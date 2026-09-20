import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerAdminRoutes(app, context) {
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
    SupportPackage,
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

app.post(
  "/api/admin/notifications",
  body("message").trim().isLength({ min: 1 }).withMessage("Announcement message is required").escape(),
  validate,
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "Announcement message is required" });
      return;
    }
    const audienceRole = ["user", "counsellor", "admin", "all"].includes(req.body?.audienceRole) ? req.body.audienceRole : "all";
    const notification = await createNotification({
      audienceRole,
      type: "announcement",
      title: String(req.body?.title || "MindSupport announcement").trim(),
      message,
    });
    res.status(201).json(normalizeNotification(notification));
  })
);

app.get(
  "/api/admin/dashboard",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const [
      roleAgg,
      statusAgg,
      appointmentAgg,
      modeAgg,
      openReports,
      resources,
      recentUsers,
      counsellors,
      totalSessions,
      activeCounsellors,
      counsellorApplications,
      pendingApplications,
      reviews,
      lowRatedCounsellors,
      paymentAgg,
      adminNotifications,
      emergencyNotifications,
    ] =
      await Promise.all([
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Appointment.aggregate([{ $group: { _id: "$mode", count: { $sum: 1 } } }]),
        PeerReport.countDocuments({ status: { $ne: "closed" } }),
        Resource.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(8),
        User.find({ role: "counsellor" }).sort({ name: 1 }),
        Appointment.countDocuments(),
        User.countDocuments({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }),
        CounsellorApplication.find().sort({ createdAt: -1 }).limit(20).populate("user", "name email role status"),
        CounsellorApplication.countDocuments({ status: { $in: ["pending", "reviewing"] } }),
        Review.find().sort({ createdAt: -1 }).limit(30).populate("student counsellor appointment"),
        User.find({ role: "counsellor", reviews: { $gte: 1 }, rating: { $lt: 3.5 } }).sort({ rating: 1 }).limit(8),
        Payment.aggregate([
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
              platformFee: { $sum: "$platformFee" },
              counsellorPayout: { $sum: "$counsellorPayout" },
            },
          },
        ]),
        Notification.find({ audienceRole: { $in: ["admin", "all"] } }).sort({ createdAt: -1 }).limit(8),
        Notification.find({ type: "emergency", audienceRole: { $in: ["admin", "all"] } }).sort({ createdAt: -1 }).limit(12),
      ]);
    const toMap = (items) => Object.fromEntries(items.map((item) => [item._id || "unknown", item.count]));
    const usersByRole = toMap(roleAgg);
    const revenue = paymentAgg[0] || {};
    const totalRevenue = revenue.amount || 0;
    const platformRevenue = revenue.platformFee || 0;
    const counsellorPayouts = revenue.counsellorPayout || 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function monthKey(d) { return `${d.getFullYear()}-${d.getMonth()}`; }
    function fillMonths(entries, keyFn, valFn) {
      const map = {};
      entries.forEach((e) => { const k = monthKey(keyFn(e)); map[k] = (map[k] || 0) + valFn(e); });
      const result = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(sixMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const k = monthKey(d);
        result.push({ month: monthNames[d.getMonth()], value: map[k] || 0 });
      }
      return result;
    }

    const [userGrowthData, sessionTrendsData, revenueTrendsData, assessmentCounts] = await Promise.all([
      User.find({ createdAt: { $gte: sixMonthsAgo } }).select("createdAt").lean(),
      Appointment.find({ createdAt: { $gte: sixMonthsAgo }, status: "completed" }).select("createdAt").lean(),
      Payment.find({ createdAt: { $gte: sixMonthsAgo } }).select("amount createdAt").lean(),
      Assessment.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    ]);

    const userGrowth = fillMonths(userGrowthData, (u) => u.createdAt, () => 1);
    const sessionTrends = fillMonths(sessionTrendsData, (a) => a.createdAt, () => 1);
    const revenueTrends = fillMonths(revenueTrendsData, (p) => p.createdAt, (p) => p.amount);

    const demandMap = { "gad7": "Anxiety", "phq9": "Depression" };
    const demand = assessmentCounts.length > 0
      ? assessmentCounts.map((a) => ({ category: demandMap[a._id] || a._id, value: a.count }))
      : [{ category: "Anxiety", value: 0 }, { category: "Depression", value: 0 }];

    res.json({
      stats: {
        usersByRole,
        usersByStatus: toMap(statusAgg),
        appointmentsByStatus: toMap(appointmentAgg),
        appointmentsByMode: toMap(modeAgg),
        openReports,
        resources,
        totalUsers: Object.values(usersByRole).reduce((sum, value) => sum + value, 0),
        activeCounsellors,
        pendingApplications,
        totalSessions,
        revenue: totalRevenue,
        emergencyAlerts: emergencyNotifications.length + openReports,
        reviewModeration: reviews.filter((review) => review.status === "flagged" || Number(review.averageRating) <= 2).length,
        lowRatedCounsellors: lowRatedCounsellors.length,
      },
      recentUsers: recentUsers.map(publicUser),
      counsellors: counsellors.map(publicUser),
      counsellorApplications: counsellorApplications.map(normalizeApplication),
      lowRatedCounsellors: lowRatedCounsellors.map(publicUser),
      analytics: { userGrowth, sessionTrends, revenueTrends, demand },
      revenue: {
        platformRevenue,
        counsellorPayouts,
        planRevenue: totalRevenue,
        platformCommissionRate: 2,
        refundRequests: 3,
      },
      notifications: adminNotifications.map(normalizeNotification),
      emergency: emergencyNotifications.length
        ? emergencyNotifications.map((notification) => {
            const normalized = normalizeNotification(notification);
            const meta = normalized.metadata || {};
            return {
              id: meta.emergencyId || normalized.id,
              source: meta.source || "wellness",
              userName: meta.userName || normalized.title || "Unknown",
              userEmail: meta.userEmail || "",
              contact: meta.contact || "",
              status: normalized.read ? "reviewed" : "open",
              time: normalized.time,
              message: normalized.message,
            };
          })
        : [],
      reviews: reviews.map((review) => normalizeReview(review, req.user)),
      activityLogs: [
        "Admin login verified with JWT",
        "Counsellor license reviewed",
        "User account activated",
        "System announcement queued",
      ],
      insights: [
        "Review suspended or pending accounts before peak counselling hours.",
        "Keep at least one counsellor available for Google Meet sessions each day.",
        "Open peer reports should be resolved before they age beyond 24 hours.",
      ],
    });
  })
);

