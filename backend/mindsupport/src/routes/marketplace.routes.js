import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerMarketplaceRoutes(app, context) {
  const {
    Appointment,
    Assessment,
    CounsellorApplication,
    CounsellorReport,
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
    decryptText,
    detectCrisis,
    encryptText,
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

const supportPlans = [
  {
    id: "one-time",
    name: "One-Time Session",
    duration: "Single session",
    cadence: "One-time consultation",
    bestFor: ["Immediate support", "One-off guidance", "Quick check-in"],
    summary: "A single counselling session for immediate support",
    multiplier: 1,
  },
  {
    id: "short-term",
    name: "Short-Term Support",
    duration: "4-8 sessions",
    cadence: "One session every two days",
    bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"],
    summary: "Quick emotional support and guidance",
    multiplier: 3,
  },
  {
    id: "medium-term",
    name: "Medium-Term Support",
    duration: "8-15 sessions",
    cadence: "Weekly or bi-weekly",
    bestFor: ["Mild depression", "Relationship issues", "Emotional healing"],
    summary: "Emotional recovery and personal growth",
    multiplier: 5,
  },
  {
    id: "long-term",
    name: "Long-Term Therapy",
    duration: "3-6+ months",
    cadence: "Weekly or bi-weekly sessions",
    bestFor: ["Trauma", "Severe anxiety", "Chronic depression"],
    summary: "Ongoing therapy and steady progress",
    multiplier: 8,
  },
];

function affordableBasePrice(user) {
  const fallback = user.counsellorType === "mentor" ? 299 : 599;
  const raw = Number(user.sessionPricing) || fallback;
  const lower = user.counsellorType === "mentor" ? 199 : 399;
  const upper = user.counsellorType === "mentor" ? 349 : 599;
  return Math.min(upper, Math.max(lower, raw));
}

function supportPlanPriceKey(planId = "") {
  return {
    "one-time": "oneTime",
    "short-term": "shortTerm",
    "medium-term": "mediumTerm",
    "long-term": "longTerm",
  }[planId];
}

function planPriceFor(user, plan) {
  const savedPrice = Number(user.supportPlanPrices?.[supportPlanPriceKey(plan.id)]);
  if (user.hasCustomSupportPlanPrices && Number.isFinite(savedPrice) && savedPrice > 0) return Math.round(savedPrice);
  return Math.max(599, Math.round((affordableBasePrice(user) * plan.multiplier) / 50) * 50 - 1);
}

function paymentSplit(amount) {
  const platformFee = Math.round(Number(amount || 0) * 0.02);
  return {
    platformCommissionRate: 2,
    platformFee,
    counsellorPayout: Math.max(0, Number(amount || 0) - platformFee),
  };
}

function publicCounsellorProfile(user) {
  const basePrice = affordableBasePrice(user);
  const customPackages = Array.isArray(user.customPackages) ? user.customPackages.filter((pkg) => pkg.isActive) : [];
  const hasCustom = customPackages.length > 0;
  return {
    id: String(user._id),
    name: user.name,
    specialization: user.specialization,
    bio: user.bio,
    gender: user.gender || "",
    location: user.location || "India - Online and in-person support",
    city: user.city || "",
    clinicAddress: user.clinicAddress || "",
    clinicMapLink: user.clinicMapLink || "",
    clinicName: user.clinicName || "",
    education: user.education || (user.counsellorType === "mentor" ? "Peer support training" : "Verified professional qualification"),
    profilePhotoUrl: user.profilePhotoUrl,
    counsellorType: user.counsellorType || "professional",
    badge: user.verificationBadge || badgeForCounsellorType(user.counsellorType),
    experience: user.experience,
    languages: user.languages,
    sessionPricing: basePrice,
    categories: user.categories,
    rating: user.rating,
    reviews: user.reviews,
    responseTime: user.responseTime,
    availability: user.availability,
    unavailableDates: user.unavailableDates || [],
    bookingEnabled: user.bookingEnabled !== false,
    consultationModes: user.consultationModes?.length ? user.consultationModes : ["google-meet", "in-person", "voice-call", "video-chat", "chat-only"],
    supportPlans: hasCustom
      ? customPackages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          duration: pkg.duration,
          cadence: pkg.cadence,
          bestFor: pkg.bestFor || [],
          summary: pkg.summary || "",
          multiplier: 1,
          bookingPrice: Number(pkg.price) || basePrice,
          perSessionPrice: Number(pkg.price) || basePrice,
          priceLabel: "One-time package",
          theme: pkg.theme || "default",
          sessionCount: pkg.sessionCount || 1,
        }))
      : supportPlans.map((plan) => ({
          ...plan,
          bookingPrice: planPriceFor(user, plan),
          perSessionPrice: planPriceFor(user, plan),
          priceLabel: "One-time package",
        })),
  };
}

