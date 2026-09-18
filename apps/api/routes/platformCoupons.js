import express from 'express';
import PlatformCoupon from '../models/PlatformCoupon.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) filter.code = new RegExp(search, 'i');
    const coupons = await PlatformCoupon.find(filter).sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, superadminOnly, async (req, res) => {
  try {
    const [total, active, totalUses, totalRevenue] = await Promise.all([
      PlatformCoupon.countDocuments(),
      PlatformCoupon.countDocuments({ isActive: true }),
      PlatformCoupon.aggregate([{ $group: { _id: null, total: { $sum: '$usedCount' } } }]),
    ]);
    res.json({ total, active, totalUses: totalUses[0]?.total || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, superadminOnly, async (req, res) => {
  try {
    const coupon = await PlatformCoupon.create({ ...req.body, createdBy: req.user._id });
    await auditLog('create_platform_coupon', req.user._id, { couponCode: coupon.code, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(coupon);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, superadminOnly, async (req, res) => {
  try {
    const coupon = await PlatformCoupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, superadminOnly, async (req, res) => {
  try {
    await PlatformCoupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
