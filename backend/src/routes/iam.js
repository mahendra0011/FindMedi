import crypto from 'node:crypto';
import express from 'express';
import IamPolicy from '../models/IamPolicy.js';
import IamRole from '../models/IamRole.js';
import IamAssignment from '../models/IamAssignment.js';
import IamGroup from '../models/IamGroup.js';
import ResourceScope from '../models/ResourceScope.js';
import AccessRequest from '../models/AccessRequest.js';
import AccessReview from '../models/AccessReview.js';
import TenantGrant from '../models/TenantGrant.js';
import ApiKey from '../models/ApiKey.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, iamPolicySchema } from '../utils/validate.js';
import { can, clearIamCache, isClinicalAction } from '../lib/iamEvaluator.js';
import { MANAGED_TEMPLATES, templateByKey } from '../lib/iamTemplates.js';
import logger from '../config/logger.js';

// File 25: tenant Access Control Center API. Gated by staff:manage (existing
// tenant-admin perm) — no matrix change needed. Server-side enforcement only;
// UI hiding is never the gate. Admin-critical ops need step-up + approver.

const router = express.Router();
router.use(protect, authorize('staff:manage'));

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);
const tenantOf = (req) => req.user.hospitalId || req.user.facilityId || null;
const requireTenant = (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  if (!tenantOf(req)) return res.status(403).json({ message: 'Tenant scope required' });
  return next();
};
const bumpTv = (userId) => User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }).catch(() => {});
const ADMIN_CRITICAL = ['iam:', 'audit:', 'export:'];
const touchesCritical = (statements) => (statements || []).some((s) =>
  (s.actions || []).some((a) => ADMIN_CRITICAL.some((p) => String(a).startsWith(p))));

