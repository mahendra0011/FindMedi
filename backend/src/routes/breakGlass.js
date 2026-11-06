import express from 'express';
import BreakGlassGrant from '../models/BreakGlassGrant.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLogRequired } from '../middleware/audit.js';
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
router.post('/', authorize('breakglass:write'), requireStepUp('phi:breakglass', { requireEnrolled: true }), async (req, res) => {
  try {
    const { subjectType, subjectId, reasonCode, ticketId, reasonNote, durationMin } = req.body || {};
    if (!SUBJECTS.includes(subjectType)) return res.status(400).json({ message: 'Valid subjectType required' });
    if (!OBJECT_ID.test(String(subjectId))) return res.status(400).json({ message: 'Valid subjectId required' });
    if (!REASONS.includes(reasonCode)) return res.status(400).json({ message: 'Valid reasonCode required' });
    if (!String(ticketId || '').trim()) return res.status(400).json({ message: 'Ticket or incident ID required' });
    if (String(reasonNote || '').trim().length < 20) return res.status(400).json({ message: 'Reason note must be at least 20 characters' });
    const mins = Math.min(60, Math.max(5, Number(durationMin) || 30));
    const grant = await BreakGlassGrant.create({
      requesterId: actorId(req),
      subject: { type: subjectType, id: subjectId },
      reasonCode, ticketId: String(ticketId || ''), reasonNote: String(reasonNote || ''),
      durationMin: mins,
    });
    try {
      await auditLogRequired('breakglass_requested', actorId(req), {
        grantId: grant._id, subjectType, subjectId, reasonCode, ticketId, ip: req.ip,
      });
    } catch (auditError) {
      await BreakGlassGrant.deleteOne({ _id: grant._id, status: 'pending' });
      throw auditError;
    }
    await notifyBreakGlassOperators(grant, actorId(req), req.ip);
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
    // DPO and authorized approvers need to see reviewable grants. Request-only
    // roles can inspect only their own requests.
    if (mine !== '1' && ['support_l2', 'clinical_safety'].includes(req.user.role)) filter.requesterId = actorId(req);
    const rows = await BreakGlassGrant.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ grants: rows.map((r) => ({
      id: String(r._id), requesterId: String(r.requesterId), approverIds: (r.approverIds || []).map(String),
      subject: r.subject, reasonCode: r.reasonCode, ticketId: r.ticketId, reasonNote: r.reasonNote,
      status: r.status, createdAt: r.createdAt, approvedAt: r.approvedAt, expiresAt: r.expiresAt,
      revokedAt: r.revokedAt, patientNotifiedAt: r.patientNotifiedAt,
      notificationPending: Boolean(r.patientNotificationNextAt && !r.patientNotifiedAt),
      dpoReviewedAt: r.dpoReviewedAt, dpoReviewedBy: r.dpoReviewedBy,
      accessLog: (r.accessLog || []).map((entry) => ({ ts: entry.ts, route: entry.route, objectId: entry.objectId })),
    })) });
  } catch (err) {
    logger.error(`Break-glass queue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (breakglass:approve) — a DIFFERENT person than the requester.
router.post('/:id/decision', authorize('breakglass:approve'), requireObjectId, requireStepUp('phi:breakglass', { requireEnrolled: true }), async (req, res) => {
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
      const denied = await BreakGlassGrant.findOneAndUpdate(
        { _id: grant._id, status: 'pending', approverIds: { $ne: me }, requesterId: { $ne: me } },
        { $set: { status: 'denied' }, $addToSet: { approverIds: me } },
        { new: true },
      );
      if (!denied) return res.status(409).json({ message: 'Grant decision already recorded' });
      await auditLogRequired('breakglass_denied', actorId(req), { grantId: grant._id, ip: req.ip });
      return res.json({ id: String(grant._id), status: grant.status });
    }

    // Sensitive = mental-health subject or legal order: needs TWO approvers.
    const sensitive = grant.subject.type === 'mental_health' || grant.reasonCode === 'legal_order';
    const distinct = new Set([...grant.approverIds.map(String), me]);
    if (sensitive && distinct.size < 2) {
      // First of two: park, do NOT activate yet.
      const firstApproval = await BreakGlassGrant.findOneAndUpdate(
        { _id: grant._id, status: 'pending', approverIds: { $ne: me }, requesterId: { $ne: me } },
        { $addToSet: { approverIds: me } },
        { new: true },
      );
      if (!firstApproval) return res.status(409).json({ message: 'Grant decision already recorded' });
      try {
        await auditLogRequired('breakglass_first_approval', actorId(req), { grantId: grant._id, ip: req.ip });
      } catch (auditError) {
        await BreakGlassGrant.updateOne(
          { _id: grant._id, status: 'pending' },
          { $pull: { approverIds: me } },
        );
        throw auditError;
      }
      return res.json({ id: String(grant._id), status: 'pending', approvals: distinct.size, need: 2 });
    }
    const now = new Date();
    const approval = {
      $set: {
        status: 'approved', approvedAt: now,
        expiresAt: new Date(now.getTime() + grant.durationMin * 60 * 1000),
      },
      $addToSet: { approverIds: me },
    };
    const approved = await BreakGlassGrant.findOneAndUpdate(
      { _id: grant._id, status: 'pending', approverIds: { $ne: me }, requesterId: { $ne: me } },
      approval,
      { new: true },
    );
    if (!approved) return res.status(409).json({ message: 'Grant decision already recorded' });
    try {
      await auditLogRequired('breakglass_approved', actorId(req), {
        grantId: grant._id, subjectType: grant.subject.type, approvals: distinct.size, ip: req.ip,
      });
    } catch (auditError) {
      await BreakGlassGrant.updateOne(
        { _id: grant._id, status: 'approved', approvedAt: now },
        { $set: { status: 'pending', approvedAt: null, expiresAt: null }, $pull: { approverIds: me } },
      );
      throw auditError;
    }

    // Notify patient upon break-glass approval (DPDP Compliance & Patient Audit)
    if (grant.subject?.id && (grant.subject.type === 'patient' || grant.subject.type === 'mental_health')) {
      try {
        const { createNotification } = await import('../services/notificationService.js');
        const patientNotice = await createNotification({
          userId: grant.subject.id,
          title: 'Emergency Medical Data Access (Break-Glass)',
          message: `An authorized operator was granted emergency break-glass access to your health record. Reference: ${String(grant._id)}`,
          type: 'security_alert',
          priority: 'critical',
          dedupKey: `breakglass:${String(grant._id)}:patient-notice`,
        });
        if (!patientNotice.notification) throw new Error(`Patient notification was not created (${patientNotice.reason || 'unknown'})`);
        await BreakGlassGrant.updateOne({ _id: grant._id }, { $set: { patientNotifiedAt: new Date(), patientNotificationNextAt: null, patientNotificationError: '' }, $inc: { patientNotificationAttempts: 1 } });
      } catch (notificationError) {
        await BreakGlassGrant.updateOne({ _id: grant._id }, { $set: { patientNotificationNextAt: new Date(Date.now() + 60_000), patientNotificationError: String(notificationError.message || notificationError).slice(0, 300) }, $inc: { patientNotificationAttempts: 1 } });
        await auditLogRequired('breakglass_patient_notification_failed', actorId(req), {
          grantId: grant._id, subjectType: grant.subject.type, ip: req.ip,
        });
        logger.error(`Break-glass patient notification failed: ${notificationError.message}`);
      }
    }

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
    const revokedAt = new Date();
    const revoked = await BreakGlassGrant.findOneAndUpdate(
      { _id: grant._id, status: 'approved' },
      { $set: { status: 'revoked', revokedAt } },
      { new: true },
    );
    if (!revoked) return res.status(409).json({ message: 'Grant decision already recorded' });
    await auditLogRequired('breakglass_revoked', actorId(req), { grantId: grant._id, ip: req.ip });
    return res.json({ id: String(grant._id), status: grant.status });
  } catch (err) {
    logger.error(`Break-glass revoke error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// DPO post-access review. Returns only metadata and route/object references;
// it never dereferences the protected clinical object.
router.get('/review/queue', authorize('breakglass:read'), async (req, res) => {
  if (req.user.role !== 'dpo') return res.status(403).json({ message: 'DPO review role required' });
  try {
    const rows = await BreakGlassGrant.find({ status: { $in: ['approved', 'expired', 'revoked'] } })
      .sort({ dpoReviewedAt: 1, updatedAt: -1 }).limit(100).lean();
    return res.json({ grants: rows.map((g) => ({
      id: String(g._id), requesterId: String(g.requesterId), approverIds: (g.approverIds || []).map(String),
      subjectType: g.subject?.type, subjectId: String(g.subject?.id || ''), reasonCode: g.reasonCode,
      reasonNote: g.reasonNote, ticketId: g.ticketId, status: g.status,
      approvedAt: g.approvedAt, expiresAt: g.expiresAt, revokedAt: g.revokedAt,
      patientNotifiedAt: g.patientNotifiedAt, notificationPending: Boolean(g.patientNotificationNextAt && !g.patientNotifiedAt),
      dpoReviewedAt: g.dpoReviewedAt, dpoReviewNote: g.dpoReviewNote,
      accesses: (g.accessLog || []).map(({ ts, route, objectId }) => ({ ts, route, objectId })),
    })) });
  } catch (err) {
    logger.error(`Break-glass DPO review queue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:id/review', authorize('breakglass:read'), requireObjectId, async (req, res) => {
  if (req.user.role !== 'dpo') return res.status(403).json({ message: 'DPO review role required' });
  try {
    const note = String(req.body?.note || '').trim();
    if (note.length < 10 || note.length > 1000) return res.status(400).json({ message: 'Review note must be 10 to 1000 characters' });
    const row = await BreakGlassGrant.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['approved', 'expired', 'revoked'] }, dpoReviewedAt: null },
      { $set: { dpoReviewedAt: new Date(), dpoReviewedBy: actorId(req), dpoReviewNote: note } },
      { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Unreviewed completed access grant not found' });
    try {
      await auditLogRequired('breakglass_dpo_reviewed', actorId(req), { grantId: row._id, ip: req.ip });
    } catch (auditError) {
      await BreakGlassGrant.updateOne({ _id: row._id, dpoReviewedBy: actorId(req), dpoReviewedAt: row.dpoReviewedAt }, { $set: { dpoReviewedAt: null, dpoReviewedBy: null, dpoReviewNote: '' } });
      throw auditError;
    }
    return res.json({ id: String(row._id), dpoReviewedAt: row.dpoReviewedAt });
  } catch (err) {
    logger.error(`Break-glass DPO review update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export async function retryBreakGlassPatientNotifications(now = new Date()) {
  const grants = await BreakGlassGrant.find({
    status: { $in: ['approved', 'expired', 'revoked'] }, patientNotifiedAt: null,
    patientNotificationNextAt: { $lte: now }, patientNotificationAttempts: { $lt: 6 },
    'subject.type': { $in: ['patient', 'mental_health'] },
  }).limit(100).lean();
  let sent = 0;
  for (const grant of grants) {
    try {
      const { createNotification } = await import('../services/notificationService.js');
      const result = await createNotification({
        userId: grant.subject.id, title: 'Emergency Medical Data Access (Break-Glass)',
        message: `An authorized operator was granted emergency break-glass access to your health record. Reference: ${String(grant._id)}`,
        type: 'security_alert', priority: 'critical', dedupKey: `breakglass:${String(grant._id)}:patient-notice`,
      });
      if (!result.notification) throw new Error(`Notification was not created (${result.reason || 'unknown'})`);
      await BreakGlassGrant.updateOne({ _id: grant._id, patientNotifiedAt: null }, { $set: { patientNotifiedAt: now, patientNotificationNextAt: null, patientNotificationError: '' }, $inc: { patientNotificationAttempts: 1 } });
      await auditLogRequired('breakglass_patient_notified', grant.requesterId, { grantId: grant._id, retry: true });
      sent += 1;
    } catch (err) {
      const attempts = Number(grant.patientNotificationAttempts || 0) + 1;
      const backoffMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
      await BreakGlassGrant.updateOne({ _id: grant._id, patientNotifiedAt: null }, {
        $set: { patientNotificationAttempts: attempts, patientNotificationNextAt: attempts >= 6 ? null : new Date(now.getTime() + backoffMinutes * 60_000), patientNotificationError: String(err.message || err).slice(0, 300) },
      });
      logger.error(`[breakglass] patient notice retry failed grant=${grant._id}: ${err.message}`);
    }
  }
  const operatorResult = await retryBreakGlassOperatorAlerts(now);
  return { scanned: grants.length, sent, operatorsScanned: operatorResult.scanned, operatorsAlerted: operatorResult.sent };
}

async function notifyBreakGlassOperators(grant, requesterId, ip) {
  try {
    const operators = await User.find({
      role: { $in: ['superadmin', 'super_admin', 'security_admin', 'dpo'] },
      status: 'active', email: { $type: 'string', $ne: '' },
    }).select('_id email').lean();
    if (!operators.length) throw new Error('No active break-glass approver or security recipients configured');
    const { createNotification, sendEmail } = await import('../services/notificationService.js');
    const failures = [];
    for (const operator of operators) {
      try {
        const result = await createNotification({
          userId: operator._id,
          title: 'Break-glass request requires review',
          message: 'A new emergency access request is waiting in the admin console.',
          type: 'security_alert', priority: 'critical',
          dedupKey: `breakglass:${String(grant._id)}:operator:${String(operator._id)}`,
        });
        if (!result.notification) throw new Error(result.reason || 'Notification was not created');
        const emailResult = await sendEmail({
          to: operator.email,
          subject: 'FindMedi break-glass request requires review',
          text: `An emergency access request (${String(grant._id)}) is waiting for review. Sign in to the admin console. This alert contains no patient information.`,
        });
        if (!emailResult?.success) throw new Error(emailResult?.error || 'Operator alert email failed');
      } catch (error) { failures.push(error); }
    }
    if (failures.length) throw new Error(`${failures.length} operator notification(s) failed`);
    await BreakGlassGrant.updateOne({ _id: grant._id }, { $set: { operatorAlertedAt: new Date(), operatorAlertNextAt: null, operatorAlertError: '' }, $inc: { operatorAlertAttempts: 1 } });
    await auditLogRequired('breakglass_operators_notified', requesterId, { grantId: grant._id, recipientCount: operators.length, ip });
  } catch (error) {
    try {
      await BreakGlassGrant.updateOne({ _id: grant._id }, { $set: { operatorAlertNextAt: new Date(Date.now() + 60_000), operatorAlertError: String(error.message || error).slice(0, 300) }, $inc: { operatorAlertAttempts: 1 } });
      await auditLogRequired('breakglass_operator_notification_failed', requesterId, { grantId: grant._id, ip });
    } catch (persistenceError) {
      logger.error(`[breakglass] operator alert failure could not be persisted grant=${grant._id}: ${persistenceError.message}`);
    }
    logger.error(`[breakglass] operator alert failed grant=${grant._id}: ${error.message}`);
  }
}

async function retryBreakGlassOperatorAlerts(now) {
  const grants = await BreakGlassGrant.find({
    status: 'pending', operatorAlertedAt: null,
    operatorAlertNextAt: { $lte: now }, operatorAlertAttempts: { $lt: 6 },
  }).limit(100).lean();
  let sent = 0;
  for (const grant of grants) {
    try {
      const operators = await User.find({
        role: { $in: ['superadmin', 'super_admin', 'security_admin', 'dpo'] },
        status: 'active', email: { $type: 'string', $ne: '' },
      }).select('_id email').lean();
      if (!operators.length) throw new Error('No active break-glass approver or security recipients configured');
      const { createNotification, sendEmail } = await import('../services/notificationService.js');
      const failures = [];
      for (const operator of operators) {
        try {
          const result = await createNotification({
            userId: operator._id, title: 'Break-glass request requires review',
            message: 'A new emergency access request is waiting in the admin console.',
            type: 'security_alert', priority: 'critical',
            dedupKey: `breakglass:${String(grant._id)}:operator:${String(operator._id)}`,
          });
          if (!result.notification) throw new Error(result.reason || 'Notification was not created');
          const emailResult = await sendEmail({
            to: operator.email,
            subject: 'FindMedi break-glass request requires review',
            text: `An emergency access request (${String(grant._id)}) is waiting for review. Sign in to the admin console. This alert contains no patient information.`,
          });
          if (!emailResult?.success) throw new Error(emailResult?.error || 'Operator alert email failed');
        } catch (error) { failures.push(error); }
      }
      if (failures.length) throw new Error(`${failures.length} operator notification(s) failed`);
      await auditLogRequired('breakglass_operators_notified', grant.requesterId, { grantId: grant._id, recipientCount: operators.length, retry: true, initiator: 'scheduler' });
      const updated = await BreakGlassGrant.updateOne({ _id: grant._id, operatorAlertedAt: null }, {
        $set: { operatorAlertedAt: now, operatorAlertNextAt: null, operatorAlertError: '' }, $inc: { operatorAlertAttempts: 1 },
      });
      if (updated.modifiedCount) sent += 1;
    } catch (error) {
      const attempts = Number(grant.operatorAlertAttempts || 0) + 1;
      const backoffMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
      await BreakGlassGrant.updateOne({ _id: grant._id, operatorAlertedAt: null }, { $set: {
        operatorAlertAttempts: attempts,
        operatorAlertNextAt: attempts >= 6 ? null : new Date(now.getTime() + backoffMinutes * 60_000),
        operatorAlertError: String(error.message || error).slice(0, 300),
      } });
      try { await auditLogRequired('breakglass_operator_notification_failed', grant.requesterId, { grantId: grant._id, retry: true, initiator: 'scheduler' }); }
      catch (auditError) { logger.error(`[breakglass] operator retry audit failed grant=${grant._id}: ${auditError.message}`); }
      logger.error(`[breakglass] operator alert retry failed grant=${grant._id}: ${error.message}`);
    }
  }
  return { scanned: grants.length, sent };
}

export default router;
