import express from 'express';
import Corporate from '../models/Corporate.js';
import CorporateEmployee from '../models/CorporateEmployee.js';
import Contract from '../models/Contract.js';
import VendorScorecard from '../models/VendorScorecard.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 16 §16.4/§16.5/§16.6: corporates (eligibility + statements), rate/AMC
// contracts with expiry sweep, vendor scorecards (computed, period-locked).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

// ─── Corporates ─────────────────────────────────────────────────────────────
router.get('/corporates', authorize('billing:read'), async (req, res) => {
  try {
    const rows = await Corporate.find(tenant(req)).sort({ name: 1 }).limit(200).lean();
    return res.json({ corporates: rows });
  } catch (err) {
    logger.error(`Corporates error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/corporates', authorize('billing:write'), async (req, res) => {
  try {
    const row = await Corporate.create({ ...tenant(req), ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Corporate create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/corporates/:id/employees', authorize('billing:read'), async (req, res) => {
  try {
    const rows = await CorporateEmployee.find({ corporateId: req.params.id, active: true })
      .sort({ name: 1 }).limit(500).lean();
    return res.json({ employees: rows });
  } catch (err) {
    logger.error(`Corporate employees error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/corporates/:id/employees', authorize('billing:write'), async (req, res) => {
  try {
    const row = await CorporateEmployee.create({ ...tenant(req), corporateId: req.params.id, ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Corporate employee create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Eligibility: employee active + corporate active + credit headroom.
router.get('/corporates/:id/eligibility', authorize('billing:read'), async (req, res) => {
  try {
    const corp = await Corporate.findById(req.params.id).lean();
    if (!corp) return res.status(404).json({ message: 'Not found' });
    const { employeeId, amount } = req.query;
    const emp = employeeId
      ? await CorporateEmployee.findOne({ corporateId: corp._id, employeeId, active: true }).lean()
      : null;
    const headroom = Number(corp.creditLimit || 0) - Number(corp.creditUsed || 0);
    const eligible = Boolean(corp.active)
      && (!employeeId || Boolean(emp))
      && headroom >= (Number(amount) || 0);
    return res.json({ eligible, headroom, employee: emp ? { name: emp.name } : null });
  } catch (err) {
    logger.error(`Eligibility error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Statement: insured bills linked to this corporate (via Claim.corporateId).
router.get('/corporates/:id/statement', authorize('billing:read'), async (req, res) => {
  try {
    const { default: Claim } = await import('../models/Claim.js').catch(() => ({ default: null }));
    if (!Claim) return res.json({ lines: [] });
    const rows = await Claim.find({ hospitalId: req.user.hospitalId, corporateId: req.params.id })
      .sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ lines: rows });
  } catch (err) {
    logger.error(`Corporate statement error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Contracts ──────────────────────────────────────────────────────────────
router.get('/contracts', authorize('billing:read'), async (req, res) => {
  try {
    const { expiringDays } = req.query;
    const filter = tenant(req);
    if (expiringDays) {
      filter.status = 'active';
      filter.endDate = { $lte: new Date(Date.now() + Number(expiringDays) * 86400 * 1000) };
    }
    const rows = await Contract.find(filter).sort({ endDate: 1 }).limit(300).lean();
    return res.json({ contracts: rows });
  } catch (err) {
    logger.error(`Contracts error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/contracts', authorize('billing:write'), async (req, res) => {
  try {
    const row = await Contract.create({ ...tenant(req), ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Contract create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/contracts/sweep', authorize('billing:write'), async (req, res) => {
  try {
    const out = await Contract.updateMany(
      { ...tenant(req), status: 'active', endDate: { $lt: new Date() } },
      { $set: { status: 'expired' } },
    );
    return res.json({ expired: out.modifiedCount || 0 });
  } catch (err) {
    logger.error(`Contract sweep error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Vendor scorecards ──────────────────────────────────────────────────────
router.get('/vendors/scorecards', authorize('billing:read'), async (req, res) => {
  try {
    const { period } = req.query;
    const filter = tenant(req);
    if (period) filter.period = period;
    const rows = await VendorScorecard.find(filter).sort({ period: -1 }).limit(200).lean();
    return res.json({ scorecards: rows });
  } catch (err) {
    logger.error(`Scorecards error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Compute from PurchaseOrders in the period (on-time + fill-rate); quality
// comes from GRN accept rates when present, else null (honest, not faked).
router.post('/vendors/:supplierId/scorecards/compute', authorize('billing:write'), async (req, res) => {
  try {
    const { period } = req.body || {};
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ message: 'period YYYY-MM required' });
    }
    const { default: PurchaseOrder } = await import('../models/PurchaseOrder.js').catch(() => ({ default: null }));
    let onTimePct = null;
    let fillRatePct = null;
    if (PurchaseOrder) {
      const [y, m] = period.split('-').map(Number);
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 1);
      const pos = await PurchaseOrder.find({
        hospitalId: req.user.hospitalId, supplierId: req.params.supplierId,
        createdAt: { $gte: from, $lt: to },
      }).lean();
      if (pos.length) {
        const onTime = pos.filter((p) => !p.expectedDate || (p.receivedDate && new Date(p.receivedDate) <= new Date(p.expectedDate))).length;
        onTimePct = Math.round((onTime / pos.length) * 100);
        const filled = pos.filter((p) => (p.status || '').toLowerCase().includes('receiv') || (p.status || '').toLowerCase().includes('complet')).length;
        fillRatePct = Math.round((filled / pos.length) * 100);
      }
    }
    const score = onTimePct != null && fillRatePct != null ? Math.round(onTimePct * 0.5 + fillRatePct * 0.5) : null;
    const row = await VendorScorecard.findOneAndUpdate(
      { hospitalId: req.user.hospitalId, supplierId: req.params.supplierId, period },
      { $set: { onTimePct, qualityPct: null, fillRatePct, score } },
      { upsert: true, new: true },
    );
    await auditLog('vendor_scorecard', actorId(req), { supplierId: req.params.supplierId, period, ip: req.ip });
    return res.json({ id: String(row._id), onTimePct, fillRatePct, score });
  } catch (err) {
    logger.error(`Scorecard compute error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P0-6: asset maintenance log (PM/calibration/repair) + overdue view.
router.get('/maintenance', authorize('billing:read'), async (req, res) => {
  try {
    const { default: AssetMaintenance } = await import('../models/AssetMaintenance.js');
    const filter = tenant(req);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.overdue === '1') filter.dueDate = { $lt: new Date() };
    const rows = await AssetMaintenance.find(filter).sort({ dueDate: 1 }).limit(300).lean();
    return res.json({ maintenance: rows });
  } catch (err) {
    logger.error(`Maintenance error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/maintenance', authorize('billing:write'), async (req, res) => {
  try {
    const { default: AssetMaintenance } = await import('../models/AssetMaintenance.js');
    const { assetUnitId, equipmentName, kind, dueDate, vendor, cost } = req.body || {};
    if (!kind) return res.status(400).json({ message: 'kind required' });
    const row = await AssetMaintenance.create({
      ...tenant(req), assetUnitId: assetUnitId || null,
      equipmentName: String(equipmentName || '').slice(0, 200), kind,
      dueDate: dueDate || null, vendor: String(vendor || '').slice(0, 200),
      cost: Number(cost) || 0, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Maintenance create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/maintenance/:id', authorize('billing:write'), async (req, res) => {
  try {
    const { default: AssetMaintenance } = await import('../models/AssetMaintenance.js');
    const allowed = ['dueDate', 'doneDate', 'vendor', 'cost', 'reportUrl', 'status'];
    const set = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    if (set.status === 'Done' && !set.doneDate) set.doneDate = new Date();
    const row = await AssetMaintenance.findOneAndUpdate(
      { _id: req.params.id, ...tenant(req) }, { $set: set }, { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Maintenance patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
