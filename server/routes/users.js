import express from 'express';
import User from '../models/User.js';
import { z } from 'zod';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendAccountBlockedEmail } from '../services/notificationService.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';
import { paginatedResults } from '../utils/pagination.js';

const blockUserSchema = z.object({ reason: z.string().optional() });

const router = express.Router();

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const filter = {};
    if (req.query.role && req.query.role !== 'All') filter.role = req.query.role;
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    const result = await paginatedResults(User, filter, { page, limit });
    result.data = result.data.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      gender: u.gender,
      dateOfBirth: u.dateOfBirth,
      status: u.status || 'active',
      isVerified: u.isVerified,
      approvalStatus: u.approvalStatus,
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/block', protect, adminOnly, validate(blockUserSchema), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot block your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && user.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();

    if (user.status === 'blocked') {
      await sendAccountBlockedEmail(user);
    }
    await auditLog(user.status === 'blocked' ? 'block_user' : 'unblock_user', req.user._id, { targetUserId: user._id, ip: req.ip, userAgent: req.get('user-agent') });

    res.json({ message: user.status === 'blocked' ? 'User blocked' : 'User unblocked', status: user.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && user.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await User.findByIdAndDelete(req.params.id);
    await auditLog('delete_user', req.user._id, { targetUserId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
