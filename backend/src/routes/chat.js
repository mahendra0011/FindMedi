import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { protect } from '../middleware/auth.js';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatPrivacy from '../models/ChatPrivacy.js';
import ChatReport from '../models/ChatReport.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import bcrypt from 'bcryptjs';
import { emitChatEvent, emitChatNotification } from '../services/socketService.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'chat');
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = (id) => String(id);

async function getConversationForUser(conversationId, userId) {
  const conv = await ChatConversation.findById(conversationId);
  if (!conv) return null;
  if (!conv.participants.some((p) => uid(p) === uid(userId))) return null;
  return conv;
}

function otherParticipantId(conv, userId) {
  const other = conv.participants.find((p) => uid(p) !== uid(userId));
  return other ? uid(other) : null;
}

function otherParticipant(conv, userId) {
  return conv.participants.find((p) => uid(p) !== uid(userId)) || null;
}

function getUnreadCount(conv, userId) {
  return conv.unreadCounts?.find((u) => uid(u.userId) === uid(userId))?.count || 0;
}

async function getPrivacy(userId) {
  let privacy = await ChatPrivacy.findOne({ userId });
  if (!privacy) privacy = await ChatPrivacy.create({ userId });
  return privacy;
}

// ─── Doctor ↔ Patient only chat ─────────────────────────────────────────────
const DOCTOR_ROLES = ['doctor', 'clinic_doctor'];
const isDoctorRole = (role) => DOCTOR_ROLES.includes(role);
/** True jab pair ek doctor aur ek patient ho. */
const isDoctorPatientPair = (roleA, roleB) =>
  (isDoctorRole(roleA) && roleB === 'patient') || (roleA === 'patient' && isDoctorRole(roleB));

/** Any mongoose ref (ObjectId | populated doc | string) → string id */
function plainId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value._id !== undefined) return String(value._id);
  return String(value);
}

/** Hidden messages: delete-for-me + "clear chat" se pehle ke messages */
function messageVisibleToUser(message, conv, userId) {
  const id = uid(userId);
  if ((message.deletedFor || []).some((d) => uid(d) === id)) return false;
  const cleared = (conv.clearedFor || []).find((c) => uid(c.userId) === id);
  if (cleared?.at && new Date(message.createdAt) <= new Date(cleared.at)) return false;
  return true;
}

function senderSnapshot(sender) {
  if (!sender) return null;
  if (typeof sender === 'object' && sender.name !== undefined) {
    return { _id: plainId(sender), name: sender.name, avatar: sender.avatar || '', role: sender.role };
  }
  return { _id: plainId(sender), name: '', avatar: '', role: '' };
}

/**
 * Client ko bhejne layak message shape. Deleted/expired content mask karta hai,
 * reactions ko group karta hai aur receipts sirf sender ko dikhata hai.
 */
function sanitizeMessage(message, userId) {
  const m = message.toObject ? message.toObject() : { ...message };
  const id = uid(userId);
  const deleted = Boolean(m.deletedForEveryone);
  const mine = plainId(m.sender) === id;

  const byEmoji = new Map();
  (m.reactions || []).forEach((r) => {
    const key = r.emoji || '❤️';
    if (!byEmoji.has(key)) byEmoji.set(key, { emoji: key, count: 0, users: [], mine: false });
    const entry = byEmoji.get(key);
    entry.count += 1;
    entry.users.push(plainId(r.userId));
    if (plainId(r.userId) === id) entry.mine = true;
  });
  const reactions = Array.from(byEmoji.values());

  const deliveredTo = (m.deliveredTo || []).map((d) => ({ userId: plainId(d.userId), at: d.at }));
  const readBy = (m.readBy || []).map((d) => ({ userId: plainId(d.userId), at: d.at }));

  let replyTo = null;
  if (m.replyTo && typeof m.replyTo === 'object') {
    replyTo = {
      _id: plainId(m.replyTo),
      content: m.replyTo.deletedForEveryone ? '' : (m.replyTo.content || ''),
      type: m.replyTo.type || 'text',
      sender: plainId(m.replyTo.sender),
      deleted: Boolean(m.replyTo.deletedForEveryone),
    };
  } else if (m.replyTo) {
    replyTo = { _id: plainId(m.replyTo), content: '', type: 'text', sender: null, deleted: false };
  }

  return {
    _id: plainId(m._id),
    conversationId: plainId(m.conversationId),
    sender: senderSnapshot(m.sender),
    type: m.type,
    content: deleted ? '' : (m.content || ''),
    attachments: deleted ? [] : (m.attachments || []),
    replyTo,
    forwarded: Boolean(m.forwarded),
    edited: Boolean(m.edited),
    deletedForEveryone: deleted,
    reactions,
    myReaction: reactions.find((r) => r.mine)?.emoji || null,
    starred: (m.starredBy || []).some((s) => plainId(s) === id),
    mine,
    deliveredCount: deliveredTo.length,
    readCount: readBy.length,
    deliveredTo: mine ? deliveredTo : [],
    readBy: mine ? readBy : [],
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    expiresAt: m.expiresAt || null,
  };
}

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Conversation ke saare participants ke privacy flags respect karte hue response banata hai */
async function decorateConversation(conv, userId) {
  const id = uid(userId);
  const other = (conv.participants || []).find((p) => uid(p._id || p) !== id) || null;
  if (other) {
    const otherPrivacy = await getPrivacy(other._id || other);
    if (otherPrivacy.online !== 'everyone') other.isOnline = false;
    if (otherPrivacy.lastSeen !== 'everyone') delete other.lastActive;
    if (otherPrivacy.profilePhoto !== 'everyone') other.avatar = '';
    if (otherPrivacy.about !== 'everyone') other.about = '';
  }
  return conv;
}

// ── Doctor ↔ Patient contact resolution (appointment-based) ────────────────
/**
 * Ek user ke "linked" counterpart users.
 * patient → jitne doctors ke saath appointment hai
 * doctor  → jitne patients ke saath appointment hai
 */
