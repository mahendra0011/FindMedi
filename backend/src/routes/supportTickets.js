import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import crypto from 'node:crypto';
import { z } from 'zod';
import express from 'express';
import SupportTicket from '../models/SupportTicket.js';
import SupportAssistSession from '../models/SupportAssistSession.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, createSupportTicketSchema, ticketCsatSchema } from '../utils/validate.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import { roleHasPermission } from '../config/permissions.js';
import { auditLogRequired } from '../middleware/audit.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { supportAssistCodeLimiter, supportAssistVerifyLimiter, supportAssistRevealLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const VALID_STATUSES = ['Open', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const PLATFORM_SUPPORT_ROLES = new Set(['support_agent', 'support_l1', 'support_l2', 'superadmin', 'super_admin']);

const safeSupportTicket = (ticket) => {
  const value = typeof ticket?.toObject === 'function' ? ticket.toObject() : ticket;
  const row = {
    _id: value._id,
    ticketId: value.ticketId,
    category: value.category,
    priority: value.priority,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    slaDueAt: value.slaDueAt,
    assignedTo: value.assignedTo,
    assignedToName: value.assignedToName,
    raisedByName: 'Customer',
    subject: 'Support request',
    description: 'Request details are hidden until a patient-authorized assist session is available.',
    messages: [],
  };
  return row;
};

const ticketView = (ticket, req) => (PLATFORM_SUPPORT_ROLES.has(req.user?.role) ? safeSupportTicket(ticket) : ticket);
const patientSafeTicket = (ticket) => {
  const row = typeof ticket?.toObject === 'function' ? ticket.toObject() : { ...ticket };
  delete row.raisedBy;
  return row;
};

const generateTicketId = async () => generateTimestampedId('TKT');
const assistFields = ['name', 'phone', 'email'];
const assistRequestSchema = z.object({}).strict();
const assistVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  reason: z.string().trim().min(20).max(300),
  fields: z.array(z.enum(assistFields)).min(1).max(3),
}).strict();
const assistPepper = () => process.env.SUPPORT_ASSIST_PEPPER || process.env.JWT_SECRET;
const hashAssistCode = (code) => {
  const pepper = assistPepper();
  if (!pepper) throw new Error('Support assist code secret is not configured');
  return crypto.createHmac('sha256', pepper).update(code).digest('hex');
};

const safePlatformTicketUpdate = (ticket, req) => (
  PLATFORM_SUPPORT_ROLES.has(req.user?.role) ? safeSupportTicket(ticket) : ticket
);

