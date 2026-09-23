import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerUserRoutes(app, context) {
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
    UserPackage,
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
  "/api/user/dashboard",
  asyncRoute(authRequired),
  requireRoles("user"),
  asyncRoute(async (req, res) => {
    const [appointments, moods, latestAssessment, resources, counsellors, journals, messages, payments, notifications, packages] = await Promise.all([
      Appointment.find({ student: req.user._id }).sort({ date: 1, time: 1 }).populate("counsellor", "name email phone specialization clinicName clinicAddress clinicMapLink city"),
      MoodEntry.find({ user: req.user._id }).sort({ date: -1 }).limit(14),
      Assessment.findOne({ user: req.user._id }).sort({ createdAt: -1 }),
      Resource.find().sort({ createdAt: -1 }).limit(6),
      User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ name: 1 }).limit(8),
      Journal.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8),
      Message.find({ deletedAt: null, $or: [{ from: req.user._id }, { to: req.user._id }] })
        .sort({ createdAt: -1 })
        .limit(80)
        .populate("from to appointment")
        .populate({ path: "replyTo", populate: { path: "from", select: "name username" } }),
      Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8),
      Notification.find({ $or: [{ user: req.user._id }, { audienceRole: { $in: ["user", "all"] } }] }).sort({ createdAt: -1 }).limit(8),
      UserPackage.find({ user: req.user._id }).sort({ createdAt: -1 }).populate("counsellor", "name email"),
    ]);
    const now = new Date();
    for (const pkg of packages) {
      if (pkg.status === "active" && pkg.expiryDate && new Date(pkg.expiryDate) < now) {
        pkg.status = "expired";
        await pkg.save();
      }
    }
    const upcoming = appointments.filter((a) => !["cancelled", "completed", "declined"].includes(a.status));
    const today = todayYMD();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const uniqueMoodDates = new Set(moods.map((m) => m.date));
    let wellnessStreak = 0;
    const streakDate = new Date(now);
    while (true) {
      const ds = `${streakDate.getFullYear()}-${String(streakDate.getMonth() + 1).padStart(2, "0")}-${String(streakDate.getDate()).padStart(2, "0")}`;
      if (uniqueMoodDates.has(ds)) { wellnessStreak++; streakDate.setDate(streakDate.getDate() - 1); }
      else break;
    }
    wellnessStreak = Math.max(0, Math.min(21, wellnessStreak));

    const latestPhq9 = latestAssessment?.type === "phq9" && latestAssessment?.responses?.q3 != null ? latestAssessment : null;
    const latestGad7 = latestAssessment?.type === "gad7" && latestAssessment?.score != null ? latestAssessment : null;
    const phq9SleepScore = latestPhq9 ? latestPhq9.responses.q3 : null;
    const sleepQualityScore = phq9SleepScore != null ? Math.round(Math.max(1, 10 - phq9SleepScore * 2.5)) : 7;
    const gad7TotalScore = latestGad7 ? latestGad7.score : null;
    const anxietyScore = gad7TotalScore != null ? Math.round(Math.max(1, Math.min(10, 10 - (gad7TotalScore - 5) * 0.5))) : 6;

    const weeklyMoodData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayMoods = moods.filter((m) => m.date === ds);
      const avgMood = dayMoods.length > 0 ? dayMoods.reduce((s, m) => s + m.mood, 0) / dayMoods.length : 0;
      weeklyMoodData.push({
        label: dayNames[d.getDay()],
        mood: avgMood,
        sleep: avgMood > 0 ? sleepQualityScore : 0,
        anxiety: avgMood > 0 ? anxietyScore : 0,
      });
    }

    const recentMoodValues = moods.slice(0, 30).map((m) => m.mood).filter((v) => v >= 1 && v <= 5);
    let emotionalStability = 50;
    if (recentMoodValues.length >= 3) {
      const mean = recentMoodValues.reduce((s, v) => s + v, 0) / recentMoodValues.length;
      const variance = recentMoodValues.reduce((s, v) => s + (v - mean) ** 2, 0) / recentMoodValues.length;
      const stdDev = Math.sqrt(variance);
      emotionalStability = Math.max(10, Math.min(100, Math.round(100 - stdDev * 25)));
    }

    const completedAppts = appointments.filter((a) => a.status === "completed").length;
    const totalActiveAppts = appointments.filter((a) => !["cancelled", "declined"].includes(a.status)).length;
    const therapyProgress = totalActiveAppts > 0 ? Math.round((completedAppts / totalActiveAppts) * 100) : 0;

    const journalsThisWeek = journals.filter((j) => {
      const d = new Date(j.createdAt);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }).length;
    const completedSessions = appointments.filter((a) => a.status === "completed").length;
    const habitData = [
      { name: "Mood Check-ins", value: `${uniqueMoodDates.size} days`, progress: Math.min(100, Math.round((uniqueMoodDates.size / 7) * 100)) },
      { name: "Journal Entries", value: `${journalsThisWeek} this week`, progress: Math.min(100, Math.round((journalsThisWeek / 7) * 100)) },
      { name: "Sessions Attended", value: `${completedSessions} completed`, progress: therapyProgress },
      { name: "Assessments Done", value: latestPhq9 || latestGad7 ? "Completed" : "Not started", progress: latestPhq9 || latestGad7 ? 100 : 0 },
    ];

    const bookedCounsellorIds = new Set(
      appointments
        .filter((appointment) => !["cancelled", "declined"].includes(appointment.status))
        .map((appointment) => String(appointment.counsellor?._id || appointment.counsellor || ""))
        .filter(Boolean)
    );
    const normalizedMessages = messages
      .map((message) => normalizeMessage(message, req.user))
      .filter((message) => bookedCounsellorIds.has(message.fromId) || bookedCounsellorIds.has(message.toId));
    const normalizedPayments = payments.map(normalizePayment);
    const chatCounsellors = counsellors.filter((counsellor) => bookedCounsellorIds.has(String(counsellor._id)));
    res.json({
      profile: publicUser(req.user),
      stats: {
        upcomingSessions: upcoming.length,
        completedSessions: appointments.filter((a) => a.status === "completed").length,
        moodEntries: moods.length,
        latestRiskLevel: latestAssessment?.level || "not-started",
        moodScore: moods[0]?.mood || 4,
        wellnessStreak,
        unreadMessages: normalizedMessages.filter((message) => message.unread).length,
        dailyTip: "Take two minutes today to breathe slowly and name one thing you handled well.",
      },
      appointments: await normalizeAppointmentsWithReviewStatus(appointments, req.user),
      moodEntries: moods,
      latestAssessment,
      recommendedResources: resources,
      therapists: chatCounsellors.map((counsellor, index) => ({
        id: String(counsellor._id),
        name: counsellor.name,
        specialization: counsellor.specialization || "General counselling",
        counsellorType: counsellor.counsellorType || "professional",
        badge: counsellor.verificationBadge || badgeForCounsellorType(counsellor.counsellorType),
        profilePhotoUrl: counsellor.profilePhotoUrl || "",
        location: counsellor.location || "India - online and in-person support",
        education: counsellor.education || "",
        bio: counsellor.bio || "",
        consultationModes: counsellor.consultationModes?.length ? counsellor.consultationModes : ["google-meet", "in-person", "voice-call"],
        responseTime: counsellor.responseTime || "Within 24 hours",
        sessionPricing: counsellor.sessionPricing || 0,
        languages: counsellor.languages || [],
        experience: counsellor.experience || "",
        rating: counsellor.rating || [4.9, 4.8, 4.7, 4.9][index % 4],
        reviews: counsellor.reviews || 42 + index * 17,
        availability: counsellor.availability || ["Mon 10:00-14:00", "Wed 12:00-16:00"],
        categories: counsellor.categories?.length
          ? counsellor.categories
          : ["Anxiety", "Depression", "Stress", "PTSD", "Addiction", "Relationship issues", "Career pressure"].slice(index, index + 4),
        nextSlot: `${today} ${index % 2 === 0 ? "15:00" : "17:30"}`,
      })),
      analytics: {
        weeklyMood: weeklyMoodData,
        emotionalStability,
        therapyProgress,
        sleepQuality: sleepQualityScore * 10,
      },
      journal: journals.map(normalizeJournal),
      packages: packages.map((pkg) => {
        const sessionsUsed = pkg.sessionsUsed || 0;
        const sessionsTotal = pkg.sessionsTotal || 1;
        return {
          id: String(pkg._id),
          counsellorId: String(pkg.counsellor?._id || pkg.counsellor),
          counsellorName: pkg.counsellor?.name || "",
          planId: pkg.planId,
          planName: pkg.planName,
          sessionsUsed,
          sessionsTotal,
          sessionsRemaining: Math.max(0, sessionsTotal - sessionsUsed),
          minCadenceDays: pkg.minCadenceDays,
          expiryDate: pkg.expiryDate,
          status: pkg.status,
          price: pkg.price,
          lastSessionDate: pkg.lastSessionDate,
          progress: Math.round((sessionsUsed / sessionsTotal) * 100),
          createdAt: pkg.createdAt,
        };
      }),
      habits: habitData,
      messages: normalizedMessages,
      notifications: notifications.map(normalizeNotification),
      payments: {
        summary: "One-time counselling package payments only",
        invoices: normalizedPayments.filter((payment) => payment.kind === "session"),
      },
      emergency: {
        sosReady: true,
        helpline: "1800-599-0019",
        contact: req.user.emergencyContactPhone || req.user.phone || "Emergency contact not added",
        contactName: req.user.emergencyContactName || "",
        contactRelation: req.user.emergencyContactRelation || "",
      },
      quickActions: [
        { label: "Find a counsellor", href: "/counselling" },
        { label: "Open wellness resources", href: "/resources" },
        { label: "Track today's mood", href: "/wellness" },
      ],
    });
  })
);