async function getLinkedContacts(user) {
  const userId = uid(user.id || user._id);
  const role = user.role;

  if (role === 'patient') {
    const appts = await Appointment.find({
      $or: [{ patientId: user._id || userId }, { patientId: { $exists: false }, patient: user.name }],
    }).select('doctorId doctor date status appointmentMode').sort({ date: -1 }).limit(500).lean();

    const byDoctor = new Map();
    appts.forEach((a) => {
      if (!a.doctorId) return;
      const key = String(a.doctorId);
      const entry = byDoctor.get(key) || { name: a.doctor, total: 0, upcoming: 0, lastAt: a.date, modes: new Set() };
      entry.total += 1;
      if (['Pending', 'Confirmed', 'In Queue', 'Serving'].includes(a.status)) entry.upcoming += 1;
      if (a.appointmentMode) entry.modes.add(a.appointmentMode);
      if (a.date && a.date > entry.lastAt) entry.lastAt = a.date;
      byDoctor.set(key, entry);
    });

    if (!byDoctor.size) return [];
    const doctors = await Doctor.find({ _id: { $in: [...byDoctor.keys()] } })
      .populate('user_id', 'name avatar role isOnline lastActive email phone')
      .lean();

    return doctors.map((d) => {
      const meta = byDoctor.get(String(d._id)) || {};
      const account = d.user_id && typeof d.user_id === 'object'
        ? d.user_id
        : { _id: d.user_id || d._id, name: d.name, avatar: d.profile_photo || '', role: 'doctor', email: d.email, phone: d.phone };
      return {
        user: account,
        doctorProfileId: String(d._id),
        doctorName: d.name,
        specialization: d.specialization,
        via: 'appointment',
        appointmentCount: meta.total || 0,
        upcomingCount: meta.upcoming || 0,
        modes: [...(meta.modes || [])],
      };
    }).filter((c) => c.user && c.user._id);
  }

  if (isDoctorRole(role)) {
    const doctorIds = [];
    if (user.doctorProfileId) doctorIds.push(user.doctorProfileId);
    const profile = await Doctor.findOne({ $or: [{ user_id: userId }, { email: user.email }] }).select('_id').lean();
    if (profile?._id) doctorIds.push(profile._id);
    if (!doctorIds.length) return [];

    const appts = await Appointment.find({ doctorId: { $in: doctorIds } })
      .select('patientId patient date status appointmentMode')
      .sort({ date: -1 }).limit(1000).lean();

    const byPatient = new Map();
    appts.forEach((a) => {
      if (!a.patientId) return;
      const key = String(a.patientId);
      const entry = byPatient.get(key) || { total: 0, upcoming: 0, lastAt: a.date, modes: new Set() };
      entry.total += 1;
      if (['Pending', 'Confirmed', 'In Queue', 'Serving'].includes(a.status)) entry.upcoming += 1;
      if (a.appointmentMode) entry.modes.add(a.appointmentMode);
      if (a.date && a.date > entry.lastAt) entry.lastAt = a.date;
      byPatient.set(key, entry);
    });

    if (!byPatient.size) return [];
    const patients = await User.find({ _id: { $in: [...byPatient.keys()] } })
      .select('name avatar role isOnline lastActive uhid phone email gender').lean();

    return patients.map((p) => {
      const meta = byPatient.get(String(p._id)) || {};
      return {
        user: p,
        uhid: p.uhid,
        via: 'appointment',
        appointmentCount: meta.total || 0,
        upcomingCount: meta.upcoming || 0,
        modes: [...(meta.modes || [])],
      };
    });
  }

  return [];
}

/** True jab in dono users ka koi appointment-linked rishta ho (kisi bhi direction me). */
async function hasAppointmentLink(userA, userB) {
  const doctorUser = isDoctorRole(userA.role) ? userA : (isDoctorRole(userB.role) ? userB : null);
  const patientUser = userA.role === 'patient' ? userA : (userB.role === 'patient' ? userB : null);
  if (!doctorUser || !patientUser) return false;

  const doctor = await Doctor.findOne({ user_id: doctorUser._id || doctorUser.id }).select('_id').lean();
  if (!doctor) return false;
  return Boolean(await Appointment.exists({
    doctorId: doctor._id,
    $or: [
      { patientId: patientUser._id || patientUser.id },
      { patientId: { $exists: false }, patient: patientUser.name },
    ],
  }));
}

