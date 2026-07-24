import express from 'express';
import Patient from '../models/Patient.js';
import { protect } from '../middleware/auth.js';
import { validate, createPatientSchema, updatePatientSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';

const router = express.Router();

// ─── Get Patients ───────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { disease: new RegExp(search, 'i') },
        { doctor: new RegExp(search, 'i') },
        { uhid: new RegExp(search, 'i') },
      ];
    }
    if (status) filter.status = status;
    const result = await paginatedResults(Patient, filter, { page, limit });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (req.user.role === 'patient' && p._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin' && p.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createPatientSchema), async (req, res) => {
  try {
    const targetHospitalId = req.body.hospitalId || req.user.hospitalId || undefined;
    const p = await Patient.create({ ...req.body, hospitalId: targetHospitalId });
    await auditLog('create_patient', req.user._id, { recordId: p._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(p);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, validate(updatePatientSchema), async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (req.user.role === 'patient' && p._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin' && p.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(p, req.body);
    await p.save();
    await auditLog('update_patient', req.user._id, { recordId: p._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(p);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (req.user.role === 'patient' && p._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin' && p.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Patient.findByIdAndDelete(req.params.id);
    await auditLog('delete_patient', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Patient removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Patient Card Data ───────────────────────────────────────────────────────
router.get('/:id/card', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    if (req.user.role === 'patient' && patient._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin' && patient.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cardData = {
      patientName: patient.name,
      uhid: patient.uhid,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      disease: patient.disease,
      doctor: patient.doctor,
      admitted: patient.admitted,
      status: patient.status,
      allergies: patient.adverseReactions || [],
      generatedAt: new Date(),
    };

    res.json(cardData);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