app.put(
  "/api/users/me",
  asyncRoute(authRequired),
  body("username").optional().trim(),
  body("phone").optional().trim(),
  validate,
  asyncRoute(async (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const body = req.body || {};
    if (typeof body.username === "string" && body.username.trim()) {
      const uname = body.username.trim().toLowerCase();
      const exists = await User.findOne({ username: uname, _id: { $ne: user._id } });
      if (exists) {
        res.status(409).json({ error: "Username already taken" });
        return;
      }
      user.username = uname;
    }
    for (const key of ["phone", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "specialization", "location", "clinicName", "clinicAddress", "city", "education", "responseTime", "bio", "profilePhotoUrl", "meetLink", "linkedin"]) {
      if (typeof body[key] === "string") user[key] = body[key].trim();
    }
    if (typeof body.sessionPricing === "number" || (typeof body.sessionPricing === "string" && body.sessionPricing !== "")) {
      user.sessionPricing = Number(body.sessionPricing) || user.sessionPricing;
    }
    if (body.supportPlanPrices && typeof body.supportPlanPrices === "object") {
      user.supportPlanPrices = { ...(user.supportPlanPrices?.toObject?.() || user.supportPlanPrices || {}), ...body.supportPlanPrices };
      user.hasCustomSupportPlanPrices = true;
    }
    if (body.privacySettings && typeof body.privacySettings === "object") {
      user.privacySettings = { ...(user.privacySettings?.toObject?.() || user.privacySettings || {}), ...body.privacySettings };
    }
    if (body.notificationSettings && typeof body.notificationSettings === "object") {
      user.notificationSettings = { ...(user.notificationSettings?.toObject?.() || user.notificationSettings || {}), ...body.notificationSettings };
    }
    await user.save();
    res.json({ user: publicUser(user) });
  })
);

