import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerPeerRoutes(app, context) {
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

function peerOwnerIds(req) {
  return [req.user?._id]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

app.get(
  "/api/peer/posts",
  asyncRoute(async (req, res) => {
    const query = {};
    if (req.query.category) query.category = String(req.query.category);
    const posts = await PeerPost.find(query).sort({ created_at: -1 });
    const counts = await PeerComment.aggregate([{ $group: { _id: "$post_id", count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
    res.json(posts.map((post) => ({ ...post.toJSON(), commentCount: countMap.get(String(post._id)) || 0 })));
  })
);

app.post(
  "/api/peer/posts",
  asyncRoute(authOptional),
  body("content").trim().isLength({ min: 1 }).withMessage("Content is required").escape(),
  body("category").optional().trim().escape(),
  body("alias").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const content = String(req.body?.content || "").trim();
    if (!content) {
      res.status(400).json({ error: "Post content is required" });
      return;
    }
    const crisis = crisisRegex.test(content);
    const post = await PeerPost.create({
      author_uid: req.user ? String(req.user._id) : req.body?.author_uid || "anonymous",
      alias: req.user?.name || req.body?.alias || "Anonymous",
      category: req.body?.category || "General Wellness",
      content,
      flagged: crisis,
      crisis,
      crisisMessage: crisis ? "If this is urgent, contact emergency services or a crisis helpline now." : "",
    });
    res.status(201).json(post);
  })
);

app.post(
  "/api/peer/posts/:post_id/vote",
  asyncRoute(authRequired),
  body("direction").isIn(["up", "down"]).withMessage("Vote direction must be up or down"),
  validate,
  asyncRoute(async (req, res) => {
    const post = await PeerPost.findById(req.params.post_id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    if (req.body?.direction === "down") post.down += 1;
    else post.up += 1;
    await post.save();
    res.json(post);
  })
);

app.patch(
  "/api/peer/posts/:post_id",
  asyncRoute(authOptional),
  body("content").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const post = await PeerPost.findById(req.params.post_id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    if (!peerOwnerIds(req).includes(String(post.author_uid || ""))) {
      res.status(403).json({ error: "You can edit only your own post" });
      return;
    }
    const content = String(req.body?.content || "").trim();
    if (!content) {
      res.status(400).json({ error: "Post content is required" });
      return;
    }
    const crisis = crisisRegex.test(content);
    post.content = content;
    if (req.body?.category) post.category = String(req.body.category);
    post.flagged = crisis;
    post.crisis = crisis;
    post.crisisMessage = crisis ? "If this is urgent, contact emergency services or a crisis helpline now." : "";
    await post.save();
    res.json(post);
  })
);

app.delete(
  "/api/peer/posts/:post_id",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    const post = await PeerPost.findById(req.params.post_id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    if (!peerOwnerIds(req).includes(String(post.author_uid || ""))) {
      res.status(403).json({ error: "You can delete only your own post" });
      return;
    }
    await Promise.all([PeerComment.deleteMany({ post_id: post._id }), post.deleteOne()]);
    res.json({ success: true, deletedPostId: String(post._id) });
  })
);

app.get(
  "/api/peer/comments",
  asyncRoute(async (req, res) => {
    const comments = await PeerComment.find({ post_id: req.query.postId }).sort({ created_at: 1 });
    res.json(comments);
  })
);

app.post(
  "/api/peer/comments",
  asyncRoute(authOptional),
  body("post_id").notEmpty().withMessage("Post ID is required"),
  body("content").trim().isLength({ min: 1 }).withMessage("Comment is required").escape(),
  body("alias").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const content = String(req.body?.content || "").trim();
    if (!content || !req.body?.post_id) {
      res.status(400).json({ error: "post_id and content are required" });
      return;
    }
    const crisis = crisisRegex.test(content);
    const comment = await PeerComment.create({
      post_id: req.body.post_id,
      author_uid: req.user ? String(req.user._id) : req.body?.author_uid || "anonymous",
      alias: req.user?.name || req.body?.alias || "Anonymous",
      content,
      flagged: crisis,
      crisis,
      crisisMessage: crisis ? "If this is urgent, contact emergency services or a crisis helpline now." : "",
    });
    res.status(201).json(comment);
  })
);

app.post(
  "/api/peer/emergency-contact",
  asyncRoute(authOptional),
  body("contact").trim().isLength({ min: 1 }).withMessage("Contact is required").escape(),
  body("alias").optional().trim().escape(),
  validate,
  asyncRoute(async (req, res) => {
    const contact = String(req.body?.contact || "").trim();
    if (!contact) {
      res.status(400).json({ error: "Contact number is required" });
      return;
    }
    await createNotification({
      audienceRole: "admin",
      type: "emergency",
      title: "Peer Support Emergency Contact",
      message: `User (alias: ${req.body?.alias || "Anonymous"}) submitted contact: ${contact} for emergency outreach.`,
      metadata: {
        source: "peer-support",
        userName: req.user?.name || req.body?.alias || "Anonymous",
        userEmail: req.user?.email || "",
        contact,
        userId: req.user ? String(req.user._id) : "",
      },
    });
    res.json({ success: true });
  })
);

app.post(
  "/api/peer/reports",
  asyncRoute(authOptional),
  body("reason").trim().isLength({ min: 1 }).withMessage("Reason is required").escape(),
  body("post_id").optional().trim(),
  body("comment_id").optional().trim(),
  validate,
  asyncRoute(async (req, res) => {
    await PeerReport.create({
      post_id: req.body?.post_id,
      comment_id: req.body?.comment_id,
      reporter_uid: req.user ? String(req.user._id) : req.body?.reporter_uid || "anonymous",
      reason: req.body?.reason || "Reported by user",
    });
    res.status(201).json({ success: true });
  })
);
}