app.get(
  "/api/admin/users",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const query = {};
    if (req.query.role) query.role = normalizeRole(req.query.role);
    if (req.query.status) query.status = String(req.query.status);
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  })
);

app.post(
  "/api/admin/users",
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("name").trim().isLength({ min: 1 }).withMessage("Name is required").escape(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  validate,
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const { name, email, password, specialization } = req.body || {};
    const role = normalizeRole(req.body?.role);
    if (!["user", "counsellor"].includes(role)) {
      res.status(400).json({ error: "Admin accounts must be created manually outside public/admin forms" });
      return;
    }
    const status = req.body?.status || (role === "counsellor" ? "approved" : "active");
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      status,
      specialization: role === "counsellor" ? specialization || "General counselling" : "",
      meetLink: role === "counsellor" ? buildMeetLink() : "",
      verificationStatus: role === "counsellor" ? "approved" : "none",
      verificationBadge: role === "counsellor" ? "Verified Professional" : "",
      counsellorType: role === "counsellor" ? "professional" : "",
    });
    res.status(201).json(publicUser(user));
  })
);

app.patch(
  "/api/admin/users/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  body("name").optional().trim().escape(),
  body("status").optional().isIn(["active", "suspended", "approved"]).withMessage("Invalid status"),
  body("role").optional().trim().escape(),
  body("specialization").optional().trim().escape(),
  body("licenseNumber").optional().trim().escape(),
  body("bio").optional().trim().escape(),
  body("meetLink").optional().trim(),
  body("verificationStatus").optional().trim().escape(),
  body("verificationBadge").optional().trim().escape(),
  body("counsellorType").optional().trim().escape(),
  body("sessionPricing").optional().isNumeric(),
  validate,
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const allowed = [
      "name",
      "status",
      "role",
      "specialization",
      "licenseNumber",
      "bio",
      "meetLink",
      "verificationStatus",
      "verificationBadge",
      "counsellorType",
      "sessionPricing",
      "supportPlanPrices",
      "hasCustomSupportPlanPrices",
      "platformCommission",
      "otpVerified",
    ];
    if ("role" in req.body && normalizeRole(req.body.role) === "admin") {
      res.status(400).json({ error: "Admin role changes must be handled manually" });
      return;
    }
    for (const key of allowed) {
      if (key in req.body) user[key] = key === "role" ? normalizeRole(req.body[key]) : req.body[key];
    }
    if ("availability" in req.body) user.availability = listFromInput(req.body.availability);
    if (req.body?.otpVerified === true && !user.otpVerifiedAt) user.otpVerifiedAt = new Date();
    await user.save();
    res.json(publicUser(user));
  })
);

