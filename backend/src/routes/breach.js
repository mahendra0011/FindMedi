import express from 'express';
import Breach from '../models/Breach.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { auditLogRequired } from '../middleware/audit.js';
import { sendEmail } from '../services/notificationService.js';
import mongoose from 'mongoose';
import logger from '../config/logger.js';

// File 22 P2-31: breach register (DPDP 72h clock) + hash-chain verify alias.
// Who may see it: superadmin, dpo, security_admin, compliance_officer,
// clinical_safety (matrix roles with audit:read or breakglass:read).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const PLATFORM_BREACH_ROLES = new Set(['superadmin', 'super_admin', 'dpo', 'security_admin', 'compliance_officer', 'clinical_safety']);
const canSee = (req) => PLATFORM_BREACH_ROLES.has(req.user.role) || req.user.role === 'hospital_admin';
const gate = (req, res, next) => {
  if (!canSee(req)) return res.status(403).json({ message: 'Breach register access required' });
  if (req.user.role === 'hospital_admin' && !req.user.hospitalId) {
    return res.status(403).json({ message: 'Hospital scope required' });
  }
  return next();
};
const tenantFilter = (req) => (req.user.role === 'hospital_admin' ? { hospitalId: req.user.hospitalId } : {});
const STATUSES = ['Open', 'Assessing', 'Notified', 'Contained', 'Closed'];
const canMove = (from, to) => ({
  Open: ['Assessing', 'Contained', 'Closed'],
  Assessing: ['Notified', 'Contained', 'Closed'],
  Notified: ['Contained', 'Closed'],
  Contained: ['Closed'],
  Closed: [],
}[from] || []).includes(to);

