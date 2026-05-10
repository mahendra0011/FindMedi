import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendAccountBlockedEmail } from '../services/notificationService.js';

const router = express.Router();

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && req.query.role !== 'All') filter.role = req.query.role;
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users.map(u => ({
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
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot block your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();

    if (user.status === 'blocked') {
      await sendAccountBlockedEmail(user);
    }

    res.json({ message: user.status === 'blocked' ? 'User blocked' : 'User unblocked', status: user.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
