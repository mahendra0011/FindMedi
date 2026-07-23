import express from 'express';
import { z } from 'zod';
import Token from '../models/Token.js';
import Notification from '../models/Notification.js';
import Appointment from '../models/Appointment.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createTokenSchema } from '../utils/validate.js';

const tokenSkipSchema = z.object({ reason: z.string().optional() });

const router = express.Router();

// Generate token with auto-increment
router.post('/generate', protect, adminOnly, validate(createTokenSchema), async (req, res) => {
  try {
    const { patientId, patientName, uhid, doctorId, doctorName, department, appointmentId, type, priority } = req.body;
    if (!patientId || !patientName || !department) {
      return res.status(400).json({ message: 'Patient and department required' });
    }

    // Check for existing waiting token for same patient
    const existingToken = await Token.findOne({ patientId, status: { $in: ['Waiting', 'Called', 'In Consultation'] } });
    if (existingToken) {
      return res.status(400).json({ message: 'Patient already has an active token', token: existingToken });
    }

    // Calculate queue position and estimated wait time
    const currentQueueLength = await Token.countDocuments({ 
      department, 
      status: { $in: ['Waiting', 'Called', 'In Consultation'] },
      createdAt: { $gte: new Date().setHours(0,0,0,0) }
    });

    const estimatedWaitTime = currentQueueLength * 15; // 15 minutes average per patient

    const token = await Token.create({
      patientId, patientName, uhid, doctorId, doctorName,
      department, appointmentId, type: type || 'OPD', priority: priority || 'Normal',
      hospitalId: req.user.hospitalId || undefined,
      queuePosition: currentQueueLength + 1,
      estimatedWaitTime,
      checkedInAt: new Date(),
    });

    // Notify relevant staff
    await Notification.create({
      title: 'New Token Generated',
      message: `Token ${token.tokenNumber} generated for ${patientName} at ${department}`,
      type: 'token',
      userId: req.user._id.toString(),
    });

    res.status(201).json(token);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/', protect, async (req, res) => {
  try {
    const { status, department, date, doctorId } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    
    if (status && status !== 'All') filter.status = status;
    if (department && department !== 'All') filter.department = department;
    if (doctorId) filter.doctorId = doctorId;
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    } else {
      // Default to today
      const startDate = new Date().setHours(0,0,0,0);
      filter.createdAt = { $gte: startDate };
    }

    const tokens = await Token.find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name')
      .sort({ queuePosition: 1, createdAt: -1 });
    
    res.json({ tokens });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/current/:department?', protect, async (req, res) => {
  try {
    const { department } = req.params;
    const filter = { status: { $in: ['Waiting', 'Called', 'In Consultation'] } };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (department && department !== 'All') filter.department = department;

    const tokens = await Token.find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name')
      .sort({ queuePosition: 1, priority: -1 });

    res.json({ tokens });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name');
    if (!token) return res.status(404).json({ message: 'Token not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && token.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(token);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/call', protect, adminOnly, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && token.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Not authorized to call this token' });
    }
    token.status = 'Called';
    token.calledAt = new Date();
    await token.save();
    
    // Notify patient
    await Notification.create({
      title: 'Token Called',
      message: `Token ${token.tokenNumber} is now being called. Please proceed to ${token.department}`,
      type: 'token',
      userId: token.patientId,
    });

    res.json(token);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/start-consultation', protect, adminOnly, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && token.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    token.status = 'Called';
    token.calledAt = new Date();
    await token.save();
    res.json(token);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/complete', protect, adminOnly, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && token.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    token.status = 'Completed';
    token.completedAt = new Date();
    if (token.consultationStartTime) {
      token.totalConsultationTime = Math.round((token.completedAt - token.consultationStartTime) / 60000);
    }
    await token.save();

    // Update appointment if linked
    if (token.appointmentId) {
      await Appointment.findByIdAndUpdate(token.appointmentId, { status: 'Completed' });
    }

    res.json(token);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/skip', protect, adminOnly, validate(tokenSkipSchema), async (req, res) => {
  try {
    const { reason } = req.body;
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && token.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    token.status = 'Skipped';
    token.skippedAt = new Date();
    token.skipReason = reason || 'Patient not present';
    await token.save();

    res.json(token);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/recall', protect, adminOnly, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && token.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    token.status = 'Called';
    token.calledAt = new Date();
    await token.save();
    res.json(token);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date().setHours(0,0,0,0);
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const waiting = await Token.countDocuments({ status: 'Waiting', createdAt: { $gte: today }, ...hFilter });
    const inConsultation = await Token.countDocuments({ status: 'In Consultation', createdAt: { $gte: today }, ...hFilter });
    const completed = await Token.countDocuments({ status: 'Completed', createdAt: { $gte: today }, ...hFilter });
    const skipped = await Token.countDocuments({ status: 'Skipped', createdAt: { $gte: today }, ...hFilter });
    const total = await Token.countDocuments({ createdAt: { $gte: today }, ...hFilter });

    res.json({ waiting, inConsultation, completed, skipped, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;