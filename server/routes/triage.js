import express from 'express';
import { z } from 'zod';
import Triage from '../models/Triage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createTriageSchema } from '../utils/validate.js';

const triageUpdateSchema = z.object({}).passthrough();
const triageAssignSchema = z.object({ doctorId: z.string().optional(), doctorName: z.string().optional() });
const triageMlcSchema = z.object({}).passthrough();
const triageNoteSchema = z.object({ text: z.string().min(1) });

const router = express.Router();

const generateEmergencyId = async () => {
  const count = await Triage.countDocuments();
  return `ER-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

const generateMlcNumber = async () => {
  const count = await Triage.countDocuments({ isMLCO: true });
  return `MLC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

router.post('/', protect, adminOnly, validate(createTriageSchema), async (req, res) => {
  try {
    const { patientName, age, gender, phone, arrivalMode, broughtBy, chiefComplaint, triageLevel, triageNotes, vitals, isMLCO, patientId } = req.body;
    if (!patientName || !chiefComplaint || !triageLevel) {
      return res.status(400).json({ message: 'Patient name, chief complaint, and triage level required' });
    }
    const emergencyId = await generateEmergencyId();
    const entry = await Triage.create({
      emergencyId, patientName, age, gender, phone, patientId,
      hospitalId: req.user.hospitalId || undefined,
      arrivalMode: arrivalMode || 'Walk-in', broughtBy: broughtBy || '',
      chiefComplaint, triageLevel, triageNotes: triageNotes || '',
      triagedBy: req.user._id, triagedAt: new Date(),
      vitals: vitals || {}, isMLCO: isMLCO || false, createdBy: req.user._id,
    });
    if (['P1-Immediate', 'P2-Urgent'].includes(triageLevel)) {
      const doctors = await User.find({ role: 'doctor', status: 'active' }).select('_id');
      await Notification.insertMany(doctors.map(doc => ({
        title: `🚨 ${triageLevel} Emergency`, message: `${patientName} - ${chiefComplaint}`,
        type: 'emergency', userId: doc._id.toString(),
      })));
    }
    res.status(201).json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/', protect, async (req, res) => {
  try {
    const { status, triageLevel, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (triageLevel && triageLevel !== 'All') filter.triageLevel = triageLevel;
    if (search) {
      filter.$or = [
        { emergencyId: new RegExp(search, 'i') },
        { patientName: new RegExp(search, 'i') },
        { chiefComplaint: new RegExp(search, 'i') },
        { mlcNumber: new RegExp(search, 'i') },
      ];
    }
    const entries = await Triage.find(filter).populate('triagedBy', 'name').sort({ createdAt: -1 });
    res.json({ entries });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id).populate('triagedBy', 'name').populate('assignedDoctor', 'name');
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, adminOnly, validate(triageUpdateSchema), async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(entry, req.body);
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, adminOnly, validate(triageAssignSchema), async (req, res) => {
  try {
    const { doctorId, doctorName } = req.body;
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    entry.assignedDoctor = doctorId;
    entry.assignedDoctorName = doctorName;
    await entry.save();
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/mlc', protect, adminOnly, validate(triageMlcSchema), async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const mlcNumber = entry.mlcNumber || await generateMlcNumber();
    entry.isMLCO = true; entry.mlcNumber = mlcNumber;
    entry.mlc = { ...req.body, reportedAt: new Date() };
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/notes', protect, adminOnly, validate(triageNoteSchema), async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    entry.treatmentNotes.push({ text: req.body.text, doctorName: req.user.name, timestamp: new Date() });
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats/main', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const total = await Triage.countDocuments(hFilter);
    const immediate = await Triage.countDocuments({ ...hFilter, triageLevel: 'P1-Immediate', status: { $ne: 'Discharged' } });
    const urgent = await Triage.countDocuments({ ...hFilter, triageLevel: 'P2-Urgent', status: { $ne: 'Discharged' } });
    const lessUrgent = await Triage.countDocuments({ ...hFilter, triageLevel: 'P3-Less Urgent', status: { $ne: 'Discharged' } });
    const active = await Triage.countDocuments({ ...hFilter, status: 'In Treatment' });
    const today = await Triage.countDocuments({ ...hFilter, createdAt: { $gte: new Date().setHours(0,0,0,0) } });
    const mlc = await Triage.countDocuments({ ...hFilter, isMLCO: true });
    res.json({ total, immediate, urgent, lessUrgent, active, today, mlc });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;