import express from 'express';
import InstrumentSet from '../models/InstrumentSet.js';
import SterilisationCycle from '../models/SterilisationCycle.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §9.7/06.4: CSSD set master + sterilisation cycles with BI/CI
// gating. A BI Fail recalls the load (result=Recalled + audit).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

router.get('/sets', authorize('inventory:manage'), async (req, res) => {
  try {
    const rows = await InstrumentSet.find(tenantFilter(req)).limit(200).lean();
    return res.json({ sets: rows });
  } catch (err) {
    logger.error(`CSSD sets error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/sets', authorize('inventory:manage'), async (req, res) => {
  try {
    const { code, name, items } = req.body || {};
    if (!code || !name) return res.status(400).json({ message: 'code + name required' });
    const s = await InstrumentSet.create({
      hospitalId: req.user.hospitalId, code, name,
      items: Array.isArray(items) ? items.slice(0, 200) : [], createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(s._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Set code already exists' });
    logger.error(`CSSD set create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/cycles', authorize('inventory:manage'), async (req, res) => {
  try {
    const { machineId, cycleNo, method, loadItems, parameters } = req.body || {};
    if (!cycleNo) return res.status(400).json({ message: 'cycleNo required' });
    const c = await SterilisationCycle.create({
      hospitalId: req.user.hospitalId, machineId: machineId || '', cycleNo,
      method: method || 'Autoclave', loadItems: loadItems || [], parameters: parameters || {},
      operator: actorId(req),
    });
    await auditLog('cssd_cycle_started', actorId(req), { cycleId: c._id, cycleNo, ip: req.ip });
    return res.status(201).json({ id: String(c._id), result: c.result });
  } catch (err) {
    logger.error(`CSSD cycle error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.put('/cycles/:id/indicators', authorize('inventory:manage'), requireObjectId, async (req, res) => {
  try {
    const { biologicalIndicator, chemicalIndicator } = req.body || {};
    const c = await SterilisationCycle.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });
    if (biologicalIndicator) c.biologicalIndicator = biologicalIndicator;
    if (chemicalIndicator) c.chemicalIndicator = chemicalIndicator;
    if (c.biologicalIndicator === 'Fail' || c.chemicalIndicator === 'Fail') {
      c.result = 'Recalled';
    } else if (c.biologicalIndicator === 'Pass' && c.chemicalIndicator === 'Pass') {
      c.result = 'Released';
    }
    await c.save();

    // Load-based recall: propagate indicator result to every set in the load.
    const setIds = (c.loadItems || []).map((li) => li.setId).filter(Boolean);
    let quarantinedSets = 0;
    let releasedSets = 0;
    if (setIds.length > 0) {
      if (c.result === 'Recalled') {
        const r = await InstrumentSet.updateMany(
          { _id: { $in: setIds } },
          { $set: { status: 'Quarantined', quarantinedByCycle: c.cycleNo } }
        );
        quarantinedSets = r.modifiedCount ?? 0;
      } else if (c.result === 'Released') {
        const r = await InstrumentSet.updateMany(
          { _id: { $in: setIds }, status: 'Quarantined' },
          { $set: { status: 'Sterile', quarantinedByCycle: '' } }
        );
        releasedSets = r.modifiedCount ?? 0;
      }
    }

    await auditLog('cssd_indicators', actorId(req), {
      cycleId: c._id, bi: c.biologicalIndicator, ci: c.chemicalIndicator, result: c.result,
      quarantinedSets, releasedSets, ip: req.ip,
    });
    return res.json({
      id: String(c._id), result: c.result,
      quarantinedSets, releasedSets,
      message: c.result === 'Recalled'
        ? `Load recalled — ${quarantinedSets} instrument set(s) quarantined for re-sterilisation`
        : `Load released — ${releasedSets} set(s) returned to sterile store`,
    });
  } catch (err) {
    logger.error(`CSSD indicators error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Explicit load-based recall (post-release recall, e.g. retro BI read at 24h)
router.post('/cycles/:id/recall', authorize('inventory:manage'), requireObjectId, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const c = await SterilisationCycle.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });
    c.result = 'Recalled';
    await c.save();
    const setIds = (c.loadItems || []).map((li) => li.setId).filter(Boolean);
    let quarantinedSets = 0;
    if (setIds.length > 0) {
      const r = await InstrumentSet.updateMany(
        { _id: { $in: setIds } },
        { $set: { status: 'Quarantined', quarantinedByCycle: c.cycleNo } }
      );
      quarantinedSets = r.modifiedCount ?? 0;
    }
    await auditLog('cssd_load_recalled', actorId(req), {
      cycleId: c._id, cycleNo: c.cycleNo, reason: reason || '', quarantinedSets, ip: req.ip,
    });
    return res.json({
      id: String(c._id), result: 'Recalled', quarantinedSets,
      message: `Load ${c.cycleNo} recalled — ${quarantinedSets} set(s) quarantined`,
    });
  } catch (err) {
    logger.error(`CSSD recall error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Indicator results register (BI/CI audit trail)
router.get('/indicators', authorize('inventory:manage'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req), $or: [{ biologicalIndicator: { $ne: '' } }, { chemicalIndicator: { $ne: '' } }] };
    const rows = await SterilisationCycle.find(filter)
      .select('cycleNo method biologicalIndicator chemicalIndicator result createdAt machineId')
      .sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ indicators: rows });
  } catch (err) {
    logger.error(`CSSD indicator register error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/cycles', authorize('inventory:manage'), async (req, res) => {
  try {
    const { result } = req.query;
    const filter = { ...tenantFilter(req) };
    if (result) filter.result = result;
    const rows = await SterilisationCycle.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ cycles: rows });
  } catch (err) {
    logger.error(`CSSD cycles error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
