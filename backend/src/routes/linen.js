import express from 'express';
import { z } from 'zod';
import LinenRequest, { LINEN_STATUSES } from '../models/LinenRequest.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generateTimestampedId } from '../utils/idGenerator.js';

// Checklist §2: linen & laundry. Ward staff request; housekeeping/laundry
// staff advance the status. Status transitions are one-way by design (a
// delivered load does not silently return to "washed" — that is a NEW
// request), so the transition table is enforced here, not in the client.

const router = express.Router();

const genId = () => generateTimestampedId('LIN');

const FORWARD = {
  requested: ['collected', 'cancelled'],
  collected: ['washed', 'cancelled'],
  washed: ['processed'],
  processed: ['delivered'],
  delivered: [],
  cancelled: [],
};

const requestSchema = z.object({
  ward: z.string().trim().max(120).optional(),
  bedNumber: z.string().trim().max(60).optional(),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    qty: z.number().int().min(1),
  })).min(1).max(30),
  isolationCase: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

// authz: role
router.post('/requests', protect, validate(requestSchema), async (req, res) => {
  try {
    const row = await LinenRequest.create({
      hospitalId: req.user.hospitalId || undefined,
      requestId: genId(),
      ward: req.body.ward || '',
      bedNumber: req.body.bedNumber || '',
      items: req.body.items,
      isolationCase: req.body.isolationCase || false,
      requestedBy: req.user._id,
      notes: req.body.notes || '',
    });
    await auditLog('linen_requested', req.user._id, { recordId: row._id, requestId: row.requestId, ip: req.ip });
    return res.status(201).json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: role
router.get('/requests', protect, authorize('records:read', 'beds:read'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.ward) filter.ward = String(req.query.ward);
    const rows = await LinenRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ total: rows.length, requests: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

const statusSchema = z.object({
  status: z.enum(LINEN_STATUSES),
  notes: z.string().trim().max(1000).optional(),
}).strict();

// authz: role
router.put('/requests/:id/status', protect, validate(statusSchema), async (req, res) => {
  try {
    const row = await LinenRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && row.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!FORWARD[row.status]?.includes(req.body.status)) {
      return res.status(409).json({ message: `Cannot move from ${row.status} to ${req.body.status}`, code: 'INVALID_TRANSITION' });
    }
    row.status = req.body.status;
    if (req.body.notes) row.notes = req.body.notes;
    if (req.body.status === 'delivered') row.deliveredAt = new Date();
    await row.save();
    await auditLog('linen_status_changed', req.user._id, { recordId: row._id, status: req.body.status, ip: req.ip });
    return res.json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: role
router.get('/stats', protect, authorize('records:read', 'beds:read'), async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const [byStatus, isolation] = await Promise.all([
      LinenRequest.aggregate([
        { $match: hFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      LinenRequest.countDocuments({ ...hFilter, isolationCase: true, status: { $nin: ['delivered', 'cancelled'] } }),
    ]);
    const stats = Object.fromEntries(byStatus.map((r) => [r._id, r.count]));
    return res.json({ byStatus: stats, isolationPending: isolation });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

export default router;
