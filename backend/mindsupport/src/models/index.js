import mongoose from "mongoose";

function applyJsonTransform(schema) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  });
}

const roles = ["user", "counsellor", "admin"];
const roleAliases = {
  user: "user",
  student: "user",
  counsellor: "counsellor",
  counselor: "counsellor",
  counceller: "counsellor",
  admin: "admin",
};

function normalizeRole(role) {
  return roleAliases[String(role || "user").trim().toLowerCase()] || "user";
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roles, default: "user" },
    status: { type: String, enum: ["active", "pending", "approved", "rejected", "suspended"], default: "active" },
    phone: { type: String, default: "" },
    emergencyContactName: { type: String, default: "" },
    emergencyContactPhone: { type: String, default: "" },
    emergencyContactRelation: { type: String, default: "" },
    specialization: { type: String, default: "" },
    licenseNumber: { type: String, default: "" },
    bio: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    clinicName: { type: String, default: "" },
    clinicAddress: { type: String, default: "" },
    clinicMapLink: { type: String, default: "" },
    gender: { type: String, default: "" },
    education: { type: String, default: "" },
    consultationModes: [{ type: String }],
    counsellorType: { type: String, enum: ["", "professional", "mentor"], default: "" },
    verificationBadge: { type: String, default: "" },
    verificationStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
    experience: { type: String, default: "" },
    languages: [{ type: String }],
    sessionPricing: { type: Number, default: 0 },
    supportPlanPrices: {
      oneTime: { type: Number, default: 0 },
      shortTerm: { type: Number, default: 0 },
      mediumTerm: { type: Number, default: 0 },
      longTerm: { type: Number, default: 0 },
    },
    hasCustomSupportPlanPrices: { type: Boolean, default: false },
    customPackages: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      summary: { type: String, default: "" },
      duration: { type: String, default: "" },
      cadence: { type: String, default: "" },
      bestFor: [{ type: String }],
      price: { type: Number, default: 0 },
      sessionCount: { type: Number, default: 1 },
      theme: { type: String, default: "default" },
      isActive: { type: Boolean, default: true },
    }],
    profilePhotoUrl: { type: String, default: "" },
    certificateLinks: [{ type: String }],
    linkedin: { type: String, default: "" },
    idVerification: { type: String, default: "" },
    categories: [{ type: String }],
    rating: { type: Number, default: 4.8 },
    reviews: { type: Number, default: 0 },
    responseTime: { type: String, default: "Within 24 hours" },
    platformCommission: { type: Number, default: 20 },
    availability: [{ type: String }],
    unavailableDates: [{ type: String }],
    bookingEnabled: { type: Boolean, default: true },
    meetLink: { type: String, default: "" },
    privacySettings: {
      showOnlineStatus: { type: Boolean, default: true },
      allowMessages: { type: Boolean, default: true },
      shareProgressWithCounsellor: { type: Boolean, default: true },
      anonymousDisplayName: { type: String, default: "" },
    },
    notificationSettings: {
      session: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      platform: { type: Boolean, default: true },
      emergency: { type: Boolean, default: true },
    },
    // Section-10 provider settings master (counsellor + psychiatrist)
    providerSettings: {
      crisisStandby: { type: Boolean, default: false },
      refundPolicy: {
        type: String,
        enum: ["full_24h", "half_4_24h", "none_4h", "full_12h", "none_2h"],
        default: "full_24h",
      },
      decompressionGapMin: { type: Number, default: 15, min: 0, max: 60 },
      rciNumber: { type: String, default: "" },
      nmcRegNumber: { type: String, default: "" },
      notesLock: { type: Boolean, default: false },
      sealUrl: { type: String, default: "" },
      scheduleXRestricted: { type: Boolean, default: true },
      intakeFee: { type: Number, default: 0, min: 0 },
      rxReviewFee: { type: Number, default: 0, min: 0 },
      emergencyTriageFee: { type: Number, default: 0, min: 0 },
      payoutBank: {
        accountHolder: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifsc: { type: String, default: "" },
        upiId: { type: String, default: "" },
        verified: { type: Boolean, default: false },
      },
    },
    otpVerified: { type: Boolean, default: false },
    otpVerifiedAt: Date,
    lastLoginAt: Date,
    refreshToken: { type: String, default: "" },
    refreshTokenExpiresAt: Date,
    loginHistory: [{
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      timestamp: { type: Date, default: Date.now },
      deviceFingerprint: { type: String, default: "" },
    }],
    resetPasswordToken: { type: String, default: "" },
    resetPasswordExpiresAt: Date,
  },
  { timestamps: true }
);
applyJsonTransform(userSchema);

const otpVerificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    channel: { type: String, enum: ["email", "phone"], default: "email" },
    destination: { type: String, required: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, default: "account-verification" },
    expiresAt: { type: Date, required: true },
    consumedAt: Date,
  },
  { timestamps: true }
);
applyJsonTransform(otpVerificationSchema);

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ["video", "article", "audiobook", "audio", "pdf", "blog"], default: "article" },
    category: { type: String, default: "General" },
    language: { type: String, default: "English" },
    url: { type: String, required: true },
    thumbnail: { type: String, default: "" },
    description: { type: String, default: "" },
    durationMin: { type: Number, default: 5 },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
  },
  { timestamps: true }
);
applyJsonTransform(resourceSchema);

const appointmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    studentEmail: { type: String, required: true, lowercase: true, trim: true },
    counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    counsellorName: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, enum: ["in-person", "online", "google-meet", "voice-call", "chat-only", "video-chat"], default: "google-meet" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "declined", "cancelled", "completed", "no-show"],
      default: "pending",
    },
    concern: { type: String, default: "" },
    crisisFlag: { type: Boolean, default: false },
    crisisMessage: { type: String, default: "" },
    notesEncrypted: { type: Boolean, default: false },
    supportPlanId: { type: String, default: "" },
    supportPlanName: { type: String, default: "" },
    supportPlanDuration: { type: String, default: "" },
    supportPlanCadence: { type: String, default: "" },
    supportPlanBestFor: [{ type: String }],
    supportPlanPrice: { type: Number, default: 0 },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "MindUserPackage" },
    notes: { type: String, default: "" },
    isAnonymous: { type: Boolean, default: false },
    anonymousAlias: { type: String, default: "Anonymous user" },
    meetingProvider: { type: String, default: "google-meet" },
    meetingLink: { type: String, default: "" },
  },
  { timestamps: true }
);
applyJsonTransform(appointmentSchema);
appointmentSchema.index({ student: 1, status: 1 });
appointmentSchema.index({ counsellor: 1, date: 1 });

const reviewSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "MindAppointment" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    professionalism: { type: Number, min: 1, max: 5, required: true },
    helpfulness: { type: Number, min: 1, max: 5, required: true },
    communication: { type: Number, min: 1, max: 5, required: true },
    averageRating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
    anonymous: { type: Boolean, default: true },
    status: { type: String, enum: ["approved", "flagged", "removed"], default: "approved" },
    adminNotes: { type: String, default: "" },
  },
  { timestamps: true }
);
reviewSchema.index({ appointment: 1, student: 1 }, { unique: true });
applyJsonTransform(reviewSchema);

const journalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    title: { type: String, default: "Private journal entry" },
    content: { type: String, required: true },
    mood: { type: String, default: "" },
    gratitude: { type: String, default: "" },
    trigger: { type: String, default: "" },
    sharedWithCounsellor: { type: Boolean, default: false },
    sharedAt: Date,
  },
  { timestamps: true }
);
applyJsonTransform(journalSchema);

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "MindAppointment" },
    subject: { type: String, default: "Message" },
    text: { type: String, default: "" },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "MindMessage" },
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    fileType: { type: String, default: "" },
    task: { type: String, default: "" },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
        emoji: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "MindUser" }],
    editedAt: Date,
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
  },
  { timestamps: true }
);
applyJsonTransform(messageSchema);
messageSchema.index({ from: 1, to: 1, deletedAt: 1 });

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "MindAppointment" },
    invoiceNumber: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    kind: { type: String, enum: ["session", "package", "refund"], default: "session" },
    platformCommissionRate: { type: Number, default: 2 },
    platformFee: { type: Number, default: 0 },
    counsellorPayout: { type: Number, default: 0 },
    plan: { type: String, default: "Session" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["pending", "paid", "refunded"], default: "paid" },
    paidAt: Date,
  },
  { timestamps: true }
);
applyJsonTransform(paymentSchema);

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
    audienceRole: { type: String, enum: ["", "user", "counsellor", "admin", "all"], default: "" },
    type: { type: String, default: "system" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "MindUser" }],
    metadata: { type: Map, of: String, default: {} },
    readAt: Date,
  },
  { timestamps: true }
);
applyJsonTransform(notificationSchema);
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ audienceRole: 1, createdAt: -1 });

const peerPostSchema = new mongoose.Schema(
  {
    author_uid: String,
    alias: String,
    category: { type: String, default: "General Wellness" },
    content: { type: String, required: true },
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 },
    flagged: { type: Boolean, default: false },
    crisis: { type: Boolean, default: false },
    crisisMessage: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);
applyJsonTransform(peerPostSchema);
peerPostSchema.index({ category: 1, created_at: -1 });

