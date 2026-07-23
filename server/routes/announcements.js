import express from 'express';
import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { validate, createAnnouncementSchema } from '../utils/validate.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const announcements = await Announcement.find({ hospitalId: req.user.hospitalId })
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    res.json(announcements);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createAnnouncementSchema), async (req, res) => {
  try {
    const { title, message, priority, targetRoles } = req.body;
    const announcement = await Announcement.create({
      hospitalId: req.user.hospitalId,
      title, message, priority,
      targetRoles: targetRoles || ['all'],
      createdBy: req.user._id,
    });

    const filter = { hospitalId: req.user.hospitalId };
    if (targetRoles && !targetRoles.includes('all')) filter.role = { $in: targetRoles };
    const recipients = await User.find(filter).select('_id');
    const notifications = recipients.map(u => ({
      userId: u._id.toString(),
      title: `📢 ${title}`,
      message,
      type: 'system',
    }));
    await Notification.insertMany(notifications);

    res.status(201).json(announcement);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
