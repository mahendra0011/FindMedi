import express from 'express';
import Bed from '../models/Bed.js';
import { protect, scopeToHospital } from '../middleware/auth.js';
import { validate, createBedSchema, updateBedSchema } from '../utils/validate.js';

const router = express.Router();

router.get('/', protect, scopeToHospital, async (req, res) => {
  try {
    const { ward, status, hospitalId } = req.query;
    const filter = {};
    if (ward) filter.ward = ward;
    if (status) filter.status = status;
    if (hospitalId) filter.hospitalId = hospitalId;
    if (req.hospitalId) filter.hospitalId = req.hospitalId;
    const beds = await Bed.find(filter).sort({ bedNumber: 1 });
    res.json(beds);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// sanitize ward name input before processing
const sanitizeWard = (ward) => ward?.trim().replace(/[<>]/g, '')

router.get('/stats', protect, scopeToHospital, async (req, res) => {
  try {
    const filter = {};
    if (req.hospitalId) filter.hospitalId = req.hospitalId;
    const total = await Bed.countDocuments(filter);
    const available = await Bed.countDocuments({ ...filter, status: 'Available' });
    const occupied = await Bed.countDocuments({ ...filter, status: 'Occupied' });
    const maintenance = await Bed.countDocuments({ ...filter, status: { $in: ['Under Cleaning', 'Maintenance'] } });
    res.json({ total, available, occupied, maintenance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, scopeToHospital, validate(createBedSchema), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const data = { ...req.body, hospitalId: req.hospitalId };
    const bed = await Bed.create(data);
    res.status(201).json(bed);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, scopeToHospital, validate(updateBedSchema), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const bed = await Bed.findOne({ _id: req.params.id, hospitalId: req.hospitalId });
    if (!bed) return res.status(404).json({ message: 'Bed not found' });
    const updated = await Bed.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, scopeToHospital, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const bed = await Bed.findOne({ _id: req.params.id, hospitalId: req.hospitalId });
    if (!bed) return res.status(404).json({ message: 'Bed not found' });
    await Bed.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bed removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Tech Exp 04: Redlock Atomic ICU/Ventilator Bed Holding Lock ───
// Holds an ICU bed exclusively for an incoming ambulance for 5 minutes (300,000 ms)
router.post('/:id/hold-lock', protect, async (req, res) => {
  try {
    const { reservationId, ambulanceRequestId } = req.body;
    const lockKey = `lock:hospital:bed:${req.params.id}`;
    const token = reservationId || ambulanceRequestId || String(req.user._id);

    const { acquireLock, releaseLock } = await import('../lib/redlock.js');
    const lockAcquired = await acquireLock(lockKey, token, 300000); // 5 min hold

    if (!lockAcquired) {
      return res.status(409).json({
        success: false,
        message: 'This bed is currently locked by another emergency trauma transfer.',
      });
    }

    // Verify bed is available
    const bed = await Bed.findById(req.params.id);
    if (!bed || bed.status !== 'Available') {
      await releaseLock(lockKey, token);
      return res.status(400).json({
        success: false,
        message: 'Bed is not in Available status',
      });
    }

    res.json({
      success: true,
      message: 'ICU Bed locked exclusively for trauma patient transfer (5-minute TTL)',
      bedId: bed._id,
      bedNumber: bed.bedNumber,
      lockKey,
      ttlMs: 300000,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

