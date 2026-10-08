import express from 'express';
import BreakGlassGrant from '../models/BreakGlassGrant.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 23 §4.2: break-glass queue. Request = breakglass:write (step-up);
// decide = breakglass:approve (step-up) by a DIFFERENT person; sensitive
// subjects (mental/sexual-health, legal) need TWO different approvers.
// Self-approval is impossible: requester approving own request is a 403.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

const REASONS = ['patient_support_consent', 'safety_incident', 'legal_order', 'fraud_investigation', 'data_repair'];
const SUBJECTS = ['patient', 'record', 'booking', 'mental_health'];

// authz: role (breakglass:write)
router.post('/', authorize('breakglass:write'), requireStepUp('phi:breakglass'), async (req, res) => {
  try {
    const { subjectType, subjectId, reasonCode, ticketId, reasonNote, durationMin } = req.body || {};
    if (!SUBJECTS.includes(subjectType)) return res.status(400).json({ message: 'Valid subjectType required' });
    if (!OBJECT_ID.test(String(subjectId))) return res.status(400).json({ message: 'Valid subjectId required' });
    if (!REASONS.includes(reasonCode)) return res.status(400).json({ message: 'Valid reasonCode required' });
    const mins = Math.min(60, Math.max(5, Number(durationMin) || 30));
    const grant = await BreakGlassGrant.create({
      requesterId: actorId(req),
      subject: { type: subjectType, id: subjectId },
      reasonCode, ticketId: String(ticketId || ''), reasonNote: String(reasonNote || ''),
      durationMin: mins,
    });
    await auditLog('breakglass_requested', actorId(req), {
      grantId: grant._id, subjectType, subjectId, reasonCode, ticketId, ip: req.ip,
    });
    return res.status(201).json({ id: String(grant._id), status: grant.status });
  } catch (err) {
    logger.error(`Break-glass request error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (breakglass:read) — approvers/DPO work the queue; requesters see own.
router.get('/', authorize('breakglass:read'), async (req, res) => {
  try {
    const { status, mine } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (mine === '1') filter.requesterId = actorId(req);
    const rows = await BreakGlassGrant.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ grants: rows.map((r) => ({ ...r, id: String(r._id), accessLog: (r.accessLog || []).length })) });
  } catch (err) {
    logger.error(`Break-glass queue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (breakglass:approve) — a DIFFERENT person than the requester.
router.post('/:id/decision', authorize('breakglass:approve'), requireObjectId, requireStepUp('phi:breakglass'), async (req, res) => {
  try {
    const grant = await BreakGlassGrant.findById(req.params.id);
    if (!grant) return res.status(404).json({ message: 'Grant not found' });
    if (grant.status !== 'pending') return res.status(409).json({ message: `Grant is ${grant.status}` });
    const me = String(actorId(req));
    if (String(grant.requesterId) === me) {
      return res.status(403).json({ message: 'Self-approval is not allowed' });
    }
    const { action } = req.body || {};
    if (!['approve', 'deny'].includes(action)) return res.status(400).json({ message: 'action must be approve|deny' });

    if (action === 'deny') {
      grant.status = 'denied';
      grant.approverIds = [...new Set([...grant.approverIds.map(String), me])];
      await grant.save();
      await auditLog('breakglass_denied', actorId(req), { grantId: grant._id, ip: req.ip });
      return res.json({ id: String(grant._id), status: grant.status });
    }

    // Sensitive = mental-health subject or legal order: needs TWO approvers.
    const sensitive = grant.subject.type === 'mental_health' || grant.reasonCode === 'legal_order';
    const distinct = new Set([...grant.approverIds.map(String), me]);
    if (sensitive && distinct.size < 2) {
      // First of two: park, do NOT activate yet.
      grant.approverIds = [...distinct];
      await grant.save();
      await auditLog('breakglass_first_approval', actorId(req), { grantId: grant._id, ip: req.ip });
      return res.json({ id: String(grant._id), status: 'pending', approvals: distinct.size, need: 2 });
    }
    const now = new Date();
    grant.approverIds = [...distinct];
    grant.status = 'approved';
    grant.approvedAt = now;
    grant.expiresAt = new Date(now.getTime() + grant.durationMin * 60 * 1000);
    await grant.save();
    await auditLog('breakglass_approved', actorId(req), {
      grantId: grant._id, subjectType: grant.subject.type, approvals: distinct.size, ip: req.ip,
    });
    return res.json({ id: String(grant._id), status: grant.status, expiresAt: grant.expiresAt });
  } catch (err) {
    logger.error(`Break-glass decision error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (breakglass:approve) — revoke early.
router.post('/:id/revoke', authorize('breakglass:approve'), requireObjectId, async (req, res) => {
  try {
    const grant = await BreakGlassGrant.findById(req.params.id);
    if (!grant) return res.status(404).json({ message: 'Grant not found' });
    if (grant.status !== 'approved') return res.status(409).json({ message: `Grant is ${grant.status}` });
    grant.status = 'revoked';
    grant.revokedAt = new Date();
    await grant.save();
    await auditLog('breakglass_revoked', actorId(req), { grantId: grant._id, ip: req.ip });
    return res.json({ id: String(grant._id), status: grant.status });
  } catch (err) {
    logger.error(`Break-glass revoke error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
