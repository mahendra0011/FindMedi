export function registerApplicationRoutes(app, context) {
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
  "/api/counsellor-applications/me",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const application = await CounsellorApplication.findOne({ user: req.user._id }).sort({ createdAt: -1 }).populate("user", "name email role status");
    res.json(normalizeApplication(application));
  })
);

app.post(
  "/api/counsellor-applications",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    if (req.user.role !== "counsellor" || req.user.status !== "pending") {
      res.status(400).json({ error: "Create a counsellor account to submit a verification request" });
      return;
    }
    const latest = await CounsellorApplication.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (latest && ["pending", "reviewing", "approved"].includes(latest.status)) {
      res.status(409).json({ error: `You already have a ${latest.status} counsellor application` });
      return;
    }
    const requestedType = req.body?.requestedType === "professional" ? "professional" : "mentor";
    const fullName = String(req.body?.fullName || req.user.name || "").trim();
    const bio = String(req.body?.bio || "").trim();
    const specialization = String(req.body?.specialization || "").trim();
    const experience = String(req.body?.experience || "").trim();
    const location = String(req.body?.location || "").trim();
    const consultationModes = listFromInput(req.body?.consultationModes);
    const responseTime = String(req.body?.responseTime || "Within 24 hours").trim();
    const idDocumentNumber = String(req.body?.idDocumentNumber || "").trim();
    if (!fullName || !bio || !specialization || !experience || !location || !idDocumentNumber) {
      res.status(400).json({ error: "Full name, bio, specialization, experience, location, and ID verification are required" });
      return;
    }
    if (!consultationModes.length) {
      res.status(400).json({ error: "Select at least one counselling mode" });
      return;
    }
    if (!Number(req.body?.sessionPricing) || Number(req.body?.sessionPricing) < 1) {
      res.status(400).json({ error: "Enter an affordable base session price" });
      return;
    }
    if (requestedType === "professional" && !String(req.body?.licenseNumber || "").trim()) {
      res.status(400).json({ error: "Professional applications require a license or registration number" });
      return;
    }
    const application = await CounsellorApplication.create({
      user: req.user._id,
      status: "pending",
      requestedType,
      fullName,
      bio,
      specialization,
      experience,
      languages: listFromInput(req.body?.languages),
      sessionPricing: Number(req.body?.sessionPricing) || 0,
      location,
      consultationModes,
      responseTime,
      profilePhotoUrl: String(req.body?.profilePhotoUrl || "").trim(),
      certificateLinks: listFromInput(req.body?.certificateLinks),
      linkedin: String(req.body?.linkedin || "").trim(),
      idDocumentType: String(req.body?.idDocumentType || "Government ID").trim(),
      idDocumentNumber,
      licenseNumber: String(req.body?.licenseNumber || "").trim(),
      education: String(req.body?.education || "").trim(),
      categories: listFromInput(req.body?.categories),
      availability: listFromInput(req.body?.availability),
      approach: String(req.body?.approach || "").trim(),
      emergencyTraining: String(req.body?.emergencyTraining || "").trim(),
      referenceContact: String(req.body?.referenceContact || "").trim(),
      verificationNotes: String(req.body?.verificationNotes || "").trim(),
    });
    req.user.verificationStatus = "pending";
    req.user.location = location;
    req.user.consultationModes = consultationModes;
    req.user.responseTime = responseTime;
    await req.user.save();
    res.status(201).json(normalizeApplication(await application.populate("user", "name email role status")));
  })
);
}
