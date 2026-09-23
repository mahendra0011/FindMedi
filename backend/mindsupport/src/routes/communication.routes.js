import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

export function registerCommunicationRoutes(app, context) {
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

const maxAttachmentDataUrlLength = 7500000;

function emitRealtime(io, room, event, payload) {
  try { io?.to(room)?.emit(event, payload); } catch { /* ignore */ }
  try {
    const mainIo = global.__mainIo;
    if (mainIo && mainIo !== io) mainIo.to(room).emit(event, payload);
  } catch { /* ignore */ }
}

function normalizeMessageAttachment(body = {}) {
  const rawUrl = String(body.fileUrl || "").trim();
  const rawName = String(body.fileName || "").trim().slice(0, 120);
  const rawType = String(body.fileType || "").trim().slice(0, 80);

  if (!rawUrl) return { fileName: "", fileUrl: "", fileType: "" };

  if (rawUrl.startsWith("data:")) {
    if (rawUrl.length > maxAttachmentDataUrlLength) {
      throw new Error("Attachment must be 5 MB or smaller");
    }
    const match = rawUrl.match(/^data:([^;,]+);base64,/i);
    const mime = match?.[1]?.toLowerCase() || "";
    if (!(mime === "application/pdf" || mime.startsWith("image/"))) {
      throw new Error("Only image files and PDFs can be attached");
    }
    return {
      fileName: rawName || (mime === "application/pdf" ? "attachment.pdf" : "image attachment"),
      fileUrl: rawUrl,
      fileType: mime,
    };
  }

  return {
    fileName: rawName || "Shared file",
    fileUrl: rawUrl.slice(0, 500),
    fileType: rawType,
  };
}

app.get(
  "/api/messages",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    let query = { deletedAt: null, $or: [{ from: req.user._id }, { to: req.user._id }] };
    if (req.query.peer) {
      const peer = await findUserByIdentifier(req.query.peer);
      if (peer) {
        if (!(await canMessageUser(req.user, peer))) {
          res.status(403).json({ error: "Book this counsellor before using secure chat" });
          return;
        }
        query.$or = [
          { from: req.user._id, to: peer._id },
          { from: peer._id, to: req.user._id },
        ];
      }
    } else if (req.user.role === "user") {
      const appointments = await Appointment.find({
        student: req.user._id,
        status: { $in: ["pending", "confirmed", "completed"] },
      }).select("counsellor");
      const counsellorIds = appointments.map((appointment) => appointment.counsellor).filter(Boolean);
      if (counsellorIds.length === 0) {
        res.json([]);
        return;
      }
      query = {
        deletedAt: null,
        $or: [
          { from: req.user._id, to: { $in: counsellorIds } },
          { from: { $in: counsellorIds }, to: req.user._id },
        ],
      };
    } else if (req.user.role === "counsellor") {
      const appointments = await Appointment.find({
        counsellor: req.user._id,
        status: { $in: ["pending", "confirmed", "completed"] },
      }).select("student");
      const studentIds = appointments.map((appointment) => appointment.student).filter(Boolean);
      if (studentIds.length === 0) {
        res.json([]);
        return;
      }
      query = {
        deletedAt: null,
        $or: [
          { from: req.user._id, to: { $in: studentIds } },
          { from: { $in: studentIds }, to: req.user._id },
        ],
      };
    }
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(80)
      .populate("from to appointment")
      .populate({ path: "replyTo", populate: { path: "from", select: "name username" } });
    res.json(messages.map((message) => normalizeMessage(message, req.user)));
  })
);

