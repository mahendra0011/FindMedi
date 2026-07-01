import express from 'express';
import Triage from '../models/Triage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateEmergencyId = async () => {
  const count = await Triage.countDocuments();
  return `ER-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

const generateMlcNumber = async () => {
  const count = await Triage.countDocuments({ isMLCO: true });
  return `MLC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

router.post('/', protect, async (req, res) => {
  try {
    const { patientName, age, gender, phone, arrivalMode, broughtBy, chiefComplaint, triageLevel, triageNotes, vitals, isMLCO, patientId } = req.body;
    if (!patientName || !chiefComplaint || !triageLevel) {
      return res.status(400).json({ message: 'Patient name, chief complaint, and triage level required' });
    }
    const emergencyId = await generateEmergencyId();
    const entry = await Triage.create({
      emergencyId, patientName, age, gender, phone, patientId,
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
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const entry = await Triage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, async (req, res) => {
  try {
    const { doctorId, doctorName } = req.body;
    const entry = await Triage.findByIdAndUpdate(req.params.id, { assignedDoctor: doctorId, assignedDoctorName: doctorName }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/mlc', protect, async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    const mlcNumber = entry.mlcNumber || await generateMlcNumber();
    entry.isMLCO = true; entry.mlcNumber = mlcNumber;
    entry.mlc = { ...req.body, reportedAt: new Date() };
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/notes', protect, async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    entry.treatmentNotes.push({ text: req.body.text, doctorName: req.user.name, timestamp: new Date() });
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats/main', protect, async (req, res) => {
  try {
    const total = await Triage.countDocuments();
    const immediate = await Triage.countDocuments({ triageLevel: 'P1-Immediate', status: { $ne: 'Discharged' } });
    const urgent = await Triage.countDocuments({ triageLevel: 'P2-Urgent', status: { $ne: 'Discharged' } });
    const lessUrgent = await Triage.countDocuments({ triageLevel: 'P3-Less Urgent', status: { $ne: 'Discharged' } });
    const active = await Triage.countDocuments({ status: 'In Treatment' });
    const today = await Triage.countDocuments({ createdAt: { $gte: new Date().setHours(0,0,0,0) } });
    const mlc = await Triage.countDocuments({ isMLCO: true });
    res.json({ total, immediate, urgent, lessUrgent, active, today, mlc });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;