import express from 'express';
import RcmEvent from '../models/RcmEvent.js';
import RcmGap from '../models/RcmGap.js';
import DailyRcmMetric from '../models/DailyRcmMetric.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 16 §16.1: RCM event detectors, stage pipeline, open gaps, daily metrics.

const router = express.Router();
router.use(protect);

const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

async function openGap(hospitalId, kind, entityRef, amount, ownerRole) {
  const exists = await RcmGap.findOne({
    hospitalId, kind, 'entityRef.model': entityRef.model, 'entityRef.id': entityRef.id, closedAt: null,
  });
  if (exists) return exists;
  return RcmGap.create({
    hospitalId, kind, entityRef, amount: amount || 0, ownerRole: ownerRole || '',
  });
}

router.get('/pipeline', authorize('billing:read'), async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 86400 * 1000);
    const rows = await RcmEvent.aggregate([
      { $match: { ...tenantFilter(req), at: { $gte: since } } },
      { $group: { _id: '$stage', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]);
    const gaps = await RcmGap.find({ ...tenantFilter(req), closedAt: null })
      .sort({ openedAt: -1 }).limit(100).lean();
    return res.json({ stages: rows, gaps });
  } catch (err) {
    logger.error(`RCM pipeline error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/gaps', authorize('billing:read'), async (req, res) => {
  try {
    const { kind } = req.query;
    const filter = { ...tenantFilter(req), closedAt: null };
    if (kind) filter.kind = kind;
    const rows = await RcmGap.find(filter).sort({ openedAt: -1 }).limit(300).lean();
    return res.json({ gaps: rows });
  } catch (err) {
    logger.error(`RCM gaps error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/gaps/:id/close', authorize('billing:write'), async (req, res) => {
  try {
    const row = await RcmGap.findByIdAndUpdate(req.params.id,
      { $set: { closedAt: new Date() } }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('rcm_gap_closed', req.user._id ?? req.user.id, { gapId: row._id, kind: row.kind, ip: req.ip });
    return res.json({ id: String(row._id), closed: true });
  } catch (err) {
    logger.error(`RCM gap close error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Detector core (exported for workers/scheduler.js).
export async function detectRcmTenant(hospitalId) {
  const opened = [];
  const { default: Billing } = await import('../models/Billing.js');
  const { default: Claim } = await import('../models/Claim.js').catch(() => ({ default: null }));
  const insured = await Billing.find({
    hospitalId, paymentMethod: 'Insurance', status: { $in: ['Pending', 'Partial'] },
  }).select('_id amount balance').limit(200).lean();
  for (const b of insured) {
    const claimed = Claim ? await Claim.findOne({ billId: b._id }).lean() : null;
    if (!claimed) {
      await openGap(hospitalId, 'unclaimed', { model: 'Billing', id: b._id }, b.balance || b.amount, 'accountant');
      opened.push('unclaimed');
    }
  }
  const cutoff = new Date(Date.now() - 90 * 86400 * 1000);
  const old = await Billing.find({
    hospitalId, status: { $in: ['Pending', 'Partial', 'Overdue'] }, createdAt: { $lte: cutoff },
  }).select('_id balance amount').limit(200).lean();
  for (const b of old) {
    await openGap(hospitalId, 'ar_90', { model: 'Billing', id: b._id }, b.balance || b.amount, 'accountant');
    opened.push('ar_90');
  }
  if (Claim) {
    const settling = await Claim.find({ hospitalId, status: 'Approved' }).select('_id settledAmount').limit(200).lean();
    for (const c of settling) {
      await openGap(hospitalId, 'settlement_pending', { model: 'Claim', id: c._id }, c.settledAmount || 0, 'accountant');
      opened.push('settlement_pending');
    }
  }
  return { opened: opened.length };
}

// Detector sweep: derives events + gaps from source collections (cron calls this).
router.post('/detect', authorize('billing:write'), async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) return res.status(400).json({ message: 'Hospital scope required' });
    return res.json(await detectRcmTenant(hospitalId));
  } catch (err) {
    logger.error(`RCM detect error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/metrics', authorize('billing:read'), async (req, res) => {
  try {
    const rows = await DailyRcmMetric.find(tenantFilter(req)).sort({ day: -1 }).limit(90).lean();
    return res.json({ metrics: rows });
  } catch (err) {
    logger.error(`RCM metrics error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export { openGap };
export default router;