app.post(
  "/api/messages",
  body("text").trim().isLength({ min: 1 }).withMessage("Message text is required").escape(),
  body("subject").optional().trim().escape(),
  body("to").optional().trim(),
  validate,
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const recipient = await findUserByIdentifier(req.body?.to);
    if (!recipient) {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }
    if (!(await canMessageUser(req.user, recipient))) {
      res.status(403).json({ error: "Book this counsellor before using secure chat" });
      return;
    }
    const text = String(req.body?.text || "").trim();
    let attachment;
    try {
      attachment = normalizeMessageAttachment(req.body);
    } catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (!text && !attachment.fileUrl) {
      res.status(400).json({ error: "Message text or attachment is required" });
      return;
    }
    let appointment = null;
    if (req.body?.appointmentId && mongoose.isValidObjectId(req.body.appointmentId)) {
      appointment = await Appointment.findOne({
        _id: req.body.appointmentId,
        $or: [
          { student: req.user._id, counsellor: recipient._id },
          { student: recipient._id, counsellor: req.user._id },
        ],
        status: { $in: ["pending", "confirmed", "completed"] },
      });
    }
    if (!appointment) {
      appointment = await Appointment.findOne({
        $or: [
          { student: req.user._id, counsellor: recipient._id },
          { student: recipient._id, counsellor: req.user._id },
        ],
        status: { $in: ["pending", "confirmed", "completed"] },
      }).sort({ date: -1, time: -1 });
    }
    let replyTo = null;
    if (req.body?.replyTo && mongoose.isValidObjectId(req.body.replyTo)) {
      replyTo = await Message.findOne({
        _id: req.body.replyTo,
        deletedAt: null,
        $or: [
          { from: req.user._id, to: recipient._id },
          { from: recipient._id, to: req.user._id },
        ],
      });
    }
    const message = await Message.create({
      from: req.user._id,
      to: recipient._id,
      appointment: appointment?._id,
      replyTo: replyTo?._id,
      subject: String(req.body?.subject || "Message").trim().slice(0, 100) || "Message",
      text: text.slice(0, 2000),
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileType: attachment.fileType,
      task: String(req.body?.task || "").trim().slice(0, 500),
      readBy: [req.user._id],
    });
    const populatedMessage = await message.populate("from to appointment replyTo");
    emitRealtime(io, `user:${recipient._id}`, "message:new", normalizeMessage(populatedMessage, recipient));
    emitRealtime(io, `user:${req.user._id}`, "message:new", normalizeMessage(populatedMessage, req.user));
    await createNotification({
      user: recipient._id,
      type: "message",
      title: "New secure message",
      message: `${req.user.name} sent: ${message.subject}`,
      metadata: { messageId: String(message._id) },
    });
    res.status(201).json(normalizeMessage(populatedMessage, req.user));
  })
);

app.patch(
  "/api/messages/:id/read",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const message = await Message.findOne({ _id: req.params.id, deletedAt: null, $or: [{ from: req.user._id }, { to: req.user._id }] });
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (!message.readBy.map(String).includes(String(req.user._id))) {
      message.readBy.push(req.user._id);
      await message.save();
    }
    res.json(normalizeMessage(await message.populate("from to appointment replyTo"), req.user));
  })
);

app.patch(
  "/api/messages/:id",
  body("text").trim().isLength({ min: 1 }).withMessage("Message text is required").escape(),
  validate,
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const message = await Message.findOne({ _id: req.params.id, from: req.user._id, deletedAt: null });
    if (!message || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    const text = String(req.body?.text || "").trim();
    if (!text) {
      res.status(400).json({ error: "Message text is required" });
      return;
    }
    message.text = text.slice(0, 2000);
    if ("task" in req.body) message.task = String(req.body.task || "").trim().slice(0, 500);
    message.editedAt = new Date();
    await message.save();
    const fromId = String(message.from);
    const toId = String(message.to);
    const populated = await message.populate("from to appointment replyTo");
    emitRealtime(io, `user:${toId}`, "message:new", normalizeMessage(populated, { _id: toId }));
    emitRealtime(io, `user:${fromId}`, "message:new", normalizeMessage(populated, req.user));
    res.json(normalizeMessage(populated, req.user));
  })
);

app.delete(
  "/api/messages/:id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const message = await Message.findOne({ _id: req.params.id, deletedAt: null, $or: [{ from: req.user._id }, { to: req.user._id }] });
    if (!message || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();
    const fromId = String(message.from);
    const toId = String(message.to);
    const deletedPayload = { id: String(message._id), deleted: true };
    emitRealtime(io, `user:${toId}`, "message:new", deletedPayload);
    emitRealtime(io, `user:${fromId}`, "message:new", deletedPayload);
    res.json({ success: true, deletedMessageId: String(message._id) });
  })
);

app.post(
  "/api/messages/:id/reactions",
  body("emoji").trim().isLength({ min: 1 }).withMessage("Emoji is required").escape(),
  validate,
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const emoji = String(req.body?.emoji || "").trim().slice(0, 16);
    if (!emoji) {
      res.status(400).json({ error: "Reaction emoji is required" });
      return;
    }
    const message = await Message.findOne({ _id: req.params.id, deletedAt: null, $or: [{ from: req.user._id }, { to: req.user._id }] });
    if (!message || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    const existingIndex = (message.reactions || []).findIndex((reaction) => String(reaction.user) === String(req.user._id) && reaction.emoji === emoji);
    let addedReaction = false;
    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ user: req.user._id, emoji });
      addedReaction = true;
    }
    await message.save();
    const fromId = String(message.from);
    const toId = String(message.to);
    const populated = await message.populate("from to appointment replyTo");
    emitRealtime(io, `user:${toId}`, "message:new", normalizeMessage(populated, { _id: toId }));
    emitRealtime(io, `user:${fromId}`, "message:new", normalizeMessage(populated, { _id: fromId }));
    if (addedReaction && fromId !== String(req.user._id)) {
      await createNotification({
        user: fromId,
        type: "message",
        title: "New chat reaction",
        message: `${req.user.name} reacted to your message.`,
        metadata: { messageId: String(message._id) },
      });
    }
    res.json(normalizeMessage(populated, req.user));
  })
);
}
