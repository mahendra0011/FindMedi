import express from 'express';
import { z } from 'zod';
import { GatePass, SecurityRound, GATE_PASS_TYPES, GATE_PASS_STATUS } from '../models/GatePass.js';
import { protect, restrictTo, authorize } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generateTimestampedId } from '../utils/idGenerator.js';

// Checklist §2: gate pass (goods leaving premises) + security rounds.
// Gate passes are requested by any staff, approved ONLY by security/admin,
// and marked used at the gate. Rounds are append-only guard evidence.

const router = express.Router();

const genPassNo = () => generateTimestampedId('GP');
const genRoundNo = () => generateTimestampedId('SR');

const passSchema = z.object({
  type: z.enum(GATE_PASS_TYPES),
  description: z.string().trim().min(1).max(1000),
  itemCount: z.number().int().min(1).optional(),
  vehicleNo: z.string().trim().max(20).optional(),
  carrierName: z.string().trim().max(200).optional(),
  carrierPhone: z.string().trim().max(15).optional(),
  destination: z.string().trim().max(300).optional(),
  validUntil: z.coerce.date().optional(),
}).strict();

// authz: role
router.post('/gate-passes', protect, validate(passSchema), async (req, res) => {
  try {
    const row = await GatePass.create({
      hospitalId: req.user.hospitalId || undefined,
      passNo: genPassNo(),
      type: req.body.type,
      description: req.body.description,
      itemCount: req.body.itemCount || 1,
      vehicleNo: req.body.vehicleNo || '',
      carrierName: req.body.carrierName || '',
      carrierPhone: req.body.carrierPhone || '',
      destination: req.body.destination || '',
      requestedBy: req.user._id,
      validUntil: req.body.validUntil || null,
    });
    await auditLog('gate_pass_requested', req.user._id, { recordId: row._id, passNo: row.passNo, ip: req.ip });
    return res.status(201).json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

const decideSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional(),
}).strict();

// authz: role
router.put('/gate-passes/:id/decide', protect, restrictTo('security', 'security_admin', 'hospital_admin', 'superadmin'), validate(decideSchema), async (req, res) => {
  try {
    const row = await GatePass.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Pass not found' });
    if (row.status !== 'requested') return res.status(409).json({ message: `Pass already ${row.status}` });
    if (req.body.action === 'approve') {
      row.status = 'approved';
      row.approvedBy = req.user._id;
      row.approvedAt = new Date();
    } else {
      row.status = 'rejected';
      row.rejectedReason = req.body.reason || '';
    }
    await row.save();
    await auditLog(`gate_pass_${req.body.action}d`, req.user._id, { recordId: row._id, passNo: row.passNo, ip: req.ip });
    return res.json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: role
router.put('/gate-passes/:id/use', protect, restrictTo('security', 'security_admin', 'hospital_admin', 'superadmin'), async (req, res) => {
  try {
    const row = await GatePass.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Pass not found' });
    if (row.status !== 'approved') return res.status(409).json({ message: 'Only an approved pass can be used', code: 'NOT_APPROVED' });
    if (row.validUntil && row.validUntil.getTime() < Date.now()) {
      row.status = 'expired';
      await row.save();
      return res.status(410).json({ message: 'Pass has expired', code: 'EXPIRED' });
    }
    row.status = 'used';
    row.usedAt = new Date();
    await row.save();
    await auditLog('gate_pass_used', req.user._id, { recordId: row._id, passNo: row.passNo, ip: req.ip });
    return res.json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: role
router.get('/gate-passes', protect, authorize('audit:read', 'records:read'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.status && GATE_PASS_STATUS.includes(String(req.query.status))) filter.status = String(req.query.status);
    if (req.query.type) filter.type = String(req.query.type);
    const rows = await GatePass.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ total: rows.length, passes: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

const roundSchema = z.object({
  checkpoints: z.array(z.object({
    name: z.string().trim().min(1).max(200),
  })).min(1).max(50),
}).strict();

// authz: role
router.post('/rounds', protect, restrictTo('security', 'security_admin', 'hospital_admin', 'superadmin'), validate(roundSchema), async (req, res) => {
  try {
    const row = await SecurityRound.create({
      hospitalId: req.user.hospitalId || undefined,
      roundNo: genRoundNo(),
      guardId: req.user._id,
      checkpoints: req.body.checkpoints.map((c) => ({ name: c.name, ok: false, note: '', at: null })),
    });
    await auditLog('security_round_started', req.user._id, { recordId: row._id, roundNo: row.roundNo, ip: req.ip });
    return res.status(201).json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

const checkpointSchema = z.object({
  index: z.number().int().min(0),
  ok: z.boolean(),
  note: z.string().trim().max(500).optional(),
}).strict();

// authz: role
router.put('/rounds/:id/checkpoints/:index', protect, restrictTo('security', 'security_admin', 'hospital_admin', 'superadmin'), validate(checkpointSchema), async (req, res) => {
  try {
    const row = await SecurityRound.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Round not found' });
    if (row.status !== 'open') return res.status(409).json({ message: 'Round is closed' });
    const cp = row.checkpoints[Number(req.params.index)];
    if (!cp) return res.status(404).json({ message: 'Checkpoint not found' });
    cp.ok = req.body.ok;
    cp.note = req.body.note || '';
    cp.at = new Date();
    await row.save();
    return res.json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

const closeRoundSchema = z.object({
  incident: z.string().trim().max(2000).optional(),
  incidentEscalatedTo: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
}).strict();

// authz: role
router.put('/rounds/:id/close', protect, restrictTo('security', 'security_admin', 'hospital_admin', 'superadmin'), validate(closeRoundSchema), async (req, res) => {
  try {
    const row = await SecurityRound.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Round not found' });
    if (row.status !== 'open') return res.status(409).json({ message: 'Round already closed' });
    row.status = 'closed';
    row.endedAt = new Date();
    if (req.body.incident) row.incident = req.body.incident;
    if (req.body.incidentEscalatedTo) row.incidentEscalatedTo = req.body.incidentEscalatedTo;
    await row.save();
    await auditLog('security_round_closed', req.user._id, { recordId: row._id, roundNo: row.roundNo, ip: req.ip });
    return res.json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: role
router.get('/rounds', protect, authorize('audit:read', 'records:read'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.status) filter.status = String(req.query.status);
    const rows = await SecurityRound.find(filter).sort({ startedAt: -1 }).limit(100).lean();
    return res.json({ total: rows.length, rounds: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

export default router;