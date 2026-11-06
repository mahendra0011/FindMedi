import express from 'express';
import DataSubjectRequest from '../models/DataSubjectRequest.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLogRequired } from '../middleware/audit.js';
import { canTransition } from '../lib/flowStates.js';
import { validate, dsrDecisionSchema, dsrExtendSchema } from '../utils/validate.js';
import logger from '../config/logger.js';
import { createNotification } from '../services/notificationService.js';

// A4 / rolesmd 10.md §4.4: "GET/POST /api/admin/dsr (data-subject requests)".
//
// The compliance queue half of 6.md §2.15. Both gates are PERMISSION-based -
// `dsr:read` to work the queue, `dsr:approve` to decide or extend - and those
// are held by compliance_officer (and superadmin, which bypasses authorize()).
// Ownership is irrelevant here: this surface exists precisely so a second pair
// of hands can review anyone's request, which is why every tag is `role`.
//
// The transition table is LOCAL, unlike the FLOW-* machines in lib/flowStates:
// this is one queue's five states, and the erasure flow that shares the DPDP
// right already lives in its own file (deletionRequests.js) with its own
// inline checks. One table, read by the route and its spec - never by the
// model, whose enum shipped in A2.
const DSR_TRANSITIONS = Object.freeze({
  submitted: ['in_review', 'rejected'],
  in_review: ['verified', 'rejected'],
  verified: ['fulfilled', 'rejected'],
  fulfilled: [],
  rejected: [],
});

const DECISION_TARGETS = Object.freeze({
  review: 'in_review',
  verify: 'verified',
  fulfill: 'fulfilled',
  reject: 'rejected',
});

// Open = still on the clock; terminal states are handled.
const OPEN_STATUSES = ['submitted', 'in_review', 'verified'];
// DPDP's 30-day clock, extended once by at most a fortnight - against the
// STORED dueAt, so the extension is auditable data and not a recomputation.
const EXTENSION_MS = 15 * 24 * 60 * 60 * 1000;
const exportStepUp = (req, res, next) => (req.body?.action === 'fulfill'
  ? requireStepUp('export:identified', { requireEnrolled: true })(req, res, next)
  : next());

const router = express.Router();
router.use(protect);

const privacyQueueRoles = (req, res, next) => (
  ['dpo', 'compliance_officer'].includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'DPO or compliance role required' })
);

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const toPositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

// ─── Queue ──────────────────────────────────────────────────────────────────

