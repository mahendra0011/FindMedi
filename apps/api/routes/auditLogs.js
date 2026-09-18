import express from 'express';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { action, userId, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    // Non-superadmin users only see their own audit logs
    if (req.user.role !== 'superadmin') {
      filter.userId = req.user._id.toString();
    }

    if (search) {
      const userIds = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id').lean();
      const matchedUserIds = userIds.map(u => u._id.toString());
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { userId: { $in: matchedUserIds } },
        { 'details': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(pageSize).lean(),
      AuditLog.countDocuments(filter),
    ]);

    const userIds = [...new Set(logs.map(l => l.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email role').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enriched = logs.map(l => ({
      ...l,
      user: l.userId ? userMap[l.userId.toString()] || null : null,
    }));

    res.json({ logs: enriched, total, page: parseInt(page), totalPages: Math.ceil(total / pageSize) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const matchFilter = req.user.role !== 'superadmin' ? { userId: req.user._id.toString() } : {};
    const totalLogs = await AuditLog.countDocuments(matchFilter);
    const actionCounts = await AuditLog.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    const last24h = await AuditLog.countDocuments({
      ...matchFilter,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const uniqueUsers = req.user.role === 'superadmin'
      ? await AuditLog.distinct('userId')
      : [req.user._id];
    const uniqueActions = await AuditLog.distinct('action', matchFilter);

    res.json({
      totalLogs, last24h,
      uniqueUsers: uniqueUsers.length,
      uniqueActions: uniqueActions.length,
      topActions: actionCounts,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
