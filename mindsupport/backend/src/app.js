import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import crypto from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { CLIENT_ORIGIN, GOOGLE_MEET_DEFAULT_LINK, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, JWT_SECRET, NOTES_ENCRYPTION_KEY, maskMongoUri, MONGODB_DATABASE, MONGODB_URI, PORT } from "./config/env.js";
import { connectDatabase, isDatabaseReady } from "./database/connect.js";
import {
  Appointment,
  Assessment,
  ConsentForm,
  CounsellorApplication,
  CounsellorReport,
  IntakeForm,
  Journal,
  Message,
  MoodEntry,
  Notification,
  OtpVerification,
  Payment,
  PeerComment,
  PeerPost,
  PeerReport,
  Resource,
  Review,
  User,
  SupportPackage,
  UserPackage,
  WellnessGoal,
  Prescription,
  Assignment,
  normalizeRole,
} from "./models/index.js";
import { createRealtimeServer } from "./realtime/socket.js";
import { registerRoutes } from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = createRealtimeServer(httpServer);

// Security headers
app.use(helmet());

// NoSQL injection protection is handled by route-level validation and Mongoose schema types.

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests, please try again later." },
});
app.use("/api/auth/otp", otpLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/auth/forgot-password", sensitiveLimiter);
app.use("/api/auth/refresh", sensitiveLimiter);
app.use("/api/auth/me", sensitiveLimiter);
app.use("/api/auth/reset-password", sensitiveLimiter);

function allowedCorsOrigins() {
  return [CLIENT_ORIGIN, ...(process.env.CORS_ORIGIN || "").split(",")]
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesCorsOrigin(origin, allowedOrigin) {
  if (!allowedOrigin) return false;
  if (allowedOrigin === "*") return true;
  if (origin === allowedOrigin) return true;
  try {
    const browserOrigin = new URL(origin);
    const configuredOrigin = new URL(/^https?:\/\//i.test(allowedOrigin) ? allowedOrigin : `https://${allowedOrigin}`);
    return browserOrigin.hostname === configuredOrigin.hostname && browserOrigin.port === configuredOrigin.port;
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = allowedCorsOrigins();
      if (!origin || allowedOrigins.some((allowedOrigin) => matchesCorsOrigin(origin, allowedOrigin))) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const activeStatuses = ["pending", "confirmed"];
const approvedCounsellorStatuses = ["active", "approved"];

const crisisRegex = /\b(suicide|suicidal|kill myself|self[-\s]?harm|hurt myself|want to die|no way out|ending it all|panic attack|abuse|abused|abusive)\b/i;

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function deriveEncryptionKey() {
  const key = NOTES_ENCRYPTION_KEY || JWT_SECRET || "mindsupport-fallback-key-2024";
  if (!NOTES_ENCRYPTION_KEY && process.env.NODE_ENV === "production") {
    console.warn("[encrypt] NOTES_ENCRYPTION_KEY not set — falling back to JWT_SECRET. Set a separate key to avoid data loss on JWT rotation.");
  }
  return crypto.createHash("sha256").update(key).digest();
}
const ENCRYPTION_KEY = deriveEncryptionKey();
const IV_LENGTH = 16;

function encryptText(text) {
  if (!text) return { encrypted: text, encryptedFlag: false };
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return { encrypted: iv.toString("hex") + ":" + encrypted.toString("hex"), encryptedFlag: true };
}

function decryptText(text) {
  if (!text || typeof text !== "string" || !text.includes(":")) return text;
  const parts = text.split(":");
  try {
    const iv = Buffer.from(parts.shift(), "hex");
    const encrypted = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch { return text; }
}

function detectCrisis(concern = "") {
  if (!concern) return { crisis: false, message: "" };
  const riskWords = /\b(suicide|suicidal|kill myself|self[-\s]?harm|hurt myself|want to die|no way out|ending it all|panic attack|trauma|severe anxiety|abuse|abused|abusive)\b/i;
  if (riskWords.test(concern)) {
    return { crisis: true, message: "Crisis keywords detected. Safety resources will be shared." };
  }
  return { crisis: false, message: "" };
}

function buildMeetLink() {
  return normalizeMeetLink(GOOGLE_MEET_DEFAULT_LINK);
}

function normalizeMeetLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.hostname !== "meet.google.com") return "";
    const pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname || pathname === "/new") return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function resolveSharedMeetLink(...candidates) {
  for (const candidate of candidates) {
    const link = normalizeMeetLink(candidate);
    if (link) return link;
  }
  return "";
}

function publicUser(user) {
  if (!user) return null;
  const raw = user.toJSON ? user.toJSON() : user;
  delete raw.passwordHash;
  return raw;
}

function normalizeUsername(value, fallback = "") {
  const base = String(value || fallback || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  return base && base.length >= 3 ? base : "";
}

async function makeUniqueUsername(seed, excludeId) {
  const base = normalizeUsername(seed, "mindsupport");
  const root = base || `user${Math.floor(1000 + Math.random() * 9000)}`;
  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0 ? root : `${root}${index + 1}`;
    const query = { username: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await User.exists(query);
    if (!exists) return candidate;
  }
  return `${root}${Date.now().toString().slice(-5)}`;
}

function listFromInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeApplication(application) {
  if (!application) return null;
  const raw = application.toJSON ? application.toJSON() : application;
  const hasPopulatedUser = raw.user && typeof raw.user === "object" && (raw.user.email || raw.user.name || raw.user.role || raw.user.status);
  const user = hasPopulatedUser ? raw.user : null;
  const userId = user?.id || user?._id || raw.user?.toString?.() || raw.user;
  return {
    ...raw,
    userId,
    userName: user?.name || "",
    userEmail: user?.email || "",
    userRole: user?.role || "",
    userStatus: user?.status || "",
  };
}

function clampRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 5;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

function badgeForCounsellorType(type) {
  return type === "professional" ? "Verified Professional" : "Community Mentor";
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, type: "access" }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, type: "refresh" }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

function setTokenCookie(res, token) {
  const maxAge = 15 * 60 * 1000; // match JWT_ACCESS_EXPIRES_IN (15m)
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

function clearTokenCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    if (!isDatabaseReady()) {
      res.status(503).json({
        error: "Database unavailable",
        detail: "MongoDB is not connected. Check MONGODB_URI and start MongoDB.",
      });
      return;
    }
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function authOptional(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : (req.cookies?.token || "");
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user && user.status !== "suspended") req.user = user;
  } catch {
    // Optional auth intentionally ignores bad tokens.
  }
  next();
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : (req.cookies?.token || "");
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.status === "suspended") {
      res.status(401).json({ error: "Invalid or suspended account" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (req.user.role === "counsellor" && allowed.includes("counsellor") && !approvedCounsellorStatuses.includes(req.user.status)) {
      res.status(403).json({ error: "Counsellor account is pending admin approval" });
      return;
    }
    next();
  };
}

function normalizeAppointment(appointment, viewer) {
  const raw = appointment.toObject ? appointment.toObject({ virtuals: true }) : appointment;
  const student = raw.student && typeof raw.student === "object" ? raw.student : null;
  const counsellor = raw.counsellor && typeof raw.counsellor === "object" ? raw.counsellor : null;
  const hideStudent = raw.isAnonymous && viewer?.role === "counsellor";
  let notes = raw.notes || "";
  if (raw.notesEncrypted && viewer?.role === "counsellor") {
    notes = decryptText(raw.notes) || notes;
  }
  if (raw.notesEncrypted && viewer?.role !== "counsellor") {
    notes = raw.notes ? "[encrypted]" : "";
  }
  return {
    id: String(raw._id || raw.id),
    packageId: raw.packageId ? String(raw.packageId) : null,
    studentId: student?.email || raw.studentEmail || String(raw.student || ""),
    studentEmail: hideStudent ? "Hidden by anonymous mode" : raw.studentEmail || student?.email || "",
    studentName: hideStudent ? raw.anonymousAlias || "Anonymous user" : student?.name || "",
    counsellorId: counsellor?._id ? String(counsellor._id) : String(raw.counsellor || ""),
    counsellorName: raw.counsellorName || counsellor?.name || "",
    date: raw.date,
    time: raw.time,
    mode: raw.mode,
    status: raw.status,
    concern: raw.concern || "",
    crisisFlag: Boolean(raw.crisisFlag),
    crisisMessage: raw.crisisMessage || "",
    supportPlanId: raw.supportPlanId || "",
    supportPlanName: raw.supportPlanName || "",
    supportPlanDuration: raw.supportPlanDuration || "",
    supportPlanCadence: raw.supportPlanCadence || "",
    supportPlanBestFor: raw.supportPlanBestFor || [],
    supportPlanPrice: Number(raw.supportPlanPrice || 0),
    notes,
    isAnonymous: Boolean(raw.isAnonymous),
    anonymousAlias: raw.anonymousAlias || "Anonymous user",
    meetingProvider: raw.meetingProvider || "",
    meetingLink: raw.meetingLink || "",
    notesEncrypted: Boolean(raw.notesEncrypted),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function normalizeAppointmentsWithReviewStatus(appointments, viewer) {
  const base = appointments.map((appointment) => normalizeAppointment(appointment, viewer));
  if (!viewer || viewer.role !== "user" || appointments.length === 0) return base;
  const appointmentIds = appointments.map((appointment) => appointment._id || appointment.id);
  const reviews = await Review.find({ appointment: { $in: appointmentIds }, student: viewer._id }).select("appointment status");
  const reviewed = new Set(reviews.map((review) => String(review.appointment)));
  return base.map((appointment) => ({
    ...appointment,
    reviewSubmitted: reviewed.has(String(appointment.id)),
  }));
}

function normalizeReview(review, viewer) {
  if (!review) return null;
  const raw = review.toObject ? review.toObject({ virtuals: true }) : review;
  const student = raw.student && typeof raw.student === "object" ? raw.student : null;
  const counsellor = raw.counsellor && typeof raw.counsellor === "object" ? raw.counsellor : null;
  const hiddenStudent = raw.anonymous && viewer?.role !== "admin";
  return {
    id: String(raw._id || raw.id),
    appointmentId: raw.appointment?._id ? String(raw.appointment._id) : String(raw.appointment || ""),
    studentId: student?._id ? String(student._id) : String(raw.student || ""),
    studentName: hiddenStudent ? "Anonymous user" : student?.name || "User",
    studentEmail: hiddenStudent ? "Hidden" : student?.email || "",
    counsellorId: counsellor?._id ? String(counsellor._id) : String(raw.counsellor || ""),
    counsellor: counsellor?.name || "",
    professionalism: raw.professionalism,
    helpfulness: raw.helpfulness,
    communication: raw.communication,
    rating: raw.averageRating,
    comment: raw.comment || "",
    anonymous: Boolean(raw.anonymous),
    status: raw.status,
    needsModeration: raw.status === "flagged" || Number(raw.averageRating) <= 2,
    adminNotes: raw.adminNotes || "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeJournal(entry) {
  if (!entry) return null;
  const raw = entry.toObject ? entry.toObject({ virtuals: true }) : entry;
  return {
    id: String(raw._id || raw.id),
    title: raw.title || "Private journal entry",
    content: raw.content || "",
    excerpt: String(raw.content || "").slice(0, 120),
    mood: raw.mood || "",
    gratitude: raw.gratitude || "",
    trigger: raw.trigger || "",
    shared: Boolean(raw.sharedWithCounsellor),
    sharedAt: raw.sharedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeMessage(message, viewer) {
  if (!message) return null;
  const raw = message.toObject ? message.toObject({ virtuals: true }) : message;
  const from = raw.from && typeof raw.from === "object" ? raw.from : null;
  const to = raw.to && typeof raw.to === "object" ? raw.to : null;
  const replyTo = raw.replyTo && typeof raw.replyTo === "object" ? raw.replyTo : null;
  const viewerId = viewer?._id ? String(viewer._id) : "";
  const readBy = (raw.readBy || []).map((item) => String(item?._id || item));
  const reactions = (raw.reactions || []).map((reaction) => ({
    userId: String(reaction.user?._id || reaction.user || ""),
    emoji: reaction.emoji || "",
    createdAt: reaction.createdAt,
    mine: viewerId ? String(reaction.user?._id || reaction.user || "") === viewerId : false,
  }));
  return {
    id: String(raw._id || raw.id),
    fromId: from?._id ? String(from._id) : String(raw.from || ""),
    toId: to?._id ? String(to._id) : String(raw.to || ""),
    from: from?.name || "User",
    fromUsername: from?.username || "",
    to: to?.name || "User",
    toUsername: to?.username || "",
    subject: raw.subject || "Message",
    text: raw.text || "",
    task: raw.task || "",
    fileName: raw.fileName || "",
    fileUrl: raw.fileUrl || "",
    fileType: raw.fileType || "",
    replyTo: replyTo && !replyTo.deletedAt
      ? {
          id: String(replyTo._id || replyTo.id),
          from: replyTo.from?.name || "User",
          text: String(replyTo.text || "").slice(0, 180),
        }
      : null,
    reactions,
    reactionSummary: reactions.reduce((summary, reaction) => {
      if (!reaction.emoji) return summary;
      summary[reaction.emoji] = (summary[reaction.emoji] || 0) + 1;
      return summary;
    }, {}),
    edited: Boolean(raw.editedAt),
    editedAt: raw.editedAt,
    deleted: Boolean(raw.deletedAt),
    deletedAt: raw.deletedAt,
    canEdit: viewerId ? String(raw.from?._id || raw.from) === viewerId && !raw.deletedAt : false,
    canDelete: viewerId ? [String(raw.from?._id || raw.from), String(raw.to?._id || raw.to)].includes(viewerId) && !raw.deletedAt : false,
    unread: viewerId ? !readBy.includes(viewerId) && String(raw.to?._id || raw.to) === viewerId : false,
    direction: viewerId && String(raw.from?._id || raw.from) === viewerId ? "sent" : "received",
    createdAt: raw.createdAt,
    time: raw.createdAt ? new Date(raw.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "",
  };
}

function normalizePayment(payment) {
  if (!payment) return null;
  const raw = payment.toObject ? payment.toObject({ virtuals: true }) : payment;
  return {
    id: raw.invoiceNumber || String(raw._id || raw.id),
    paymentId: String(raw._id || raw.id),
    appointmentId: raw.appointment?._id ? String(raw.appointment._id) : String(raw.appointment || ""),
    amount: raw.amount || 0,
    currency: raw.currency || "INR",
    kind: raw.kind || "session",
    platformCommissionRate: raw.platformCommissionRate || 20,
    platformFee: raw.platformFee || 0,
    counsellorPayout: raw.counsellorPayout || 0,
    plan: raw.plan || "Session",
    description: raw.description || "",
    status: raw.status || "paid",
    date: raw.paidAt ? new Date(raw.paidAt).toISOString().slice(0, 10) : raw.createdAt ? new Date(raw.createdAt).toISOString().slice(0, 10) : "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeNotification(notification) {
  if (!notification) return null;
  const raw = notification.toObject ? notification.toObject({ virtuals: true }) : notification;
  return {
    id: String(raw._id || raw.id),
    type: raw.type || "system",
    title: raw.title || "",
    message: raw.message || "",
    metadata: raw.metadata ? Object.fromEntries(raw.metadata instanceof Map ? raw.metadata : Object.entries(raw.metadata)) : {},
    read: Boolean(raw.read),
    createdAt: raw.createdAt,
    time: raw.createdAt ? new Date(raw.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "",
  };
}

async function refreshCounsellorRating(counsellorId) {
  if (!counsellorId) return;
  const objectId = new mongoose.Types.ObjectId(String(counsellorId));
  const [summary] = await Review.aggregate([
    { $match: { counsellor: objectId, status: "approved" } },
    { $group: { _id: "$counsellor", average: { $avg: "$averageRating" }, count: { $sum: 1 } } },
  ]);
  await User.findByIdAndUpdate(counsellorId, {
    rating: summary ? Number(summary.average.toFixed(1)) : 4.8,
    reviews: summary?.count || 0,
  });
}

async function createNotification({ user, audienceRole = "", type = "system", title, message, metadata = {} }) {
  if (!title || !message) return null;
  const notification = await Notification.create({
    user,
    audienceRole,
    type,
    title,
    message,
    metadata,
  });
  return notification;
}

async function canMessageUser(sender, recipient) {
  if (!sender || !recipient) return false;
  if (sender.role === "admin") return true;
  if (recipient.role === "admin") return true;
  if (sender.role === "user") {
    if (recipient.role !== "counsellor" || !approvedCounsellorStatuses.includes(recipient.status)) return false;
    const appointment = await Appointment.exists({
      student: sender._id,
      counsellor: recipient._id,
      status: { $in: ["pending", "confirmed", "completed"] },
    });
    return Boolean(appointment);
  }
  if (sender.role === "counsellor") {
    if (recipient.role !== "user") return false;
    const appointment = await Appointment.exists({
      counsellor: sender._id,
      student: recipient._id,
      status: { $in: ["pending", "confirmed", "completed"] },
    });
    return Boolean(appointment);
  }
  return false;
}

async function findUserByIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (!value) return null;
  if (mongoose.isValidObjectId(value)) return User.findById(value);
  const normalized = value.toLowerCase();
  return User.findOne({ $or: [{ email: normalized }, { username: normalized }] });
}

async function findCounsellor(counsellorId) {
  if (!counsellorId || counsellorId === "first_available") {
    const counsellors = await User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ createdAt: 1 });
    if (counsellors.length === 0) return null;
    const loads = await Promise.all(
      counsellors.map(async (counsellor) => ({
        counsellor,
        count: await Appointment.countDocuments({
          counsellor: counsellor._id,
          status: { $in: activeStatuses },
        }),
      }))
    );
    loads.sort((a, b) => a.count - b.count);
    return loads[0].counsellor;
  }
  if (mongoose.isValidObjectId(counsellorId)) {
    return User.findOne({ _id: counsellorId, role: "counsellor", status: { $in: approvedCounsellorStatuses } });
  }
  return User.findOne({ email: String(counsellorId).toLowerCase(), role: "counsellor", status: { $in: approvedCounsellorStatuses } });
}

async function hasAppointmentConflict(counsellorId, date, time, excludeId) {
  const query = {
    counsellor: counsellorId,
    date,
    time,
    status: { $in: activeStatuses },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Appointment.exists(query);
}

function canAccessAppointment(user, appt) {
  if (user.role === "admin") return true;
  if (user.role === "counsellor" && String(appt.counsellor) === String(user._id)) return true;
  if (user.role === "user" && String(appt.student) === String(user._id)) return true;
  return false;
}

function scoreAssessment(type, responses) {
  const values = Object.values(responses || {}).map((value) => Number(value) || 0);
  const score = values.reduce((sum, value) => sum + value, 0);
  const highThreshold = type === "gad7" ? 15 : 20;
  const moderateThreshold = type === "gad7" ? 10 : 10;
  const level = score >= highThreshold ? "high" : score >= moderateThreshold ? "moderate" : "low";
  const recommendations = {
    low: [
      "Keep tracking your mood and sleep for early pattern awareness.",
      "Use a short breathing or grounding exercise when stress rises.",
    ],
    moderate: [
      "Consider booking a counselling session for extra support.",
      "Create a simple support plan with one trusted person and one daily routine.",
    ],
    high: [
      "Please reach out to a counsellor or trusted adult as soon as you can.",
      "If you feel unsafe, contact emergency services or a crisis helpline immediately.",
    ],
  }[level];
  return { score, level, recommendations };
}

registerRoutes(app, {
  Appointment,
  Assessment,
  ConsentForm,
  CounsellorApplication,
  CounsellorReport,
  IntakeForm,
  Journal,
  Message,
  MoodEntry,
  Notification,
  OtpVerification,
  Payment,
  PeerComment,
  PeerPost,
  PeerReport,
  Resource,
  Review,
  User,
  SupportPackage,
  UserPackage,
  WellnessGoal,
  Prescription,
  Assignment,
  MONGODB_DATABASE,
  MONGODB_URI,
  maskMongoUri,
  activeStatuses,
  approvedCounsellorStatuses,
  asyncRoute,
  authOptional,
  authRequired,
  badgeForCounsellorType,
  bcrypt,
  buildMeetLink,
  normalizeMeetLink,
  resolveSharedMeetLink,
  canAccessAppointment,
  canMessageUser,
  createNotification,
  crisisRegex,
  findCounsellor,
  findUserByIdentifier,
  generateOtpCode,
  hasAppointmentConflict,
  io,
  isDatabaseReady,
  listFromInput,
  makeUniqueUsername,
  mongoose,
  normalizeRole,
  clampRating,
  normalizeApplication,
  normalizeAppointment,
  normalizeAppointmentsWithReviewStatus,
  normalizeJournal,
  normalizeMessage,
  normalizeNotification,
  normalizePayment,
  normalizeReview,
  publicUser,
  refreshCounsellorRating,
  requireRoles,
  scoreAssessment,
  signToken,
  signRefreshToken,
  setTokenCookie,
  clearTokenCookie,
  jwt,
  JWT_SECRET,
  todayYMD,
  encryptText,
  decryptText,
  detectCrisis,
});

const distPath = path.join(__dirname, "..", "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) {
    res.status(409).json({ error: "Duplicate record" });
    return;
  }
  res.status(500).json({ error: error?.message || "Server error" });
});

export { app, connectDatabase, httpServer, PORT };
