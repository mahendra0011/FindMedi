import express from 'express';
import ApprovalPolicy from '../models/ApprovalPolicy.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import Delegation from '../models/Delegation.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 13 §13.2: policy thresholds, tiered requests, delegates, expiry sweep.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

// Tier selection: highest tier whose min <= amount.
export function selectTier(policy, amount) {
  const tiers = [...(policy.tiers || [])].sort((a, b) => a.min - b.min);
  let sel = tiers[0] || { roles: [], steps: 1 };
  for (const t of tiers) {
    if (Number(amount) >= Number(t.min)) sel = t;
  }
  return sel;
}

router.get('/policies', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await ApprovalPolicy.find({ ...tenantFilter(req), active: true }).lean();
    return res.json({ policies: rows });
  } catch (err) {
    logger.error(`Approval policies error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/policies', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await ApprovalPolicy.create({
      hospitalId: req.user.hospitalId, ...req.body,
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Approval policy create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

/** Helper used by business routes: true = approval required and created. */
export async function requireApproval({ req, policyKey, entityRef, title, amount }) {
  const policy = await ApprovalPolicy.findOne({ ...tenantFilter(req), key: policyKey, active: true }).lean();
  if (!policy) return { required: false };
  if ((policy.excludedRoles || []).includes(req.user.role)) return { required: false };
  const tier = selectTier(policy, amount);
  if (!(tier.roles || []).length) return { required: false };
  const steps = [];
  for (let i = 0; i < Number(tier.steps || 1); i += 1) {
    for (const role of tier.roles) steps.push({ step: steps.length, role });
  }
  const row = await ApprovalRequest.create({
    hospitalId: req.user.hospitalId, policyKey,
    entityRef: entityRef || {}, title: String(title || '').slice(0, 200),
    amount: Number(amount) || 0, requiredRoles: tier.roles || [], steps,
    requestedBy: actorId(req),
    dueAt: new Date(Date.now() + 48 * 3600 * 1000),
  });
  return { required: true, request: row };
}

router.post('/requests', authorize('staff:manage'), async (req, res) => {
  try {
    const { policyKey, entityRef, title, amount } = req.body || {};
    const out = await requireApproval({ req, policyKey, entityRef, title, amount });
    if (!out.required) return res.json({ required: false, approved: true });
    return res.status(201).json({ required: true, id: String(out.request._id) });
  } catch (err) {
    logger.error(`Approval request error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/requests', authorize('staff:manage'), async (req, res) => {
  try {
    const { status, mine } = req.query;
    const filter = { ...tenantFilter(req) };
    if (status) filter.status = status;
    if (mine === '1') {
      // Pending requests where I am an eligible approver, honoring delegation.
      const myDelegates = await Delegation.find({
        ...tenantFilter(req), toUser: actorId(req), active: true,
        from: { $lte: new Date() }, to: { $gte: new Date() },
      }).lean();
      const extraRoles = [];
      if (myDelegates.length) {
        const { default: User } = await import('../models/User.js');
        const froms = await User.find({ _id: { $in: myDelegates.map((d) => d.fromUser) } }).lean();
        extraRoles.push(...froms.map((u) => u.role));
      }
      filter.status = 'pending';
      filter.requiredRoles = { $in: [req.user.role, ...extraRoles] };
    }
    const rows = await ApprovalRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ requests: rows });
  } catch (err) {
    logger.error(`Approval list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/requests/:id/decide', authorize('staff:manage'), async (req, res) => {
  try {
    const { decision, comment } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be approved|rejected' });
    }
    const row = await ApprovalRequest.findById(req.params.id);
    if (!row || row.status !== 'pending') return res.status(404).json({ message: 'Pending request not found' });
    // File 22 P0-1: self-approval block — the requester can NEVER decide
    // their own request, even via delegation or dual roles.
    const { isSelfApproval } = await import('../lib/approvalWiring.js');
    if (isSelfApproval(row.requestedBy, actorId(req))) {
      await auditLog('approval_self_attempt', actorId(req), { requestId: row._id, ip: req.ip });
      return res.status(403).json({ message: 'Self-approval forbidden: a different approver must decide', code: 'SELF_APPROVAL' });
    }
    const next = (row.steps || []).find((s) => s.status === 'pending');
    if (!next) return res.status(409).json({ message: 'No pending steps' });
    // Delegate may act on behalf of the role.
    const delegation = await Delegation.findOne({
      ...tenantFilter(req), toUser: actorId(req), active: true,
      from: { $lte: new Date() }, to: { $gte: new Date() },
    }).lean();
    let actingRole = req.user.role;
    if (next.role !== req.user.role && delegation) {
      const { default: User } = await import('../models/User.js');
      const fromUser = await User.findById(delegation.fromUser).lean();
      if (fromUser && fromUser.role === next.role) actingRole = fromUser.role;
    }
    if (next.role !== actingRole && next.role !== req.user.role) {
      return res.status(403).json({ message: `Step requires ${next.role}` });
    }
    next.status = decision;
    next.by = actorId(req);
    next.at = new Date();
    next.comment = String(comment || '').slice(0, 500);
    if (decision === 'rejected') {
      row.status = 'rejected';
    } else if (!(row.steps || []).some((s) => s.status === 'pending')) {
      row.status = 'approved';
    }
    await row.save();
    await auditLog('approval_decision', actorId(req), {
      requestId: row._id, decision, role: next.role, ip: req.ip,
    });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Approval decide error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/delegations', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await Delegation.find({ ...tenantFilter(req), active: true }).lean();
    return res.json({ delegations: rows });
  } catch (err) {
    logger.error(`Delegations error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/delegations', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await Delegation.create({ hospitalId: req.user.hospitalId, ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Delegation create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/sweep', authorize('staff:manage'), async (req, res) => {
  try {
    const out = await ApprovalRequest.updateMany(
      { ...tenantFilter(req), status: 'pending', dueAt: { $lte: new Date() } },
      { $set: { status: 'expired' } },
    );
    return res.json({ expired: out.modifiedCount || 0 });
  } catch (err) {
    logger.error(`Approval sweep error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;

/** Shared 409/422 mapping for ensureApproval/consumeApproval errors. */
export function approvalError(res, err, fallback = 'Approval check failed') {
  if (err?.code === 'NEEDS_APPROVAL') {
    return res.status(409).json({
      message: err.message, code: err.code,
      approvalId: err.approvalId, approverRoles: err.approverRoles,
    });
  }
  if (err?.code && String(err.code).startsWith('APPROVAL_')) {
    return res.status(422).json({ message: err.message, code: err.code });
  }
  return null;
}

/**
 * File 22 P0-1: consume a captured approval exactly once. Returns the
 * request when it is approved, unconsumed, same-hospital, same-policy and
 * covers minAmount — else throws with a machine-readable code.
 */
export async function consumeApproval({ hospitalId, approvalId, policyKey, minAmount, consumedFor, consumedBy }) {
  const row = await ApprovalRequest.findById(approvalId);
  if (!row) {
    const e = new Error('Approval not found');
    e.code = 'APPROVAL_MISSING';
    throw e;
  }
  if (hospitalId && row.hospitalId && String(row.hospitalId) !== String(hospitalId)) {
    const e = new Error('Approval belongs to another hospital');
    e.code = 'APPROVAL_TENANT';
    throw e;
  }
  if (row.policyKey !== policyKey) {
    const e = new Error(`Approval is for ${row.policyKey}, not ${policyKey}`);
    e.code = 'APPROVAL_POLICY';
    throw e;
  }
  if (row.status !== 'approved') {
    const e = new Error(`Approval is ${row.status}`);
    e.code = 'APPROVAL_NOT_APPROVED';
    throw e;
  }
  if (row.consumedAt) {
    const e = new Error('Approval already used');
    e.code = 'APPROVAL_REPLAY';
    throw e;
  }
  if (minAmount != null && Number(row.amount || 0) + 0.009 < Number(minAmount)) {
    const e = new Error('Approval covers a smaller amount');
    e.code = 'APPROVAL_AMOUNT';
    throw e;
  }
  row.consumedAt = new Date();
  row.consumedBy = consumedBy || null;
  row.consumedFor = String(consumedFor || '').slice(0, 120);
  await row.save();
  return row;
}

/**
 * Ensure an over-threshold action is approved: verifies a captured
 * approvalId when given, else auto-creates the request and throws
 * NEEDS_APPROVAL carrying the new request id + approver roles.
 */
export async function ensureApproval({ req, policyKey, entityRef, title, amount, roles }) {
  if (req.body?.approvalId) {
    return consumeApproval({
      hospitalId: req.user.hospitalId, approvalId: req.body.approvalId,
      policyKey, minAmount: amount, consumedFor: title, consumedBy: actorId(req),
    });
  }
  const created = await ApprovalRequest.create({
    hospitalId: req.user.hospitalId, policyKey,
    entityRef: entityRef || {}, title: String(title || '').slice(0, 200),
    amount: Number(amount) || 0, requiredRoles: roles || ['hospital_admin'],
    steps: (roles || ['hospital_admin']).map((role, i) => ({ step: i, role })),
    requestedBy: actorId(req), dueAt: new Date(Date.now() + 48 * 3600 * 1000),
  });
  const e = new Error(`Requires approval (${(roles || ['hospital_admin']).join('/')})`);
  e.code = 'NEEDS_APPROVAL';
  e.approvalId = String(created._id);
  e.approverRoles = roles || ['hospital_admin'];
  throw e;
}