app.get(
  "/api/counsellors",
  asyncRoute(async (_req, res) => {
    const counsellors = await User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ name: 1 });
    res.json(counsellors.map(publicCounsellorProfile));
  })
);

app.get(
  "/api/counsellors/:id",
  asyncRoute(async (req, res) => {
    const counsellor = await findCounsellor(req.params.id);
    if (!counsellor) {
      res.status(404).json({ error: "Counsellor not found" });
      return;
    }
    res.json(publicCounsellorProfile(counsellor));
  })
);

app.get(
  "/api/appointments/my",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const filter = req.user.role === "counsellor" ? { counsellor: req.user._id } : { student: req.user._id };
    const appointments = await Appointment.find(filter).sort({ date: 1, time: 1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.get(
  "/api/appointments/student/:student_id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const studentId = String(req.params.student_id).toLowerCase();
    if (req.user.role === "user" && studentId !== req.user.email && studentId !== String(req.user._id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const student = mongoose.isValidObjectId(studentId)
      ? await User.findById(studentId)
      : await User.findOne({ email: studentId });
    const query = student ? { student: student._id } : { studentEmail: studentId };
    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.get(
  "/api/appointments/counsellor/:counsellor_id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const counsellorId = req.params.counsellor_id;
    if (req.user.role === "counsellor" && counsellorId !== String(req.user._id) && counsellorId !== req.user.email) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const counsellor = await findCounsellor(counsellorId);
    if (!counsellor) {
      res.status(404).json({ error: "Counsellor not found" });
      return;
    }
    const appointments = await Appointment.find({ counsellor: counsellor._id }).sort({ date: 1, time: 1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.get(
  "/api/appointments/reminders",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1hr = new Date(now.getTime() + 60 * 60 * 1000);
    const filter = req.user.role === "counsellor" ? { counsellor: req.user._id } : { student: req.user._id };
    const appointments = await Appointment.find({
      ...filter,
      status: { $in: ["confirmed", "pending"] },
    }).populate("student counsellor");
    const reminders = [];
    for (const apt of appointments) {
      const aptDate = new Date(`${apt.date}T${apt.time}`);
      const diffMs = aptDate.getTime() - now.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      // 24hr reminder: send if between 23-25 hrs away
      if (diffHrs > 23 && diffHrs < 25) reminders.push({ type: "24hr", appointment: normalizeAppointment(apt, req.user), message: `Reminder: You have a session tomorrow at ${apt.time}` });
      // 1hr reminder: send if between 0.5-1.5 hrs away
      if (diffHrs > 0.5 && diffHrs < 1.5) reminders.push({ type: "1hr", appointment: normalizeAppointment(apt, req.user), message: `Reminder: Your session starts in 1 hour at ${apt.time}` });
    }
    res.json(reminders);
  })
);

app.post(
  "/api/appointments",
  body("counsellorId").notEmpty().withMessage("Counsellor is required"),
  body("date").matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Valid date required (YYYY-MM-DD)"),
  body("time").notEmpty().withMessage("Time is required"),
  body("mode").isIn(["google-meet", "in-person", "voice-call", "video-chat", "chat-only", "online"]).withMessage("Valid mode required"),
  body("concern").optional().trim().escape(),
  validate,
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  asyncRoute(async (req, res) => {
    const student =
      req.user.role === "user"
        ? req.user
        : await User.findOne({ email: String(req.body?.studentEmail || "").toLowerCase(), role: "user" });
    if (!student) {
      res.status(400).json({ error: "Student user not found" });
      return;
    }
    const counsellor = await findCounsellor(req.body?.counsellorId);
    if (!counsellor) {
      res.status(400).json({ error: "No active counsellor is available" });
      return;
    }
    if (counsellor.bookingEnabled === false) {
      res.status(409).json({ error: "This counsellor is not accepting new bookings right now" });
      return;
    }
    const { date, time } = req.body || {};
    if (!date || !time) {
      res.status(400).json({ error: "Date and time are required" });
      return;
    }
    if ((counsellor.unavailableDates || []).includes(date)) {
      res.status(409).json({ error: "This counsellor marked that date unavailable" });
      return;
    }
    // For non-package bookings, enforce single active booking. Package bookings allow multiple sessions as cadence handles timing.
    if (!req.body?.packageId) {
      const existingBooking = await Appointment.findOne({
        student: student._id,
        counsellor: counsellor._id,
        status: { $in: activeStatuses },
      });
      if (existingBooking) {
        res.status(409).json({ error: "You already have an active booking with this counsellor. Use Session Schedule to manage it." });
        return;
      }
    }
    if (await hasAppointmentConflict(counsellor._id, date, time)) {
      res.status(409).json({ error: "This counsellor already has a session at that time" });
      return;
    }
    const requestedMode = String(req.body?.mode || "google-meet");
    const mode = ["in-person", "online", "google-meet", "voice-call", "chat-only", "video-chat"].includes(requestedMode) ? requestedMode : "google-meet";
    const plan = supportPlans.find((item) => item.id === req.body?.supportPlanId) || supportPlans[0];
    const supportPlanPrice = planPriceFor(counsellor, plan);
    const sharedMeetingLink = mode === "in-person" || mode === "voice-call" ? "" : resolveSharedMeetLink(counsellor.meetLink, buildMeetLink());
    const packageId = req.body?.packageId || null;
    let autoConfirm = req.body?.autoConfirm === true;
    let userPackage = null;
    if (packageId) {
      userPackage = await UserPackage.findById(packageId);
      if (!userPackage) {
        res.status(400).json({ error: "Package not found" }); return;
      }
      if (userPackage.status !== "active") {
        res.status(409).json({ error: `Package is ${userPackage.status}, not active` }); return;
      }
      if (userPackage.sessionsUsed >= userPackage.sessionsTotal) {
        res.status(409).json({ error: "All sessions in this package have been used" }); return;
      }
      if (userPackage.expiryDate && new Date(userPackage.expiryDate) < new Date()) {
        res.status(409).json({ error: "Package has expired" }); return;
      }
      if (String(userPackage.counsellor?._id || userPackage.counsellor) !== String(counsellor._id)) {
        res.status(400).json({ error: "Package is for a different counsellor" }); return;
      }
      if (String(userPackage.user?._id || userPackage.user) !== String(req.user._id)) {
        res.status(403).json({ error: "Package does not belong to you" }); return;
      }
      if (userPackage.minCadenceDays > 0 && userPackage.lastSessionDate) {
        const daysSince = Math.floor((Date.now() - new Date(userPackage.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < userPackage.minCadenceDays) {
          res.status(409).json({ error: `Please wait ${userPackage.minCadenceDays - daysSince} more day(s) before booking another session (min ${userPackage.minCadenceDays} days between sessions)` });
          return;
        }
      }
      autoConfirm = true;
    }
    const concern = req.body?.concern || "";
    const crisisCheck = detectCrisis(concern);
    const appointment = await Appointment.create({
      student: student._id,
      studentEmail: student.email,
      counsellor: counsellor._id,
      counsellorName: counsellor.name,
      date,
      time,
      mode,
      status: autoConfirm ? "confirmed" : "pending",
      concern,
      crisisFlag: crisisCheck.crisis,
      crisisMessage: crisisCheck.message,
      supportPlanId: plan.id,
      supportPlanName: plan.name,
      supportPlanDuration: plan.duration,
      supportPlanCadence: plan.cadence,
      supportPlanBestFor: plan.bestFor,
      supportPlanPrice,
      packageId: userPackage?._id || null,
      isAnonymous: Boolean(req.body?.isAnonymous),
      anonymousAlias: String(req.body?.anonymousAlias || "Anonymous user").trim().slice(0, 60) || "Anonymous user",
      meetingProvider: mode === "in-person" || mode === "voice-call" ? "" : "google-meet",
      meetingLink: sharedMeetingLink,
    });
    if (userPackage) {
      userPackage.sessionsUsed = Math.min(userPackage.sessionsTotal, userPackage.sessionsUsed + 1);
      if (userPackage.sessionsUsed >= userPackage.sessionsTotal) {
        userPackage.status = "completed";
      }
      userPackage.lastSessionDate = new Date(`${date}T${time}`);
      await userPackage.save();
    }
    if (packageId) {
      await createNotification({
        user: counsellor._id,
        type: "booking",
        title: "New session booked",
        message: `${student.name} booked a session on ${date} at ${time} using their ${userPackage.planName} package.`,
        metadata: { appointmentId: String(appointment._id), packageId: String(userPackage._id) },
      });
      await createNotification({
        user: student._id,
        type: "booking",
        title: "Session booked",
        message: `Your session on ${date} at ${time} is confirmed (${userPackage.planName}). Sessions used: ${userPackage.sessionsUsed}/${userPackage.sessionsTotal}.`,
        metadata: { appointmentId: String(appointment._id), packageId: String(userPackage._id) },
      });
    } else {
      const payment = await Payment.create({
        user: student._id,
        appointment: appointment._id,
        invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
        amount: supportPlanPrice,
        kind: "session",
        ...paymentSplit(supportPlanPrice),
        plan: `${plan.name} one-time booking`,
        description: `One-time package payment for ${counsellor.name}`,
        status: autoConfirm ? "paid" : "pending",
      });
      if (autoConfirm) {
        await createNotification({
          user: counsellor._id,
          type: "booking",
          title: "New session booked",
          message: `${student.name} booked ${plan.name} on ${date} at ${time}. Payment received.`,
          metadata: { appointmentId: String(appointment._id) },
        });
        await createNotification({
          user: student._id,
          type: "booking",
          title: "Booking confirmed",
          message: `Your ${plan.name} with ${counsellor.name} on ${date} at ${time} is confirmed. Invoice: ${payment.invoiceNumber}.`,
          metadata: { appointmentId: String(appointment._id), paymentId: String(payment._id) },
        });
      } else {
        await createNotification({
          user: counsellor._id,
          type: "booking",
          title: "New counselling request",
          message: `${student.name} requested ${plan.name} on ${date} at ${time}.`,
          metadata: { appointmentId: String(appointment._id) },
        });
        await createNotification({
          user: student._id,
          type: "booking",
          title: "Booking request sent",
          message: `${counsellor.name} will review your ${plan.name} request.`,
          metadata: { appointmentId: String(appointment._id), paymentId: String(payment._id) },
        });
      }
    }
    await createNotification({
      audienceRole: "admin",
      type: "booking",
      title: "New session booking",
      message: `${student.email} booked ${counsellor.name} for ${plan.name}. ${autoConfirm ? "Auto-confirmed." : "Pending counsellor approval."}`,
      metadata: { appointmentId: String(appointment._id) },
    });
    if (crisisCheck.crisis) {
      await createNotification({
        audienceRole: "admin",
        type: "emergency",
        title: "Crisis keywords detected in booking",
        message: `${student.email} used crisis-related language: "${concern.slice(0, 200)}". Counsellor: ${counsellor.name}.`,
        metadata: { appointmentId: String(appointment._id), userId: String(student._id) },
      });
      await createNotification({
        user: counsellor._id,
        type: "emergency",
        title: "Crisis alert — review concern details",
        message: `${student.name}'s session concern contains crisis keywords. Please review before the session.`,
        metadata: { appointmentId: String(appointment._id) },
      });
    }
    res.status(201).json(normalizeAppointment(await appointment.populate("student counsellor"), req.user));
  })
);

app.put(
  "/api/appointments/:id",
  body("date").optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Valid date required (YYYY-MM-DD)"),
  body("time").optional().notEmpty().withMessage("Time cannot be empty"),
  body("mode").optional().isIn(["google-meet", "in-person", "voice-call", "video-chat", "chat-only", "online"]).withMessage("Valid mode required"),
  body("concern").optional().trim().escape(),
  body("notes").optional().trim().escape(),
  validate,
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!canAccessAppointment(req.user, appointment)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const payload = req.body || {};
    if (req.user.role === "user" && payload.status && payload.status !== "cancelled") {
      res.status(403).json({ error: "Students can only cancel their own session status" });
      return;
    }
    if (payload.counsellorId && req.user.role !== "user") {
      const counsellor = await findCounsellor(payload.counsellorId);
      if (!counsellor) {
        res.status(400).json({ error: "Counsellor not found" });
        return;
      }
      appointment.counsellor = counsellor._id;
      appointment.counsellorName = counsellor.name;
    }
    for (const key of ["date", "time", "mode", "status", "concern", "notes"]) {
      if (key in payload) appointment[key] = payload[key];
    }
    if ("supportPlanId" in payload) {
      const plan = supportPlans.find((item) => item.id === payload.supportPlanId);
      if (plan) {
        appointment.supportPlanId = plan.id;
        appointment.supportPlanName = plan.name;
        appointment.supportPlanDuration = plan.duration;
        appointment.supportPlanCadence = plan.cadence;
        appointment.supportPlanBestFor = plan.bestFor;
        const pricingCounsellor = await findCounsellor(appointment.counsellor);
        appointment.supportPlanPrice = pricingCounsellor ? planPriceFor(pricingCounsellor, plan) : appointment.supportPlanPrice;
      }
    }
    if ("meetingLink" in payload && req.user.role !== "user") {
      const meetingLink = normalizeMeetLink(payload.meetingLink);
      if (payload.meetingLink && !meetingLink) {
        res.status(400).json({ error: "Use a reusable Google Meet room link, not https://meet.google.com/new." });
        return;
      }
      appointment.meetingLink = meetingLink;
    }
    if (appointment.mode === "in-person" || appointment.mode === "voice-call") {
      appointment.meetingProvider = "";
      appointment.meetingLink = "";
    }
    if (!["in-person", "voice-call"].includes(appointment.mode) && !normalizeMeetLink(appointment.meetingLink)) {
      appointment.meetingProvider = "google-meet";
      appointment.meetingLink = resolveSharedMeetLink(req.user.meetLink, buildMeetLink());
    }
    if (await hasAppointmentConflict(appointment.counsellor, appointment.date, appointment.time, appointment._id)) {
      res.status(409).json({ error: "This counsellor already has a session at that time" });
      return;
    }
    if ("notes" in payload && payload.notes) {
      const { encrypted, encryptedFlag } = encryptText(payload.notes);
      appointment.notes = encrypted;
      appointment.notesEncrypted = encryptedFlag;
    }
    await appointment.save();
    if (appointment.packageId) {
      const userPackage = await UserPackage.findById(appointment.packageId);
      if (userPackage && userPackage.status === "active") {
        if (payload.status === "cancelled" || payload.status === "declined") {
          const apptDateTime = new Date(`${appointment.date}T${appointment.time}`);
          const hoursUntilAppt = (apptDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
          const isLateCancellation = hoursUntilAppt < 24;
          if (!isLateCancellation) {
            if (userPackage.sessionsUsed > 0) {
              userPackage.sessionsUsed = Math.max(0, userPackage.sessionsUsed - 1);
            }
          }
        }
        if (payload.status === "no-show") {
          if (userPackage.sessionsUsed < userPackage.sessionsTotal) {
            userPackage.sessionsUsed = Math.min(userPackage.sessionsTotal, userPackage.sessionsUsed + 1);
          }
          if (userPackage.sessionsUsed >= userPackage.sessionsTotal) {
            userPackage.status = "completed";
          }
        }
        await userPackage.save();
      }
    }
    const populated = await appointment.populate("student counsellor");
    await createNotification({
      user: populated.student?._id || appointment.student,
      type: "session",
      title: "Session updated",
      message: `${appointment.counsellorName} updated your session status to ${appointment.status}.`,
      metadata: { appointmentId: String(appointment._id) },
    });
    if (String(populated.counsellor?._id || appointment.counsellor) !== String(req.user._id)) {
      await createNotification({
        user: populated.counsellor?._id || appointment.counsellor,
        type: "session",
        title: "Session updated",
        message: `A session with ${appointment.studentEmail} was updated to ${appointment.status}.`,
        metadata: { appointmentId: String(appointment._id) },
      });
    }
    res.json(normalizeAppointment(populated, req.user));
  })
);

app.delete(
  "/api/appointments/:id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!canAccessAppointment(req.user, appointment)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    appointment.status = "cancelled";
    await appointment.save();
    if (appointment.packageId) {
      const userPackage = await UserPackage.findById(appointment.packageId);
      if (userPackage && userPackage.status === "active" && userPackage.sessionsUsed > 0) {
        userPackage.sessionsUsed = Math.max(0, userPackage.sessionsUsed - 1);
        await userPackage.save();
      }
    }
    res.json({ success: true, appointment: normalizeAppointment(appointment, req.user) });
  })
);

app.get(
  "/api/reviews/counsellor/:id",
  asyncRoute(async (req, res) => {
    const counsellor = await findCounsellor(req.params.id);
    if (!counsellor) {
      res.status(404).json({ error: "Counsellor not found" });
      return;
    }
    const reviews = await Review.find({ counsellor: counsellor._id, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("student counsellor appointment");
    res.json(reviews.map((review) => normalizeReview(review, req.user)));
  })
);

app.post(
  "/api/reviews",
  body("appointmentId").notEmpty().withMessage("Appointment ID required"),
  body("professionalism").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("helpfulness").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("communication").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("comment").optional().trim().escape(),
  validate,
  asyncRoute(authRequired),
  requireRoles("user"),
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.body?.appointmentId).populate("student counsellor");
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (String(appointment.student?._id || appointment.student) !== String(req.user._id)) {
      res.status(403).json({ error: "You can only review your own session" });
      return;
    }
    if (appointment.status !== "completed") {
      res.status(400).json({ error: "Reviews are available after a session is marked completed" });
      return;
    }
    const exists = await Review.findOne({ appointment: appointment._id, student: req.user._id });
    if (exists) {
      res.status(409).json({ error: "You already reviewed this session" });
      return;
    }
    const professionalism = clampRating(req.body?.professionalism);
    const helpfulness = clampRating(req.body?.helpfulness);
    const communication = clampRating(req.body?.communication);
    const averageRating = Number(((professionalism + helpfulness + communication) / 3).toFixed(1));
    const comment = String(req.body?.comment || "").trim().slice(0, 1000);
    const status = averageRating <= 2 || /\b(abuse|abusive|threat|harass|unsafe|scam|fake)\b/i.test(comment) ? "flagged" : "approved";
    const review = await Review.create({
      appointment: appointment._id,
      student: req.user._id,
      counsellor: appointment.counsellor?._id || appointment.counsellor,
      professionalism,
      helpfulness,
      communication,
      averageRating,
      comment,
      anonymous: req.body?.anonymous !== false,
      status,
    });
    await refreshCounsellorRating(review.counsellor);
    res.status(201).json(normalizeReview(await review.populate("student counsellor appointment"), req.user));
  })
);

app.post(
  "/api/reviews/submit",
  body("counsellorId").notEmpty().withMessage("Counsellor ID required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("comment").optional().trim().escape(),
  validate,
  asyncRoute(authRequired),
  requireRoles("user"),
  asyncRoute(async (req, res) => {
    const counsellorId = req.body?.counsellorId;
    if (!counsellorId) {
      res.status(400).json({ error: "counsellorId is required" });
      return;
    }
    const counsellor = await findCounsellor(counsellorId);
    if (!counsellor) {
      res.status(404).json({ error: "Counsellor not found" });
      return;
    }
    const rating = Math.max(1, Math.min(5, Number(req.body?.rating) || 5));
    const comment = String(req.body?.comment || "").trim().slice(0, 1000);
    const exists = await Review.findOne({ student: req.user._id, counsellor: counsellor._id, comment: { $ne: "" } });
    const review = await Review.create({
      student: req.user._id,
      counsellor: counsellor._id,
      professionalism: rating,
      helpfulness: rating,
      communication: rating,
      averageRating: rating,
      comment,
      anonymous: req.body?.anonymous !== false,
      status: "approved",
    });
    await refreshCounsellorRating(review.counsellor);
    res.status(201).json(normalizeReview(await review.populate("student counsellor"), req.user));
  })
);

app.post(
  "/api/reports/counsellor",
  body("reason").notEmpty().trim().escape().withMessage("Reason is required"),
  body("details").optional().trim().escape(),
  validate,
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const { counsellorId, reason, details } = req.body || {};
    if (!counsellorId || !reason) { res.status(400).json({ error: "Counsellor ID and reason are required" }); return; }
    const counsellor = await User.findById(counsellorId);
    if (!counsellor || counsellor.role !== "counsellor") { res.status(400).json({ error: "Counsellor not found" }); return; }
    const report = await CounsellorReport.create({
      reporter: req.user._id,
      counsellor: counsellor._id,
      reason: String(reason).trim(),
      details: String(details || "").trim(),
    });
    await createNotification({
      audienceRole: "admin",
      type: "report",
      title: "Counsellor reported",
      message: `${req.user.name || req.user.email} reported ${counsellor.name}. Reason: ${reason}`,
      metadata: { reportId: String(report._id), counsellorId: String(counsellor._id) },
    });
    res.status(201).json({ success: true, id: String(report._id) });
  })
);

app.get(
  "/api/reports/counsellor",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const reports = await CounsellorReport.find().sort({ createdAt: -1 }).populate("reporter counsellor", "name email");
    res.json(reports.map(r => ({
      id: String(r._id),
      reporterName: r.reporter?.name || "Unknown",
      reporterEmail: r.reporter?.email || "",
      counsellorName: r.counsellor?.name || "Unknown",
      counsellorEmail: r.counsellor?.email || "",
      reason: r.reason,
      details: r.details,
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt,
    })));
  })
);

app.patch(
  "/api/reports/counsellor/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const report = await CounsellorReport.findById(req.params.id);
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }
    if (req.body.status) report.status = req.body.status;
    if (req.body.adminNotes !== undefined) report.adminNotes = req.body.adminNotes;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();
    res.json({ success: true });
  })
);
}
