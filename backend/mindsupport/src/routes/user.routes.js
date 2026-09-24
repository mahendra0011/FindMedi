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
    // U-1: bridge FindMedi _id <-> mind_users _id via email so merged-mode
    // patient dashboards are never empty. All user-scoped queries use $in.
    const userIds = [req.user._id];
    try {
      if (req.user?.email) {
        const mindSelf = await User.findOne({ email: req.user.email }).select("_id").lean();
        if (mindSelf && String(mindSelf._id) !== String(req.user._id)) userIds.push(mindSelf._id);
      }
    } catch { /* keep findId only */ }
    const userFilter = { $in: userIds };
    const [appointments, moods, latestAssessment, resources, counsellors, journals, messages, payments, notifications, packages] = await Promise.all([
      Appointment.find({ student: userFilter }).sort({ date: 1, time: 1 }).populate("counsellor", "name email phone specialization clinicName clinicAddress clinicMapLink city"),
      MoodEntry.find({ user: userFilter }).sort({ date: -1 }).limit(14),
      Assessment.findOne({ user: userFilter }).sort({ createdAt: -1 }),
      Resource.find().sort({ createdAt: -1 }).limit(6),
      User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ name: 1 }).limit(8),
      Journal.find({ user: userFilter }).sort({ createdAt: -1 }).limit(8),
      Message.find({ deletedAt: null, $or: [{ from: userFilter }, { to: userFilter }] })
        .sort({ createdAt: -1 })
        .limit(80)
        .populate("from to appointment")
        .populate({ path: "replyTo", populate: { path: "from", select: "name username" } }),
      Payment.find({ user: userFilter }).sort({ createdAt: -1 }).limit(8),
      Notification.find({ $or: [{ user: userFilter }, { audienceRole: { $in: ["user", "all"] } }] }).sort({ createdAt: -1 }).limit(8),
      UserPackage.find({ user: userFilter }).sort({ createdAt: -1 }).populate("counsellor", "name email"),
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
    // U-6: no assessment → null (never a healthy-looking default). UI renders 0/"Not started".
    const sleepQualityScore = phq9SleepScore != null ? Math.round(Math.max(1, 10 - phq9SleepScore * 2.5)) : null;
    const gad7TotalScore = latestGad7 ? latestGad7.score : null;
    const anxietyScore = gad7TotalScore != null ? Math.round(Math.max(1, Math.min(10, 10 - (gad7TotalScore - 5) * 0.5))) : null;

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
        sleep: avgMood > 0 ? sleepQualityScore : null,
        anxiety: avgMood > 0 ? anxietyScore : null,
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
        moodScore: moods[0]?.mood || null,
        wellnessStreak,
        unreadMessages: normalizedMessages.filter((message) => message.unread).length,
        // U-7: tip is derived from real state, never a static string pretending insight.
        dailyTip: (() => {
          if (moods.length === 0) return "Welcome! Log your first mood check-in to start tracking your journey.";
          const last = moods[0]?.mood;
          if (last != null && last <= 2) return "Low patch? Consider journaling what's weighing on you, or reach out to your counsellor.";
          if (upcoming.length > 0) return `You have ${upcoming.length} upcoming session${upcoming.length > 1 ? "s" : ""} — note one thing you'd like to discuss.`;
          if (wellnessStreak >= 3) return `${wellnessStreak}-day check-in streak — consistency builds insight. Keep going.`;
          return "Take two minutes today to breathe slowly and name one thing you handled well.";
        })(),
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
        // U-6: never invent social proof — real values or empty (UI shows "New").
        rating: counsellor.reviews > 0 ? counsellor.rating : null,
        reviews: counsellor.reviews || 0,
        availability: counsellor.availability?.length ? counsellor.availability : [],
        categories: counsellor.categories?.length ? counsellor.categories : [],
        nextSlot: null,
      })),
      analytics: {
        weeklyMood: weeklyMoodData,
        emotionalStability,
        therapyProgress,
        sleepQuality: sleepQualityScore != null ? sleepQualityScore * 10 : null,
        hasAssessment: Boolean(latestPhq9 || latestGad7),
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
    // Section-10 provider settings master (allow-listed)
    if (body.providerSettings && typeof body.providerSettings === "object") {
      const ps = body.providerSettings;
      const next = { ...(user.providerSettings?.toObject?.() || user.providerSettings || {}) };
      if (typeof ps.crisisStandby === "boolean") next.crisisStandby = ps.crisisStandby;
      if (["full_24h", "half_4_24h", "none_4h", "full_12h", "none_2h"].includes(ps.refundPolicy)) next.refundPolicy = ps.refundPolicy;
      if (ps.decompressionGapMin !== undefined && Number(ps.decompressionGapMin) >= 0 && Number(ps.decompressionGapMin) <= 60) next.decompressionGapMin = Number(ps.decompressionGapMin);
      if (typeof ps.rciNumber === "string") next.rciNumber = ps.rciNumber.trim().slice(0, 40);
      if (typeof ps.nmcRegNumber === "string") next.nmcRegNumber = ps.nmcRegNumber.trim().slice(0, 40);
      if (typeof ps.notesLock === "boolean") next.notesLock = ps.notesLock;
      if (typeof ps.sealUrl === "string") next.sealUrl = ps.sealUrl.trim().slice(0, 500);
      if (typeof ps.scheduleXRestricted === "boolean") next.scheduleXRestricted = ps.scheduleXRestricted;
      for (const k of ["intakeFee", "rxReviewFee", "emergencyTriageFee"]) {
        if (ps[k] !== undefined && Number(ps[k]) >= 0) next[k] = Number(ps[k]);
      }
      if (ps.payoutBank && typeof ps.payoutBank === "object") {
        next.payoutBank = { ...(next.payoutBank || {}) };
        for (const k of ["accountHolder", "accountNumber", "ifsc", "upiId"]) {
          if (typeof ps.payoutBank[k] === "string") next.payoutBank[k] = ps.payoutBank[k].trim().slice(0, 60);
        }
        if (typeof ps.payoutBank.verified === "boolean") next.payoutBank.verified = ps.payoutBank.verified;
      }
      user.providerSettings = next;
    }
    if (typeof body.licenseNumber === "string") user.licenseNumber = body.licenseNumber.trim().slice(0, 40);
    const updated = await User.findByIdAndUpdate(user._id, { $set: user }, { new: true }).catch(() => null);
    res.json({ user: publicUser(updated || user) });
  })
);

// U-1/U-10: all ids this caller may own (merged-mode FindMedi + mind).
async function resolveMyIds(req) {
  const ids = [req.user._id];
  try {
    if (req.user?.email && User) {
      const mindSelf = await User.findOne({ email: req.user.email }).select("_id").lean().catch(() => null);
      if (mindSelf && String(mindSelf._id) !== String(req.user._id)) ids.push(mindSelf._id);
    }
  } catch { /* ignore */ }
  return ids;
}

app.get(
  "/api/journals",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  asyncRoute(async (req, res) => {
    const userId = req.user.role === "admin" && req.query.userId
      ? req.query.userId
      : { $in: await resolveMyIds(req) };
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
      // U-10: dual-id so booked counsellors resolve in merged mode and get notified.
      const myIds = await resolveMyIds(req);
      const appointments = await Appointment.find({ student: { $in: myIds }, status: { $in: ["confirmed", "completed"] } }).distinct("counsellor");
      const packages = await UserPackage.find({ user: { $in: myIds }, counsellor: { $ne: null } }).distinct("counsellor");
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
    const query = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, user: { $in: await resolveMyIds(req) } };
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
