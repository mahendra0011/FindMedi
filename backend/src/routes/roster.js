import express from 'express';
import Roster from '../models/Roster.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §9.8/06.1: monthly duty roster (draft → published) + swap requests.
// Published rosters are read-only snapshots for the ward (edits = new draft).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

router.get('/', authorize('staff:manage'), async (req, res) => {
  try {
    const { month, wardId, deptId } = req.query;
    const filter = { ...tenantFilter(req) };
    if (month) filter.month = month;
    if (wardId) filter.wardId = wardId;
    if (deptId) filter.deptId = deptId;
    const rows = await Roster.find(filter).sort({ month: -1 }).limit(50).lean();
    return res.json({ rosters: rows });
  } catch (err) {
    logger.error(`Roster list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/', authorize('staff:manage'), async (req, res) => {
  try {
    const { month, wardId, deptId, entries } = req.body || {};
    if (!month || !Array.isArray(entries)) return res.status(400).json({ message: 'month + entries[] required' });
    const row = await Roster.findOneAndUpdate(
      { ...tenantFilter(req), month, wardId: wardId || '', deptId: deptId || '' },
      {
        $set: {
          entries: entries.slice(0, 2000).map((e) => ({
            staffId: e.staffId, date: e.date, shift: e.shift, onCall: Boolean(e.onCall),
          })),
          status: 'Draft', createdBy: actorId(req),
        },
      },
      { new: true, upsert: true },
    );
    await auditLog('roster_saved', actorId(req), { rosterId: row._id, month, ip: req.ip });
    return res.status(201).json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Roster save error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:id/publish', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await Roster.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    row.status = 'Published';
    await row.save();
    await auditLog('roster_published', actorId(req), { rosterId: row._id, month: row.month, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Roster publish error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P0-6: shift-swap requests (decider must differ from requester).
router.get('/swaps', authorize('staff:view'), async (req, res) => {
  try {
    const { default: ShiftSwap } = await import('../models/ShiftSwap.js');
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = req.query.status;
    const rows = await ShiftSwap.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ swaps: rows });
  } catch (err) {
    logger.error(`Swaps error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/swaps', authorize('staff:view'), async (req, res) => {
  try {
    const { default: ShiftSwap } = await import('../models/ShiftSwap.js');
    const { fromStaffId, toStaffId, shiftDate, shift, reason } = req.body || {};
    if (!fromStaffId || !toStaffId || !shiftDate) {
      return res.status(400).json({ message: 'fromStaffId + toStaffId + shiftDate required' });
    }
    if (String(fromStaffId) === String(toStaffId)) {
      return res.status(400).json({ message: 'Cannot swap with yourself' });
    }
    const row = await ShiftSwap.create({
      ...tenantFilter(req), fromStaffId, toStaffId, shiftDate, shift: shift || 'Morning',
      reason: String(reason || '').slice(0, 500), createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Swap create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/swaps/:id/decide', authorize('staff:manage'), async (req, res) => {
  try {
    const { default: ShiftSwap } = await import('../models/ShiftSwap.js');
    const { decision } = req.body || {};
    if (!['Approved', 'Rejected'].includes(decision)) return res.status(400).json({ message: 'decision must be Approved|Rejected' });
    const row = await ShiftSwap.findById(req.params.id);
    if (!row || row.status !== 'Pending') return res.status(404).json({ message: 'Pending swap not found' });
    const { isSelfApproval } = await import('../lib/approvalWiring.js');
    if (isSelfApproval(row.createdBy, actorId(req))) {
      return res.status(403).json({ message: 'Self-approval forbidden', code: 'SELF_APPROVAL' });
    }
    row.status = decision;
    row.decidedBy = actorId(req);
    await row.save();
    await auditLog('shift_swap_decided', actorId(req), { swapId: row._id, decision, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Swap decide error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
