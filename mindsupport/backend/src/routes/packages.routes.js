import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

function getPackageDefaults(planId) {
  return {
    "one-time": { sessionsTotal: 1, minCadenceDays: 0, validityMonths: 1 },
    "short-term": { sessionsTotal: 6, minCadenceDays: 2, validityMonths: 3 },
    "medium-term": { sessionsTotal: 12, minCadenceDays: 7, validityMonths: 6 },
    "long-term": { sessionsTotal: 16, minCadenceDays: 14, validityMonths: 12 },
  }[planId] || { sessionsTotal: 1, minCadenceDays: 0, validityMonths: 1 };
}

function supportPlanPriceKey(planId = "") {
  return {
    "one-time": "oneTime",
    "short-term": "shortTerm",
    "medium-term": "mediumTerm",
    "long-term": "longTerm",
  }[planId];
}

function supportPlans() {
  return [
    { id: "one-time", name: "One-Time Session", duration: "Single session", cadence: "One-time consultation", summary: "A single counselling session for immediate support", bestFor: ["Immediate support", "One-off guidance", "Quick check-in"], multiplier: 1, modeOptions: ["video-chat", "chat-only", "voice-call", "in-person"] },
    { id: "short-term", name: "Short-Term Support", duration: "4-8 sessions", cadence: "One session every two days", summary: "Quick emotional support and guidance", bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"], multiplier: 3, modeOptions: ["video-chat", "chat-only", "voice-call", "in-person"] },
    { id: "medium-term", name: "Medium-Term Support", duration: "8-15 sessions", cadence: "Weekly or bi-weekly", summary: "Emotional recovery and personal growth", bestFor: ["Mild depression", "Relationship issues", "Emotional healing"], multiplier: 5, modeOptions: ["video-chat", "chat-only", "voice-call", "in-person"] },
    { id: "long-term", name: "Long-Term Therapy", duration: "3-6+ months", cadence: "Weekly or bi-weekly sessions", summary: "Ongoing therapy and steady progress", bestFor: ["Trauma", "Severe anxiety", "Chronic depression"], multiplier: 8, modeOptions: ["video-chat", "chat-only", "voice-call", "in-person"] },
  ];
}

function affordableBasePrice(user) {
  const fallback = user.counsellorType === "mentor" ? 299 : 599;
  const raw = Number(user.sessionPricing) || fallback;
  const lower = user.counsellorType === "mentor" ? 199 : 399;
  const upper = user.counsellorType === "mentor" ? 349 : 599;
  return Math.min(upper, Math.max(lower, raw));
}

function planPriceFor(user, planId) {
  const plan = supportPlans().find(p => p.id === planId) || supportPlans()[0];
  const key = supportPlanPriceKey(plan.id);
  const savedPrice = Number(user.supportPlanPrices?.[key]);
  if (user.hasCustomSupportPlanPrices && Number.isFinite(savedPrice) && savedPrice > 0) return Math.round(savedPrice);
  return Math.max(599, Math.round((affordableBasePrice(user) * plan.multiplier) / 50) * 50 - 1);
}

function paymentSplit(amount) {
  const platformFee = Math.round(Number(amount || 0) * 0.02);
  return { platformCommissionRate: 2, platformFee, counsellorPayout: Math.max(0, Number(amount || 0) - platformFee) };
}

function normalizeUserPackage(pkg) {
  return {
    id: String(pkg._id || pkg.id),
    userId: String(pkg.user?._id || pkg.user),
    counsellorId: String(pkg.counsellor?._id || pkg.counsellor),
    counsellorName: pkg.counsellor?.name || "",
    planId: pkg.planId,
    planName: pkg.planName,
    sessionsTotal: pkg.sessionsTotal,
    sessionsUsed: pkg.sessionsUsed,
    sessionsRemaining: Math.max(0, pkg.sessionsTotal - pkg.sessionsUsed),
    minCadenceDays: pkg.minCadenceDays,
    expiryDate: pkg.expiryDate,
    status: pkg.status,
    price: pkg.price,
    lastSessionDate: pkg.lastSessionDate,
    mode: pkg.mode || "google-meet",
    modeOptions: pkg.modeOptions || [],
    progress: pkg.sessionsTotal > 0 ? Math.round((pkg.sessionsUsed / pkg.sessionsTotal) * 100) : 0,
    dataEncryptionEnabled: pkg.dataEncryptionEnabled !== false,
    consentGiven: pkg.consentGiven || false,
    createdAt: pkg.createdAt,
  };
}

export function registerPackageRoutes(app, context) {
  const {
    Appointment, Notification, Payment, User, UserPackage,
    IntakeForm, ConsentForm,
    approvedCounsellorStatuses, asyncRoute, authRequired, createNotification,
    findCounsellor, mongoose, requireRoles, todayYMD,
  } = context;

  app.post(
    "/api/packages/purchase",
    asyncRoute(authRequired),
    requireRoles("user"),
    body("counsellorId").notEmpty().trim().escape().withMessage("Counsellor ID is required"),
    body("planId").notEmpty().trim().escape().withMessage("Plan ID is required"),
    validate,
    asyncRoute(async (req, res) => {
      const { counsellorId, planId } = req.body || {};
      const counsellor = await findCounsellor(counsellorId);
      if (!counsellor) {
        res.status(400).json({ error: "Counsellor not found" });
        return;
      }
      const plan = supportPlans().find(p => p.id === planId);
      if (!plan) {
        res.status(400).json({ error: "Invalid plan" });
        return;
      }
      const defaults = getPackageDefaults(planId);
      const price = planPriceFor(counsellor, planId);
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + defaults.validityMonths);

      const userPackage = await UserPackage.create({
        user: req.user._id,
        counsellor: counsellor._id,
        planId: plan.id,
        planName: plan.name,
        sessionsTotal: defaults.sessionsTotal,
        sessionsUsed: 0,
        minCadenceDays: defaults.minCadenceDays,
        expiryDate,
        status: "active",
        price,
        mode: req.body?.mode || "google-meet",
        modeOptions: plan.modeOptions || ["video-chat", "chat-only", "voice-call", "in-person"],
        dataEncryptionEnabled: true,
      });

      const payment = await Payment.create({
        user: req.user._id,
        packageId: userPackage._id,
        invoiceNumber: `PKG-${Date.now().toString().slice(-8)}`,
        amount: price,
        kind: "package",
        ...paymentSplit(price),
        plan: `${plan.name} package`,
        description: `${plan.name} package with ${counsellor.name}`,
        status: "paid",
        paidAt: new Date(),
      });

      userPackage.payment = payment._id;
      await userPackage.save();

      await createNotification({
        user: req.user._id,
        type: "payment",
        title: "Package purchased",
        message: `Your ${plan.name} with ${counsellor.name} is confirmed. You have ${defaults.sessionsTotal} sessions.`,
        metadata: { packageId: String(userPackage._id) },
      });

      await createNotification({
        user: counsellor._id,
        type: "booking",
        title: "New package assigned",
        message: `${req.user.name} purchased ${plan.name} with you.`,
        metadata: { packageId: String(userPackage._id) },
      });

      await createNotification({
        audienceRole: "admin",
        type: "payment",
        title: "Package sold",
        message: `${req.user.email} purchased ${plan.name} from ${counsellor.name} for ₹${price}.`,
        metadata: { packageId: String(userPackage._id) },
      });

      const populated = await UserPackage.findById(userPackage._id).populate("user counsellor");
      res.status(201).json(normalizeUserPackage(populated));
    })
  );

  app.get(
    "/api/packages/my",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const filter = req.user.role === "counsellor"
        ? { counsellor: req.user._id }
        : { user: req.user._id };
      const packages = await UserPackage.find(filter)
        .sort({ createdAt: -1 })
        .populate("user counsellor", "name email");
      const now = new Date();
      for (const pkg of packages) {
        if (pkg.status === "active" && pkg.expiryDate && new Date(pkg.expiryDate) < now) {
          pkg.status = "expired";
          await pkg.save();
        }
      }
      res.json(packages.map(normalizeUserPackage));
    })
  );

  app.get(
    "/api/packages/user/:userId",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      if (req.user.role === "user" && String(req.user._id) !== req.params.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const packages = await UserPackage.find({ user: req.params.userId })
        .sort({ createdAt: -1 })
        .populate("user counsellor", "name email");
      res.json(packages.map(normalizeUserPackage));
    })
  );

  app.get(
    "/api/packages/:id",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const pkg = await UserPackage.findById(req.params.id).populate("user counsellor", "name email");
      if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
      if (req.user.role === "user" && String(pkg.user?._id || pkg.user) !== String(req.user._id)) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      if (req.user.role === "counsellor" && String(pkg.counsellor?._id || pkg.counsellor) !== String(req.user._id)) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      res.json(normalizeUserPackage(pkg));
    })
  );

  app.patch(
    "/api/packages/:id/status",
    asyncRoute(authRequired),
    body("status").isIn(["active", "completed", "expired", "cancelled"]).withMessage("Invalid status"),
    validate,
    asyncRoute(async (req, res) => {
      const { status } = req.body || {};
      const pkg = await UserPackage.findById(req.params.id).populate("user counsellor");
      if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
      if (req.user.role === "user" && String(pkg.user?._id || pkg.user) !== String(req.user._id)) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      if (req.user.role === "counsellor" && String(pkg.counsellor?._id || pkg.counsellor) !== String(req.user._id)) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      pkg.status = status;
      await pkg.save();
      res.json(normalizeUserPackage(pkg));
    })
  );

  app.post(
    "/api/packages/:id/refund",
    asyncRoute(authRequired),
    requireRoles("user", "admin"),
    asyncRoute(async (req, res) => {
      const pkg = await UserPackage.findById(req.params.id).populate("user counsellor");
      if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
      if (req.user.role === "user" && String(pkg.user?._id || pkg.user) !== String(req.user._id)) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      if (pkg.status === "cancelled") { res.status(409).json({ error: "Package already cancelled" }); return; }
      const daysSincePurchase = Math.floor((Date.now() - new Date(pkg.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePurchase > 7) { res.status(409).json({ error: "Refund window is 7 days from purchase" }); return; }
      const usedSessions = pkg.sessionsUsed;
      const totalSessions = pkg.sessionsTotal;
      let refundAmount;
      if (usedSessions === 0) {
        refundAmount = pkg.price;
      } else {
        const perSessionPrice = pkg.price / totalSessions;
        const unusedSessions = totalSessions - usedSessions;
        refundAmount = Math.round(perSessionPrice * unusedSessions * 0.9); // 10% processing fee
      }
      pkg.status = "cancelled";
      await pkg.save();
      const refundPayment = await Payment.create({
        user: pkg.user._id || pkg.user,
        packageId: pkg._id,
        invoiceNumber: `RFND-${Date.now().toString().slice(-8)}`,
        amount: -refundAmount,
        kind: "refund",
        plan: `${pkg.planName} refund`,
        description: `Refund for ${pkg.planName} — ${usedSessions}/${totalSessions} sessions used`,
        status: "paid",
        paidAt: new Date(),
      });
      await createNotification({
        user: pkg.user._id || pkg.user,
        type: "payment",
        title: "Refund processed",
        message: `₹${refundAmount} refunded for ${pkg.planName}. ${usedSessions}/${totalSessions} sessions were used.`,
        metadata: { packageId: String(pkg._id), refundId: String(refundPayment._id) },
      });
      await createNotification({
        user: pkg.counsellor._id || pkg.counsellor,
        type: "payment",
        title: "Package cancelled — refund issued",
        message: `${pkg.user?.name || "User"} cancelled ${pkg.planName}. Refund ₹${refundAmount}.`,
        metadata: { packageId: String(pkg._id) },
      });
      res.json({ success: true, refundAmount, sessionsUsed: usedSessions, sessionsTotal: totalSessions });
    })
  );

  app.post(
    "/api/intake/submit",
    asyncRoute(authRequired),
    requireRoles("user"),
    body("fullName").notEmpty().trim().escape().withMessage("Full name is required"),
    body("age").optional().isNumeric(),
    body("gender").optional().trim().escape(),
    body("occupation").optional().trim().escape(),
    body("contactPhone").optional().trim().escape(),
    body("concerns").optional().isArray(),
    body("goals").optional().trim().escape(),
    validate,
    asyncRoute(async (req, res) => {
      const { packageId, fullName, age, gender, occupation, contactPhone, emergencyContact, concerns, concernsDetail, previousTherapy, medicalHistory, medications, goals } = req.body || {};
      const existing = await IntakeForm.findOne({ user: req.user._id, packageId });
      if (existing) { res.status(409).json({ error: "Intake form already submitted for this package" }); return; }
      const intake = await IntakeForm.create({
        user: req.user._id,
        counsellor: req.body.counsellorId || null,
        packageId: packageId || null,
        fullName, age, gender, occupation, contactPhone, emergencyContact,
        concerns: Array.isArray(concerns) ? concerns : (concerns ? [concerns] : []),
        concernsDetail, previousTherapy, medicalHistory, medications, goals,
        submittedAt: new Date(),
      });
      res.status(201).json({ success: true, id: String(intake._id) });
    })
  );

  app.get(
    "/api/intake/:packageId",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const intake = await IntakeForm.findOne({ user: req.user._id, packageId: req.params.packageId });
      res.json(intake ? { submitted: true, ...intake.toObject() } : { submitted: false });
    })
  );

  app.post(
    "/api/consent/submit",
    asyncRoute(authRequired),
    body("dataPrivacyAccepted").isBoolean().withMessage("Data privacy acceptance is required"),
    body("termsAccepted").isBoolean().withMessage("Terms acceptance is required"),
    body("confidentialityAccepted").optional().isBoolean(),
    body("emergencyProtocolAccepted").optional().isBoolean(),
    validate,
    asyncRoute(async (req, res) => {
      const { dataPrivacyAccepted, termsAccepted, confidentialityAccepted, emergencyProtocolAccepted } = req.body || {};
      const existing = await ConsentForm.findOne({ user: req.user._id });
      if (existing) { res.status(409).json({ error: "Consent already provided" }); return; }
      const consent = await ConsentForm.create({
        user: req.user._id,
        dataPrivacyAccepted: !!dataPrivacyAccepted,
        termsAccepted: !!termsAccepted,
        confidentialityAccepted: !!confidentialityAccepted,
        emergencyProtocolAccepted: !!emergencyProtocolAccepted,
        acceptedAt: new Date(),
      });
      res.status(201).json({ success: true, id: String(consent._id) });
    })
  );

  app.get(
    "/api/consent/status",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const consent = await ConsentForm.findOne({ user: req.user._id });
      res.json({ accepted: !!consent, consent: consent || null });
    })
  );
}
