import express from 'express';
import { z } from 'zod';
import TwoPersonApproval from '../models/TwoPersonApproval.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';
import { sendServerError } from '../utils/safeError.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Approval request not found' })
);

const APPROVAL_ROLES = ['superadmin', 'finance_admin', 'compliance_officer', 'hospital_admin'];

const requestApprovalSchema = z.object({
  actionType: z.enum([
    'payout',
    'sensitive_kyc_approval',
    'tenant_suspension',
    'commission_rate_change',
    'fee_waiver',
    'break_glass',
    'superadmin_escalation',
    'bulk_export',
  ]),
  targetModel: z.string().trim().min(1).max(100),
  targetId: z.string().trim().min(1).max(100),
  payload: z.record(z.any()).optional().default({}),
  requiredApprovalsCount: z.number().int().min(2).max(5).optional().default(2),
  expiresInHours: z.number().positive().max(168).optional().default(48),
});

const approveSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

const rejectSchema = z.object({
  reason: z.string().trim().min(5, 'Rejection reason must be at least 5 characters').max(1000),
});

// GET /api/admin/approvals — list approval requests with status filter
router.get('/', requireRole(APPROVAL_ROLES), async (req, res) => {
  try {
    const { status = 'pending', actionType, targetModel, page = '1', limit = '20' } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (actionType) filter.actionType = actionType;
    if (targetModel) filter.targetModel = targetModel;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [approvals, total] = await Promise.all([
      TwoPersonApproval.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      TwoPersonApproval.countDocuments(filter),
    ]);

    return res.json({
      approvals,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    return sendServerError(res, err, 'Failed to fetch approval requests');
  }
});

// POST /api/admin/approvals/request — initiate four-eyes approval request
router.post('/request', requireRole(APPROVAL_ROLES), validate(requestApprovalSchema), async (req, res) => {
  try {
    const callerId = req.user._id ?? req.user.id;
    const callerName = req.user.name || req.user.email || 'Admin';

    const approval = await TwoPersonApproval.requestAction({
      actionType: req.body.actionType,
      targetModel: req.body.targetModel,
      targetId: req.body.targetId,
      requestedBy: callerId,
      requestedByName: callerName,
      payload: req.body.payload,
      requiredApprovalsCount: req.body.requiredApprovalsCount,
      expiresInHours: req.body.expiresInHours,
    });

    await auditLog('four_eyes_approval_requested', callerId, {
      approvalId: approval._id,
      actionType: req.body.actionType,
      targetModel: req.body.targetModel,
      targetId: req.body.targetId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json(approval);
  } catch (err) {
    logger.error(`Error requesting four-eyes approval: ${err.message}`);
    return sendServerError(res, err, 'Failed to request approval');
  }
});

// GET /api/admin/approvals/:id — view single approval request
router.get('/:id', requireRole(APPROVAL_ROLES), requireObjectId, async (req, res) => {
  try {
    const approval = await TwoPersonApproval.findById(req.params.id).lean();
    if (!approval) return res.status(404).json({ message: 'Approval request not found' });
    return res.json(approval);
  } catch (err) {
    return sendServerError(res, err, 'Failed to fetch approval request');
  }
});

// POST /api/admin/approvals/:id/approve — record an approval (four-eyes enforcement)
router.post('/:id/approve', requireRole(APPROVAL_ROLES), requireObjectId, validate(approveSchema), async (req, res) => {
  try {
    const callerId = req.user._id ?? req.user.id;
    const callerName = req.user.name || req.user.email || 'Admin';

    const updated = await TwoPersonApproval.recordApproval({
      approvalId: req.params.id,
      adminId: callerId,
      adminName: callerName,
      adminRole: req.user.role,
      ip: req.ip,
      notes: req.body.notes || '',
    });

    await auditLog('four_eyes_approval_recorded', callerId, {
      approvalId: updated._id,
      actionType: updated.actionType,
      targetModel: updated.targetModel,
      targetId: updated.targetId,
      status: updated.status,
      approvalsCount: updated.approvals.length,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json(updated);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    logger.error(`Error approving four-eyes request: ${err.message}`);
    return sendServerError(res, err, 'Failed to record approval');
  }
});

// POST /api/admin/approvals/:id/reject — reject an approval request
router.post('/:id/reject', requireRole(APPROVAL_ROLES), requireObjectId, validate(rejectSchema), async (req, res) => {
  try {
    const callerId = req.user._id ?? req.user.id;

    const updated = await TwoPersonApproval.rejectAction({
      approvalId: req.params.id,
      adminId: callerId,
      reason: req.body.reason,
    });

    await auditLog('four_eyes_approval_rejected', callerId, {
      approvalId: updated._id,
      actionType: updated.actionType,
      targetModel: updated.targetModel,
      targetId: updated.targetId,
      reason: req.body.reason,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json(updated);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    logger.error(`Error rejecting four-eyes request: ${err.message}`);
    return sendServerError(res, err, 'Failed to reject approval');
  }
});

export default router;
