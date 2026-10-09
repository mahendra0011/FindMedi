import express from 'express';
import KpiDefinition, { KPI_CATALOGUE } from '../models/KpiDefinition.js';
import DailyMetric from '../models/DailyMetric.js';
import DailyRcmMetric from '../models/DailyRcmMetric.js';
import AiInvocation from '../models/AiInvocation.js';
import { protect, authorize } from '../middleware/auth.js';
import { draftDischargeSummary, noShowScore, forecastDemand } from '../lib/aiGateway.js';
import logger from '../config/logger.js';

// File 17 §17.2/§17.3/§17.4: KPI compute (10 formulas, computed — never
// hand-typed), daily metrics read, AI features (draft, no-show, forecast)
// with kill switch + invocation log.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

router.get('/kpis', authorize('staff:view'), async (req, res) => {
  try {
    return res.json({ kpis: KPI_CATALOGUE });
  } catch (err) {
    logger.error(`KPI catalogue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Compute the full KPI set for this hospital from live collections.
router.get('/kpis/compute', authorize('staff:view'), async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) return res.status(400).json({ message: 'Hospital scope required' });
    // Seed the definitions collection once so the catalogue is queryable.
    try {
      const count = await KpiDefinition.countDocuments();
      if (count === 0) {
        await KpiDefinition.insertMany(KPI_CATALOGUE.map((k) => ({ ...k })));
      }
    } catch { /* seeding must never break compute */ }
    const [
      Bed, AdmissionM, BillingM, ClaimM, AppointmentM, LabOrderM,
    ] = await Promise.all([
      import('../models/Bed.js').then((m) => m.default),
      import('../models/Admission.js').then((m) => m.default),
      import('../models/Billing.js').then((m) => m.default),
      import('../models/Claim.js').then((m) => m.default).catch(() => null),
      import('../models/Appointment.js').then((m) => m.default).catch(() => null),
      import('../models/LabOrder.js').then((m) => m.default).catch(() => null),
    ]);
    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);
    const out = {};
    const [totalBeds, occBeds] = await Promise.all([
      Bed.countDocuments({ hospitalId }),
      Bed.countDocuments({ hospitalId, status: 'Occupied' }),
    ]);
    out.bed_occupancy = pct(occBeds, totalBeds);
    const stays = await AdmissionM.find({ hospitalId, status: 'Discharged' })
      .select('createdAt updatedAt').sort({ updatedAt: -1 }).limit(200).lean()
      .catch(() => []);
    const los = stays
      .map((s) => (s.createdAt && s.updatedAt
        ? (new Date(s.updatedAt) - new Date(s.createdAt)) / 86400000 : null))
      .filter((n) => n != null && n >= 0);
    out.avg_los = los.length ? Math.round((los.reduce((a, b) => a + b, 0) / los.length) * 10) / 10 : null;
    const bills = await BillingM.find({ hospitalId }).select('amount paid status').limit(2000).lean()
      .catch(() => []);
    const billed = bills.reduce((a, b) => a + Number(b.amount || 0), 0);
    const collected = bills.reduce((a, b) => a + Number(b.paid || 0), 0);
    out.collection_ratio = pct(collected, billed);
    if (ClaimM) {
      const [denied, total] = await Promise.all([
        ClaimM.countDocuments({ hospitalId, status: 'Rejected' }),
        ClaimM.countDocuments({ hospitalId }),
      ]);
      out.denial_rate = pct(denied, total);
    } else out.denial_rate = null;
    if (AppointmentM) {
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const appts = await safeFirst(AppointmentM.find({ hospitalId, status: { $in: ['Completed', 'Missed'] } })
        .select('status').limit(500).lean()) || [];
      const seen = appts.filter((a) => a.status === 'Completed').length;
      out.left_without_seen = pct(appts.length - seen, appts.length);
    } else out.left_without_seen = null;
    out.opd_wait_p50 = null; // needs wait-time capture (tokens) — explicit null, not faked
    if (LabOrderM) {
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const labs = await safeFirst(LabOrderM.find({ hospitalId }).select('createdAt verifiedAt').limit(500).lean()) || [];
      const breached = labs.filter((l) => l.createdAt && l.verifiedAt
        && (new Date(l.verifiedAt) - new Date(l.createdAt)) > 24 * 3600 * 1000).length;
      out.lab_tat_breach = pct(breached, labs.length);
    } else out.lab_tat_breach = null;
    out.ot_utilization = null; // needs slot master — explicit null
    out.readmit_30 = null; // needs longitudinal linkage — explicit null
    out.recall_conversion = null; // RecallLog tracks sends, not bookings — explicit null
    return res.json({ kpis: out });
  } catch (err) {
    logger.error(`KPI compute error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Daily metrics ──────────────────────────────────────────────────────────
router.get('/metrics/daily', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await DailyMetric.find(tenant(req)).sort({ day: -1 }).limit(90).lean();
    return res.json({ days: rows });
  } catch (err) {
    logger.error(`Daily metrics error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Nightly compute (scheduler calls per hospital; manual trigger allowed).
export async function computeDailyMetricsTenant(hospitalId, day) {
  const { default: Billing } = await import('../models/Billing.js');
  const { default: Admission } = await import('../models/Admission.js');
  const { safeFirst } = await import('../lib/approvalWiring.js');
  const dayStr = day || new Date().toISOString().slice(0, 10);
  const from = new Date(`${dayStr}T00:00:00Z`);
  const to = new Date(`${dayStr}T23:59:59Z`);
  const bills = await safeFirst(Billing.find({ hospitalId, createdAt: { $gte: from, $lte: to } })
    .select('amount paid').lean()) || [];
  const admissions = await Admission.countDocuments({
    hospitalId, createdAt: { $gte: from, $lte: to },
  }).catch(() => 0);
  const metrics = {
    billed: bills.reduce((a, b) => a + Number(b.amount || 0), 0),
    collected: bills.reduce((a, b) => a + Number(b.paid || 0), 0),
    bills: bills.length,
    admissions,
  };
  await DailyMetric.findOneAndUpdate(
    { hospitalId, day: dayStr }, { $set: { metrics } }, { upsert: true },
  );
  // Mirror the finance slice into DailyRcmMetric for the RCM dashboard.
  await DailyRcmMetric.findOneAndUpdate(
    { hospitalId, day: dayStr },
    { $set: { billed: metrics.billed, collected: metrics.collected } },
    { upsert: true },
  ).catch(() => {});
  return metrics;
}

router.post('/metrics/daily/compute', authorize('staff:manage'), async (req, res) => {
  try {
    if (!req.user.hospitalId) return res.status(400).json({ message: 'Hospital scope required' });
    const metrics = await computeDailyMetricsTenant(req.user.hospitalId, req.body?.day);
    return res.json({ day: req.body?.day || new Date().toISOString().slice(0, 10), metrics });
  } catch (err) {
    logger.error(`Daily compute error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── AI ─────────────────────────────────────────────────────────────────────
router.post('/ai/discharge-draft', authorize('staff:manage'), async (req, res) => {
  try {
    const out = await draftDischargeSummary({
      hospitalId: req.user.hospitalId, fields: req.body?.fields || {}, by: actorId(req),
    });
    return res.json(out);
  } catch (err) {
    if (err.code === 'AI_DISABLED') return res.status(423).json({ message: err.message });
    logger.error(`AI draft error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/ai/noshow-score', authorize('staff:view'), async (req, res) => {
  try {
    const score = noShowScore(req.body || {});
    await AiInvocation.create({
      hospitalId: req.user.hospitalId, feature: 'noshow_score', provider: 'heuristic',
      redacted: true, ok: true, by: actorId(req),
    }).catch(() => {});
    return res.json({ score });
  } catch (err) {
    logger.error(`No-show error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/ai/forecast', authorize('staff:view'), async (req, res) => {
  try {
    const out = forecastDemand(req.body?.dailyCounts || []);
    return res.json(out);
  } catch (err) {
    logger.error(`Forecast error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/ai/invocations', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await AiInvocation.find(tenant(req)).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ invocations: rows });
  } catch (err) {
    logger.error(`AI log read error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
