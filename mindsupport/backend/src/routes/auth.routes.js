import crypto from "node:crypto";
import { body, validationResult } from "express-validator";
import { sendBrevoEmail, sendOtpEmail, sendWelcomeEmail } from "../services/emailService.js";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, CLIENT_ORIGIN } from "../config/env.js";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerAuthRoutes(app, context) {
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
    MONGODB_DATABASE,
    MONGODB_URI,
    maskMongoUri,
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
    makeUniqueUsername,
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
    jwt,
    JWT_SECRET,
    signToken,
    signRefreshToken,
    setTokenCookie,
    clearTokenCookie,
    todayYMD,
  } = context;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "MindSupport Express API",
    database: isDatabaseReady() ? "connected" : "disconnected",
    databaseName: MONGODB_DATABASE,
    mongoUri: maskMongoUri ? maskMongoUri(MONGODB_URI) : MONGODB_URI.replace(/\/\/.*@/, "//***@"),
    timestamp: new Date().toISOString(),
  });
});

app.post(
  "/api/auth/register",
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain a lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain a number"),
  body("name").trim().isLength({ min: 1 }).withMessage("Name is required").escape(),
  validate,
  asyncRoute(async (req, res) => {
    const { name, email, password, phone } = req.body || {};
    const requestedRole = normalizeRole(req.body?.role || req.body?.accountType || "user");
    if (!["user", "counsellor"].includes(requestedRole)) {
      res.status(400).json({ error: "Signup allows only user or counsellor accounts" });
      return;
    }
    const requestedUsername = await makeUniqueUsername(req.body?.username || name || email);
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const requestedType = req.body?.requestedType === "professional" ? "professional" : "mentor";
    const fullName = String(req.body?.fullName || name || "").trim();
    const bio = String(req.body?.bio || "").trim();
    const specialization = String(req.body?.specialization || "").trim();
    const experience = String(req.body?.experience || "").trim();
    const location = String(req.body?.location || "").trim();
    const consultationModes = listFromInput(req.body?.consultationModes);
    const responseTime = String(req.body?.responseTime || "Within 24 hours").trim();
    const idDocumentNumber = String(req.body?.idDocumentNumber || "").trim();
    if (requestedRole === "counsellor") {
      if (!fullName || !bio || !specialization || !experience || !location || !idDocumentNumber) {
        res.status(400).json({ error: "Counsellor signup requires full name, bio, specialization, experience, location, and ID verification" });
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
        res.status(400).json({ error: "Professional counsellor signup requires a license or registration number" });
        return;
      }
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: fullName || name,
      username: requestedUsername,
      email,
      passwordHash,
      role: requestedRole,
      status: requestedRole === "counsellor" ? "pending" : "active",
      phone: phone || "",
      specialization: requestedRole === "counsellor" ? specialization : "",
      bio: requestedRole === "counsellor" ? bio : "",
      counsellorType: requestedRole === "counsellor" ? requestedType : "",
      verificationStatus: requestedRole === "counsellor" ? "pending" : "none",
      experience: requestedRole === "counsellor" ? experience : "",
      languages: requestedRole === "counsellor" ? listFromInput(req.body?.languages) : [],
      sessionPricing: requestedRole === "counsellor" ? Number(req.body?.sessionPricing) || 0 : 0,
      location: requestedRole === "counsellor" ? location : "",
      consultationModes: requestedRole === "counsellor" ? consultationModes : [],
      responseTime: requestedRole === "counsellor" ? responseTime : "Within 24 hours",
      profilePhotoUrl: requestedRole === "counsellor" ? String(req.body?.profilePhotoUrl || "").trim() : "",
      certificateLinks: requestedRole === "counsellor" ? listFromInput(req.body?.certificateLinks) : [],
      linkedin: requestedRole === "counsellor" ? String(req.body?.linkedin || "").trim() : "",
      licenseNumber: requestedRole === "counsellor" ? String(req.body?.licenseNumber || "").trim() : "",
      idVerification: requestedRole === "counsellor" ? `${String(req.body?.idDocumentType || "Government ID").trim()}: ${idDocumentNumber}` : "",
      categories: requestedRole === "counsellor" ? listFromInput(req.body?.categories) : [],
      availability: requestedRole === "counsellor" ? listFromInput(req.body?.availability) : [],
    });
    let application = null;
    if (requestedRole === "counsellor") {
      application = await CounsellorApplication.create({
        user: user._id,
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
      await createNotification({
        audienceRole: "admin",
        type: "application",
        title: "New counsellor application",
        message: `${fullName} submitted a counsellor verification request.`,
        metadata: { applicationId: String(application._id), userId: String(user._id) },
      });
    }

    // Send welcome email and auto-request OTP for email verification
    try {
      await sendWelcomeEmail(email, fullName || name);
    } catch (emailError) {
      console.warn("[auth] Welcome email send failed:", emailError?.message);
    }

    // Auto-generate and send OTP for email verification
    try {
      const otpCode = generateOtpCode();
      const codeHash = await bcrypt.hash(otpCode, 10);
      await OtpVerification.updateMany({ user: user._id, consumedAt: { $exists: false } }, { consumedAt: new Date() });
      await OtpVerification.create({
        user: user._id,
        channel: "email",
        destination: email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await sendOtpEmail(email, otpCode, fullName || name);
    } catch (otpError) {
      console.warn("[auth] OTP email send failed:", otpError?.message);
    }

    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = refreshTokenHash;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    const token = signToken(user);
    setTokenCookie(res, token);
    res.status(201).json({
      token,
      refreshToken,
      user: publicUser(user),
      application: normalizeApplication(application),
      approvalPending: requestedRole === "counsellor",
    });
  })
);

app.post(
  "/api/auth/login",
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 1 }).withMessage("Password is required"),
  validate,
  asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};
    const identifier = String(email || req.body?.username || "").trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
      res.status(401).json({ error: "Invalid email, username, or password" });
      return;
    }
    if (user.status === "suspended") {
      res.status(403).json({ error: "Account suspended" });
      return;
    }

    // Device tracking
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    const deviceFingerprint = `${ip}|${userAgent}`;
    const knownDevice = user.loginHistory?.some((entry) => entry.deviceFingerprint === deviceFingerprint);

    if (!knownDevice && user.loginHistory?.length > 0) {
      try {
        await sendBrevoEmail({
          to: user.email,
          subject: "New login to your MindSupport account",
          htmlContent: `
            <h2>New sign-in detected</h2>
            <p>Hi ${user.name},</p>
            <p>Your MindSupport account was just accessed from:</p>
            <ul>
              <li><strong>IP:</strong> ${ip}</li>
              <li><strong>Browser:</strong> ${userAgent}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString("en-IN")}</li>
            </ul>
            <p>If this was you, you can ignore this email. If not, please change your password immediately.</p>`,
        });
      } catch (emailError) {
        console.warn("[auth] New device alert email failed:", emailError?.message);
      }
    }

    const MAX_LOGIN_HISTORY = 20;
    user.loginHistory = [
      { ip, userAgent, timestamp: new Date(), deviceFingerprint },
      ...(user.loginHistory || []).slice(0, MAX_LOGIN_HISTORY - 1),
    ];

    // Refresh token rotation
    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.refreshToken = refreshTokenHash;
    user.refreshTokenExpiresAt = refreshTokenExpiresAt;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    setTokenCookie(res, token);
    res.json({ token, refreshToken, user: publicUser(user) });
  })
);

