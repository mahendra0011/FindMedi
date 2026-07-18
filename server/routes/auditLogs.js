import express from 'express';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { protect, superadminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const { action, userId, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    let logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const userIds = [...new Set(logs.map(l => l.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email role').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    logs = logs.map(l => ({
      ...l,
      user: l.userId ? userMap[l.userId.toString()] || null : null,
    }));

    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.action?.toLowerCase().includes(q) ||
        l.user?.name?.toLowerCase().includes(q) ||
        l.user?.email?.toLowerCase().includes(q) ||
        JSON.stringify(l.details).toLowerCase().includes(q)
      );
    }

    const total = await AuditLog.countDocuments(filter);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / pageSize) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, superadminOnly, async (req, res) => {
  try {
    const totalLogs = await AuditLog.countDocuments();

    const actionCounts = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    const last24h = await AuditLog.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const uniqueUsers = await AuditLog.distinct('userId');
    const uniqueActions = await AuditLog.distinct('action');

    res.json({
      totalLogs,
      last24h,
      uniqueUsers: uniqueUsers.length,
      uniqueActions: uniqueActions.length,
      topActions: actionCounts,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
