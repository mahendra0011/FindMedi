import express from 'express';
import License from '../models/License.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const { status, facilityType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (facilityType) filter.facilityType = facilityType;
    if (search) filter.$or = [
      { facilityName: new RegExp(search, 'i') },
      { licenseNumber: new RegExp(search, 'i') },
    ];
    const licenses = await License.find(filter).sort({ expiryDate: 1 });
    res.json({ licenses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, superadminOnly, async (req, res) => {
  try {
    const license = await License.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!license) return res.status(404).json({ message: 'License not found' });
    await auditLog('update_license', req.user._id, { targetLicenseId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(license);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/expiring', protect, superadminOnly, async (req, res) => {
  try {
    const licenses = await License.find({ status: 'Expiring Soon' }).sort({ expiryDate: 1 });
    res.json({ licenses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, superadminOnly, async (req, res) => {
  try {
    const total = await License.countDocuments();
    const active = await License.countDocuments({ status: 'Active' });
    const expiringSoon = await License.countDocuments({ status: 'Expiring Soon' });
    const expired = await License.countDocuments({ status: 'Expired' });
    res.json({ total, active, expiringSoon, expired });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;