router.post('/', protect, authorize('support:write', 'support:write:own'), validate(createSupportTicketSchema), async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    const ticketId = await generateTicketId();
    const ticket = await SupportTicket.create({
      ticketId,
      raisedBy: req.user._id,
      raisedByName: req.user.name,
      subject,
      description: message,
      category,
      priority,
      status: 'Open',
    });
    res.status(201).json(patientSafeTicket(ticket));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my-tickets', protect, authorize('support:read', 'support:read:own'), async (req, res) => {
  try {
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role) || req.user.role !== 'patient') return res.status(403).json({ message: 'Patient ticket list only' });
    const tickets = await SupportTicket.find({ raisedBy: req.user._id }).select('_id ticketId category priority status createdAt updatedAt slaDueAt subject description messages').sort({ createdAt: -1 });
    res.json({ tickets: tickets.map(patientSafeTicket) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', protect, authorize('support:read', 'support:read:own'), async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    if (req.user.role === 'patient' && (priority || category || search)) return res.status(400).json({ message: 'Use your own tickets view' });
    if (!PLATFORM_SUPPORT_ROLES.has(req.user.role) && req.user.role !== 'patient') return res.status(403).json({ message: 'Patient ticket list only' });
    const filter = req.user.role === 'patient' ? { raisedBy: req.user._id } : {};
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role) && !['support_l1', 'support_l2'].includes(req.user.role)) return res.status(403).json({ message: 'Support operator inbox only' });
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      filter.status = status;
    }
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search && PLATFORM_SUPPORT_ROLES.has(req.user.role)) {
      filter.ticketId = new RegExp(escapeRegex(capSearch(search)), 'i');
    }
    // Platform support can locate cases by ticket ID only. Free-text identity
    // and symptom search is deliberately not available in the masked inbox.
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role)) filter.assignedTo = req.user._id;
    const tickets = await SupportTicket.find(filter).select('_id ticketId category priority status createdAt updatedAt slaDueAt assignedTo assignedToName').sort({ createdAt: -1 }).limit(100);
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role)) {
      await auditLogRequired('support_ticket_queue_viewed', req.user._id, {
        count: tickets.length, status: status || '', category: category || '', ip: req.ip,
      });
    }
    res.json({ tickets: tickets.map((ticket) => ticketView(ticket, req)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, authorize('support:manage'), async (req, res) => {
  try {
    if (req.user.role !== 'support_l2') return res.status(403).json({ message: 'Support L2 queue metrics only' });
    const scoped = { assignedTo: req.user._id };
    const total = await SupportTicket.countDocuments(scoped);
    const open = await SupportTicket.countDocuments({ ...scoped, status: 'Open' });
    const inProgress = await SupportTicket.countDocuments({ ...scoped, status: 'In Progress' });
    const urgent = await SupportTicket.countDocuments({ ...scoped, priority: 'Urgent', status: { $nin: ['Resolved', 'Closed'] } });
    await auditLogRequired('support_ticket_stats_viewed', req.user._id, { ip: req.ip });
    return res.json({ total, open, inProgress, resolved: await SupportTicket.countDocuments({ ...scoped, status: 'Resolved' }), closed: await SupportTicket.countDocuments({ ...scoped, status: 'Closed' }), urgent });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, authorize('support:read', 'support:read:own'), requireObjectId, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('raisedBy', 'name email');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const isOwner = String(ticket.raisedBy?._id || ticket.raisedBy) === String(req.user._id);
    if (req.user.role === 'patient' && !isOwner) return res.status(404).json({ message: 'Ticket not found' });
    if (!PLATFORM_SUPPORT_ROLES.has(req.user.role) && req.user.role !== 'patient') return res.status(403).json({ message: 'Support operator or ticket owner access required' });
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role)
      && (req.user.role !== 'support_l2' || String(ticket.assignedTo || '') !== String(req.user._id))) {
      return res.status(403).json({ message: 'Only the assigned L2 operator can open ticket details' });
    }
    const consent = PLATFORM_SUPPORT_ROLES.has(req.user.role)
      ? await SupportAssistSession.findOne({ ticketId: ticket._id, patientId: ticket.raisedBy?._id || ticket.raisedBy, operatorId: req.user._id, status: 'active', sessionExpiresAt: { $gt: new Date() } })
      : null;
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role) && !consent) return res.status(403).json({ message: 'A current patient-consented assist session is required to view ticket content' });
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role)) await SupportAssistSession.updateMany(
      { ticketId: ticket._id, operatorId: req.user._id, status: 'active', sessionExpiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } },
    );
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role)) {
      await auditLogRequired('support_ticket_viewed', req.user._id, { ticketId: ticket.ticketId, ip: req.ip });
    }
    return res.json({ ticket: PLATFORM_SUPPORT_ROLES.has(req.user.role) ? ticket : patientSafeTicket(ticket) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// Patient shares a short-lived code from the app with support for one ticket.
// The code is returned only on the authenticated patient session and stored as
// a keyed digest. It never unlocks clinical records.
router.post('/:id/assist/request', protect, authorize('support:write:own'), supportAssistCodeLimiter, requireObjectId, validate(assistRequestSchema), async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Patient session required' });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, raisedBy: req.user._id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const active = await SupportAssistSession.findOne({ ticketId: ticket._id, patientId: req.user._id, status: 'active', sessionExpiresAt: { $gt: new Date() } });
    if (active) return res.status(409).json({ message: 'An assist session is already active for this ticket' });
    await SupportAssistSession.updateMany({ ticketId: ticket._id, patientId: req.user._id, status: 'pending' }, { $set: { status: 'expired' } });
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const codeExpiresAt = new Date(Date.now() + 5 * 60_000);
    const session = await SupportAssistSession.create({
      ticketId: ticket._id, patientId: req.user._id, codeHash: hashAssistCode(code), codeExpiresAt,
    });
    await auditLogRequired('support_assist_code_requested', req.user._id, { ticketId: ticket.ticketId, sessionId: session._id, ip: req.ip });
    return res.status(201).json({ code, expiresAt: codeExpiresAt, message: 'Share this code with your assigned support operator. It is valid for five minutes.' });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// L2 reveals only selected contact fields for one assigned ticket, after patient
// consent, reason capture and a fresh TOTP/passkey step-up.
router.post('/:id/assist/verify', protect, authorize('support:manage'), supportAssistVerifyLimiter, requireObjectId, validate(assistVerifySchema), requireStepUp('support:assist-reveal', { requireEnrolled: true }), async (req, res) => {
  try {
    if (req.user.role !== 'support_l2') return res.status(403).json({ message: 'Support L2 role required' });
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (String(ticket.assignedTo || '') !== String(req.user._id)) return res.status(403).json({ message: 'Only the assigned operator can request a reveal' });
    const now = new Date();
    const attemptSession = await SupportAssistSession.findOne({
      ticketId: ticket._id, patientId: ticket.raisedBy, status: 'pending', consumedAt: null,
      codeExpiresAt: { $gt: now },
    }).select('+codeHash');
    if (!attemptSession || attemptSession.attempts >= 5) return res.status(403).json({ message: 'No valid patient assist code is available' });
    const session = await SupportAssistSession.findOneAndUpdate(
      { _id: attemptSession._id, status: 'pending', consumedAt: null, attempts: { $lt: 5 }, codeExpiresAt: { $gt: now } },
      { $inc: { attempts: 1 } }, { new: true },
    ).select('+codeHash');
    if (!session) return res.status(409).json({ message: 'Assist code is being verified; retry once' });
    const supplied = Buffer.from(hashAssistCode(req.body.code), 'hex');
    const expected = Buffer.from(session.codeHash, 'hex');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      if (session.attempts >= 5) await SupportAssistSession.updateOne({ _id: session._id, status: 'pending' }, { $set: { status: 'expired' } });
      await auditLogRequired('support_assist_code_rejected', req.user._id, { ticketId: ticket.ticketId, sessionId: session._id, ip: req.ip });
      return res.status(403).json({ message: 'Assist code is invalid or expired' });
    }
    const sessionExpiresAt = new Date(Date.now() + 15 * 60_000);
    const active = await SupportAssistSession.findOneAndUpdate(
      { _id: session._id, status: 'pending', consumedAt: null, attempts: { $lte: 5 }, codeExpiresAt: { $gt: now } },
      { $set: { status: 'active', consumedAt: now, operatorId: req.user._id, reason: req.body.reason.trim(), fields: [...new Set(req.body.fields)], sessionExpiresAt } },
      { new: true },
    );
    if (!active) return res.status(409).json({ message: 'Assist code was already used; request a new code' });
    try {
      await auditLogRequired('support_assist_session_opened', req.user._id, {
        ticketId: ticket.ticketId, sessionId: active._id, fields: active.fields, reason: active.reason, expiresAt: sessionExpiresAt, ip: req.ip,
      });
    } catch (auditError) {
      await SupportAssistSession.updateOne({ _id: active._id, status: 'active' }, { $set: { status: 'revoked', revokedAt: new Date() } });
      throw auditError;
    }
    return res.json({ sessionId: String(active._id), fields: active.fields, expiresAt: sessionExpiresAt });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.get('/:id/assist/contact', protect, authorize('support:manage'), supportAssistRevealLimiter, requireObjectId, requireStepUp('support:assist-reveal', { requireEnrolled: true }), async (req, res) => {
  try {
    if (req.user.role !== 'support_l2') return res.status(403).json({ message: 'Support L2 role required' });
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket || String(ticket.assignedTo || '') !== String(req.user._id)) return res.status(404).json({ message: 'Ticket not found' });
    const session = await SupportAssistSession.findOne({
      ticketId: ticket._id, patientId: ticket.raisedBy, operatorId: req.user._id,
      status: 'active', sessionExpiresAt: { $gt: new Date() },
    });
    if (!session) return res.status(403).json({ message: 'No active patient-authorized assist session' });
    const fields = [...new Set(session.fields)].filter((field) => assistFields.includes(field));
    const patient = await User.findById(ticket.raisedBy).select(fields.join(' ')).lean();
    if (!patient) return res.status(404).json({ message: 'Customer not found' });
    await auditLogRequired('support_assist_contact_revealed', req.user._id, {
      ticketId: ticket.ticketId, sessionId: session._id, fields, reason: session.reason, ip: req.ip,
    });
    return res.json({ fields: Object.fromEntries(fields.map((field) => [field, patient[field] || ''])), expiresAt: session.sessionExpiresAt });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.post('/:id/assist/renew', protect, authorize('support:write:own'), requireObjectId, validate(assistRequestSchema), async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Patient session required' });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, raisedBy: req.user._id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const revoked = await SupportAssistSession.updateMany(
      { ticketId: ticket._id, patientId: req.user._id, status: 'active', sessionExpiresAt: { $gt: new Date() } },
      { $set: { status: 'revoked', revokedAt: new Date() } },
    );
    if (!revoked.modifiedCount) return res.status(409).json({ message: 'No live session to renew' });
    await auditLogRequired('support_assist_session_renewed', req.user._id, { ticketId: ticket.ticketId, ip: req.ip });
    return res.json({ renewed: true, message: 'Current session revoked. Request a new code to authorize again.' });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.post('/:id/assist/revoke', protect, authorize('support:write:own'), requireObjectId, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Patient session required' });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, raisedBy: req.user._id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    await SupportAssistSession.updateMany(
      { ticketId: ticket._id, patientId: req.user._id, status: { $in: ['pending', 'active'] } },
      { $set: { status: 'revoked', revokedAt: new Date() } },
    );
    await auditLogRequired('support_assist_session_revoked', req.user._id, { ticketId: ticket.ticketId, ip: req.ip });
    return res.json({ revoked: true });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});


router.put('/:id/status', protect, authorize('support:manage'), requireObjectId, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const existing = await SupportTicket.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Ticket not found' });
    if (!['superadmin', 'super_admin'].includes(req.user.role)) return res.status(403).json({ message: 'Super Admin status management required' });
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    await auditLogRequired('support_ticket_status_changed', req.user._id, { ticketId: ticket.ticketId, status, ip: req.ip });
    res.json(safePlatformTicketUpdate(ticket, req));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, authorize('support:manage'), requireObjectId, async (req, res) => {
  try {
    if (!['superadmin', 'super_admin'].includes(req.user.role)) return res.status(403).json({ message: 'Super Admin assignment required' });
    const assignee = await User.findById(req.body.assignedTo).select('_id name role');
    if (!assignee || assignee.role !== 'support_l2') {
      return res.status(400).json({ message: 'A Support L2 operator is required for ticket content access' });
    }
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id,
      { assignedTo: assignee._id, assignedToName: assignee.name, status: 'In Progress' }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    await auditLogRequired('support_ticket_assigned', req.user._id, { ticketId: ticket.ticketId, assignedTo: String(assignee._id), ip: req.ip });
    res.json(safePlatformTicketUpdate(ticket, req));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/messages', protect, authorize('support:write', 'support:write:own'), requireObjectId, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const isOwner = String(ticket.raisedBy) === String(req.user._id);
    const isAssigned = String(ticket.assignedTo || '') === String(req.user._id);
    if (req.user.role === 'patient' && !isOwner) return res.status(404).json({ message: 'Ticket not found' });
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role)) {
      if (req.user.role !== 'support_l2' || !isAssigned) return res.status(403).json({ message: 'Only the assigned L2 operator can reply' });
    }
    ticket.messages.push({ sender: req.user._id, senderName: req.user.name, message: req.body.message });
    ticket.status = 'In Progress';
    await ticket.save();
    if (PLATFORM_SUPPORT_ROLES.has(req.user.role)) {
      await auditLogRequired('support_ticket_replied', req.user._id, { ticketId: ticket.ticketId, ip: req.ip });
    }
    res.json(ticketView(ticket, req));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// CSAT: rated once, by the raiser, on a resolved/closed ticket. Staff reply
// rates nothing; a second rating is a 409, not a silent overwrite.
// authz: self (raiser owns the row)
router.post('/:id/csat', protect, authorize('support:write', 'support:write:own'), requireObjectId, validate(ticketCsatSchema), async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, raisedBy: req.user._id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!['Resolved', 'Closed'].includes(ticket.status)) {
      return res.status(409).json({ message: 'Rate only after resolution', code: 'NOT_RESOLVED' });
    }
    if (ticket.csat?.rating) {
      return res.status(409).json({ message: 'Already rated', code: 'ALREADY_RATED' });
    }
    ticket.csat = { rating: req.body.rating, at: new Date() };
    await ticket.save();
    return res.json({ rating: ticket.csat.rating });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