app.delete(
  "/api/admin/users/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    if (String(req.user._id) === String(req.params.id)) {
      res.status(400).json({ error: "Admins cannot delete their own active account" });
      return;
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const affectedCounsellors = await Review.distinct("counsellor", {
      $or: [{ student: user._id }, { counsellor: user._id }],
    });
    await Promise.all([
      Journal.deleteMany({ user: user._id }),
      Message.deleteMany({ $or: [{ from: user._id }, { to: user._id }] }),
      Payment.deleteMany({ user: user._id }),
      Notification.deleteMany({ user: user._id }),
      OtpVerification.deleteMany({ user: user._id }),
      CounsellorApplication.deleteMany({ user: user._id }),
      Review.deleteMany({ $or: [{ student: user._id }, { counsellor: user._id }] }),
      Appointment.deleteMany({ $or: [{ student: user._id }, { counsellor: user._id }] }),
    ]);
    await User.findByIdAndDelete(user._id);
    await Promise.all(affectedCounsellors.filter((id) => String(id) !== String(user._id)).map(refreshCounsellorRating));
    res.json({ success: true, deletedUserId: String(user._id) });
  })
);

app.get(
  "/api/admin/counsellor-applications",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (_req, res) => {
    const applications = await CounsellorApplication.find().sort({ createdAt: -1 }).populate("user", "name email role status");
    res.json(applications.map(normalizeApplication));
  })
);

app.patch(
  "/api/admin/counsellor-applications/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  body("status").optional().isIn(["reviewing", "approved", "rejected"]).withMessage("Invalid status"),
  body("adminNotes").optional().trim().escape(),
  body("requestedType").optional().isIn(["professional", "mentor"]).withMessage("Invalid counsellor type"),
  validate,
  asyncRoute(async (req, res) => {
    const application = await CounsellorApplication.findById(req.params.id).populate("user");
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const nextStatus = ["reviewing", "approved", "rejected"].includes(req.body?.status) ? req.body.status : "reviewing";
    application.status = nextStatus;
    application.adminNotes = String(req.body?.adminNotes || application.adminNotes || "");
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();

    const applicant = application.user;
    if (nextStatus === "approved" && applicant) {
      const type = req.body?.requestedType === "professional" ? "professional" : application.requestedType;
      applicant.role = "counsellor";
      applicant.status = "approved";
      applicant.name = application.fullName || applicant.name;
      applicant.bio = application.bio;
      applicant.specialization = application.specialization;
      applicant.experience = application.experience;
      applicant.languages = application.languages;
      applicant.sessionPricing = application.sessionPricing;
      applicant.profilePhotoUrl = application.profilePhotoUrl;
      applicant.certificateLinks = application.certificateLinks;
      applicant.linkedin = application.linkedin;
      applicant.location = application.location || applicant.location;
      applicant.consultationModes = application.consultationModes?.length ? application.consultationModes : applicant.consultationModes;
      applicant.licenseNumber = application.licenseNumber;
      applicant.idVerification = `${application.idDocumentType}: ${application.idDocumentNumber}`;
      applicant.categories = application.categories;
      applicant.availability = application.availability?.length ? application.availability : ["Mon 10:00-13:00", "Wed 14:00-17:00"];
      applicant.counsellorType = type;
      applicant.verificationBadge = badgeForCounsellorType(type);
      applicant.verificationStatus = "approved";
      applicant.meetLink = applicant.meetLink || buildMeetLink();
      applicant.responseTime = application.responseTime || (type === "professional" ? "Fast Response" : "Within 24 hours");
      applicant.reviews = applicant.reviews || 0;
      await applicant.save();
    }

    if (nextStatus === "rejected" && applicant) {
      applicant.verificationStatus = "rejected";
      if (applicant.role !== "admin") applicant.role = "user";
      if (applicant.status !== "suspended") applicant.status = "active";
      await applicant.save();
    }

    await application.save();
    res.json(normalizeApplication(await application.populate("user", "name email role status")));
  })
);