app.get(
  "/api/journals",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  asyncRoute(async (req, res) => {
    const userId = req.user.role === "admin" && req.query.userId ? req.query.userId : req.user._id;
    const journals = await Journal.find({ user: userId }).sort({ createdAt: -1 });
    res.json(journals.map(normalizeJournal));
  })
);

app.post(
  "/api/journals",
  asyncRoute(authRequired),
  requireRoles("user"),
  body("content").trim().isLength({ min: 1 }).withMessage("Journal content is required").escape(),
  body("title").optional().trim().escape(),
  body("mood").optional().trim().escape(),
  body("gratitude").optional().trim().escape(),
  body("trigger").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const sharedWithCounsellor = Boolean(req.body?.sharedWithCounsellor);
    const content = String(req.body?.content || "").trim();
    const entry = await Journal.create({
      user: req.user._id,
      title: String(req.body?.title || "Private journal entry").trim().slice(0, 80) || "Private journal entry",
      content,
      mood: String(req.body?.mood || "").trim(),
      gratitude: String(req.body?.gratitude || "").trim(),
      trigger: String(req.body?.trigger || "").trim(),
      sharedWithCounsellor,
      sharedAt: sharedWithCounsellor ? new Date() : undefined,
    });
    if (sharedWithCounsellor) {
      const appointments = await Appointment.find({ student: req.user._id, status: { $in: ["confirmed", "completed"] } }).distinct("counsellor");
      const packages = await UserPackage.find({ user: req.user._id, counsellor: { $ne: null } }).distinct("counsellor");
      const counsellorIds = [...new Set([...appointments.map(String), ...packages.map(String)])];
      for (const counsellorId of counsellorIds) {
        await createNotification({
          user: counsellorId,
          type: "journal",
          title: "Shared journal entry",
          message: `${req.user.name} shared a journal entry for counsellor review.`,
        });
      }
    }
    res.status(201).json(normalizeJournal(entry));
  })
);

app.patch(
  "/api/journals/:id",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  body("content").optional().trim().escape(),
  body("title").optional().trim().escape(),
  body("mood").optional().trim().escape(),
  body("gratitude").optional().trim().escape(),
  body("trigger").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const query = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
    const entry = await Journal.findOne(query);
    if (!entry) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }
    if ("sharedWithCounsellor" in (req.body || {})) {
      entry.sharedWithCounsellor = Boolean(req.body.sharedWithCounsellor);
      entry.sharedAt = entry.sharedWithCounsellor ? new Date() : undefined;
    }
    for (const key of ["title", "content", "mood", "gratitude", "trigger"]) {
      if (key in (req.body || {})) entry[key] = String(req.body[key] || "").trim();
    }
    await entry.save();
    res.json(normalizeJournal(entry));
  })
);
}
