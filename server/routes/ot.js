import express from 'express';
import { z } from 'zod';
import OperationTheatre from '../models/OperationTheatre.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { validate, createSurgerySchema } from '../utils/validate.js';

const otCompleteSchema = z.object({ findings: z.string().optional(), procedure: z.string().optional(), complications: z.string().optional(), postOpInstructions: z.string().optional(), instrumentsAfter: z.number().optional(), spongesAfter: z.number().optional() });
const otRecoverySchema = z.object({ recoveryNotes: z.string().optional(), vitals: z.any().optional() });
const otChecklistSchema = z.object({ checklist: z.any() });
const otPreOpVitalsSchema = z.object({ bp: z.string().optional(), hr: z.string().optional(), temp: z.string().optional(), spO2: z.string().optional(), weight: z.string().optional(), notes: z.string().optional() });
const otInstrumentsSchema = z.object({ instrumentsBefore: z.number().optional(), spongesBefore: z.number().optional() });

const router = express.Router();

const generateOTId = async () => {
  const count = await OperationTheatre.countDocuments();
  return `OT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

router.post('/surgeries', protect, validate(createSurgerySchema), async (req, res) => {
  try {
    const { patientId, patientName, surgeryName, surgeryType, anaesthesiaType, assistants, otNumber, scheduledDate } = req.body;
    if (!patientId || !surgeryName) return res.status(400).json({ message: 'Patient and surgery required' });
    const otId = await generateOTId();
    const surgery = await OperationTheatre.create({
      otId, patientId, patientName, doctorId: req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId || undefined,
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
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
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
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(surgery);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/surgeries/:id/start', protect, async (req, res) => {
  try {
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    surgery.status = 'In Progress';
    surgery.startTime = new Date();
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/complete', protect, validate(otCompleteSchema), async (req, res) => {
  try {
    const { findings, procedure, complications, postOpInstructions, instrumentsAfter, spongesAfter } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
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

router.put('/surgeries/:id/recovery', protect, validate(otRecoverySchema), async (req, res) => {
  try {
    const { recoveryNotes, vitals } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    surgery.status = 'Completed';
    surgery.recoveryNotes = recoveryNotes || '';
    if (vitals) surgery.recoveryVitals.push(vitals);
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/checklist', protect, validate(otChecklistSchema), async (req, res) => {
  try {
    const { checklist } = req.body;
    const requiredFields = ['consentSigned', 'bloodGroupConfirmed', 'anaesthesiaFitness', 'npoStatus', 'allergiesChecked', 'siteMarked', 'investigationsReviewed'];
    const missingFields = requiredFields.filter(f => !checklist?.[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Mandatory checklist fields missing: ${missingFields.join(', ')}` });
    }
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    surgery.preOpChecklist = checklist;
    surgery.status = 'Pre-Op';
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/surgeries/:id/pre-op-vitals', protect, validate(otPreOpVitalsSchema), async (req, res) => {
  try {
    const { bp, hr, temp, spO2, weight, notes } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
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

router.post('/surgeries/:id/instruments', protect, validate(otInstrumentsSchema), async (req, res) => {
  try {
    const { instrumentsBefore, spongesBefore } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (instrumentsBefore !== undefined) surgery.instrumentsCount.before = instrumentsBefore;
    if (spongesBefore !== undefined) surgery.spongeCount.before = spongesBefore;
    
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const total = await OperationTheatre.countDocuments(hFilter);
    const scheduled = await OperationTheatre.countDocuments({ ...hFilter, status: 'Scheduled' });
    const inProgress = await OperationTheatre.countDocuments({ ...hFilter, status: { $in: ['In Progress', 'Pre-Op'] } });
    const completed = await OperationTheatre.countDocuments({ ...hFilter, status: 'Completed' });
    const today = await OperationTheatre.countDocuments({ ...hFilter, scheduledDate: { $gte: new Date().setHours(0,0,0,0) } });
    res.json({ total, scheduled, inProgress, completed, today });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;