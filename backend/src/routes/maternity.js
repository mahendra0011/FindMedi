import express from 'express';
import AntenatalRecord from '../models/AntenatalRecord.js';
import LabourRecord from '../models/LabourRecord.js';
import BirthRecord from '../models/BirthRecord.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §04.7: antenatal cards, visits, labour/partogram, delivery close-out
// (creates the BirthRecord for CRS data).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const CLINICAL = ['doctor', 'clinic_doctor', 'nurse', 'hospital_admin', 'superadmin'];
const clinicalOnly = (req, res, next) => (
  CLINICAL.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Clinical access required' })
);
const OBJECT_ID = /^[0-9a-f]{24}$/i;

router.post('/antenatal', clinicalOnly, async (req, res) => {
  try {
    const { patientId, lmp, edd, gravida, para, riskFlags } = req.body || {};
    if (!OBJECT_ID.test(String(patientId || ''))) return res.status(400).json({ message: 'patientId required' });
    const row = await AntenatalRecord.create({
      patientId, hospitalId: req.user.hospitalId,
      lmp: lmp || null, edd: edd || null,
      gravida: Number(gravida) || 0, para: Number(para) || 0,
      riskFlags: riskFlags || [], createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`ANC error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/antenatal/:id/visits', clinicalOnly, async (req, res) => {
  try {
    const row = await AntenatalRecord.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    row.visits.push({ ...req.body, by: actorId(req) });
    await row.save();
    return res.json({ id: String(row._id), visits: row.visits.length });
  } catch (err) {
    logger.error(`ANC visit error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/antenatal', clinicalOnly, async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    const rows = await AntenatalRecord.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    return res.json({ records: rows });
  } catch (err) {
    logger.error(`ANC list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/labour', clinicalOnly, async (req, res) => {
  try {
    const { antenatalId, admissionId, patientId, onsetAt } = req.body || {};
    if (!OBJECT_ID.test(String(patientId || ''))) return res.status(400).json({ message: 'patientId required' });
    const row = await LabourRecord.create({
      antenatalId: antenatalId || null, admissionId: admissionId || null,
      patientId, hospitalId: req.user.hospitalId,
      onsetAt: onsetAt || null, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Labour error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/labour/:id/deliver', clinicalOnly, async (req, res) => {
  try {
    const row = await LabourRecord.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const { deliveryType, babyWeightKg, babySex, notes } = req.body || {};
    row.deliveryAt = new Date();
    row.deliveryType = deliveryType || '';
    row.babyWeightKg = Number(babyWeightKg) || 0;
    row.babySex = babySex || '';
    row.notes = String(notes || '').slice(0, 2000);
    await row.save();
    const birth = await BirthRecord.create({
      hospitalId: row.hospitalId, motherId: row.patientId,
      admissionId: row.admissionId, weightKg: row.babyWeightKg, sex: row.babySex,
      timeOfBirth: row.deliveryAt, deliveryType: row.deliveryType,
    });
    await AntenatalRecord.updateOne({ _id: row.antenatalId }, { $set: { status: 'Delivered' } }).catch(() => {});
    await auditLog('delivery_recorded', actorId(req), { labourId: row._id, birthId: birth._id, ip: req.ip });
    return res.json({ id: String(row._id), birthId: String(birth._id) });
  } catch (err) {
    logger.error(`Deliver error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
