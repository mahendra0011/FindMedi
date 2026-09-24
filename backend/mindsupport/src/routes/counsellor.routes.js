import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerCounsellorRoutes(app, context) {
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
  "/api/counsellor/dashboard",
  asyncRoute(authRequired),
  requireRoles("counsellor", "psychiatrist"),
  asyncRoute(async (req, res) => {
    // B6-3: bridge FindMedi _id <-> mind_users _id via email so merged-mode
    // dashboards are never empty. Query with $in [findId, mindId].
    const providerIds = [req.user._id];
    try {
      if (req.user?.email) {
        const mindSelf = await User.findOne({ email: req.user.email }).select("_id").lean();
        if (mindSelf && String(mindSelf._id) !== String(req.user._id)) providerIds.push(mindSelf._id);
      }
    } catch { /* keep findId only */ }
    const providerFilter = { $in: providerIds };
    const [appointments, approvedReviews, messages, notifications, allPackages] = await Promise.all([
      Appointment.find({ counsellor: providerFilter }).sort({ date: 1, time: 1 }).populate("student", "name email phone"),
      Review.find({ counsellor: providerFilter, status: "approved" }).sort({ createdAt: -1 }).limit(10).populate("student counsellor appointment"),
      Message.find({ deletedAt: null, $or: [{ from: providerFilter }, { to: providerFilter }] })
        .sort({ createdAt: -1 })
        .limit(80)
        .populate("from to appointment")
        .populate({ path: "replyTo", populate: { path: "from", select: "name username" } }),
      Notification.find({ $or: [{ user: providerFilter }, { audienceRole: { $in: ["counsellor", "all"] } }] }).sort({ createdAt: -1 }).limit(8),
      UserPackage.find({ counsellor: providerFilter }).sort({ createdAt: -1 }).populate("user", "name email phone"),
    ]);
    const today = todayYMD();
    const studentIds = new Set(appointments.map((a) => String(a.student?._id || a.student)).filter(Boolean));
    const studentIdList = [...studentIds].filter((id) => mongoose.isValidObjectId(id));
    const [moodEntries, assessments, sharedJournals] = await Promise.all([
      MoodEntry.find({ user: { $in: studentIdList } }).sort({ createdAt: -1 }).limit(studentIdList.length * 5 || 1),
      Assessment.find({ user: { $in: studentIdList } }).sort({ createdAt: -1 }).limit(studentIdList.length * 5 || 1),
      Journal.find({ user: { $in: studentIdList }, sharedWithCounsellor: true }).sort({ createdAt: -1 }).limit(studentIdList.length * 5 || 1),
    ]);
    const latestMoodByUser = new Map();
    moodEntries.forEach((entry) => {
      const userId = String(entry.user);
      if (!latestMoodByUser.has(userId)) latestMoodByUser.set(userId, entry);
    });
    const latestAssessmentByUser = new Map();
    assessments.forEach((entry) => {
      const userId = String(entry.user);
      if (!latestAssessmentByUser.has(userId)) latestAssessmentByUser.set(userId, entry);
    });
    const journalByUser = new Map();
    sharedJournals.forEach((entry) => {
      const userId = String(entry.user);
      const current = journalByUser.get(userId) || { count: 0, latest: null };
      journalByUser.set(userId, { count: current.count + 1, latest: current.latest || entry });
    });
    const patientMap = new Map();
    appointments.forEach((appointment) => {
      const normalized = normalizeAppointment(appointment, req.user);
      const studentId = String(appointment.student?._id || appointment.student || normalized.studentEmail || normalized.studentName);
      if (!studentId) return;
      const existing =
        patientMap.get(studentId) || {
          id: studentId,
          name: normalized.studentName || appointment.student?.name || "Student",
          email: normalized.studentEmail || appointment.student?.email || "",
          phone: appointment.student?.phone || "",
          sessions: [],
          plans: new Map(),
          modes: {},
          totalSessions: 0,
          completedSessions: 0,
          pendingSessions: 0,
          confirmedSessions: 0,
          cancelledSessions: 0,
          declinedSessions: 0,
        };
      existing.sessions.push(normalized);
      existing.totalSessions += 1;
      existing.modes[normalized.mode || "unknown"] = (existing.modes[normalized.mode || "unknown"] || 0) + 1;
      if (normalized.status === "completed") existing.completedSessions += 1;
      if (normalized.status === "pending") existing.pendingSessions += 1;
      if (normalized.status === "confirmed") existing.confirmedSessions += 1;
      if (normalized.status === "cancelled") existing.cancelledSessions += 1;
      if (normalized.status === "declined") existing.declinedSessions += 1;
      const planName = normalized.supportPlanName || "Counselling sessions";
      const plan = existing.plans.get(planName) || {
        name: planName,
        duration: normalized.supportPlanDuration || "",
        cadence: normalized.supportPlanCadence || "",
        bestFor: normalized.supportPlanBestFor || [],
        total: 0,
        completed: 0,
        active: 0,
      };
      plan.total += 1;
      if (normalized.status === "completed") plan.completed += 1;
      if (["pending", "confirmed"].includes(normalized.status)) plan.active += 1;
      existing.plans.set(planName, plan);
      patientMap.set(studentId, existing);
    });
    const packageMap = new Map();
    allPackages.forEach((pkg) => {
      const uid = String(pkg.user?._id || pkg.user);
      if (!uid) return;
      const current = packageMap.get(uid) || [];
      current.push({
        id: String(pkg._id),
        planId: pkg.planId,
        planName: pkg.planName,
        sessionsTotal: pkg.sessionsTotal,
        sessionsUsed: pkg.sessionsUsed,
        sessionsRemaining: Math.max(0, pkg.sessionsTotal - pkg.sessionsUsed),
        status: pkg.status,
        expiryDate: pkg.expiryDate,
        progress: pkg.sessionsTotal > 0 ? Math.round((pkg.sessionsUsed / pkg.sessionsTotal) * 100) : 0,
      });
      packageMap.set(uid, current);
    });
    const patients = [...patientMap.values()].map((patient, index) => {
      const orderedSessions = patient.sessions.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      const upcomingSessions = orderedSessions.filter((item) => ["pending", "confirmed"].includes(item.status));
      const completed = orderedSessions.filter((item) => item.status === "completed");
      const activePlan = [...patient.plans.values()].find((plan) => plan.active > 0) || [...patient.plans.values()][0] || {};
      const latestMood = latestMoodByUser.get(patient.id);
      const latestAssessment = latestAssessmentByUser.get(patient.id);
      const journalInfo = journalByUser.get(patient.id) || { count: 0, latest: null };
      const attendanceBase = patient.totalSessions - patient.cancelledSessions - patient.declinedSessions;
      const attendance = attendanceBase ? Math.round((patient.completedSessions / attendanceBase) * 100) : 0;
      // B6-8: no 12% floor, no default mood — null when there is no signal.
      const hasSignal = attendanceBase > 0 || latestMood;
      const progress = hasSignal
        ? Math.min(100, Math.round((attendance + (latestMood ? (Number(latestMood.mood) / 5) * 100 : attendance)) / 2))
        : null;
      return {
        ...patient,
        plans: [...patient.plans.values()],
        activePlanName: activePlan.name || "Counselling sessions",
        activePlanDuration: activePlan.duration || "",
        activePlanCadence: activePlan.cadence || "",
        activePlanBestFor: activePlan.bestFor || [],
        therapyHistory: `${patient.completedSessions}/${patient.totalSessions} sessions completed`,
        moodReport: latestMood ? `${latestMood.mood}/5 mood` : null,
        latestMood: latestMood?.mood || null,
        latestSleepQuality: latestMood?.sleepQuality || null,
        latestStressLevel: latestMood?.stressLevel || null,
        latestAnxietyLevel: latestMood?.anxietyLevel || null,
        latestAssessmentLevel: latestAssessment?.level || "",
        latestAssessmentScore: latestAssessment?.score || null,
        sharedJournalCount: journalInfo.count,
        latestJournalTitle: journalInfo.latest?.title || "",
        latestJournalExcerpt: journalInfo.latest?.content ? String(journalInfo.latest.content).slice(0, 140) : "",
        progress,
        attendance,
        risk: latestAssessment?.level || ["low", "moderate", "low", "high"][index % 4],
        nextSession: upcomingSessions[0] || null,
        lastSession: completed[completed.length - 1] || orderedSessions[orderedSessions.length - 1] || null,
        modeBreakdown: Object.entries(patient.modes).map(([mode, count]) => ({ mode, count })),
        sessions: orderedSessions,
        crisisFlag: patient.sessions.some((s) => s.crisisFlag),
        crisisMessage: patient.sessions.find((s) => s.crisisMessage)?.crisisMessage || "",
        packages: packageMap.get(patient.id) || [],
      };
    });
    const sessionRevenue = appointments
      .filter((appointment) => appointment.status === "completed")
      .reduce((sum, appointment) => sum + (Number(appointment.supportPlanPrice) || Number(req.user.sessionPricing) || 700), 0);
    const platformFee = Math.round(sessionRevenue * 0.02);
    const counsellorPayout = Math.max(0, sessionRevenue - platformFee);

    const completedAppointmentIds = appointments
      .filter((a) => a.status === "completed")
      .map((a) => a._id);
    const packageIds = allPackages.map((p) => p._id);
    const paymentFilters = [];
    if (completedAppointmentIds.length) paymentFilters.push({ appointment: { $in: completedAppointmentIds } });
    if (packageIds.length) paymentFilters.push({ packageId: { $in: packageIds } });

    const payments = paymentFilters.length
      ? await Payment.find({ $or: paymentFilters })
          .populate("user", "name email avatar")
          .sort({ createdAt: -1 })
      : [];

    const packageRevenueThisMonth = allPackages.reduce((sum, pkg) => {
      const created = new Date(pkg.createdAt);
      const now = new Date();
      if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth() && pkg.status !== "cancelled") {
        return sum + (Number(pkg.price) || 0);
      }
      return sum;
    }, 0);

    const oneTimeRevenueThisMonth = payments
      .filter((p) => {
        const d = new Date(p.paidAt || p.createdAt);
        const now = new Date();
        const isCurrentMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        const isSessionPayment = p.kind === "session" || (p.plan && !String(p.plan).toLowerCase().includes("package"));
        return isCurrentMonth && isSessionPayment && p.status === "paid";
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const nowTime = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const activePackagesList = allPackages.filter((p) => p.status === "active");
    const expiringSoonPackagesList = activePackagesList.filter((p) => {
      if (!p.expiryDate) return false;
      const diff = new Date(p.expiryDate).getTime() - nowTime;
      return diff > 0 && diff <= sevenDaysMs;
    });
    const sessionsRemainingTotal = activePackagesList.reduce(
      (sum, p) => sum + Math.max(0, (p.sessionsTotal || 0) - (p.sessionsUsed || 0)),
      0
    );

    const packageSummary = {
      activeCount: activePackagesList.length,
      expiringSoonCount: expiringSoonPackagesList.length,
      sessionsRemainingTotal,
      packageRevenueThisMonth,
      oneTimeRevenueThisMonth,
      totalRevenueThisMonth: packageRevenueThisMonth + oneTimeRevenueThisMonth,
      totalPackagesCount: allPackages.length,
    };
    const transactions = payments.map((p) => ({
      id: String(p._id),
      invoiceNumber: p.invoiceNumber,
      amount: p.amount,
      platformFee: p.platformFee,
      counsellorPayout: p.counsellorPayout,
      status: p.status,
      date: p.paidAt || p.createdAt,
      patientName: p.user?.name || "Unknown",
      patientAvatar: p.user?.avatar || null,
      plan: p.plan,
    }));
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyMap = {};
    payments.forEach((p) => {
      const d = new Date(p.paidAt || p.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, platformFee: 0 };
      monthlyMap[key].revenue += p.amount;
      monthlyMap[key].platformFee += p.platformFee;
    });
    let monthly = Object.entries(monthlyMap).slice(-6).map(([key, val]) => {
      const [, monthIdx] = key.split("-").map(Number);
      return {
        month: monthNames[monthIdx] || "N/A",
        revenue: val.revenue,
        payout: val.revenue - val.platformFee,
        platformFee: val.platformFee,
      };
    });
    if (monthly.length === 0) {
      const currentMonth = monthNames[new Date().getMonth()] || "N/A";
      monthly = [{ month: currentMonth, revenue: 0, payout: 0, platformFee: 0 }];
    }
    const avgAttendance = patients.length > 0
      ? Math.round(patients.reduce((s, p) => s + (p.attendance || 0), 0) / patients.length)
      : 0;
    const allPatientMoods = moodEntries.map((m) => m.mood).filter((v) => v >= 1 && v <= 5);
    const avgMood = allPatientMoods.length > 0
      ? Math.round((allPatientMoods.reduce((s, v) => s + v, 0) / allPatientMoods.length) * 20)
      : 0;
    const latestGad7Scores = [...latestAssessmentByUser.values()].filter((a) => a.type === "gad7").map((a) => a.score);
    const avgGad7 = latestGad7Scores.length > 0
      ? Math.round((1 - (latestGad7Scores.reduce((s, v) => s + v, 0) / latestGad7Scores.length) / 21) * 100)
      : null;
    const avgProgress = patients.length > 0
      ? Math.round(patients.reduce((s, p) => s + (p.progress || 0), 0) / patients.length)
      : 0;
    // B6-11: never advertise the platform shared room as the counsellor's own.
    const hasOwnMeetLink = Boolean((req.user.meetLink || "").trim());
    // B6-6: pending = only unpaid/pending payments, never lifetime total.
    const pendingPayoutAmount = payments
      .filter((p) => ["pending", "unpaid", "processing"].includes(String(p.status || "").toLowerCase()))
      .reduce((s, p) => s + (Number(p.counsellorPayout) || 0), 0);
    res.json({
      profile: publicUser(req.user),
      stats: {
        todaySessions: appointments.filter((a) => a.date === today && activeStatuses.includes(a.status)).length,
        pendingRequests: appointments.filter((a) => a.status === "pending").length,
        activeClients: studentIds.size,
        googleMeetReady: hasOwnMeetLink,
        hasOwnMeetLink,
        earnings: counsellorPayout,
        pendingPayouts: pendingPayoutAmount,
        rating: typeof req.user.rating === "number" ? req.user.rating : null,
        ratingCount: req.user.ratingCount || approvedReviews.length || 0,
        unreadMessages: messages.map((message) => normalizeMessage(message, req.user)).filter((message) => message.unread).length,
      },
      appointments: await normalizeAppointmentsWithReviewStatus(appointments, req.user),
      patients,
      allPackages: allPackages.map((pkg) => ({
        id: String(pkg._id),
        userId: String(pkg.user?._id || pkg.user),
        userName: pkg.user?.name || "Patient",
        userEmail: pkg.user?.email || "",
        userPhone: pkg.user?.phone || "",
        planId: pkg.planId,
        planName: pkg.planName,
        sessionsTotal: pkg.sessionsTotal,
        sessionsUsed: pkg.sessionsUsed,
        sessionsRemaining: Math.max(0, pkg.sessionsTotal - pkg.sessionsUsed),
        status: pkg.status,
        expiryDate: pkg.expiryDate,
        price: pkg.price,
        mode: pkg.mode,
        minCadenceDays: pkg.minCadenceDays || 0,
        lastSessionDate: pkg.lastSessionDate,
        createdAt: pkg.createdAt,
        progress: pkg.sessionsTotal > 0 ? Math.round((pkg.sessionsUsed / pkg.sessionsTotal) * 100) : 0,
      })),
      packageSummary,
      progress: [
        { label: "Mood improvement", value: avgMood },
        { label: "Anxiety reduction", value: avgGad7 },
        { label: "Session attendance", value: avgAttendance },
        { label: "Recovery progress", value: avgProgress },
      ],
      messages: messages.map((message) => normalizeMessage(message, req.user)),
      earnings: {
        total: counsellorPayout,
        sessionRevenue,
        platformFees: platformFee,
        pendingPayouts: pendingPayoutAmount,
        platformCommissionRate: 2,
        monthly,
        transactions,
      },
      reviews: approvedReviews.map((review) => normalizeReview(review, req.user)),
      // B6-7: never invent notifications — empty means empty.
      notifications: notifications.map(normalizeNotification),
      actions: [
        "Confirm pending requests",
        "Add a Google Meet link before online sessions",
        "Mark completed sessions after follow-up notes are saved",
      ],
    });
  })
);

app.put(
  "/api/counsellor/availability",
  asyncRoute(authRequired),
  requireRoles("counsellor", "psychiatrist"),
  body("meetLink").optional().trim(),
  validate,
  asyncRoute(async (req, res) => {
    req.user.availability = Array.isArray(req.body?.availability) ? req.body.availability : req.user.availability;
    if (Array.isArray(req.body?.unavailableDates)) {
      req.user.unavailableDates = req.body.unavailableDates
        .map((item) => String(item || "").trim())
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
    }
    if (typeof req.body?.bookingEnabled === "boolean") {
      req.user.bookingEnabled = req.body.bookingEnabled;
    }
    if (req.body?.privacySettings) {
      req.user.privacySettings = { ...(req.user.privacySettings?.toObject?.() || req.user.privacySettings || {}), ...req.body.privacySettings };
    }
    if (req.body?.notificationSettings) {
      req.user.notificationSettings = { ...(req.user.notificationSettings?.toObject?.() || req.user.notificationSettings || {}), ...req.body.notificationSettings };
    }
    if (typeof req.body?.meetLink === "string") {
      const meetLink = normalizeMeetLink(req.body.meetLink);
      if (req.body.meetLink.trim() && !meetLink) {
        res.status(400).json({ error: "Paste a reusable Google Meet room link, not https://meet.google.com/new." });
        return;
      }
      req.user.meetLink = meetLink;
    }
    const updated = await User.findByIdAndUpdate(req.user._id, { $set: req.user }, { new: true }).catch(() => null);
    res.json({ user: publicUser(updated || req.user) });
  })
);

app.put(
  "/api/counsellor/packages",
  asyncRoute(authRequired),
  requireRoles("counsellor", "psychiatrist"),
  body("packages").isArray({ min: 1 }).withMessage("Packages must be a non-empty array"),
  validate,
  asyncRoute(async (req, res) => {
    const packages = req.body?.packages;
    req.user.customPackages = packages.map((pkg) => ({
      id: String(pkg.id || "").toLowerCase().replace(/\s+/g, "-"),
      name: String(pkg.name || "").trim(),
      summary: String(pkg.summary || "").trim(),
      duration: String(pkg.duration || "").trim(),
      cadence: String(pkg.cadence || "").trim(),
      bestFor: Array.isArray(pkg.bestFor) ? pkg.bestFor : [],
      price: Number(pkg.price) || 0,
      sessionCount: Math.max(1, Number(pkg.sessionCount) || 1),
      theme: pkg.theme || "default",
      isActive: pkg.isActive !== false,
    }));
    req.user.hasCustomSupportPlanPrices = true;
    await User.findByIdAndUpdate(req.user._id, { $set: { customPackages: req.user.customPackages, hasCustomSupportPlanPrices: true } }).catch(() => null);
    res.json({ customPackages: req.user.customPackages });
  })
);

app.post(
  "/api/meet/create",
  asyncRoute(authRequired),
  requireRoles("counsellor", "psychiatrist", "admin"),
  body("appointmentId").notEmpty().withMessage("Appointment ID is required"),
  validate,
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.body?.appointmentId);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!canAccessAppointment(req.user, appointment)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const meetingLink = resolveSharedMeetLink(appointment.meetingLink, req.body?.meetingLink, req.user.meetLink, buildMeetLink());
    if (!meetingLink) {
      res.status(400).json({
        error: "Add a real Google Meet room link in Settings first. https://meet.google.com/new creates separate rooms.",
      });
      return;
    }
    appointment.mode = "google-meet";
    appointment.meetingProvider = "google-meet";
    appointment.meetingLink = meetingLink;
    if (appointment.status === "pending") appointment.status = "confirmed";
    await appointment.save();
    res.json({
      appointment: normalizeAppointment(await appointment.populate("student counsellor"), req.user),
      meetingLink: appointment.meetingLink,
      provider: "google-meet",
    });
  })
);
}