const peerCommentSchema = new mongoose.Schema(
  {
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: "MindPeerPost", required: true },
    author_uid: String,
    alias: String,
    content: { type: String, required: true },
    flagged: { type: Boolean, default: false },
    crisis: { type: Boolean, default: false },
    crisisMessage: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);
applyJsonTransform(peerCommentSchema);

const peerReportSchema = new mongoose.Schema(
  {
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: "MindPeerPost" },
    comment_id: { type: mongoose.Schema.Types.ObjectId, ref: "MindPeerComment" },
    reporter_uid: String,
    reason: String,
    status: { type: String, enum: ["open", "reviewing", "closed"], default: "open" },
  },
  { timestamps: true }
);
applyJsonTransform(peerReportSchema);

const moodEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
    userKey: String,
    mood: { type: Number, min: 1, max: 5, required: true },
    note: { type: String, default: "" },
    date: { type: String, required: true },
  },
  { timestamps: true }
);
applyJsonTransform(moodEntrySchema);

const assessmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
    userKey: String,
    type: { type: String, enum: ["phq9", "gad7"], default: "phq9" },
    responses: { type: Map, of: Number, default: {} },
    score: Number,
    level: { type: String, enum: ["low", "moderate", "high"], default: "low" },
    recommendations: [{ type: String }],
  },
  { timestamps: true }
);
applyJsonTransform(assessmentSchema);

const counsellorApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    status: { type: String, enum: ["pending", "reviewing", "approved", "rejected"], default: "pending" },
    requestedType: { type: String, enum: ["professional", "mentor"], default: "mentor" },
    fullName: { type: String, required: true, trim: true },
    bio: { type: String, required: true },
    specialization: { type: String, required: true },
    experience: { type: String, required: true },
    languages: [{ type: String }],
    sessionPricing: { type: Number, default: 0 },
    profilePhotoUrl: { type: String, default: "" },
    certificateLinks: [{ type: String }],
    linkedin: { type: String, default: "" },
    location: { type: String, default: "" },
    clinicName: { type: String, default: "" },
    clinicAddress: { type: String, default: "" },
    clinicMapLink: { type: String, default: "" },
    consultationModes: [{ type: String }],
    responseTime: { type: String, default: "Within 24 hours" },
    idDocumentType: { type: String, default: "" },
    idDocumentNumber: { type: String, default: "" },
    licenseNumber: { type: String, default: "" },
    education: { type: String, default: "" },
    categories: [{ type: String }],
    availability: [{ type: String }],
    approach: { type: String, default: "" },
    emergencyTraining: { type: String, default: "" },
    referenceContact: { type: String, default: "" },
    verificationNotes: { type: String, default: "" },
    adminNotes: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
    reviewedAt: Date,
  },
  { timestamps: true }
);
applyJsonTransform(counsellorApplicationSchema);

// ─── Phase 3 (merge) ─────────────────────────────────────────────────────────
// These models are mounted INSIDE the main FindMedi server (same process, same
// mongoose connection, same MongoDB). The main app already registers
// User/Appointment/Notification/Payment/Prescription/Review with different
// schemas, so every MindSupport model uses a `Mind*` name + `mind_*`
// collection. Exported variable names are unchanged, so routes/services need
// no changes.
const User = mongoose.model("MindUser", userSchema, "mind_users");
const OtpVerification = mongoose.model("MindOtpVerification", otpVerificationSchema, "mind_otp_verifications");
const Resource = mongoose.model("MindResource", resourceSchema, "mind_resources");
const Appointment = mongoose.model("MindAppointment", appointmentSchema, "mind_appointments");
const Review = mongoose.model("MindReview", reviewSchema, "mind_reviews");
const Journal = mongoose.model("MindJournal", journalSchema, "mind_journals");
const Message = mongoose.model("MindMessage", messageSchema, "mind_messages");
const Payment = mongoose.model("MindPayment", paymentSchema, "mind_payments");
const Notification = mongoose.model("MindNotification", notificationSchema, "mind_notifications");
const PeerPost = mongoose.model("MindPeerPost", peerPostSchema, "mind_peer_posts");
const PeerComment = mongoose.model("MindPeerComment", peerCommentSchema, "mind_peer_comments");
const PeerReport = mongoose.model("MindPeerReport", peerReportSchema, "mind_peer_reports");
const MoodEntry = mongoose.model("MindMoodEntry", moodEntrySchema, "mind_mood_entries");
const Assessment = mongoose.model("MindAssessment", assessmentSchema, "mind_assessments");
const CounsellorApplication = mongoose.model("MindCounsellorApplication", counsellorApplicationSchema, "mind_counsellor_applications");

const supportPackageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    duration: { type: String, default: "" },
    cadence: { type: String, default: "" },
    bestFor: [{ type: String }],
    defaultPrice: { type: Number, default: 0 },
    multiplier: { type: Number, default: 1 },
    sessionCount: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    theme: { type: String, default: "default" },
  },
  { timestamps: true }
);
applyJsonTransform(supportPackageSchema);

const SupportPackage = mongoose.model("MindSupportPackage", supportPackageSchema, "mind_support_packages");

const userPackageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    sessionsTotal: { type: Number, required: true },
    sessionsUsed: { type: Number, default: 0 },
    minCadenceDays: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "completed", "expired", "cancelled"], default: "active" },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "MindPayment" },
    price: { type: Number, default: 0 },
    mode: { type: String, default: "google-meet" },
    modeOptions: [{ type: String }],
    lastSessionDate: { type: Date },
    dataEncryptionEnabled: { type: Boolean, default: true },
    consentGiven: { type: Boolean, default: false },
    consentGivenAt: Date,
  },
  { timestamps: true }
);
applyJsonTransform(userPackageSchema);

const UserPackage = mongoose.model("MindUserPackage", userPackageSchema, "mind_user_packages");

const intakeFormSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: "MindUserPackage" },
  fullName: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, default: "" },
  occupation: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  emergencyContact: { type: String, default: "" },
  concerns: [{ type: String }],
  concernsDetail: { type: String, default: "" },
  previousTherapy: { type: String, default: "" },
  medicalHistory: { type: String, default: "" },
  medications: { type: String, default: "" },
  goals: { type: String, default: "" },
  submittedAt: { type: Date },
}, { timestamps: true });
applyJsonTransform(intakeFormSchema);
const IntakeForm = mongoose.model("MindIntakeForm", intakeFormSchema, "mind_intake_forms");

const consentFormSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  dataPrivacyAccepted: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, default: false },
  confidentialityAccepted: { type: Boolean, default: false },
  emergencyProtocolAccepted: { type: Boolean, default: false },
  acceptedAt: { type: Date },
}, { timestamps: true });
applyJsonTransform(consentFormSchema);
const ConsentForm = mongoose.model("MindConsentForm", consentFormSchema, "mind_consent_forms");

const wellnessGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  category: { type: String, enum: ["mood", "assessment", "journal", "session", "custom"], default: "custom" },
  target: { type: Number, default: 1 },
  progress: { type: Number, default: 0 },
  unit: { type: String, default: "times" },
  status: { type: String, enum: ["active", "completed", "archived"], default: "active" },
  completedAt: Date,
  dueDate: Date,
}, { timestamps: true });
applyJsonTransform(wellnessGoalSchema);
const WellnessGoal = mongoose.model("MindWellnessGoal", wellnessGoalSchema, "mind_wellness_goals");

const prescriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "MindAppointment" },
  clinicName: { type: String, default: "" },
  diagnosis: { type: String, default: "" },
  notes: { type: String, default: "" },
  followUpDate: Date,
  // PS-6: prescription lifecycle (revoke / renew audit trail).
  status: { type: String, enum: ["active", "revoked"], default: "active" },
  revokedAt: Date,
  revokeReason: { type: String, default: "" },
  renewedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "MindPrescription" },
  medicines: [{
    name: { type: String, required: true },
    dosage: { type: String, default: "" },
    frequency: { type: String, default: "" },
    duration: { type: String, default: "" },
    notes: { type: String, default: "" },
  }],
}, { timestamps: true });
applyJsonTransform(prescriptionSchema);
const Prescription = mongoose.model("MindPrescription", prescriptionSchema, "mind_prescriptions");

const assignmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "MindAppointment" },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  category: { type: String, enum: ["exercise", "journal", "reading", "practice", "other"], default: "other" },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  dueDate: Date,
  completedAt: Date,
}, { timestamps: true });
applyJsonTransform(assignmentSchema);
const Assignment = mongoose.model("MindAssignment", assignmentSchema, "mind_assignments");

const counsellorReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser", required: true },
  reason: { type: String, required: true },
  details: { type: String, default: "" },
  status: { type: String, enum: ["pending", "reviewed", "dismissed", "action_taken"], default: "pending" },
  adminNotes: { type: String, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MindUser" },
  reviewedAt: { type: Date },
}, { timestamps: true });
applyJsonTransform(counsellorReportSchema);
const CounsellorReport = mongoose.model("MindCounsellorReport", counsellorReportSchema, "mind_counsellor_reports");

export {
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
  SupportPackage,
  UserPackage,
  normalizeRole,
  roles,
  IntakeForm,
  ConsentForm,
  CounsellorReport,
  WellnessGoal,
  Prescription,
  Assignment,
};
