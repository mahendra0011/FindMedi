import express from 'express';
import ChemoProtocol from '../models/ChemoProtocol.js';
import ChemoCycle from '../models/ChemoCycle.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §04.9: chemo protocols + per-patient cycles with BSA-based doses
// and cytotoxic handling log. Tumour-board decisions link via cases.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const CLINICAL = ['doctor', 'clinic_doctor', 'hospital_admin', 'superadmin', 'nurse'];
const clinicalOnly = (req, res, next) => (
  CLINICAL.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Clinical access required' })
);
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

router.get('/protocols', clinicalOnly, async (req, res) => {
  try {
    const rows = await ChemoProtocol.find(tenantFilter(req)).limit(200).lean();
    return res.json({ protocols: rows });
  } catch (err) {
    logger.error(`Oncology protocols error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/protocols', clinicalOnly, async (req, res) => {
  try {
    const { name, cancerType, totalCycles, cycleDays, drugs } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const p = await ChemoProtocol.create({
      hospitalId: req.user.hospitalId, name, cancerType: cancerType || '',
      totalCycles: Number(totalCycles) || 1, cycleDays: Number(cycleDays) || 21,
      drugs: Array.isArray(drugs) ? drugs.slice(0, 50) : [], createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(p._id) });
  } catch (err) {
    logger.error(`Oncology protocol error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/cycles/schedule', clinicalOnly, async (req, res) => {
  try {
    const { protocolId, patientId, cycleNo, scheduledAt, bsa } = req.body || {};
    if (!protocolId || !patientId || !cycleNo) {
      return res.status(400).json({ message: 'protocolId + patientId + cycleNo required' });
    }
    const proto = await ChemoProtocol.findById(protocolId).lean();
    if (!proto) return res.status(404).json({ message: 'Protocol not found' });
    const bsaNum = Number(bsa) || 0;
    const c = await ChemoCycle.create({
      protocolId, patientId, hospitalId: req.user.hospitalId,
      cycleNo: Number(cycleNo), scheduledAt: scheduledAt || null, bsa: bsaNum,
      doses: (proto.drugs || []).map((d) => ({
        name: d.name, plannedMg: +((d.dosePerM2 || 0) * bsaNum).toFixed(1), givenMg: 0,
      })),
    });
    await auditLog('chemo_scheduled', actorId(req), { cycleId: c._id, protocolId, ip: req.ip });
    return res.status(201).json({ id: String(c._id), status: c.status });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Cycle already scheduled' });
    logger.error(`Chemo schedule error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/cycles/:id/administer', clinicalOnly, async (req, res) => {
  try {
    const { doses, cytotoxicLog } = req.body || {};
    const c = await ChemoCycle.findById(req.params.id);
    if (!c || c.status !== 'Scheduled') return res.status(404).json({ message: 'Scheduled cycle not found' });
    if (Array.isArray(doses)) {
      for (const d of doses) {
        const line = c.doses.find((x) => x.name === d.name);
        if (line) line.givenMg = Number(d.givenMg) || 0;
      }
    }
    c.cytotoxicLog = String(cytotoxicLog || '').slice(0, 2000);
    c.status = 'Administered';
    c.administeredAt = new Date();
    c.administeredBy = actorId(req);
    await c.save();
    await auditLog('chemo_administered', actorId(req), { cycleId: c._id, ip: req.ip });
    return res.json({ id: String(c._id), status: c.status });
  } catch (err) {
    logger.error(`Chemo administer error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/cycles', clinicalOnly, async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = { ...tenantFilter(req) };
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    const rows = await ChemoCycle.find(filter).sort({ scheduledAt: 1 }).limit(200).lean();
    return res.json({ cycles: rows });
  } catch (err) {
    logger.error(`Chemo cycles error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
