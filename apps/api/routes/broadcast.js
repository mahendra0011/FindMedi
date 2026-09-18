import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { notifyUser } from '../services/socketService.js';

const router = express.Router();

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const filter = {};
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
      Notification.countDocuments(filter),
    ]);
    res.json({ data: notifications, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, superadminOnly, async (req, res) => {
  try {
    const { title, message, priority, targetRoles } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

    const filter = {};
    if (targetRoles && targetRoles.length > 0 && !targetRoles.includes('all')) {
      filter.role = { $in: targetRoles };
    }
    const recipients = await User.find(filter).select('_id');
    const notifications = recipients.map(u => ({
      userId: u._id.toString(),
      title: `${priority === 'urgent' ? '🔴 ' : priority === 'high' ? '📢 ' : ''}${title}`,
      message,
      type: 'system',
    }));
    await Notification.insertMany(notifications);

    for (const n of notifications) {
      notifyUser(n.userId, n);
    }

    await auditLog('platform_broadcast', req.user._id, { title, targetRoles: targetRoles || ['all'], recipientCount: recipients.length, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json({ message: 'Broadcast sent', recipientCount: recipients.length });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