app.get(
  "/api/admin/appointments",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const appointments = await Appointment.find().sort({ date: -1, time: -1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.get(
  "/api/admin/reviews",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const reviews = await Review.find().sort({ createdAt: -1 }).populate("student counsellor appointment");
    res.json(reviews.map((review) => normalizeReview(review, req.user)));
  })
);

app.patch(
  "/api/admin/reviews/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  body("status").optional().isIn(["pending", "approved", "flagged", "removed"]).withMessage("Invalid review status"),
  body("adminNotes").optional().trim().escape(),
  body("action").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const review = await Review.findById(req.params.id).populate("student counsellor appointment");
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    if (["approved", "flagged", "removed"].includes(req.body?.status)) {
      review.status = req.body.status;
    }
    if ("adminNotes" in (req.body || {})) {
      review.adminNotes = String(req.body.adminNotes || "");
    }
    await review.save();
    await refreshCounsellorRating(review.counsellor?._id || review.counsellor);
    if (req.body?.action === "suspend-counsellor" && review.counsellor) {
      review.counsellor.status = "suspended";
      await review.counsellor.save();
    }
    res.json(normalizeReview(review, req.user));
  })
);

app.get(
  "/api/admin/packages",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (_req, res) => {
    const packages = await SupportPackage.find().sort({ createdAt: -1 });
    res.json(packages);
  })
);

app.post(
  "/api/admin/packages",
  body("id").trim().isLength({ min: 1 }).withMessage("Package ID is required").escape(),
  body("name").trim().isLength({ min: 1 }).withMessage("Package name is required").escape(),
  body("summary").optional().trim().escape(),
  body("duration").optional().trim().escape(),
  body("cadence").optional().trim().escape(),
  validate,
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const { id, name, summary, duration, cadence, bestFor, defaultPrice, multiplier, sessionCount, isActive, theme } = req.body || {};
    if (!id || !name) {
      res.status(400).json({ error: "Package ID and name are required" });
      return;
    }
    const existing = await SupportPackage.findOne({ id });
    if (existing) {
      res.status(409).json({ error: "Package with this ID already exists" });
      return;
    }
    const pkg = await SupportPackage.create({
      id,
      name,
      summary: summary || "",
      duration: duration || "",
      cadence: cadence || "",
      bestFor: Array.isArray(bestFor) ? bestFor : [],
      defaultPrice: Number(defaultPrice) || 0,
      multiplier: Number(multiplier) || 1,
      sessionCount: Number(sessionCount) || 1,
      isActive: isActive !== false,
      theme: theme || "default",
    });
    res.status(201).json(pkg);
  })
);

app.patch(
  "/api/admin/packages/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  body("name").optional().trim().escape(),
  body("summary").optional().trim().escape(),
  body("duration").optional().trim().escape(),
  body("cadence").optional().trim().escape(),
  body("defaultPrice").optional().isNumeric(),
  body("multiplier").optional().isNumeric(),
  body("sessionCount").optional().isNumeric(),
  body("isActive").optional().isBoolean(),
  body("theme").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const pkg = await SupportPackage.findOne({ id: req.params.id });
    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }
    const updates = req.body || {};
    if ("name" in updates) pkg.name = updates.name;
    if ("summary" in updates) pkg.summary = updates.summary || "";
    if ("duration" in updates) pkg.duration = updates.duration || "";
    if ("cadence" in updates) pkg.cadence = updates.cadence || "";
    if ("bestFor" in updates) pkg.bestFor = Array.isArray(updates.bestFor) ? updates.bestFor : pkg.bestFor;
    if ("defaultPrice" in updates) pkg.defaultPrice = Number(updates.defaultPrice) || 0;
    if ("multiplier" in updates) pkg.multiplier = Number(updates.multiplier) || 1;
    if ("sessionCount" in updates) pkg.sessionCount = Number(updates.sessionCount) || 1;
    if ("isActive" in updates) pkg.isActive = updates.isActive;
    if ("theme" in updates) pkg.theme = updates.theme || "default";
    await pkg.save();
    res.json(pkg);
  })
);