router.get('/', gate, async (req, res) => {
  try {
    const filter = tenantFilter(req);
    if (req.query.status) filter.status = req.query.status;
    const rows = await Breach.find(filter).sort({ deadlineAt: 1 }).limit(200).lean();
    const now = Date.now();
    const breaches = rows.map((b) => {
      const overdue = !b.notifiedAt && b.deadlineAt && new Date(b.deadlineAt).getTime() < now;
      if (req.user.role === 'superadmin' || req.user.role === 'super_admin') {
        return { _id: b._id, hospitalId: b.hospitalId, nature: b.nature, recordsAffected: b.recordsAffected, detectedAt: b.detectedAt, deadlineAt: b.deadlineAt, status: b.status, overdue };
      }
      return { ...b, overdue };
    });
    return res.json({ breaches });
  } catch (err) {
    logger.error(`Breach list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/', gate, async (req, res) => {
  try {
    const { hospitalId, title, nature, scope, recordsAffected, detectedAt } = req.body || {};
    if (typeof title !== 'string' || !title.trim() || title.length > 200) return res.status(400).json({ message: 'title required (max 200 characters)' });
    if (nature && !['confidentiality', 'integrity', 'availability', 'other'].includes(nature)) return res.status(400).json({ message: 'Invalid incident nature' });
    const targetHospital = req.user.role === 'hospital_admin' ? req.user.hospitalId : hospitalId;
    if (targetHospital && !mongoose.Types.ObjectId.isValid(String(targetHospital))) return res.status(400).json({ message: 'Invalid hospitalId' });
    if (req.user.role === 'hospital_admin' && hospitalId && String(hospitalId) !== String(req.user.hospitalId)) return res.status(403).json({ message: 'Cross-hospital access denied' });
    if (recordsAffected != null && (!Number.isFinite(Number(recordsAffected)) || Number(recordsAffected) < 0)) return res.status(400).json({ message: 'recordsAffected must be non-negative' });
    const detected = detectedAt ? new Date(detectedAt) : new Date();
    if (Number.isNaN(detected.getTime()) || detected.getTime() > Date.now()) return res.status(400).json({ message: 'Invalid detectedAt' });
    const row = await Breach.create({
      hospitalId: targetHospital || undefined, title: title.trim(),
      nature: nature || 'other', scope: String(scope || '').slice(0, 1000),
      recordsAffected: Number(recordsAffected) || 0,
      detectedAt: detected,
      createdBy: actorId(req),
    });
    await auditLogRequired('breach_reported', actorId(req), { breachId: row._id, hospitalId: row.hospitalId, ip: req.ip });
    return res.status(201).json({ id: String(row._id), deadlineAt: row.deadlineAt });
  } catch (err) {
    logger.error(`Breach create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', gate, async (req, res) => {
  try {
    const row = await Breach.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!row) return res.status(404).json({ message: 'Not found' });
    const { nature, scope, recordsAffected, status, containment, notifiedTo } = req.body || {};
    if (nature != null && !['confidentiality', 'integrity', 'availability', 'other'].includes(nature)) return res.status(400).json({ message: 'Invalid incident nature' });
    if (scope != null && (typeof scope !== 'string' || scope.length > 1000)) return res.status(400).json({ message: 'Invalid scope' });
    if (containment != null && (typeof containment !== 'string' || containment.length > 2000)) return res.status(400).json({ message: 'Invalid containment note' });
    if (recordsAffected != null && (!Number.isFinite(Number(recordsAffected)) || Number(recordsAffected) < 0)) return res.status(400).json({ message: 'recordsAffected must be non-negative' });
    if (status != null && (!STATUSES.includes(status) || !canMove(row.status, status))) return res.status(409).json({ message: 'Invalid breach status transition' });
    const set = Object.fromEntries(Object.entries({ nature, scope, recordsAffected: recordsAffected == null ? undefined : Number(recordsAffected), status, containment }).filter(([, value]) => value !== undefined));
    if (set.status === 'Notified') {
      set.notifiedAt = new Date();
      if (typeof notifiedTo !== 'string' || !notifiedTo.trim() || notifiedTo.length > 500) return res.status(400).json({ message: 'notifiedTo required when marking Notified' });
      set.notifiedTo = notifiedTo.trim();
    }
    Object.assign(row, set);
    await row.save();
    await auditLogRequired('breach_updated', actorId(req), { breachId: row._id, status: row.status, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Breach patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Scheduler hook: un-notified rows past (or within 12h of) deadline.
export async function breachDeadlineSweep() {
  const now = new Date();
  const soon = new Date(Date.now() + 12 * 3600 * 1000);
  const rows = await Breach.find({
    status: { $in: ['Open', 'Assessing'] }, notifiedAt: null, deadlineAt: { $lte: soon },
  }).select('_id hospitalId title deadlineAt createdBy alertSentAt alertAttempts alertNextAt alertLeaseUntil').limit(100).lean();
  let alertsSent = 0;
  for (const b of rows) {
    logger.warn(`[breach] 72h clock at risk: ${b._id} (${b.title}) due ${b.deadlineAt}`);
    if ((b.alertAttempts || 0) >= 6 || b.alertSentAt || (b.alertNextAt && b.alertNextAt > now) || (b.alertLeaseUntil && b.alertLeaseUntil > now)) continue;
    const claimed = await Breach.findOneAndUpdate({
      _id: b._id, status: { $in: ['Open', 'Assessing'] }, notifiedAt: null,
      deadlineAt: { $lte: soon }, alertSentAt: null, alertAttempts: { $lt: 6 },
      $and: [
        { $or: [{ alertNextAt: null }, { alertNextAt: { $lte: now } }] },
        { $or: [{ alertLeaseUntil: null }, { alertLeaseUntil: { $lte: now } }] },
      ],
    }, { $set: { alertLeaseUntil: new Date(now.getTime() + 5 * 60_000) } }, { new: true });
    if (!claimed) continue;
    try {
      const recipients = await User.find({
        role: { $in: ['superadmin', 'super_admin', 'security_admin', 'dpo'] },
        status: 'active', email: { $type: 'string', $ne: '' },
      }).select('_id email').limit(100).lean();
      if (!recipients.length) throw new Error('No active DPO/security alert recipients configured');
      await auditLogRequired('breach_deadline_alert_attempted', b.createdBy, { breachId: b._id, recipientCount: recipients.length, deadlineAt: b.deadlineAt, initiator: 'scheduler' });
      const results = await Promise.all(recipients.map((user) => sendEmail({
        to: user.email,
        subject: 'FindMedi breach response deadline needs attention',
        text: `Breach register item ${String(b._id)} is approaching its response deadline (${new Date(b.deadlineAt).toISOString()}). Open the admin Privacy Centre to review it. Do not reply to this automated alert.`,
      })));
      const failures = results.filter((result) => !result?.success);
      if (failures.length) throw new Error(`${failures.length} of ${results.length} deadline alert emails failed`);
      await auditLogRequired('breach_deadline_alert_sent', b.createdBy, { breachId: b._id, recipientCount: recipients.length, deadlineAt: b.deadlineAt, initiator: 'scheduler' });
      await Breach.updateOne({ _id: b._id, alertSentAt: null }, { $set: { alertSentAt: now, alertNextAt: null, alertLeaseUntil: null, alertError: '' }, $inc: { alertAttempts: 1 } });
      alertsSent += 1;
    } catch (error) {
      const attempts = Number(b.alertAttempts || 0) + 1;
      const nextAt = attempts >= 6 ? null : new Date(now.getTime() + Math.min(6 * 3600_000, (2 ** attempts) * 60_000));
      await Breach.updateOne({ _id: b._id, alertSentAt: null }, { $set: {
        alertAttempts: attempts, alertNextAt: nextAt, alertLeaseUntil: null,
        alertError: String(error.message || error).slice(0, 300),
      } });
      logger.error(`[breach] deadline alert failed item=${b._id}: ${error.message}`);
    }
  }
  return { atRisk: rows.length, alertsSent };
}

export default router;
