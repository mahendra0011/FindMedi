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
      Bed, AdmissionM, BillingM, ClaimM, AppointmentM, LabOrderM, PrescriptionM, OtM,
    ] = await Promise.all([
      import('../models/Bed.js').then((m) => m.default),
      import('../models/Admission.js').then((m) => m.default),
      import('../models/Billing.js').then((m) => m.default),
      import('../models/Claim.js').then((m) => m.default).catch(() => null),
      import('../models/Appointment.js').then((m) => m.default).catch(() => null),
      import('../models/LabOrder.js').then((m) => m.default).catch(() => null),
      import('../models/Prescription.js').then((m) => m.default).catch(() => null),
      import('../models/OperationTheatre.js').then((m) => m.default).catch(() => null),
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
    // File 22 P2-36: second KPI wave (all derived, nulls stay explicit).
    out.avg_bill_value = bills.length ? Math.round(billed / bills.length) : null;
    if (AppointmentM) {
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const all = await safeFirst(AppointmentM.find({ hospitalId }).select('status').limit(2000).lean()) || [];
      const missed = all.filter((a) => a.status === 'Missed').length;
      const done = all.filter((a) => ['Completed', 'Missed'].includes(a.status)).length;
      const cancelled = all.filter((a) => a.status === 'Cancelled').length;
      out.noshow_pct = pct(missed, done);
      out.cancel_pct = pct(cancelled, all.length);
    } else { out.noshow_pct = null; out.cancel_pct = null; }
    const disch = await AdmissionM.find({ hospitalId, status: 'Discharged' })
      .select('dischargedAt').sort({ dischargedAt: -1 }).limit(200).lean().catch(() => []);
    const withTime = disch.filter((d) => d.dischargedAt);
    out.discharge_before_noon_pct = withTime.length
      ? pct(withTime.filter((d) => new Date(d.dischargedAt).getHours() < 12).length, withTime.length) : null;
    if (PrescriptionM) {
      const [rxPending, rxActive] = await Promise.all([
        PrescriptionM.countDocuments({ hospitalId, verificationStatus: 'pending' }).catch(() => 0),
        PrescriptionM.countDocuments({ hospitalId, status: 'Active' }).catch(() => 0),
      ]);
      out.rx_verify_backlog = rxPending;
      out.pharmacy_pending_count = rxActive;
    } else { out.rx_verify_backlog = null; out.pharmacy_pending_count = null; }
    if (LabOrderM) {
      out.lab_verify_backlog = await LabOrderM.countDocuments({ hospitalId, status: 'Under Verification' }).catch(() => 0);
    } else out.lab_verify_backlog = null;
    if (OtM) {
      const monthAgo = new Date(Date.now() - 30 * 86400 * 1000);
      out.ot_completed_30d = await OtM.countDocuments({ hospitalId, status: 'Completed', createdAt: { $gte: monthAgo } }).catch(() => 0);
    } else out.ot_completed_30d = null;

    // File 22 P2-36: third KPI wave. Every model load is fail-soft — a
    // missing collection yields an explicit null (never a fabricated 0),
    // which is what the dashboard renders as "no data".
    const load = (p) => p.catch(() => null);
    const [InvM, PoM, LedgerM, DialysisM, HaiM, AbxM, NeedleM] = await Promise.all([
      load(import('../models/Inventory.js').then((m) => m.default)),
      load(import('../models/PurchaseOrder.js').then((m) => m.default)),
      load(import('../models/StockLedger.js').then((m) => m.default)),
      load(import('../models/DialysisSession.js').then((m) => m.default)),
      load(import('../models/InfectionControl.js').then((m) => m.default)),
      load(import('../models/InfectionControl.js').then((m) => m.AntibioticReview)),
      load(import('../models/InfectionControl.js').then((m) => m.NeedleStick)),
    ]);
    const inv = InvM ? await InvM.find({ hospitalId })
      .select('currentStock minStockLevel unitPrice expiryDate').limit(2000).lean().catch(() => []) : [];
    const stockouts = inv.filter((i) => Number(i.currentStock || 0) <= Number(i.minStockLevel || 0)).length;
    out.stockout_items = InvM ? stockouts : null;
    const soon = Date.now() + 90 * 86400000;
    out.near_expiry_value = InvM
      ? Math.round(inv.filter((i) => i.expiryDate && new Date(i.expiryDate).getTime() <= soon)
        .reduce((a, i) => a + Number(i.unitPrice || 0) * Number(i.currentStock || 0), 0)) : null;
    // Inventory turnover: trailing-90d issue value / average stock value
    // (opening+closing)/2. Missing issue history yields explicit null.
    out.inventory_turnover = null;
    if (InvM && LedgerM) {
      const since = new Date(Date.now() - 90 * 86400000);
      const [outRows, prices] = await Promise.all([
        LedgerM.find({ hospitalId, qtyOut: { $gt: 0 }, createdAt: { $gte: since } })
          .select('itemId qtyOut').limit(5000).lean().catch(() => []),
        InvM.find({ hospitalId }).select('itemName unitPrice currentStock').limit(2000).lean().catch(() => []),
      ]);
      if (outRows.length && prices.length) {
        const priceById = new Map(prices.map((p) => [String(p.itemName), Number(p.unitPrice || 0)]));
        const issueValue = outRows.reduce((a, r) => a + (priceById.get(String(r.itemId)) || 0) * Number(r.qtyOut || 0), 0);
        const stockValue = prices.reduce((a, p) => a + Number(p.unitPrice || 0) * Number(p.currentStock || 0), 0);
        if (stockValue > 0) out.inventory_turnover = Math.round((issueValue / stockValue) * 100) / 100;
      }
    }
    if (PoM) {
      const pos = await PoM.find({ hospitalId, status: { $in: ['Received', 'Partially Received', 'Ordered'] } })
        .select('status expectedDelivery receivedDate').limit(300).lean().catch(() => []);
      const delivered = pos.filter((p) => p.receivedDate && p.expectedDelivery);
      const onTime = delivered.filter((p) => new Date(p.receivedDate) <= new Date(p.expectedDelivery)).length;
      out.vendor_otd_pct = delivered.length ? pct(onTime, delivered.length) : null;
      out.po_fill_rate = pos.length
        ? pct(pos.filter((p) => p.status === 'Received').length, pos.length) : null;
    } else { out.vendor_otd_pct = null; out.po_fill_rate = null; }
    // ARPOB = billed / (occupied beds x 30) for the trailing window.
    out.arpob = occBeds > 0 ? Math.round(billed / (occBeds * 30)) : null;
    // AR days: unpaid balance / (billed / 30).
    const outstanding = bills.reduce((a, b) => a + Math.max(0, Number(b.amount || 0) - Number(b.paid || 0)), 0);
    out.ar_days = billed > 0 ? Math.round((outstanding / (billed / 30)) * 10) / 10 : null;
    out.cash_collection = Math.round(bills.filter((b) => b.paymentMethod === 'Cash')
      .reduce((a, b) => a + Number(b.paid || 0), 0));
    if (ClaimM) {
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      const recent = await ClaimM.find({ hospitalId, submittedAt: { $gte: monthAgo } })
        .select('submittedAt updatedAt status').limit(300).lean().catch(() => []);
      const decided = recent.filter((c) => c.updatedAt && c.submittedAt);
      out.claim_approval_days = decided.length
        ? Math.round((decided.reduce((a, c) => a + (new Date(c.updatedAt) - new Date(c.submittedAt)), 0)
          / decided.length) / 86400000 * 10) / 10 : null;
      const cutoff = Date.now() - 60 * 86400000;
      out.claim_ageing_60 = await ClaimM.countDocuments({
        hospitalId, submittedAt: { $lte: new Date(cutoff) },
        status: { $in: ['Submitted', 'Appealed'] },
      }).catch(() => 0);
    } else { out.claim_approval_days = null; out.claim_ageing_60 = null; }
    if (AppointmentM) {
      // New patient % = share of appointments that were the patient's first.
      const apptRows = await AppointmentM.find({ hospitalId })
        .select('patientId createdAt').limit(2000).lean().catch(() => []);
      if (apptRows.length) {
        const firstAt = new Map();
        for (const a of apptRows) {
          const k = String(a.patientId || '');
          const t = new Date(a.createdAt || 0).getTime();
          if (k && (!firstAt.has(k) || t < firstAt.get(k))) firstAt.set(k, t);
        }
        const isFirst = apptRows.filter((a) => {
          const k = String(a.patientId || '');
          return k && new Date(a.createdAt || 0).getTime() === firstAt.get(k);
        }).length;
        out.opd_new_patient_pct = pct(isFirst, apptRows.length);
      } else out.opd_new_patient_pct = null;
    } else out.opd_new_patient_pct = null;
    if (Bed) {
      const icuBeds = await Bed.countDocuments({ hospitalId, ward: { $in: ['ICU', 'NICU', 'PICU'] } }).catch(() => 0);
      const icuOcc = await Bed.countDocuments({ hospitalId, ward: { $in: ['ICU', 'NICU', 'PICU'] }, status: 'Occupied' }).catch(() => 0);
      out.icu_occupancy = pct(icuOcc, icuBeds);
    } else out.icu_occupancy = null;
    out.mortality_rate = pct(
      await AdmissionM.countDocuments({ hospitalId, status: 'DOD' }).catch(() => 0),
      Math.max(1, await AdmissionM.countDocuments({ hospitalId, status: { $in: ['Discharged', 'DOD'] } }).catch(() => 1)),
    );
    if (HaiM && HaiM.countDocuments) {
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      const [hai, admits] = await Promise.all([
        HaiM.countDocuments({ hospitalId, status: 'confirmed', onsetDate: { $gte: monthAgo } }).catch(() => 0),
        AdmissionM.countDocuments({ hospitalId, createdAt: { $gte: monthAgo } }).catch(() => 0),
      ]);
      const patientDays = Math.max(1, admits * 4);
      out.hai_rate = Math.round((hai / patientDays) * 1000 * 100) / 100;
    } else out.hai_rate = null;
    out.needlestick_reports = NeedleM
      ? await NeedleM.countDocuments({ hospitalId, injuryDate: { $gte: new Date(Date.now() - 30 * 86400000) } }).catch(() => 0)
      : null;
    out.restricted_abx_pending = AbxM
      ? await AbxM.countDocuments({ hospitalId, restricted: true, approvalStatus: 'pending' }).catch(() => 0)
      : null;
    out.dialysis_sessions_30d = DialysisM
      ? await DialysisM.countDocuments({
        hospitalId,
        // DialysisSession.date is a YYYY-MM-DD string, not a Date.
        date: { $gte: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) },
      }).catch(() => 0)
      : null;
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
  // File 22 P2-36: scheduler KPI snapshot rides the same nightly row.
  const { default: AppointmentM } = await import('../models/Appointment.js').catch(() => ({ default: null }));
  let appointments = 0;
  let noshows = 0;
  if (AppointmentM) {
    const rows = await safeFirst(AppointmentM.find({ hospitalId, createdAt: { $gte: from, $lte: to } }).select('status').lean()) || [];
    appointments = rows.length;
    noshows = rows.filter((r) => r.status === 'Missed').length;
  }
  const metrics = {
    billed: bills.reduce((a, b) => a + Number(b.amount || 0), 0),
    collected: bills.reduce((a, b) => a + Number(b.paid || 0), 0),
    bills: bills.length,
    admissions,
    appointments,
    noshows,
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
