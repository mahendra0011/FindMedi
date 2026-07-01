import express from 'express';
import Radiology from '../models/Radiology.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateOrderId = async () => {
  const count = await Radiology.countDocuments();
  return `RAD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// ─── Create Radiology Order ────────────────────────────────────────────────
router.post('/orders', protect, async (req, res) => {
  try {
    const { patientId, patientName, modality, bodyPart, clinicalHistory, priority } = req.body;
    if (!patientId || !modality || !bodyPart) {
      return res.status(400).json({ message: 'Patient, modality, and body part required' });
    }
    const orderId = await generateOrderId();
    const order = await Radiology.create({
      orderId, patientId, patientName,
      doctorId: req.user._id, doctorName: req.user.name,
      modality, bodyPart, clinicalHistory: clinicalHistory || '',
      priority: priority || 'Routine', createdBy: req.user._id,
    });
    // Notify radiology staff
    const staff = await User.find({ role: { $in: ['radiologist', 'admin'] }, status: 'active' }).select('_id');
    await Notification.insertMany(staff.map(s => ({
      title: 'New Radiology Order', message: `Dr. ${req.user.name} ordered ${modality} for ${patientName}`,
      type: 'radiology', userId: s._id.toString(),
    })));
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── List Orders ──────────────────────────────────────────────────────────
router.get('/orders', protect, async (req, res) => {
  try {
    const { status, modality, search } = req.query;
    const filter = {};
    if (req.user.role === 'doctor') filter.doctorId = req.user._id;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (status && status !== 'All') filter.status = status;
    if (modality && modality !== 'All') filter.modality = modality;
    if (search) {
      filter.$or = [
        { orderId: new RegExp(search, 'i') },
        { patientName: new RegExp(search, 'i') },
        { bodyPart: new RegExp(search, 'i') },
      ];
    }
    const orders = await Radiology.find(filter).populate('patientId', 'name email phone').populate('doctorId', 'name email').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Single Order ──────────────────────────────────────────────────────
router.get('/orders/:id', protect, async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id).populate('patientId', 'name email phone').populate('doctorId', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Schedule Scan ─────────────────────────────────────────────────────────
router.put('/orders/:id/schedule', protect, async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    const order = await Radiology.findByIdAndUpdate(req.params.id, { status: 'Scheduled', scheduledAt }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Start Scan (Technician) ───────────────────────────────────────────────
router.put('/orders/:id/start', protect, async (req, res) => {
  try {
    const order = await Radiology.findByIdAndUpdate(req.params.id, { status: 'In Progress', performedAt: new Date(), performedBy: req.user.name }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Complete Scan ─────────────────────────────────────────────────────────
router.put('/orders/:id/complete', protect, async (req, res) => {
  try {
    const { imageUrls } = req.body;
    const order = await Radiology.findByIdAndUpdate(req.params.id, { status: 'Completed', imageUrls: imageUrls || [] }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Submit Report (Radiologist) ──────────────────────────────────────────
router.put('/orders/:id/report', protect, async (req, res) => {
  try {
    const { findings, impression, recommendation, reportUrl } = req.body;
    const order = await Radiology.findByIdAndUpdate(req.params.id, {
      status: 'Reported', findings, impression, recommendation, reportUrl,
      reportedBy: req.user._id, reportedAt: new Date(),
    }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    // Notify doctor
    await Notification.create({
      title: 'Radiology Report Ready', message: `${order.modality} report for ${order.patientName} is ready`,
      type: 'radiology', userId: order.doctorId.toString(),
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Deliver Report ────────────────────────────────────────────────────────
router.put('/orders/:id/deliver', protect, async (req, res) => {
  try {
    const order = await Radiology.findByIdAndUpdate(req.params.id, { status: 'Delivered' }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    // Notify patient
    await Notification.create({
      title: 'Radiology Report Available', message: `Your ${order.modality} report is now available.`,
      type: 'radiology', userId: order.patientId.toString(),
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'doctor') filter.doctorId = req.user._id;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    const total = await Radiology.countDocuments(filter);
    const pending = await Radiology.countDocuments({ ...filter, status: { $in: ['Ordered', 'Scheduled'] } });
    const inProgress = await Radiology.countDocuments({ ...filter, status: 'In Progress' });
    const completed = await Radiology.countDocuments({ ...filter, status: { $in: ['Completed', 'Reported', 'Delivered'] } });
    const reported = await Radiology.countDocuments({ ...filter, status: { $in: ['Reported', 'Delivered'] } });
    res.json({ total, pending, inProgress, completed, reported });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;