// authz: role
router.get('/', authorize('dsr:read'), privacyQueueRoles, async (req, res) => {
  try {
    const { status, type, overdue } = req.query;
    const filter = {};
    if (status) filter.status = status;
    else if (overdue === '1') filter.status = { $in: OPEN_STATUSES };
    if (type) filter.type = type;
    if (overdue === '1') filter.dueAt = { $lt: new Date() };

    const pageNum = toPositiveInt(req.query.page, 1, 10000);
    const pageSize = toPositiveInt(req.query.limit, 50, 100);
    const [rows, total] = await Promise.all([
      DataSubjectRequest.find(filter)
        .sort({ dueAt: 1, requestedAt: 1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      DataSubjectRequest.countDocuments(filter),
    ]);
    const now = Date.now();
    return res.json({
      requests: rows.map((row) => ({
        ...row,
        exportRef: undefined,
        exportPurpose: undefined,
        exportExpiresAt: undefined,
        fulfillmentApprovals: (row.fulfillmentApprovals || []).map((approval) => ({
          approverId: String(approval.approverId), approvedAt: approval.approvedAt,
        })),
        id: String(row._id),
        overdue: OPEN_STATUSES.includes(row.status) && row.dueAt && new Date(row.dueAt).getTime() < now,
      })),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize) || 1,
      limit: pageSize,
    });
  } catch (err) {
    logger.error(`List DSR queue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Decide ─────────────────────────────────────────────────────────────────

// authz: role
router.post('/:id/decision', authorize('dsr:approve'), privacyQueueRoles, requireObjectId, validate(dsrDecisionSchema), exportStepUp, async (req, res) => {
  try {
    const row = await DataSubjectRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Request not found' });

    const { action, note, exportRef, exportPurpose, exportExpiresAt, method } = req.body;
    const target = DECISION_TARGETS[action];

    // Conditional requirements live here (not in the schema): the schema
    // cannot know the ROW's type or status, and only this handler does.
    if (action === 'verify' && !method) {
      return res.status(400).json({ message: 'method is required to verify a request' });
    }
    if (action === 'fulfill' && row.type === 'export') {
      if (!row.verification?.at || row.status !== 'verified') {
        return res.status(409).json({ message: 'Verify the data principal before approving an export' });
      }
      if (!exportRef || !/^[A-Za-z0-9._:-]{8,200}$/.test(exportRef)) {
        return res.status(400).json({ message: 'Provide an opaque export artifact reference, not a public URL' });
      }
      if (typeof exportPurpose !== 'string' || exportPurpose.trim().length < 20) {
        return res.status(400).json({ message: 'A specific export purpose of at least 20 characters is required' });
      }
      const expiresAt = new Date(exportExpiresAt || '');
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date() || expiresAt > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        return res.status(400).json({ message: 'Export artifact expiry must be within the next 24 hours' });
      }
      // Identified exports require a real artifact registry and deletion worker.
      // Reject before recording an approval against an opaque, unverified reference.
      return res.status(503).json({ message: 'Identified export delivery is disabled until a private artifact store, de-identification/watermarking checks, and expiry purge are configured' });
    }

    // A state machine, not a free-form status write: fulfilling straight out of
    // `submitted` would publish data nobody verified, and re-deciding a
    // terminal row would rewrite history an auditor reads.
    if (!canTransition(DSR_TRANSITIONS, row.status, target)) {
      return res.status(409).json({ message: `Cannot move a request from '${row.status}' to '${target}'` });
    }

    const previous = row.status;
    row.status = target;
    row.decidedAt = new Date();
    row.decidedBy = actorId(req);
    if (note) row.resolutionNote = note;
    if (action === 'verify') row.verification = { method, at: new Date(), by: actorId(req) };
    if (action === 'fulfill') {
      row.fulfilledAt = new Date();
      if (exportRef) row.exportRef = exportRef;
    }
    await row.save();

    await auditLogRequired(`dsr_${action}`, actorId(req), {
      requestId: row._id, type: row.type, from: previous, to: target, ip: req.ip,
    });
    await createNotification({
      userId: row.userId, type: 'privacy_request', priority: 'critical',
      title: 'Privacy request update',
      message: `Your privacy request status changed to ${target}. Sign in to FindMedi to view the update.`,
      dedupKey: `dsr:${String(row._id)}:${target}`,
    });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Decide data-subject request error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Extend the deadline (once) ─────────────────────────────────────────────

// authz: role
router.post('/:id/extend', authorize('dsr:approve'), privacyQueueRoles, requireObjectId, validate(dsrExtendSchema), async (req, res) => {
  try {
    const row = await DataSubjectRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Request not found' });
    if (!OPEN_STATUSES.includes(row.status)) {
      return res.status(409).json({ message: `Cannot extend a request in status '${row.status}'` });
    }
    // ONE extension: an open-ended right to delay is the SLA wearing a mask,
    // and `extensionReason` is the audit trail that an extension happened.
    if (row.extensionReason) {
      return res.status(409).json({ message: 'This request has already been extended' });
    }

    row.dueAt = new Date(new Date(row.dueAt).getTime() + EXTENSION_MS);
    row.extensionReason = req.body.reason;
    await row.save();

    await auditLogRequired('dsr_extended', actorId(req), {
      requestId: row._id, dueAt: row.dueAt, reason: req.body.reason, ip: req.ip,
    });
    return res.json({ id: String(row._id), dueAt: row.dueAt, extensionReason: row.extensionReason });
  } catch (err) {
    logger.error(`Extend data-subject request error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
