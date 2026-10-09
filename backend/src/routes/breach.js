import express from 'express';
import Breach from '../models/Breach.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 22 P2-31: breach register (DPDP 72h clock) + hash-chain verify alias.
// Who may see it: superadmin, dpo, security_admin, compliance_officer,
// clinical_safety (matrix roles with audit:read or breakglass:read).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const canSee = (req) => ['superadmin', 'dpo', 'security_admin', 'compliance_officer', 'clinical_safety', 'hospital_admin'].includes(req.user.role);
const gate = (req, res, next) => (canSee(req) ? next() : res.status(403).json({ message: 'Breach register access required' }));

router.get('/', gate, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.status) filter.status = req.query.status;
    const rows = await Breach.find(filter).sort({ deadlineAt: 1 }).limit(200).lean();
    const now = Date.now();
    return res.json({
      breaches: rows.map((b) => ({
        ...b,
        overdue: !b.notifiedAt && b.deadlineAt && new Date(b.deadlineAt).getTime() < now,
      })),
    });
  } catch (err) {
    logger.error(`Breach list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/', gate, async (req, res) => {
  try {
    const { hospitalId, title, nature, scope, recordsAffected, detectedAt } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });
    const row = await Breach.create({
      hospitalId: hospitalId || req.user.hospitalId || undefined, title,
      nature: nature || 'other', scope: String(scope || '').slice(0, 1000),
      recordsAffected: Number(recordsAffected) || 0,
      detectedAt: detectedAt ? new Date(detectedAt) : new Date(),
      createdBy: actorId(req),
    });
    await auditLog('breach_reported', actorId(req), { breachId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id), deadlineAt: row.deadlineAt });
  } catch (err) {
    logger.error(`Breach create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', gate, async (req, res) => {
  try {
    const allowed = ['nature', 'scope', 'recordsAffected', 'status', 'containment', 'notifiedTo'];
    const set = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    if (set.status === 'Notified') {
      set.notifiedAt = new Date();
      if (!set.notifiedTo) return res.status(400).json({ message: 'notifiedTo required when marking Notified' });
    }
    const row = await Breach.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('breach_updated', actorId(req), { breachId: row._id, status: row.status, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Breach patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Scheduler hook: un-notified rows past (or within 12h of) deadline.
export async function breachDeadlineSweep() {
  const soon = new Date(Date.now() + 12 * 3600 * 1000);
  const rows = await Breach.find({
    status: { $in: ['Open', 'Assessing'] }, notifiedAt: null, deadlineAt: { $lte: soon },
  }).select('_id hospitalId title deadlineAt').limit(100).lean();
  for (const b of rows) {
    logger.warn(`[breach] 72h clock at risk: ${b._id} (${b.title}) due ${b.deadlineAt}`);
  }
  return { atRisk: rows.length };
}

export default router;