app.get(
  "/api/admin/packages/stats",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const packages = await UserPackage.find().populate("user counsellor", "name email");
    const total = packages.length;
    const active = packages.filter(p => p.status === "active").length;
    const completed = packages.filter(p => p.status === "completed").length;
    const expired = packages.filter(p => p.status === "expired").length;
    const cancelled = packages.filter(p => p.status === "cancelled").length;
    const totalRevenue = packages.reduce((sum, p) => sum + (p.price || 0), 0);
    res.json({ total, active, completed, expired, cancelled, totalRevenue, packages: packages.slice(0, 20) });
  })
);

app.get(
  "/api/admin/analytics/sessions",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const total = await Appointment.countDocuments();
    const completed = await Appointment.countDocuments({ status: "completed" });
    const cancelled = await Appointment.countDocuments({ status: "cancelled" });
    const noShow = await Appointment.countDocuments({ status: "no-show" });
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const churnRate = total > 0 ? Math.round(((cancelled + noShow) / total) * 100) : 0;

    const packageAgg = await UserPackage.aggregate([
      { $group: { _id: "$planId", count: { $sum: 1 }, totalRevenue: { $sum: "$price" }, usedSessions: { $sum: "$sessionsUsed" }, totalSessions: { $sum: "$sessionsTotal" } } },
    ]);
    const packageRevenue = packageAgg.map(p => ({
      plan: p._id,
      count: p.count,
      revenue: p.totalRevenue,
      usageRate: p.totalSessions > 0 ? Math.round((p.usedSessions / p.totalSessions) * 100) : 0,
    }));

    const monthlyAgg = await Appointment.aggregate([
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    res.json({ total, completed, cancelled, noShow, completionRate, churnRate, packageRevenue, monthlyTrend: monthlyAgg });
  })
);

app.get(
   "/api/admin/therapist-verification",
   asyncRoute(authRequired),
   requireRoles("admin"),
   asyncRoute(async (req, res) => {
     const counsellors = await User.find({ role: "counsellor" }).sort({ createdAt: -1 });
     res.json(counsellors.map(c => ({
       id: String(c._id),
       name: c.name,
       email: c.email,
       clinicName: c.clinicName || "",
       clinicAddress: c.clinicAddress || "",
       licenseNumber: c.licenseNumber || "",
       idVerification: c.idVerification || "",
       verificationStatus: c.verificationStatus || "none",
       verificationBadge: c.verificationBadge || "",
       counsellorType: c.counsellorType || "",
       experience: c.experience || "",
       specialization: c.specialization || "",
       education: c.education || "",
       certificateLinks: c.certificateLinks || [],
       status: c.status,
     })));
   })
);

app.patch(
  "/api/admin/therapist-verification/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  body("verificationStatus").optional().trim().escape(),
  body("verificationBadge").optional().trim().escape(),
  body("clinicName").optional().trim().escape(),
  body("clinicAddress").optional().trim().escape(),
  body("status").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const counsellor = await User.findById(req.params.id);
    if (!counsellor) { res.status(404).json({ error: "Counsellor not found" }); return; }
    if (req.body.verificationStatus) counsellor.verificationStatus = req.body.verificationStatus;
    if (req.body.verificationBadge !== undefined) counsellor.verificationBadge = req.body.verificationBadge;
    if (req.body.clinicName !== undefined) counsellor.clinicName = req.body.clinicName;
    if (req.body.clinicAddress !== undefined) counsellor.clinicAddress = req.body.clinicAddress;
    if (req.body.status) counsellor.status = req.body.status;
    await counsellor.save();
    res.json({ success: true });
  })
);

app.delete(
  "/api/admin/packages/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const result = await SupportPackage.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Package not found" });
      return;
    }
    res.json({ success: true, deletedId: req.params.id });
  })
);
}