// ─── File upload (base64 dataURL → /uploads/chat) ───────────────────────────
router.post('/upload', protect, async (req, res) => {
  try {
    const { dataUrl, name = 'file' } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ message: 'dataUrl required' });
    }
    const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!match) return res.status(400).json({ message: 'Invalid dataUrl' });
    const mimeType = match[1] || 'application/octet-stream';
    const isBase64 = match[2] === ';base64';
    const buffer = Buffer.from(match[3], isBase64 ? 'base64' : 'utf8');
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ message: 'File too large (max 25MB)' });
    }
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'application/pdf': 'pdf' };
    const ext = extMap[mimeType] || (path.extname(name).replace('.', '') || 'bin');
    const filename = `${uuidv4()}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    res.json({ url: `/uploads/chat/${filename}`, name, mimeType, size: buffer.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ─── Search users to start a chat ────────────────────────────────────────────
router.get('/search-users', protect, async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const safe = escapeRegex(q);
    const me = req.authUser;
    const myId = uid(me._id);

    // Patient sirf doctors dhoondh sakta hai, doctor sirf patients.
    if (me.role === 'patient') {
      const filter = { approved: true };
      if (safe) {
        filter.$or = [
          { name: { $regex: safe, $options: 'i' } },
          { specialization: { $regex: safe, $options: 'i' } },
          { department: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
        ];
      }
      const doctors = await Doctor.find(filter)
        .populate('user_id', 'name avatar role isOnline lastActive')
        .select('name specialization department profile_photo user_id email phone')
        .limit(Number(limit)).lean();
      return res.json(doctors.map((d) => {
        const account = d.user_id && typeof d.user_id === 'object'
          ? d.user_id
          : { _id: d.user_id || d._id, name: d.name, avatar: d.profile_photo || '', role: 'doctor' };
        return {
          _id: account._id,
          name: account.name || d.name,
          avatar: account.avatar || d.profile_photo || '',
          role: account.role || 'doctor',
          isOnline: account.isOnline,
          lastActive: account.lastActive,
          specialization: d.specialization,
          department: d.department,
        };
      }).filter((u) => u._id && uid(u._id) !== myId));
    }

    if (isDoctorRole(me.role)) {
      const filter = { role: 'patient' };
      if (safe) {
        filter.$or = [
          { name: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
          { phone: { $regex: safe, $options: 'i' } },
          { uhid: { $regex: safe, $options: 'i' } },
        ];
      }
      const patients = await User.find(filter)
        .select('name avatar role isOnline lastActive uhid gender').limit(Number(limit)).lean();
      return res.json(patients.filter((p) => uid(p._id) !== myId));
    }

    return res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Contacts: mere saare doctors / patients (appointments se linked) ────────
router.get('/contacts', protect, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const me = req.authUser;
    if (me.role !== 'patient' && !isDoctorRole(me.role)) {
      return res.json([]);
    }

    let contacts = await getLinkedContacts(me);
    if (q) {
      const safe = escapeRegex(q).toLowerCase();
      contacts = contacts.filter((c) =>
        (c.user?.name || '').toLowerCase().includes(safe) ||
        (c.user?.email || '').toLowerCase().includes(safe) ||
        (c.user?.uhid || '').toLowerCase().includes(safe) ||
        (c.specialization || '').toLowerCase().includes(safe)
      );
    }

    // Last message / unread badge ke liye conversation jodna
    const otherIds = contacts.map((c) => c.user._id);
    const convs = otherIds.length
      ? await ChatConversation.find({ participants: { $all: [me._id], $in: otherIds } })
          .populate('lastMessage', 'content type createdAt sender deletedForEveryone')
          .lean()
      : [];
    const byUser = new Map();
    convs.forEach((c) => {
      const other = c.participants.find((p) => uid(p) !== uid(me._id));
      if (other) byUser.set(uid(other), c);
    });

    const out = contacts.map((c) => {
      const conv = byUser.get(uid(c.user._id)) || null;
      return {
        ...c,
        conversationId: conv?._id || null,
        unreadCount: conv ? getUnreadCount(conv, me._id) : 0,
        lastMessage: conv?.lastMessage
          ? { content: conv.lastMessage.deletedForEveryone ? '' : conv.lastMessage.content, type: conv.lastMessage.type, createdAt: conv.lastMessage.createdAt }
          : null,
        lastMessageAt: conv?.lastMessageAt || null,
      };
    });

    out.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get all conversations (filter: all | archived | unread) ────────────────
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter = 'all' } = req.query;
    // Pending message requests alag section me jaati hain (jab tak main initiator na hoon)
    const convs = await ChatConversation.find({
      participants: userId,
      $or: [
        { requestStatus: { $ne: 'pending' } },
        { initiatedBy: userId },
        { initiatedBy: null },
      ],
    })
      .populate('participants', 'name avatar role isOnline lastActive')
      .populate({
        path: 'lastMessage',
        populate: { path: 'replyTo', select: 'content type sender' },
      })
      .populate('pinnedMessage', 'content type sender createdAt')
      .sort({ lastMessageAt: -1 })
      .lean();

    const out = [];
    for (let conv of convs) {
      const id = uid(userId);
      if (conv.deletedFor?.some((d) => uid(d) === id)) continue;
      if (filter === 'archived' && !conv.archivedBy?.some((a) => uid(a) === id)) continue;
      if (filter === 'all' && conv.archivedBy?.some((a) => uid(a) === id)) continue;
      if (filter === 'locked' && !conv.lockedBy?.some((l) => uid(l.userId) === id)) continue;
      if (filter !== 'locked' && conv.lockedBy?.some((l) => uid(l.userId) === id)) continue;
      const unread = getUnreadCount(conv, userId);
      if (filter === 'unread' && unread === 0) continue;

      // Privacy: other user ne last seen / online hide kiya ho to strip karo
      const other = (conv.participants || []).find((p) => uid(p._id) !== id) || null;
      if (other) {
        const otherPrivacy = await getPrivacy(other._id);
        if (otherPrivacy.online === 'nobody') other.isOnline = false;
        if (otherPrivacy.lastSeen === 'nobody') delete other.lastActive;
      }

      conv.unread = unread;
      conv.pinned = conv.pinnedBy?.some((p) => uid(p) === id) || false;
      conv.muted = conv.mutedBy?.some((m) => uid(m) === id) || false;
      conv.archived = conv.archivedBy?.some((a) => uid(a) === id) || false;
      conv.myDraft = conv.drafts?.find((d) => uid(d.userId) === id)?.text || '';
      conv.requestStatus = conv.requestStatus || 'accepted';
      conv.locked = conv.lockedBy?.some((l) => uid(l.userId) === id) || false;
      conv.myWallpaper = conv.wallpapers?.find((w) => uid(w.userId) === id)?.value || '';
      out.push(conv);
    }
    // Pinned chats first, then latest
    out.sort((a, b) => (b.pinned - a.pinned) || (new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get or create conversation with a user ─────────────────────────────────
router.post('/conversations', protect, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const me = req.authUser;
    const userId = uid(me._id);
    if (!targetUserId) return res.status(400).json({ message: 'targetUserId required' });
    if (userId === uid(targetUserId)) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    const target = await User.findById(targetUserId).select('name avatar role email uhid');
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Sirf doctor ↔ patient chat allowed
    if (!isDoctorPatientPair(me.role, target.role)) {
      return res.status(403).json({ message: 'Chat is available only between a doctor and a patient' });
    }

    let conversation = await ChatConversation.findOne({
      participants: { $all: [me._id, target._id] }
    }).populate('participants', 'name avatar role isOnline lastActive');

    if (!conversation) {
      // Message request: agar appointment-linked nahi hai to recipient ki policy lagti hai
      const linked = await hasAppointmentLink(me, target);
      let requestStatus = 'accepted';
      if (!linked) {
        const targetPrivacy = await getPrivacy(target._id);
        if (targetPrivacy.requestPolicy === 'block') {
          return res.status(403).json({ message: 'This user is not accepting new messages' });
        }
        requestStatus = targetPrivacy.requestPolicy === 'accept' ? 'accepted' : 'pending';
      }

      conversation = new ChatConversation({
        participants: [me._id, target._id],
        initiatedBy: me._id,
        requestStatus,
      });
      await conversation.save();
      await conversation.populate('participants', 'name avatar role isOnline lastActive');

      if (requestStatus === 'pending') {
        emitChatNotification(String(target._id), 'chat:message_request', {
          conversationId: conversation._id,
          from: { _id: me._id, name: me.name, role: me.role },
        });
      }
    } else {
      // "Delete chat" kiya tha to wapas unhide karo
      let changed = false;
      if (conversation.deletedFor?.some((d) => uid(d) === userId)) {
        conversation.deletedFor = conversation.deletedFor.filter((d) => uid(d) !== userId);
        changed = true;
      }
      if (conversation.requestStatus === 'declined') {
        conversation.requestStatus = 'pending';
        changed = true;
      }
      if (changed) await conversation.save();
    }

    await decorateConversation(conversation, userId);
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Message requests (unknown sender → mujhe aayi requests) ────────────────
router.get('/conversations/requests', protect, async (req, res) => {
  try {
    const me = req.authUser;
    const convs = await ChatConversation.find({
      participants: me._id,
      requestStatus: 'pending',
      initiatedBy: { $ne: me._id },
      deletedFor: { $ne: me._id },
    })
      .populate('participants', 'name avatar role isOnline lastActive')
      .populate('lastMessage', 'content type createdAt')
      .sort({ lastMessageAt: -1 })
      .lean();
    res.json(convs.map((c) => ({ ...c, other: otherParticipant(c, me._id) })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/conversations/:conversationId/request', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { action = 'accept' } = req.body; // accept | decline | block
    const me = req.authUser;
    const conv = await getConversationForUser(conversationId, me._id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (conv.initiatedBy && uid(conv.initiatedBy) === uid(me._id)) {
      return res.status(403).json({ message: 'Only the receiver can respond to a request' });
    }

    if (action === 'decline') {
      conv.requestStatus = 'declined';
      if (!conv.deletedFor.some((d) => uid(d) === uid(me._id))) conv.deletedFor.push(me._id);
    } else if (action === 'block') {
      conv.requestStatus = 'declined';
      if (!conv.blockedBy.some((b) => uid(b) === uid(me._id))) conv.blockedBy.push(me._id);
      if (!conv.deletedFor.some((d) => uid(d) === uid(me._id))) conv.deletedFor.push(me._id);
    } else {
      conv.requestStatus = 'accepted';
      conv.deletedFor = conv.deletedFor.filter((d) => uid(d) !== uid(me._id));
      conv.blockedBy = conv.blockedBy.filter((b) => uid(b) !== uid(me._id));
    }

    await conv.save();
    emitChatEvent(conversationId, 'chat:conversation_updated', { conversationId, requestStatus: conv.requestStatus });
    res.json({ success: true, requestStatus: conv.requestStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Privacy / chat settings (get) ───────────────────────────────────────────
router.get('/privacy', protect, async (req, res) => {
  try {
    const privacy = await getPrivacy(req.user.id);
    const out = privacy.toObject();
    out.appLockPinSet = Boolean(out.appLockPinHash);
    delete out.appLockPinHash;
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Privacy / chat settings (update) ────────────────────────────────────────
const PRIVACY_FIELDS = [
  'lastSeen', 'online', 'profilePhoto', 'about', 'readReceipts', 'typingIndicator',
  'recordingIndicator', 'screenshotProtection', 'callsPrivacy', 'silenceUnknownCallers',
  'notificationsEnabled', 'messageNotifications', 'callNotifications', 'reactionNotifications',
  'notificationPreview', 'notificationSound', 'notificationVibration', 'notificationBadge',
  'desktopNotifications', 'enterKeyBehaviour', 'mediaVisibilityInGallery', 'keepArchivedUnmuted',
  'autoArchiveInactive', 'fontScale', 'appLockEnabled', 'appLockScope', 'appLockBiometric',
  'hideLockedNotifications', 'messageRequestsEnabled', 'requestPolicy', 'mediaQuality',
  'autoDeleteDownloaded', 'appearance', 'autoDownload', 'backup',
];

router.put('/privacy', protect, async (req, res) => {
  try {
    const privacy = await getPrivacy(req.user.id);
    PRIVACY_FIELDS.forEach((k) => {
      const v = req.body[k];
      if (v === undefined) return;
      // Nested objects ko merge karo, warna ek field update karne par baaki reset ho jaate.
      if (v && typeof v === 'object' && !Array.isArray(v) && typeof privacy[k] === 'object') {
        privacy[k] = { ...(privacy[k].toObject ? privacy[k].toObject() : privacy[k]), ...v };
        privacy.markModified(k);
      } else {
        privacy[k] = v;
      }
    });

    // App lock enable karne ke liye pehle PIN set hona chahiye
    if (privacy.appLockEnabled && !privacy.appLockPinHash) {
      return res.status(400).json({ message: 'Set an app lock PIN before enabling app lock' });
    }

    await privacy.save();
    const out = privacy.toObject();
    out.appLockPinSet = Boolean(out.appLockPinHash);
    delete out.appLockPinHash;
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// App lock PIN set / change
router.post('/privacy/app-lock/pin', protect, async (req, res) => {
  try {
    const { pin, currentPin } = req.body;
    if (!pin || !/^\d{4,8}$/.test(String(pin))) {
      return res.status(400).json({ message: 'PIN 4–8 digits ka hona chahiye' });
    }
    const privacy = await getPrivacy(req.user.id);
    if (privacy.appLockPinHash) {
      const ok = currentPin ? await bcrypt.compare(String(currentPin), privacy.appLockPinHash) : false;
      if (!ok) return res.status(403).json({ message: 'Current PIN is incorrect' });
    }
    privacy.appLockPinHash = await bcrypt.hash(String(pin), 10);
    await privacy.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/privacy/app-lock/verify', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    const privacy = await getPrivacy(req.user.id);
    if (!privacy.appLockPinHash) return res.json({ success: true, pinSet: false });
    const ok = Boolean(pin) && await bcrypt.compare(String(pin), privacy.appLockPinHash);
    res.json({ success: ok, pinSet: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Storage usage summary (storage & data screen ke liye) ───────────────────
router.get('/storage-usage', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const convs = await ChatConversation.find({ participants: userId }).select('_id').lean();
    const ids = convs.map((c) => c._id);
    const rows = ids.length ? await ChatMessage.find({
      conversationId: { $in: ids },
      'attachments.0': { $exists: true },
      deletedForEveryone: { $ne: true },
    }).select('conversationId attachments type createdAt').lean() : [];

    const byType = { image: 0, video: 0, audio: 0, voice: 0, file: 0 };
    const byChat = new Map();
    let total = 0;
    rows.forEach((m) => {
      const size = (m.attachments || []).reduce((s, a) => s + (a.size || 0), 0);
      total += size;
      byType[m.type] = (byType[m.type] || 0) + size;
      byChat.set(String(m.conversationId), (byChat.get(String(m.conversationId)) || 0) + size);
    });

    const privacy = await getPrivacy(userId);
    const backup = privacy.backup.toObject ? privacy.backup.toObject() : { ...privacy.backup };
    res.json({
      totalBytes: total,
      byType,
      byChat: [...byChat.entries()].map(([conversationId, bytes]) => ({ conversationId, bytes }))
        .sort((a, b) => b.bytes - a.bytes),
      messagesWithMedia: rows.length,
      downloadQuality: privacy.mediaQuality,
      autoDownload: privacy.autoDownload,
      backup: { ...backup, estimatedBytes: total },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Backup trigger (metadata only — transcripts server pe already hain) ───
router.post('/backup/run', protect, async (req, res) => {
  try {
    const privacy = await getPrivacy(req.user.id);
    const convs = await ChatConversation.find({ participants: req.user.id }).select('_id').lean();
    const count = convs.length
      ? await ChatMessage.countDocuments({ conversationId: { $in: convs.map((c) => c._id) } })
      : 0;
    const current = privacy.backup.toObject ? privacy.backup.toObject() : { ...privacy.backup };
    privacy.backup = { ...current, enabled: true, lastBackupAt: new Date(), lastBackupSize: count };
    privacy.markModified('backup');
    await privacy.save();
    res.json({ success: true, backedUpMessages: count, at: privacy.backup.lastBackupAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Report a user / message (safety center) ────────────────────────────────
router.post('/report', protect, async (req, res) => {
  try {
    const { reportedUserId, messageId = null, conversationId = null, reason = 'other', details = '' } = req.body;
    const me = req.authUser;
    if (!reportedUserId) return res.status(400).json({ message: 'reportedUserId required' });
    if (uid(reportedUserId) === uid(me._id)) return res.status(400).json({ message: 'You cannot report yourself' });

    let snapshot = '';
    if (messageId) {
      const msg = await ChatMessage.findById(messageId).select('content type sender conversationId').lean();
      if (msg) snapshot = `${msg.type}: ${(msg.content || '').slice(0, 500)}`;
    }

    const report = await ChatReport.create({
      reporterId: me._id,
      reportedUserId,
      reportedMessageId: messageId || undefined,
      conversationId: conversationId || undefined,
      reason,
      details: String(details).slice(0, 1000),
      messageSnapshot: snapshot,
    });
    res.status(201).json({ success: true, _id: report._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/report/my', protect, async (req, res) => {
  try {
    const reports = await ChatReport.find({ reporterId: req.user.id })
      .populate('reportedUserId', 'name avatar role')
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Blocked users list ──────────────────────────────────────────────────────
router.get('/blocked', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const convs = await ChatConversation.find({
      participants: userId,
      blockedBy: { $elemMatch: { $eq: userId } },
    }).populate('participants', 'name avatar role');
    const blocked = convs.map((c) => otherParticipant(c, userId)).filter(Boolean);
    res.json(blocked);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get messages for a conversation (cleared/deleted filter ke saath) ──────
router.get('/messages/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    let messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('replyTo', 'content type sender attachments createdAt deletedForEveryone')
      .populate('sender', 'name avatar');

    messages = messages.filter((m) => messageVisibleToUser(m, conv, userId));
    res.json(messages.reverse().map((m) => sanitizeMessage(m, userId)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Search within a conversation (text / media / files / links / starred) ──
router.get('/messages/:conversationId/search', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q = '', type = 'all' } = req.query;
    const userId = req.user.id;

    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const filter = { conversationId };
    if (q) filter.content = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (type === 'media') filter.type = { $in: ['image', 'video'] };
    if (type === 'files') filter.type = { $in: ['file', 'audio', 'voice'] };
    if (type === 'links') filter.content = /https?:\/\//.test(q) ? filter.content : { $regex: 'https?://', $options: 'i' };
    if (type === 'starred') filter.starredBy = userId;

    let messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('replyTo', 'content type sender')
      .populate('sender', 'name avatar');

    messages = messages.filter((m) => messageVisibleToUser(m, conv, userId));
    res.json(messages.reverse().map((m) => sanitizeMessage(m, userId)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Send a message (with reply, forward, disappearing, unread counts) ──────
router.post('/messages', protect, async (req, res) => {
  try {
    const { conversationId, content = '', type = 'text', attachments = [], replyTo = null, forwarded = false, clientGeneratedId = '' } = req.body;
    const senderId = req.user.id;

    const conversation = await getConversationForUser(conversationId, senderId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    // Offline queue retry: same clientGeneratedId dobara aaya to duplicate
    // message banane ke bajaye pehla wala hi wapas bheja jata hai.
    if (clientGeneratedId) {
      const existing = await ChatMessage.findOne({ conversationId, sender: senderId, clientGeneratedId })
        .populate('replyTo', 'content type sender deletedForEveryone')
        .populate('sender', 'name avatar');
      if (existing) return res.status(200).json(sanitizeMessage(existing, senderId));
    }

    // Recipient ne block kiya hai to send na ho
    const recipientId = otherParticipantId(conversation, senderId);
    if (recipientId && conversation.blockedBy.some((b) => uid(b) === recipientId)) {
      return res.status(403).json({ message: 'You cannot send messages to this user' });
    }
    if (conversation.blockedBy.some((b) => uid(b) === uid(senderId))) {
      return res.status(403).json({ message: 'Unblock this chat to send messages' });
    }
    if (conversation.requestStatus === 'declined') {
      return res.status(403).json({ message: 'This conversation was declined' });
    }
    // Patient/doctor ke liye content validation — dono me se ek hona chahiye
    const hasText = String(content).trim().length > 0;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!hasText && !hasAttachments) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const message = new ChatMessage({
      conversationId,
      sender: senderId,
      content,
      type,
      attachments,
      replyTo: replyTo || null,
      forwarded: Boolean(forwarded),
      clientGeneratedId: clientGeneratedId || '',
    });

    // Disappearing messages timer
    if (conversation.disappearing?.enabled && conversation.disappearing.durationHours > 0) {
      message.expiresAt = new Date(Date.now() + conversation.disappearing.durationHours * 3600 * 1000);
    }

    await message.save();
    await message.populate('replyTo', 'content type sender deletedForEveryone');
    await message.populate('sender', 'name avatar');

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    // Naya message bhejne par chat list me wapas dikhna chahiye
    conversation.deletedFor = conversation.deletedFor.filter((d) => uid(d) !== uid(senderId));
    // Sender ka draft clear karo
    conversation.drafts = (conversation.drafts || []).filter((d) => uid(d.userId) !== uid(senderId));
    // recipient ka unread count badhao
    if (recipientId) {
      let entry = conversation.unreadCounts.find((u) => uid(u.userId) === recipientId);
      if (entry) entry.count += 1;
      else conversation.unreadCounts.push({ userId: recipientId, count: 1 });
    }
    await conversation.save();

    const payload = sanitizeMessage(message, senderId);
    emitChatEvent(conversationId, 'chat:receive_message', payload);
    if (recipientId) {
      emitChatNotification(recipientId, 'chat:new_message_notification', payload);
    }
    res.status(201).json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Mark messages as read (+ reset unread counter) ─────────────────────────
router.put('/messages/read/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const privacy = await getPrivacy(userId);
    if (privacy.readReceipts) {
      await ChatMessage.updateMany(
        { conversationId, sender: { $ne: userId }, 'readBy.userId': { $ne: userId } },
        { $push: { readBy: { userId, at: new Date() }, deliveredTo: { userId, at: new Date() } } }
      );
    }

    // unread counter reset
    const entry = conv.unreadCounts.find((u) => uid(u.userId) === uid(userId));
    if (entry && entry.count !== 0) {
      entry.count = 0;
      await conv.save();
    }

    emitChatEvent(conversationId, 'chat:read', { conversationId, userId, at: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Mark as delivered ───────────────────────────────────────────────────────
router.put('/messages/delivered/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    await ChatMessage.updateMany(
      { conversationId, sender: { $ne: userId }, 'deliveredTo.userId': { $ne: userId } },
      { $push: { deliveredTo: { userId, at: new Date() } } }
    );
    emitChatEvent(conversationId, 'chat:delivered', { conversationId, userId, at: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Mark as unread (chat list me unread badge wapas) ───────────────────────
router.put('/messages/mark-unread/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    const entry = conv.unreadCounts.find((u) => uid(u.userId) === uid(userId));
    if (entry) entry.count = Math.max(entry.count, 1);
    else conv.unreadCounts.push({ userId, count: 1 });
    await conv.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Conversation settings: mute | block | pin | archive | disappearing ────
router.put('/settings/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { action, value } = req.body;
    const userId = req.user.id;

    const conversation = await getConversationForUser(conversationId, userId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const id = uid(userId);
    const toggle = (arr, on) => {
      const idx = arr.findIndex((x) => uid(x) === id);
      if (on && idx === -1) arr.push(userId);
      if (!on && idx !== -1) arr.splice(idx, 1);
    };

    if (action === 'mute') toggle(conversation.mutedBy, value);
    else if (action === 'block') toggle(conversation.blockedBy, value);
    else if (action === 'pin') toggle(conversation.pinnedBy, value);
    else if (action === 'archive') toggle(conversation.archivedBy, value);
    else if (action === 'lock') {
      conversation.lockedBy = (conversation.lockedBy || []).filter((l) => uid(l.userId) !== id);
      if (value) conversation.lockedBy.push({ userId, at: new Date() });
    } else if (action === 'wallpaper') {
      conversation.wallpapers = (conversation.wallpapers || []).filter((w) => uid(w.userId) !== id);
      if (value) conversation.wallpapers.push({ userId, value: String(value).slice(0, 500) });
    } else if (action === 'disappearing') {
      if (value && value.enabled !== undefined) {
        conversation.disappearing = {
          enabled: Boolean(value.enabled),
          durationHours: Number(value.durationHours) || 24,
          setBy: userId,
        };
      }
    } else {
      return res.status(400).json({ message: 'Unknown action' });
    }

    await conversation.save();
    emitChatEvent(conversationId, 'chat:conversation_updated', { conversationId });
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Clear chat (only for me) ────────────────────────────────────────────────
router.delete('/chat/:conversationId/clear', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    conv.clearedFor = conv.clearedFor.filter((c) => uid(c.userId) !== uid(userId));
    conv.clearedFor.push({ userId, at: new Date() });
    await conv.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Delete chat (sirf meri list se) ─────────────────────────────────────────
router.delete('/chat/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.deletedFor.some((d) => uid(d) === uid(userId))) conv.deletedFor.push(userId);
    await conv.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Draft save / clear ──────────────────────────────────────────────────────
router.put('/chat/:conversationId/draft', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text = '' } = req.body;
    const userId = req.user.id;
    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    conv.drafts = (conv.drafts || []).filter((d) => uid(d.userId) !== uid(userId));
    if (text) conv.drafts.push({ userId, text });
    await conv.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Pin / unpin a message inside the chat ──────────────────────────────────
router.put('/chat/:conversationId/pin-message', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageId = null } = req.body;
    const userId = req.user.id;
    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    conv.pinnedMessage = messageId;
    await conv.save();
    emitChatEvent(conversationId, 'chat:pinned_message', { conversationId, messageId });
    res.json({ success: true, messageId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Message nikaalo + verify karo ki main us conversation ka participant hoon */
async function getMessageForUser(messageId, userId) {
  const message = await ChatMessage.findById(messageId);
  if (!message) return { error: 404, errText: 'Message not found' };
  const conv = await getConversationForUser(message.conversationId, userId);
  if (!conv) return { error: 404, errText: 'Conversation not found' };
  return { message, conv };
}

// ─── Add / change / remove reaction ─────────────────────────────────────────
router.post('/messages/:messageId/reactions', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    if (!emoji) return res.status(400).json({ message: 'emoji required' });

    const { message, conv, error, errText } = await getMessageForUser(messageId, userId);
    if (error) return res.status(error).json({ message: errText });

    const existing = message.reactions.find((r) => uid(r.userId) === uid(userId));
    if (existing && existing.emoji === emoji) {
      // Same emoji dobara → toggle off
      message.reactions = message.reactions.filter((r) => uid(r.userId) !== uid(userId));
    } else if (existing) {
      existing.emoji = emoji;         // change reaction
      existing.at = new Date();
    } else {
      message.reactions.push({ userId, emoji, at: new Date() });
    }
    await message.save();
    await message.populate('sender', 'name avatar');

    const payload = sanitizeMessage(message, userId);
    emitChatEvent(String(conv._id), 'chat:message_reaction', payload);
    const recipientId = otherParticipantId(conv, userId);
    if (recipientId) emitChatNotification(recipientId, 'chat:message_reaction', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Who reacted with what (reaction details sheet) ─────────────────────────
router.get('/messages/:messageId/reactions', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { message, error, errText } = await getMessageForUser(messageId, userId);
    if (error) return res.status(error).json({ message: errText });

    const ids = [...new Set(message.reactions.map((r) => String(r.userId)))];
    const users = await User.find({ _id: { $in: ids } }).select('name avatar role').lean();
    const nameOf = new Map(users.map((u) => [String(u._id), u]));
    res.json(message.reactions.map((r) => ({
      emoji: r.emoji,
      at: r.at,
      mine: uid(r.userId) === uid(userId),
      user: nameOf.get(String(r.userId)) || { _id: r.userId, name: 'Unknown' },
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Edit message (sirf apna, 15 min ke andar, text only) ───────────────────
const EDIT_WINDOW_MS = 15 * 60 * 1000;
router.put('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const { message, conv, error, errText } = await getMessageForUser(messageId, userId);
    if (error) return res.status(error).json({ message: errText });

    if (uid(message.sender) !== uid(userId)) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }
    if (message.deletedForEveryone) {
      return res.status(400).json({ message: 'Deleted messages cannot be edited' });
    }
    if (message.type !== 'text') {
      return res.status(400).json({ message: 'Only text messages can be edited' });
    }
    if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
      return res.status(400).json({ message: 'Edit window (15 min) has expired' });
    }
    if (!String(content || '').trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('sender', 'name avatar');

    const payload = sanitizeMessage(message, userId);
    emitChatEvent(String(conv._id), 'chat:message_edited', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Delete message (for me | for everyone) ────────────────────────────────
router.delete('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { scope = 'me' } = req.query; // me | everyone
    const userId = req.user.id;

    const { message, conv, error, errText } = await getMessageForUser(messageId, userId);
    if (error) return res.status(error).json({ message: errText });

    if (scope === 'everyone') {
      if (uid(message.sender) !== uid(userId)) {
        return res.status(403).json({ message: 'Only the sender can delete for everyone' });
      }
      message.deletedForEveryone = true;
      message.content = '';
      message.attachments = [];
      message.reactions = [];
      await message.save();
      await message.populate('sender', 'name avatar');
      const payload = sanitizeMessage(message, userId);
      emitChatEvent(String(conv._id), 'chat:message_deleted', payload);
      return res.json(payload);
    }

    if (!message.deletedFor.some((d) => uid(d) === uid(userId))) {
      message.deletedFor.push(userId);
    }
    await message.save();
    emitChatEvent(String(conv._id), 'chat:message_deleted', { _id: messageId, conversationId: String(conv._id), scope: 'me', userId });
    res.json({ success: true, scope: 'me', _id: messageId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Bulk select → delete multiple messages ────────────────────────────────
router.post('/messages/bulk-delete', protect, async (req, res) => {
  try {
    const { messageIds = [], scope = 'me' } = req.body;
    const userId = req.user.id;
    if (!Array.isArray(messageIds) || !messageIds.length) {
      return res.status(400).json({ message: 'messageIds required' });
    }

    const messages = await ChatMessage.find({ _id: { $in: messageIds } });
    const affected = new Set();
    let count = 0;
    for (const message of messages) {
      const conv = await getConversationForUser(message.conversationId, userId);
      if (!conv) continue;
      if (scope === 'everyone') {
        if (uid(message.sender) !== uid(userId)) continue;
        message.deletedForEveryone = true;
        message.content = '';
        message.attachments = [];
        message.reactions = [];
      } else if (!message.deletedFor.some((d) => uid(d) === uid(userId))) {
        message.deletedFor.push(userId);
      }
      await message.save();
      affected.add(String(conv._id));
      count += 1;
    }

    affected.forEach((conversationId) => {
      emitChatEvent(conversationId, 'chat:messages_bulk_deleted', { conversationId, messageIds, scope, userId });
    });
    res.json({ success: true, deleted: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Star / unstar message ──────────────────────────────────────────────────
router.put('/messages/:messageId/star', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { starred } = req.body;
    const userId = req.user.id;

    const { message, error, errText } = await getMessageForUser(messageId, userId);
    if (error) return res.status(error).json({ message: errText });

    const isStarred = message.starredBy.some((s) => uid(s) === uid(userId));
    const want = starred === undefined ? !isStarred : Boolean(starred);
    if (want && !isStarred) message.starredBy.push(userId);
    if (!want && isStarred) message.starredBy = message.starredBy.filter((s) => uid(s) !== uid(userId));
    await message.save();
    await message.populate('sender', 'name avatar');
    res.json(sanitizeMessage(message, userId));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Starred / saved messages (chat list → "Starred messages") ──────────────
router.get('/starred', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await ChatMessage.find({ starredBy: userId, deletedForEveryone: { $ne: true } })
      .sort({ createdAt: -1 }).limit(200)
      .populate('sender', 'name avatar')
      .populate('conversationId', 'participants');
    res.json(messages.map((m) => sanitizeMessage(m, userId)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Forward message(s) to another conversation ────────────────────────────
router.post('/messages/forward', protect, async (req, res) => {
  try {
    const { messageIds = [], conversationId } = req.body;
    const userId = req.user.id;
    if (!conversationId || !Array.isArray(messageIds) || !messageIds.length) {
      return res.status(400).json({ message: 'conversationId and messageIds required' });
    }

    const target = await getConversationForUser(conversationId, userId);
    if (!target) return res.status(404).json({ message: 'Target conversation not found' });
    if (target.blockedBy.some((b) => uid(b) === uid(userId))) {
      return res.status(403).json({ message: 'Unblock this chat to send messages' });
    }

    const source = await ChatMessage.find({ _id: { $in: messageIds } }).sort({ createdAt: 1 });
    const created = [];
    for (const m of source) {
      if (m.deletedForEveryone) continue;
      const copy = new ChatMessage({
        conversationId,
        sender: userId,
        content: m.content,
        type: m.type,
        attachments: m.attachments,
        forwarded: true,
      });
      await copy.save();
      await copy.populate('sender', 'name avatar');
      created.push(copy);
    }
    if (!created.length) return res.status(400).json({ message: 'Nothing to forward' });

    const recipientId = otherParticipantId(target, userId);
    const last = created[created.length - 1];
    target.lastMessage = last._id;
    target.lastMessageAt = last.createdAt;
    target.deletedFor = target.deletedFor.filter((d) => uid(d) !== uid(userId));
    if (recipientId) {
      const entry = target.unreadCounts.find((u) => uid(u.userId) === recipientId);
      if (entry) entry.count += created.length;
      else target.unreadCounts.push({ userId: recipientId, count: created.length });
    }
    await target.save();

    const payloads = created.map((m) => sanitizeMessage(m, userId));
    payloads.forEach((p) => emitChatEvent(String(target._id), 'chat:receive_message', p));
    if (recipientId) emitChatNotification(recipientId, 'chat:new_message_notification', payloads[payloads.length - 1]);
    res.status(201).json(payloads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Message info (delivery + read timestamps) ─────────────────────────────
router.get('/messages/:messageId/info', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { message, error, errText } = await getMessageForUser(messageId, userId);
    if (error) return res.status(error).json({ message: errText });

    const ids = [...new Set([
      ...message.deliveredTo.map((d) => String(d.userId)),
      ...message.readBy.map((r) => String(r.userId)),
    ])];
    const users = await User.find({ _id: { $in: ids } }).select('name avatar role').lean();
    const nameOf = new Map(users.map((u) => [String(u._id), u]));

    res.json({
      _id: String(message._id),
      sentAt: message.createdAt,
      editedAt: message.editedAt || null,
      delivered: message.deliveredTo.map((d) => ({ at: d.at, user: nameOf.get(String(d.userId)) || { _id: d.userId } })),
      read: message.readBy.map((r) => ({ at: r.at, user: nameOf.get(String(r.userId)) || { _id: r.userId } })),
      starredByMe: message.starredBy.some((s) => uid(s) === uid(userId)),
      reactions: sanitizeMessage(message, userId).reactions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Media / links / files gallery for a conversation ──────────────────────
router.get('/messages/:conversationId/media', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { type = 'media' } = req.query; // media | files | links | voice
    const userId = req.user.id;

    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const filter = { conversationId, deletedForEveryone: { $ne: true } };
    if (type === 'media') filter.type = { $in: ['image', 'video'] };
    else if (type === 'files') filter.type = { $in: ['file', 'audio'] };
    else if (type === 'voice') filter.type = 'voice';
    else if (type === 'links') filter.content = { $regex: 'https?://', $options: 'i' };

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 }).limit(300)
      .populate('sender', 'name avatar');
    res.json(messages.filter((m) => messageVisibleToUser(m, conv, userId)).map((m) => sanitizeMessage(m, userId)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Global search: people + messages across all chats ────────────────────
router.get('/global-search', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q = '', filter = 'all' } = req.query;
    const safe = escapeRegex(q);

    const convs = await ChatConversation.find({ participants: userId }).select('_id participants').lean();
    const convIds = convs.map((c) => c._id);

    const filterObj = { conversationId: { $in: convIds }, deletedForEveryone: { $ne: true }, deletedFor: { $ne: userId } };
    if (safe) filterObj.content = { $regex: safe, $options: 'i' };
    if (filter === 'media') filterObj.type = { $in: ['image', 'video'] };
    if (filter === 'files') filterObj.type = { $in: ['file', 'audio', 'voice'] };
    if (filter === 'links') filterObj.content = { $regex: 'https?://', $options: 'i' };

    const messages = (convIds.length && (safe || filter !== 'all'))
      ? await ChatMessage.find(filterObj).sort({ createdAt: -1 }).limit(100)
          .populate('sender', 'name avatar')
      : [];

    let people = [];
    if (safe) {
      const convOtherIds = convs
        .flatMap((c) => c.participants.map(String))
        .filter((p) => p !== String(userId));
      people = await User.find({
        _id: { $in: [...new Set(convOtherIds)] },
        $or: [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }],
      }).select('name avatar role isOnline').limit(20).lean();
    }

    res.json({
      people,
      messages: messages.map((m) => sanitizeMessage(m, userId)),
      counts: { people: people.length, messages: messages.length },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Suspicious / medical link check (link preview safety warning) ────────
router.post('/link-check', protect, (req, res) => {
  const { url = '' } = req.body;
  const suspicious = /(bit\.ly|tinyurl|t\.co|is\.gd|goo\.gl|\.tk\/|\.xyz\/|free-|win-|claim-)/i.test(String(url));
  const medical = /(medicine|pharma|drug|tablet|syrup|dose|prescription)/i.test(String(url));
  res.json({
    suspicious,
    medical,
    warning: suspicious ? 'This link looks suspicious. Do not share personal or payment details.' : '',
  });
});

export default router;
