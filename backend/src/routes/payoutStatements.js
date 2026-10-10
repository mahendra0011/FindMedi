import express from 'express';
import PayoutStatement from '../models/PayoutStatement.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 22 P0-6: doctor payout statements — complete CRUD + Draft→Approved→Paid
// transitions with separation of duties. finance.js keeps its legacy /payouts
// surface; this router is the accounts-desk ledger (read-by-id, void of drafts).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

router.get('/', authorize('billing:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.period) filter.period = req.query.period;
    if (req.query.doctorId) filter.doctorId = req.query.doctorId;
    const rows = await PayoutStatement.find(filter).sort({ period: -1 }).limit(300).lean();
    return res.json({ payouts: rows });
  } catch (err) {
    logger.error(`Payout statements list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/', authorize('billing:write'), async (req, res) => {
  try {
    const { doctorId, period, gross, tdsRate, otherDeductions } = req.body || {};
    if (!doctorId || !period || !/^\d{4}-\d{2}$/.test(period) || !(Number(gross) >= 0)) {
      return res.status(400).json({ message: 'doctorId + period YYYY-MM + gross>=0 required' });
    }
    const row = await PayoutStatement.create({
      hospitalId: req.user.hospitalId, doctorId, period,
      gross: Number(gross), tdsRate: Number(tdsRate ?? 10),
      otherDeductions: Number(otherDeductions) || 0, createdBy: actorId(req),
    });
    await auditLog('payout_statement_created', actorId(req), { payoutId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id), gross: row.gross, tds: row.tds, net: row.net });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Payout already exists for doctor+period' });
    logger.error(`Payout statement create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authorize('billing:read'), async (req, res) => {
  try {
    const row = await PayoutStatement.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json(row);
  } catch (err) {
    logger.error(`Payout statement get error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:id/approve', authorize('billing:write'), requireStepUp('payouts:add'), async (req, res) => {
  try {
    const row = await PayoutStatement.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!row || row.status !== 'Draft') return res.status(404).json({ message: 'Draft payout not found' });
    const { isSelfApproval } = await import('../lib/approvalWiring.js');
    if (isSelfApproval(row.createdBy, actorId(req))) {
      return res.status(403).json({ message: 'Self-approval forbidden', code: 'SELF_APPROVAL' });
    }
    row.status = 'Approved';
    row.approvedBy = actorId(req);
    await row.save();
    await auditLog('payout_statement_approved', actorId(req), { payoutId: row._id, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status, net: row.net });
  } catch (err) {
    logger.error(`Payout statement approve error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:id/pay', authorize('billing:write'), requireStepUp('payouts:add'), async (req, res) => {
  try {
    const row = await PayoutStatement.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!row || row.status !== 'Approved') return res.status(404).json({ message: 'Approved payout not found' });
    row.status = 'Paid';
    row.paidAt = new Date();
    await row.save();
    await auditLog('payout_statement_paid', actorId(req), { payoutId: row._id, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status, paidAt: row.paidAt });
  } catch (err) {
    logger.error(`Payout statement pay error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authorize('billing:write'), async (req, res) => {
  try {
    const row = await PayoutStatement.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!row) return res.status(404).json({ message: 'Not found' });
    if (row.status !== 'Draft') {
      return res.status(409).json({ message: 'Only Draft payout statements can be deleted' });
    }
    await PayoutStatement.findOneAndDelete({ _id: row._id, ...tenantFilter(req) });
    await auditLog('payout_statement_deleted', actorId(req), { payoutId: row._id, ip: req.ip });
    return res.json({ id: String(row._id), deleted: true });
  } catch (err) {
    logger.error(`Payout statement delete error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
