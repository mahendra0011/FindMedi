import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerNotificationRoutes(app, context) {
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
  "/api/payments/my",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  asyncRoute(async (req, res) => {
    const userId = req.user.role === "admin" && req.query.userId ? req.query.userId : req.user._id;
    const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 }).populate("appointment");
    res.json(payments.map(normalizePayment));
  })
);

app.post(
  "/api/payments/session",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  body("amount").optional().isNumeric(),
  body("plan").optional().trim().escape(),
  body("description").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const user = req.user.role === "admin" && req.body?.userId ? await User.findById(req.body.userId) : req.user;
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    let appointment = null;
    if (req.body?.appointmentId && mongoose.isValidObjectId(req.body.appointmentId)) {
      appointment = await Appointment.findOne({ _id: req.body.appointmentId, student: user._id }).populate("counsellor");
    }
    if (!appointment) {
      appointment = await Appointment.findOne({ student: user._id, status: { $in: ["pending", "confirmed", "completed"] } })
        .sort({ date: 1, time: 1 })
        .populate("counsellor");
    }
    const amount = Number(req.body?.amount || appointment?.supportPlanPrice || appointment?.counsellor?.sessionPricing || 700);
    const commissionRate = 2;
    const platformFee = Math.round(amount * (commissionRate / 100));
    const counsellorPayout = Math.max(0, amount - platformFee);
    let payment = appointment
      ? await Payment.findOne({ user: user._id, appointment: appointment._id, status: "pending" }).sort({ createdAt: -1 })
      : null;
    if (payment) {
      payment.amount = amount;
      payment.platformCommissionRate = commissionRate;
      payment.platformFee = platformFee;
      payment.counsellorPayout = counsellorPayout;
      payment.status = "paid";
      payment.paidAt = new Date();
      await payment.save();
    } else {
      payment = await Payment.create({
        user: user._id,
        appointment: appointment?._id,
        invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
        amount,
        kind: "session",
        platformCommissionRate: commissionRate,
        platformFee,
        counsellorPayout,
        plan: req.body?.plan || (appointment?.supportPlanName ? `${appointment.supportPlanName} one-time booking` : "Counselling package booking"),
        description: req.body?.description || "MindSupport one-time counselling package payment",
        status: "paid",
        paidAt: new Date(),
      });
    }
    await createNotification({
      user: user._id,
      type: "payment",
      title: "Payment confirmed",
      message: `One-time package invoice ${payment.invoiceNumber} for Rs. ${payment.amount} is paid.`,
      metadata: { paymentId: String(payment._id) },
    });
    if (appointment?.counsellor?._id) {
      await createNotification({
        user: appointment.counsellor._id,
        type: "payment",
        title: "Session payout updated",
        message: `Rs. ${counsellorPayout} is marked for counsellor payout after platform fee.`,
        metadata: { paymentId: String(payment._id), appointmentId: String(appointment._id) },
      });
    }
    await createNotification({
      audienceRole: "admin",
      type: "payment",
      title: "Platform commission received",
      message: `Platform fee recorded: Rs. ${platformFee} from invoice ${payment.invoiceNumber}.`,
      metadata: { paymentId: String(payment._id) },
    });
    res.status(201).json(normalizePayment(payment));
  })
);

app.get(
  "/api/notifications/my",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const notifications = await Notification.find({
      $or: [{ user: req.user._id }, { audienceRole: { $in: [req.user.role, "all"] } }],
    })
      .sort({ createdAt: -1 })
      .limit(50);
    const result = notifications.map((n) => {
      const normalized = normalizeNotification(n);
      if (n.readBy && n.readBy.length > 0) {
        normalized.read = n.readBy.some((id) => String(id) === String(req.user._id));
      }
      return normalized;
    });
    res.json(result);
  })
);

app.patch(
  "/api/notifications/:id/read",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { audienceRole: { $in: [req.user.role, "all"] } }],
    });
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    notification.read = true;
    if (!notification.readBy) notification.readBy = [];
    if (!notification.readBy.some((id) => String(id) === String(req.user._id))) {
      notification.readBy.push(req.user._id);
    }
    notification.readAt = new Date();
    await notification.save();
    const normalized = normalizeNotification(notification);
    normalized.read = true;
    res.json(normalized);
  })
);
}