// ─── Policies ───────────────────────────────────────────────────────────────
router.get('/policies', requireTenant, async (req, res) => {
  try {
    const filter = { $or: [{ tenantId: null }, ...(tenantOf(req) ? [{ tenantId: tenantOf(req) }] : [])] };
    const rows = await IamPolicy.find(req.user.role === 'superadmin' && !tenantOf(req) ? {} : filter)
      .select('-statements').sort({ type: 1, name: 1 }).limit(200).lean();
    return res.json({ policies: rows });
  } catch (err) {
    logger.error(`IAM policies error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/policies/templates', requireTenant, async (req, res) => {
  return res.json({ templates: MANAGED_TEMPLATES.map((t) => ({ key: t.key, name: t.name, statements: t.statements })) });
});

router.post('/policies', requireTenant, validate(iamPolicySchema), async (req, res) => {
  try {
    const { name, statements, boundaryId } = req.body;
    const critical = touchesCritical(statements);
    const policy = await IamPolicy.create({
      tenantId: tenantOf(req), name, statements, type: 'custom', createdBy: actorId(req),
    });
    await auditLog('iam_policy_created', actorId(req), {
      policyId: policy._id, name, critical, ip: req.ip,
    });
    clearIamCache();
    return res.status(201).json({ id: String(policy._id), version: policy.version });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Policy name already exists' });
    logger.error(`IAM create policy error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Roles ──────────────────────────────────────────────────────────────────
router.get('/roles', requireTenant, async (req, res) => {
  try {
    const filter = req.user.role === 'superadmin' && !tenantOf(req) ? {} : { tenantId: tenantOf(req) };
    const rows = await IamRole.find(filter).populate('policyIds', 'name type version').limit(200).lean();
    return res.json({ roles: rows });
  } catch (err) {
    logger.error(`IAM roles error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/roles', requireTenant, requireStepUp('iam:role-change'), async (req, res) => {
  try {
    const { name, templateKey, policyIds, boundaryId } = req.body || {};
    if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'name required' });
    let policies = Array.isArray(policyIds) ? policyIds.filter((id) => OBJECT_ID.test(String(id))) : [];
    if (templateKey) {
      const t = templateByKey(templateKey);
      if (!t) return res.status(400).json({ message: 'Unknown template' });
      const created = await IamPolicy.create({
        tenantId: tenantOf(req), name: `${name} — ${t.name}`, statements: t.statements,
        type: 'managed', createdBy: actorId(req),
      });
      policies = [String(created._id)];
    }
    const role = await IamRole.create({
      tenantId: tenantOf(req), name: String(name).trim(), type: templateKey ? 'managed' : 'custom',
      policyIds: policies, boundaryId: boundaryId || null, createdBy: actorId(req),
    });
    await auditLog('iam_role_created', actorId(req), { roleId: role._id, name, templateKey: templateKey || '', ip: req.ip });
    clearIamCache();
    return res.status(201).json({ id: String(role._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Role name already exists' });
    logger.error(`IAM create role error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Assignments (no self-grant; critical needs approver) ───────────────────
router.post('/assignments', requireTenant, requireStepUp('iam:role-change'), async (req, res) => {
  try {
    const { principalType, principalId, roleId, policyId, scope, conditions, expiresAt, approvedBy, reason } = req.body || {};
    if (!['user', 'group'].includes(principalType) || !OBJECT_ID.test(String(principalId || ''))) {
      return res.status(400).json({ message: 'principalType=user|group + principalId required' });
    }
    if (String(principalId) === String(actorId(req))) {
      return res.status(403).json({ message: 'Self-grant is not allowed' });
    }
    let statements = [];
    if (roleId) {
      if (!OBJECT_ID.test(String(roleId))) return res.status(400).json({ message: 'Invalid roleId' });
      const role = await IamRole.findById(roleId).populate('policyIds', 'statements');
      if (!role) return res.status(404).json({ message: 'Role not found' });
      statements = (role.policyIds || []).flatMap((p) => p.statements || []);
    } else if (policyId) {
      if (!OBJECT_ID.test(String(policyId))) return res.status(400).json({ message: 'Invalid policyId' });
      const pol = await IamPolicy.findById(policyId);
      if (!pol) return res.status(404).json({ message: 'Policy not found' });
      statements = pol.statements || [];
    } else {
      return res.status(400).json({ message: 'roleId or policyId required' });
    }
    if (touchesCritical(statements)) {
      if (!approvedBy || !OBJECT_ID.test(String(approvedBy)) || String(approvedBy) === String(actorId(req))) {
        return res.status(403).json({ message: 'Admin-critical grants need a different approver' });
      }
    }
    const a = await IamAssignment.create({
      tenantId: tenantOf(req) || undefined, principalType, principalId,
      roleId: roleId || null, policyId: policyId || null,
      scope: scope || {}, conditions: conditions || {},
      expiresAt: expiresAt || null, grantedBy: actorId(req),
      approvedBy: approvedBy || null, reason: String(reason || '').slice(0, 500),
    });
    await bumpTv(principalType === 'user' ? principalId : null);
    if (principalType === 'group') {
      const g = await IamGroup.findById(principalId);
      if (g) await Promise.all((g.memberIds || []).map((m) => bumpTv(m)));
    }
    clearIamCache();
    await auditLog('iam_assignment_created', actorId(req), {
      assignmentId: a._id, principalType, principalId, roleId, policyId, ip: req.ip,
    });
    return res.status(201).json({ id: String(a._id) });
  } catch (err) {
    logger.error(`IAM assign error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/assignments/:id', requireTenant, requireStepUp('iam:role-change'), requireObjectId, async (req, res) => {
  try {
    const a = await IamAssignment.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Not found' });
    a.status = 'revoked';
    await a.save();
    await bumpTv(a.principalType === 'user' ? a.principalId : null);
    clearIamCache();
    await auditLog('iam_assignment_revoked', actorId(req), { assignmentId: a._id, ip: req.ip });
    return res.json({ id: String(a._id), status: a.status });
  } catch (err) {
    logger.error(`IAM revoke error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Groups & scopes ────────────────────────────────────────────────────────
router.get('/groups', requireTenant, async (req, res) => {
  try {
    const rows = await IamGroup.find({ tenantId: tenantOf(req) }).limit(200).lean();
    return res.json({ groups: rows });
  } catch (err) {
    logger.error(`IAM groups error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/groups', requireTenant, async (req, res) => {
  try {
    const { name, memberIds, roleIds, policyIds } = req.body || {};
    if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'name required' });
    const g = await IamGroup.create({
      tenantId: tenantOf(req), name: String(name).trim(),
      memberIds: (memberIds || []).filter((id) => OBJECT_ID.test(String(id))),
      roleIds: (roleIds || []).filter((id) => OBJECT_ID.test(String(id))),
      policyIds: (policyIds || []).filter((id) => OBJECT_ID.test(String(id))),
      createdBy: actorId(req),
    });
    await auditLog('iam_group_created', actorId(req), { groupId: g._id, name, ip: req.ip });
    return res.status(201).json({ id: String(g._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Group name already exists' });
    logger.error(`IAM group error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/scopes', requireTenant, async (req, res) => {
  try {
    const rows = await ResourceScope.find({ tenantId: tenantOf(req) }).limit(500).lean();
    return res.json({ scopes: rows });
  } catch (err) {
    logger.error(`IAM scopes error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/scopes', requireTenant, async (req, res) => {
  try {
    const { type, name, key, parentId } = req.body || {};
    if (!['department', 'ward', 'location'].includes(type) || !name || !key) {
      return res.status(400).json({ message: 'type + name + key required' });
    }
    const s = await ResourceScope.create({
      tenantId: tenantOf(req), type, name: String(name).slice(0, 120), key: String(key).slice(0, 80),
      parentId: parentId || null, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(s._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Scope key already exists' });
    logger.error(`IAM scope error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Simulator: "Can X do Y on Z? why/why not" (§7.2) ───────────────────────
router.post('/simulate', requireTenant, async (req, res) => {
  try {
    const { userId, action, resource } = req.body || {};
    if (!OBJECT_ID.test(String(userId || '')) || !action || !resource?.type) {
      return res.status(400).json({ message: 'userId + action + resource{type} required' });
    }
    const u = await User.findById(userId).select('hospitalId facilityId role').lean();
    if (!u) return res.status(404).json({ message: 'User not found' });
    const principal = {
      id: String(u._id), tenantId: String(u.hospitalId || u.facilityId || ''),
      tenantKind: '', isOwner: ['hospital_admin', 'superadmin'].includes(u.role),
      mfa: false, ip: req.ip, onShift: true, policyVersion: 0,
    };
    const result = await can(principal, action, { tenantId: principal.tenantId, ...resource }, { now: new Date() });
    return res.json({ allow: result.allow, reason: result.reason || null, obligations: result.obligations || [] });
  } catch (err) {
    logger.error(`IAM simulate error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Access requests ────────────────────────────────────────────────────────
router.post('/requests', requireTenant, async (req, res) => {
  try {
    const q = req.body?.requested || {};
    const reason = String(req.body?.reason || '').slice(0, 1000);
    if (!['role', 'policy', 'actions'].includes(q.kind)) return res.status(400).json({ message: 'requested.kind must be role|policy|actions' });
    if (!reason) return res.status(400).json({ message: 'reason required' });
    const r = await AccessRequest.create({
      tenantId: tenantOf(req), requesterId: actorId(req),
      requested: {
        kind: q.kind, roleId: q.roleId || null, policyId: q.policyId || null,
        actions: q.actions || [], scope: q.scope || {}, expiresAt: q.expiresAt || null,
      },
      reason,
    });
    await auditLog('iam_request_created', actorId(req), { requestId: r._id, ip: req.ip });
    return res.status(201).json({ id: String(r._id), status: r.status });
  } catch (err) {
    logger.error(`IAM request error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/requests/:id/decision', requireTenant, requireStepUp('iam:role-change'), requireObjectId, async (req, res) => {
  try {
    const r = await AccessRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (r.status !== 'pending') return res.status(409).json({ message: `Request is ${r.status}` });
    if (String(r.requesterId) === String(actorId(req))) {
      return res.status(403).json({ message: 'Self-approval is not allowed' });
    }
    const { action } = req.body || {};
    if (!['approve', 'deny'].includes(action)) return res.status(400).json({ message: 'action must be approve|deny' });
    r.status = action === 'approve' ? 'approved' : 'denied';
    r.decidedAt = new Date();
    r.decidedBy = actorId(req);
    r.approverIds = [actorId(req)];
    await r.save();
    let assignmentId = null;
    if (action === 'approve') {
      const q = r.requested || {};
      const a = await IamAssignment.create({
        tenantId: r.tenantId, principalType: 'user', principalId: r.requesterId,
        roleId: q.roleId || null, policyId: q.policyId || null,
        scope: q.scope || {}, expiresAt: q.expiresAt || null,
        grantedBy: actorId(req), approvedBy: actorId(req), reason: r.reason,
      });
      assignmentId = String(a._id);
      await bumpTv(r.requesterId);
      clearIamCache();
    }
    await auditLog('iam_request_decided', actorId(req), { requestId: r._id, action, ip: req.ip });
    return res.json({ id: String(r._id), status: r.status, assignmentId });
  } catch (err) {
    logger.error(`IAM decision error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Tenant emergency grants (§8) ──────────────────────────────────────────
router.post('/grants', requireTenant, requireStepUp('phi:breakglass'), async (req, res) => {
  try {
    const { subjectType, subjectId, actions, reasonCode, ticketId, reasonNote, minutes } = req.body || {};
    if (!['patient', 'record'].includes(subjectType) || !OBJECT_ID.test(String(subjectId || ''))) {
      return res.status(400).json({ message: 'subjectType=patient|record + subjectId required' });
    }
    if (!['emergency_care', 'safety_incident', 'legal_order', 'treatment'].includes(reasonCode)) {
      return res.status(400).json({ message: 'Valid reasonCode required' });
    }
    const mins = Math.min(60, Math.max(5, Number(minutes) || 30));
    const g = await TenantGrant.create({
      tenantId: tenantOf(req), principalId: actorId(req),
      subject: { type: subjectType, id: subjectId },
      actions: Array.isArray(actions) && actions.length ? actions : ['records:read'],
      reasonCode, ticketId: String(ticketId || ''), reasonNote: String(reasonNote || '').slice(0, 1000),
      expiresAt: new Date(Date.now() + mins * 60 * 1000),
    });
    await auditLog('tenant_grant_requested', actorId(req), {
      grantId: g._id, subjectType, reasonCode, ip: req.ip,
    });
    return res.status(201).json({ id: String(g._id), status: g.status });
  } catch (err) {
    logger.error(`IAM grant error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Tenant grant decisions (dual approval for restricted/legal) ───────────
router.post('/grants/:id/decision', requireTenant, requireStepUp('phi:breakglass'), requireObjectId, async (req, res) => {
  try {
    const g = await TenantGrant.findById(req.params.id);
    if (!g) return res.status(404).json({ message: 'Not found' });
    if (g.status !== 'pending') return res.status(409).json({ message: `Grant is ${g.status}` });
    const me = String(actorId(req));
    if (String(g.principalId) === me) {
      return res.status(403).json({ message: 'Self-approval is not allowed' });
    }
    const { action } = req.body || {};
    if (!['approve', 'deny'].includes(action)) return res.status(400).json({ message: 'action must be approve|deny' });
    if (action === 'deny') {
      g.status = 'denied';
      g.approvedBy = [actorId(req)];
      await g.save();
      await auditLog('tenant_grant_denied', actorId(req), { grantId: g._id, ip: req.ip });
      return res.json({ id: String(g._id), status: g.status });
    }
    const needsTwo = g.reasonCode === 'legal_order';
    const distinct = new Set([...(g.approvedBy || []).map(String), me]);
    if (needsTwo && distinct.size < 2) {
      g.approvedBy = [...distinct];
      await g.save();
      await auditLog('tenant_grant_first_approval', actorId(req), { grantId: g._id, ip: req.ip });
      return res.json({ id: String(g._id), status: 'pending', approvals: distinct.size, need: 2 });
    }
    g.approvedBy = [...distinct];
    g.status = 'approved';
    await g.save();
    await auditLog('tenant_grant_approved', actorId(req), {
      grantId: g._id, subjectType: g.subject.type, reasonCode: g.reasonCode, ip: req.ip,
    });
    return res.json({ id: String(g._id), status: g.status, expiresAt: g.expiresAt });
  } catch (err) {
    logger.error(`IAM grant decision error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/grants/:id/revoke', requireTenant, requireObjectId, async (req, res) => {
  try {
    const g = await TenantGrant.findById(req.params.id);
    if (!g) return res.status(404).json({ message: 'Not found' });
    if (g.status !== 'approved') return res.status(409).json({ message: `Grant is ${g.status}` });
    g.status = 'revoked';
    await g.save();
    await auditLog('tenant_grant_revoked', actorId(req), { grantId: g._id, ip: req.ip });
    return res.json({ id: String(g._id), status: g.status });
  } catch (err) {
    logger.error(`IAM grant revoke error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── API keys (hashed at rest, show once) ───────────────────────────────────
router.post('/apikeys', requireTenant, requireStepUp('iam:role-change'), async (req, res) => {
  try {
    const { name, policyId, ipBinding, expiresAt } = req.body || {};
    if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'name required' });
    const raw = `fm_${crypto.randomBytes(24).toString('base64url')}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const k = await ApiKey.create({
      tenantId: tenantOf(req), name: String(name).slice(0, 120),
      policyId: policyId || null,
      hash, prefix: raw.slice(0, 8),
      ipBinding: Array.isArray(ipBinding) ? ipBinding.slice(0, 10) : [],
      expiresAt: expiresAt || null, createdBy: actorId(req),
    });
    await auditLog('iam_apikey_created', actorId(req), { keyId: k._id, name, ip: req.ip });
    return res.status(201).json({ id: String(k._id), key: raw });
  } catch (err) {
    logger.error(`IAM apikey error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/apikeys/:id/revoke', requireTenant, requireStepUp('iam:role-change'), requireObjectId, async (req, res) => {
  try {
    const k = await ApiKey.findById(req.params.id);
    if (!k) return res.status(404).json({ message: 'Not found' });
    k.revokedAt = new Date();
    await k.save();
    await auditLog('iam_apikey_revoked', actorId(req), { keyId: k._id, ip: req.ip });
    return res.json({ id: String(k._id), revoked: true });
  } catch (err) {
    logger.error(`IAM apikey revoke error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
export { isClinicalAction };
