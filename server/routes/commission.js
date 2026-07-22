import express from 'express';
import CommissionConfig from '../models/CommissionConfig.js';
import Payout from '../models/Payout.js';
import TransactionLedger from '../models/TransactionLedger.js';
import Hospital from '../models/Hospital.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/config', protect, superadminOnly, async (req, res) => {
  try {
    let configs = await CommissionConfig.find().sort({ facilityName: 1 }).lean();

    const hospitals = await Hospital.find({ status: 'approved' }).select('name').lean();
    const existingIds = new Set(configs.map(c => c.facilityId?.toString()).filter(Boolean));

    for (const h of hospitals) {
      if (!existingIds.has(h._id.toString())) {
        const created = await CommissionConfig.create({
          facilityId: h._id,
          facilityName: h.name,
          facilityType: 'hospital',
          commissionPercent: 10,
          payoutSchedule: 'monthly',
        });
        configs.push(created.toObject());
      }
    }

    configs.sort((a, b) => (a.facilityName || '').localeCompare(b.facilityName || ''));

    const stats = {
      totalActive: configs.filter(c => c.status === 'active').length,
      totalPaused: configs.filter(c => c.status === 'paused').length,
      totalEarnings: configs.reduce((s, c) => s + (c.totalEarnings || 0), 0),
      totalPendingPayout: configs.reduce((s, c) => s + (c.pendingPayout || 0), 0),
    };

    res.json({ configs, stats });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/config/:id', protect, superadminOnly, async (req, res) => {
  try {
    const allowedFields = ['commissionPercent', 'commissionCap', 'payoutSchedule', 'status'];
    const update = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const config = await CommissionConfig.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!config) return res.status(404).json({ message: 'Config not found' });
    
    try {
      await auditLog('update_commission_config', req.user._id, { configId: config._id, facilityId: config.facilityId, ip: req.ip, userAgent: req.get('user-agent') });
    } catch (err) {
      console.error('Audit error:', err);
    }
    
    res.json(config);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/ledger', protect, superadminOnly, async (req, res) => {
  try {
    const { facilityId, source, status, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (facilityId) filter.facilityId = facilityId;
    if (source) filter.source = source;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    const [transactions, total] = await Promise.all([
      TransactionLedger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      TransactionLedger.countDocuments(filter),
    ]);

    const totals = await TransactionLedger.aggregate([
      { $match: filter },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalCommission: { $sum: '$commissionAmount' }, totalNet: { $sum: '$netAmount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / pageSize),
      totals: totals[0] || { totalAmount: 0, totalCommission: 0, totalNet: 0, count: 0 },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/payouts', protect, superadminOnly, async (req, res) => {
  try {
    const { facilityId, status, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (facilityId) filter.facilityId = facilityId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    const [payouts, total] = await Promise.all([
      Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      Payout.countDocuments(filter),
    ]);

    const stats = await Payout.aggregate([
      { $group: { _id: '$status', total: { $sum: '$netPayout' }, count: { $sum: 1 } } },
    ]);

    res.json({ payouts, total, page: parseInt(page), totalPages: Math.ceil(total / pageSize), stats });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/payouts', protect, superadminOnly, async (req, res) => {
  try {
    const { facilityId, periodStart, periodEnd } = req.body;
    if (!facilityId) return res.status(400).json({ message: 'facilityId is required' });

    const config = await CommissionConfig.findOne({ facilityId });
    if (!config) return res.status(404).json({ message: 'Commission config not found for this facility' });

    const transactions = await TransactionLedger.find({
      facilityId,
      payoutId: { $exists: false },
      status: 'completed',
      createdAt: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
    });

    const grossRevenue = transactions.reduce((s, t) => s + (t.amount || 0), 0);
    const commissionAmount = transactions.reduce((s, t) => s + (t.commissionAmount || 0), 0);
    const netPayout = grossRevenue - commissionAmount;

    const payout = await Payout.create({
      facilityId,
      facilityName: config.facilityName,
      facilityType: config.facilityType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      grossRevenue,
      commissionAmount,
      netPayout,
      transactionCount: transactions.length,
      status: 'pending',
    });

    await TransactionLedger.updateMany(
      { _id: { $in: transactions.map(t => t._id) } },
      { payoutId: payout._id }
    );

    config.pendingPayout = (config.pendingPayout || 0) + netPayout;
    await config.save();

    try {
      await auditLog('create_payout', req.user._id, { payoutId: payout._id, facilityId, netPayout, ip: req.ip, userAgent: req.get('user-agent') });
    } catch (err) {
      console.error('Audit error:', err);
    }

    res.status(201).json(payout);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/payouts/:id/pay', protect, superadminOnly, async (req, res) => {
  try {
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date(), transactionRef: req.body.transactionRef || '' },
      { new: true }
    );
    if (!payout) return res.status(404).json({ message: 'Payout not found' });

    const config = await CommissionConfig.findOne({ facilityId: payout.facilityId });
    if (config) {
      config.totalEarnings = (config.totalEarnings || 0) + payout.commissionAmount;
      config.pendingPayout = Math.max(0, (config.pendingPayout || 0) - payout.netPayout);
      config.lastPayoutDate = new Date();
      await config.save();
    }

    try {
      await auditLog('process_payout', req.user._id, { payoutId: payout._id, facilityId: payout.facilityId, netPayout: payout.netPayout, ip: req.ip, userAgent: req.get('user-agent') });
    } catch (err) {
      console.error('Audit error:', err);
    }

    res.json(payout);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, superadminOnly, async (req, res) => {
  try {
    const totalCommission = (await CommissionConfig.aggregate([
      { $group: { _id: null, total: { $sum: '$totalEarnings' }, pending: { $sum: '$pendingPayout' } } },
    ]))[0] || { total: 0, pending: 0 };

    const pendingPayouts = await Payout.countDocuments({ status: 'pending' });
    const paidPayouts = await Payout.countDocuments({ status: 'paid' });
    const totalPaid = (await Payout.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$netPayout' } } },
    ]))[0]?.total || 0;

    const monthlyTrend = await TransactionLedger.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, amount: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' }, net: { $sum: '$netAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    const sourceBreakdown = await TransactionLedger.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$source', amount: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]);

    res.json({
      totalEarnings: totalCommission.total,
      pendingPayoutAmount: totalCommission.pending,
      totalPaid,
      pendingPayouts,
      paidPayouts,
      monthlyTrend,
      sourceBreakdown,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
