import express from 'express';
import OperationTheatre from '../models/OperationTheatre.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateOTId = async () => {
  const count = await OperationTheatre.countDocuments();
  return `OT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

router.post('/surgeries', protect, async (req, res) => {
  try {
    const { patientId, patientName, surgeryName, surgeryType, anaesthesiaType, assistants, otNumber, scheduledDate } = req.body;
    if (!patientId || !surgeryName) return res.status(400).json({ message: 'Patient and surgery required' });
    const otId = await generateOTId();
    const surgery = await OperationTheatre.create({
      otId, patientId, patientName, doctorId: req.user._id, doctorName: req.user.name,
      surgeryName, surgeryType: surgeryType || 'Elective',
      anaesthesiaType: anaesthesiaType || 'General', assistants: assistants || [],
      otNumber: otNumber || '', scheduledDate,
      createdBy: req.user._id,
    });
    res.status(201).json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/surgeries', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { otId: new RegExp(search, 'i') }, { patientName: new RegExp(search, 'i') },
        { surgeryName: new RegExp(search, 'i') }, { doctorName: new RegExp(search, 'i') },
      ];
    }
    const surgeries = await OperationTheatre.find(filter)
      .populate('patientId', 'name email phone').populate('doctorId', 'name')
      .sort({ createdAt: -1 });
    res.json({ surgeries });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/surgeries/:id', protect, async (req, res) => {
  try {
    const surgery = await OperationTheatre.findById(req.params.id)
      .populate('patientId', 'name email phone').populate('doctorId', 'name');
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    res.json(surgery);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/surgeries/:id/start', protect, async (req, res) => {
  try {
    const surgery = await OperationTheatre.findByIdAndUpdate(req.params.id, { status: 'In Progress', startTime: new Date() }, { new: true });
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/complete', protect, async (req, res) => {
  try {
    const { findings, procedure, complications, postOpInstructions, instrumentsAfter, spongesAfter } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    surgery.status = 'Recovery';
    surgery.endTime = new Date();
    surgery.findings = findings || '';
    surgery.procedure = procedure || '';
    surgery.complications = complications || '';
    surgery.postOpInstructions = postOpInstructions || '';
    if (instrumentsAfter !== undefined) {
      surgery.instrumentsCount.after = instrumentsAfter;
      surgery.instrumentsCount.correct = surgery.instrumentsCount.before === instrumentsAfter;
    }
    if (spongesAfter !== undefined) {
      surgery.spongeCount.after = spongesAfter;
      surgery.spongeCount.correct = surgery.spongeCount.before === spongesAfter;
    }
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/recovery', protect, async (req, res) => {
  try {
    const { recoveryNotes, vitals } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    surgery.status = 'Completed';
    surgery.recoveryNotes = recoveryNotes || '';
    if (vitals) surgery.recoveryVitals.push(vitals);
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/checklist', protect, async (req, res) => {
  try {
    const { checklist } = req.body;
    const requiredFields = ['consentSigned', 'bloodGroupConfirmed', 'anaesthesiaFitness', 'npoStatus', 'allergiesChecked', 'siteMarked', 'investigationsReviewed'];
    const missingFields = requiredFields.filter(f => !checklist?.[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Mandatory checklist fields missing: ${missingFields.join(', ')}` });
    }
    const surgery = await OperationTheatre.findByIdAndUpdate(req.params.id, { preOpChecklist: checklist, status: 'Pre-Op' }, { new: true });
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/surgeries/:id/pre-op-vitals', protect, async (req, res) => {
  try {
    const { bp, hr, temp, spO2, weight, notes } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    
    if (bp) surgery.preOpVitals.bp = bp;
    if (hr) surgery.preOpVitals.hr = hr;
    if (temp) surgery.preOpVitals.temp = temp;
    if (spO2) surgery.preOpVitals.spO2 = spO2;
    if (weight) surgery.preOpVitals.weight = weight;
    
    surgery.status = 'Pre-Op';
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/surgeries/:id/instruments', protect, async (req, res) => {
  try {
    const { instrumentsBefore, spongesBefore } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    
    if (instrumentsBefore !== undefined) surgery.instrumentsCount.before = instrumentsBefore;
    if (spongesBefore !== undefined) surgery.spongeCount.before = spongesBefore;
    
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const total = await OperationTheatre.countDocuments();
    const scheduled = await OperationTheatre.countDocuments({ status: 'Scheduled' });
    const inProgress = await OperationTheatre.countDocuments({ status: { $in: ['In Progress', 'Pre-Op'] } });
    const completed = await OperationTheatre.countDocuments({ status: 'Completed' });
    const today = await OperationTheatre.countDocuments({ scheduledDate: { $gte: new Date().setHours(0,0,0,0) } });
    res.json({ total, scheduled, inProgress, completed, today });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;