import express from 'express';
import Patient from '../models/Patient.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ─── Get Patients ───────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { disease: new RegExp(search, 'i') },
        { doctor: new RegExp(search, 'i') },
        { uhid: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    if (status) filter.status = status;
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && p.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const targetHospitalId = req.body.hospitalId || req.user.hospitalId || undefined;
    const p = await Patient.create({ ...req.body, hospitalId: targetHospitalId });
    res.status(201).json(p);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && p.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(p, req.body);
    await p.save();
    res.json(p);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && p.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ message: 'Patient removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Patient Card Data ───────────────────────────────────────────────────────
router.get('/:id/card', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
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

export default router;// 24