app.get("/api/auth/me", asyncRoute(authRequired), (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post("/api/auth/logout", asyncRoute(authRequired), asyncRoute(async (req, res) => {
  req.user.refreshToken = "";
  req.user.refreshTokenExpiresAt = undefined;
  await req.user.save();
  clearTokenCookie(res);
  res.json({ message: "Signed out" });
}));

app.post(
  "/api/auth/otp/request",
  asyncRoute(authRequired),
  body("channel").optional().isIn(["email", "phone"]).withMessage("Channel must be email or phone"),
  validate,
  asyncRoute(async (req, res) => {
    const channel = req.body?.channel === "phone" && req.user.phone ? "phone" : "email";
    const destination = channel === "phone" ? req.user.phone : req.user.email;
    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    await OtpVerification.updateMany({ user: req.user._id, consumedAt: { $exists: false } }, { consumedAt: new Date() });
    await OtpVerification.create({
      user: req.user._id,
      channel,
      destination,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send OTP via Brevo email
    try {
      await sendOtpEmail(destination, code, req.user.name);
    } catch (emailError) {
      console.warn("[auth] OTP email send failed:", emailError?.message);
    }

    res.status(201).json({
      message: `OTP sent to your ${channel}.`,
      channel,
      destination,
      expiresInMinutes: 10,
      devOtp: process.env.NODE_ENV === "production" ? undefined : code,
    });
  })
);

app.post(
  "/api/auth/otp/verify",
  asyncRoute(authRequired),
  body("code").matches(/^\d{6}$/).withMessage("Enter the 6 digit OTP"),
  validate,
  asyncRoute(async (req, res) => {
    const code = String(req.body?.code || "").trim();
    const otp = await OtpVerification.findOne({
      user: req.user._id,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!otp || !(await bcrypt.compare(code, otp.codeHash))) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }
    otp.consumedAt = new Date();
    req.user.otpVerified = true;
    req.user.otpVerifiedAt = new Date();
    await Promise.all([otp.save(), req.user.save()]);
    res.json({ user: publicUser(req.user), message: "Account verified with OTP" });
  })
);

// Google OAuth routes
app.get("/api/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "your_google_client_id_here") {
    res.status(501).json({ error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env" });
    return;
  }
  const redirectUri = encodeURIComponent(GOOGLE_CALLBACK_URL);
  const scope = encodeURIComponent("email profile");
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

app.get("/api/auth/google/callback", asyncRoute(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.redirect(`${CLIENT_ORIGIN}/login?error=google_auth_failed`);
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange Google auth code");
    }

    const tokenData = await tokenResponse.json();
    const { id_token, access_token } = tokenData;

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to get Google user info");
    }

    const googleUser = await userInfoResponse.json();
    const googleEmail = googleUser.email;
    const googleName = googleUser.name || googleUser.given_name || "Google User";
    const googlePicture = googleUser.picture || "";

    // Find or create user
    let user = await User.findOne({ email: googleEmail });

    if (!user) {
      // Create new user from Google profile
      const requestedUsername = await makeUniqueUsername(googleName);
      const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user = await User.create({
        name: googleName,
        username: requestedUsername,
        email: googleEmail,
        role: "user",
        status: "active",
        profilePhotoUrl: googlePicture,
        otpVerified: true,
        otpVerifiedAt: new Date(),
        passwordHash: placeholderHash,
      });
    }

    // Generate tokens
    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = refreshTokenHash;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    const token = signToken(user);
    setTokenCookie(res, token);
    res.redirect(`${CLIENT_ORIGIN}/auth/google/success#token=${token}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error("[auth] Google OAuth error:", error);
    res.redirect(`${CLIENT_ORIGIN}/login?error=google_auth_failed`);
  }
}));

// Refresh token rotation endpoint
app.post(
  "/api/auth/refresh",
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  validate,
  asyncRoute(async (req, res) => {
    const { refreshToken } = req.body;
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    if (!decoded || !decoded.sub) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const user = await User.findById(decoded.sub);
    if (!user || !user.refreshToken || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    // Rotate refresh token
    const newRefreshToken = signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    user.refreshToken = refreshTokenHash;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    const token = signToken(user);
    setTokenCookie(res, token);
    res.json({ token, refreshToken: newRefreshToken, user: publicUser(user) });
  })
);

// Forgot password - send reset link
app.post(
  "/api/auth/forgot-password",
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  validate,
  asyncRoute(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase() });
    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: "If that email is registered, a reset link has been sent." });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${CLIENT_ORIGIN}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    try {
      await sendBrevoEmail({
        to: email,
        subject: "Reset your MindSupport password",
        htmlContent: `
          <h2>Password reset request</h2>
          <p>Hi ${user.name},</p>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #4f7cff; color: white; text-decoration: none; border-radius: 8px;">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    } catch (emailError) {
      console.warn("[auth] Password reset email failed:", emailError?.message);
    }

    res.json({ message: "If that email is registered, a reset link has been sent." });
  })
);

// Reset password
app.post(
  "/api/auth/reset-password",
  body("token").notEmpty().withMessage("Reset token is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain a lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain a number"),
  validate,
  asyncRoute(async (req, res) => {
    const { token, password } = req.body;
    const email = String(req.body.email || "").toLowerCase();
    const user = await User.findOne({
      email,
      resetPasswordExpiresAt: { $gt: new Date() },
    });
    if (!user || !user.resetPasswordToken) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    const isValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isValid) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordToken = "";
    user.resetPasswordExpiresAt = undefined;
    user.refreshToken = "";
    user.refreshTokenExpiresAt = undefined;
    await user.save();

    res.json({ message: "Password reset successful. Please sign in with your new password." });
  })
);

app.put(
  "/api/users/me",
  asyncRoute(authRequired),
  body("name").optional().trim().escape(),
  body("phone").optional().trim().escape(),
  body("bio").optional().trim().escape(),
  body("specialization").optional().trim().escape(),
  body("licenseNumber").optional().trim().escape(),
  body("meetLink").optional().trim(),
  body("location").optional().trim().escape(),
  body("education").optional().trim().escape(),
  body("responseTime").optional().trim().escape(),
  body("profilePhotoUrl").optional().trim(),
  body("linkedin").optional().trim().escape(),
  body("clinicName").optional().trim().escape(),
  body("clinicAddress").optional().trim().escape(),
  body("clinicMapLink").optional().trim(),
  body("city").optional().trim().escape(),
  body("gender").optional().trim().escape(),
  body("emergencyContactName").optional().trim().escape(),
  body("emergencyContactPhone").optional().trim().escape(),
  body("emergencyContactRelation").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const allowed = [
      "name",
      "phone",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelation",
      "bio",
      "specialization",
      "licenseNumber",
      "availability",
      "meetLink",
      "location",
      "education",
      "responseTime",
      "profilePhotoUrl",
      "linkedin",
      "clinicName",
      "clinicAddress",
      "clinicMapLink",
      "city",
      "gender",
    ];
    for (const key of allowed) {
      if (key in req.body) req.user[key] = req.body[key];
    }
    const hasPricingUpdate = "sessionPricing" in req.body || "supportPlanPrices" in req.body;
    if (hasPricingUpdate && req.user.role !== "counsellor") {
      res.status(403).json({ error: "Only approved counsellors can update counselling package prices" });
      return;
    }
    if ("sessionPricing" in req.body) {
      const sessionPricing = Number(req.body.sessionPricing);
      if (!Number.isFinite(sessionPricing) || sessionPricing < 1) {
        res.status(400).json({ error: "Enter a valid base session price" });
        return;
      }
      req.user.sessionPricing = Math.round(sessionPricing);
    }
    if ("supportPlanPrices" in req.body) {
      const currentPrices = req.user.supportPlanPrices?.toObject?.() || req.user.supportPlanPrices || {};
      const source = req.body.supportPlanPrices || {};
      const nextPrices = { ...currentPrices };
      for (const key of ["oneTime", "shortTerm", "mediumTerm", "longTerm"]) {
        if (key in source) {
          const price = Number(source[key]);
          if (!Number.isFinite(price) || price < 1) {
            res.status(400).json({ error: "Enter valid one-time package prices" });
            return;
          }
          nextPrices[key] = Math.round(price);
        }
      }
      req.user.supportPlanPrices = nextPrices;
      req.user.hasCustomSupportPlanPrices = true;
    }
    if ("consultationModes" in req.body) req.user.consultationModes = listFromInput(req.body.consultationModes);
    if ("categories" in req.body) req.user.categories = listFromInput(req.body.categories);
    if ("languages" in req.body) req.user.languages = listFromInput(req.body.languages);
    if ("username" in req.body) {
      const username = String(req.body.username || "").trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        res.status(400).json({ error: "Username must be 3-24 characters using lowercase letters, numbers, or underscore" });
        return;
      }
      const exists = await User.exists({ username, _id: { $ne: req.user._id } });
      if (exists) {
        res.status(409).json({ error: "Username is already taken" });
        return;
      }
      req.user.username = username;
    }
    if ("privacySettings" in req.body) {
      req.user.privacySettings = { ...(req.user.privacySettings?.toObject?.() || req.user.privacySettings || {}), ...(req.body.privacySettings || {}) };
    }
    if ("notificationSettings" in req.body) {
      req.user.notificationSettings = { ...(req.user.notificationSettings?.toObject?.() || req.user.notificationSettings || {}), ...(req.body.notificationSettings || {}) };
    }
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);
}