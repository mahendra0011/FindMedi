import crypto from "node:crypto";
import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

function guestKey(req) {
  const raw = `${req.ip || "unknown"}|${req.headers["user-agent"] || "unknown"}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function registerWellnessRoutes(app, context) {
  const {
    Appointment,
    Assessment,
    CounsellorApplication,
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
    MONGODB_URI,
    activeStatuses,
    approvedCounsellorStatuses,
    asyncRoute,
    authOptional,
    authRequired,
    badgeForCounsellorType,
    bcrypt,
    buildMeetLink,
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
    todayYMD,
  } = context;

app.get(
  "/api/wellness/profile",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    res.json({
      user: req.user ? publicUser(req.user) : { id: "guest_user", name: "Guest User" },
      privacy: "Your wellness data is visible only to you and authorized care staff.",
    });
  })
);

app.post(
  "/api/wellness/mood",
  asyncRoute(authOptional),
  body("mood").isInt({ min: 1, max: 5 }).withMessage("Mood must be 1-5"),
  body("note").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const mood = Number(req.body.mood);
    const entry = await MoodEntry.create({
      user: req.user?._id,
      userKey: req.user ? undefined : guestKey(req),
      mood,
      note: req.body?.note || "",
      date: req.body?.date || todayYMD(),
    });
    res.status(201).json(entry);
  })
);

app.get(
  "/api/wellness/mood",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    const query = req.user ? { user: req.user._id } : { userKey: guestKey(req) };
    const entries = await MoodEntry.find(query).sort({ date: 1 }).limit(60);
    res.json(entries);
  })
);

app.post(
  "/api/wellness/assessment",
  asyncRoute(authOptional),
  body("type").isIn(["gad7", "phq9"]).withMessage("Assessment type must be gad7 or phq9"),
  body("responses").isObject().withMessage("Responses must be an object"),
  validate,
  asyncRoute(async (req, res) => {
    const type = req.body?.type === "gad7" ? "gad7" : "phq9";
    const responses = req.body?.responses || {};
    const result = scoreAssessment(type, responses);
    const assessment = await Assessment.create({
      user: req.user?._id,
      userKey: req.user ? undefined : guestKey(req),
      type,
      responses,
      ...result,
    });
    res.status(201).json(assessment);
  })
);

app.get(
  "/api/wellness/assessment",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    const query = req.user ? { user: req.user._id } : { userKey: guestKey(req) };
    const assessment = await Assessment.findOne(query).sort({ createdAt: -1 });
    res.json(assessment || null);
  })
);

app.post(
  "/api/wellness/emergency",
  asyncRoute(authRequired),
  requireRoles("user", "admin", "counsellor"),
  body("message").optional().trim().escape(),
  body("type").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const emergencyId = new mongoose.Types.ObjectId().toString();
    const message = String(req.body?.message || req.body?.type || "Emergency support requested").trim().slice(0, 500);
    const source = String(req.body?.source || "wellness").trim().slice(0, 80);
    const contacts = [
      { label: "India Kiran Mental Health Helpline", value: "1800-599-0019" },
      { label: "Aasra Suicide Prevention", value: "+91-9820466726" },
      { label: "Emergency services", value: "Call your local emergency number" },
    ];
    let notifiedCounsellors = [];
    if (req.user.role === "user") {
      const appointments = await Appointment.find({
        student: req.user._id,
        status: { $in: ["pending", "confirmed", "completed"] },
      })
        .sort({ date: -1, time: -1 })
        .populate("counsellor", "name email role status");
      const counsellorMap = new Map();
      appointments.forEach((appointment) => {
        const counsellor = appointment.counsellor;
        if (counsellor?._id && !counsellorMap.has(String(counsellor._id))) {
          counsellorMap.set(String(counsellor._id), { counsellor, appointment });
        }
      });
      notifiedCounsellors = await Promise.all(
        [...counsellorMap.values()].map(async ({ counsellor, appointment }) => {
          const alertText = `${req.user.name} requested urgent support. Source: ${source}. Message: ${message}`;
          await createNotification({
            user: counsellor._id,
            type: "emergency",
            title: "Emergency support requested",
            message: alertText,
            metadata: {
              emergencyId,
              userId: String(req.user._id),
              userEmail: req.user.email,
              appointmentId: String(appointment._id),
            },
          });
          await Message.create({
            from: req.user._id,
            to: counsellor._id,
            appointment: appointment._id,
            subject: "Emergency support request",
            text: alertText,
            readBy: [req.user._id],
          });
          io.to(`user:${counsellor._id}`).emit("message:new", {
            type: "emergency",
            title: "Emergency support requested",
            message: alertText,
          });
          return { id: String(counsellor._id), name: counsellor.name, email: counsellor.email };
        })
      );
      await createNotification({
        user: req.user._id,
        type: "emergency",
        title: "Emergency support sent",
        message: notifiedCounsellors.length
          ? `SOS alert sent to ${notifiedCounsellors.map((item) => item.name).join(", ")} and platform admin.`
          : "SOS alert sent to platform admin. Booked counsellors were not found.",
        metadata: { emergencyId },
      });
    }
    const emergencyContact = req.user.emergencyContactPhone || req.user.phone || "";
    await createNotification({
      audienceRole: "admin",
      type: "emergency",
      title: "Emergency alert",
      message: `${req.user.name} (${req.user.email}) triggered SOS from ${source}. ${message}`,
      metadata: {
        emergencyId,
        source: "wellness",
        userName: req.user.name,
        userEmail: req.user.email,
        contact: emergencyContact,
        userId: String(req.user._id),
        counsellorCount: String(notifiedCounsellors.length),
      },
    });
    res.status(201).json({
      success: true,
      message: notifiedCounsellors.length
        ? "Emergency support request sent to your booked counsellor and admin."
        : "Emergency support request recorded and sent to admin.",
      request: {
        id: emergencyId,
        type: req.body?.type || "support",
        createdAt: new Date().toISOString(),
        notifiedCounsellors,
      },
      contacts,
    });
  })
);

app.post(
  "/api/wellness/notification",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    res.status(201).json({
      success: true,
      notification: {
        id: new mongoose.Types.ObjectId().toString(),
        type: req.body?.type || "reminder",
        message: req.body?.message || "Time for your daily wellness check.",
        delivered: true,
        channel: "in-app",
        timestamp: new Date().toISOString(),
      },
    });
  })
);
}
