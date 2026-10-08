/**
 * File 25 §3: layered authorization evaluator (AWS-IAM style, tenant scope).
 *
 * Evaluation order: guardrails → tenant → statements (Deny wins) →
 * boundary → sensitivity/consent → conditions are per-statement.
 * ANY error → DENY (fail-closed). No eval/regex from user input anywhere:
 * matching is exact-segment or `*` wildcards only.
 *
 * Principal shape:
 *   { id, tenantId, tenantKind, isOwner, roles[], deptIds[], wardIds[],
 *     careTeamPatientIds[], mfa, ip, onShift, policyVersion }
 * Resource shape:
 *   { type, id, tenantId, deptId, wardId, sensitivity, careTeam[] }
 * Ctx shape: { emergency, reason, consentGranted, now }
 */
import IamPolicy from '../models/IamPolicy.js';
import IamRole from '../models/IamRole.js';
import IamAssignment from '../models/IamAssignment.js';
import IamGroup from '../models/IamGroup.js';

// Platform guardrails (SCP-like, §3 L0): cannot be overridden by tenants.
const T3_KINDS = new Set(['wellness', 'commerce', 'community']);
const CLINICAL_PREFIXES = ['records:', 'prescriptions:', 'patients:', 'vitals:', 'lab:', 'radiology:', 'nursing:', 'ipd:'];
const IAM_ACTIONS = ['iam:'];

export const isClinicalAction = (action) => CLINICAL_PREFIXES.some((p) => String(action).startsWith(p));

export function guardrailsAllow(principal, action) {
  // T3 tenants (gym/yoga/store/community) can never hold clinical actions.
  if (T3_KINDS.has(principal.tenantKind) && isClinicalAction(action)) {
    return { ok: false, reason: 'guardrail:t3-no-clinical' };
  }
  // IAM administration is owner-only.
  if (IAM_ACTIONS.some((p) => String(action).startsWith(p)) && !principal.isOwner) {
    return { ok: false, reason: 'guardrail:iam-owner-only' };
  }
  return { ok: true };
}

// --- matchers (exact segments + `*`, no regex) ---
const splitSegs = (s) => String(s || '').split(':');
const splitPath = (s) => String(s || '').split('/');

export function matchAction(pattern, action) {
  const p = splitSegs(pattern);
  const a = splitSegs(action);
  if (p.length !== a.length && !p.includes('*')) return false;
  return p.every((seg, i) => seg === '*' || seg === a[i]);
}

export function matchResource(pattern, resource, principal) {
  if (pattern === '*') return true;
  // Scope-dimension patterns: ward/<id|{ownWards}>/*, dept/…, location/…,
  // patient/<id|*|{careTeam}>, tenant/self/*, or plain type/<id|*>.
  const p = splitPath(pattern);
  const [dim, key] = p;
  const mine = (arr, v) => (arr || []).map(String).includes(String(v ?? ''));
  switch (dim) {
    case 'tenant':
      return key === 'self' || key === '*';
    case 'ward':
      if (key === '{ownWards}') return mine(principal.wardIds, resource.wardId);
      return String(resource.wardId || '') === String(key);
    case 'dept':
      if (key === '{ownDepts}') return mine(principal.deptIds, resource.deptId);
      return String(resource.deptId || '') === String(key);
    case 'location':
      return String(resource.locationId || '') === String(key);
    case 'patient': {
      if (resource.type !== 'patient' && resource.type !== 'record') return false;
      if (key === '*') return true;
      if (key === '{careTeam}') return mine(resource.careTeam, principal.id);
      return String(resource.id || '') === String(key);
    }
    default: {
      // plain type/id path, e.g. record/r1, bill/*.
      if (dim !== resource.type) return false;
      if (key === undefined || key === '*') return true;
      return String(resource.id || '') === String(key);
    }
  }
}

// --- conditions allowlist (§4): unknown keys → statement does NOT match ---
export function evalConditions(conditions, principal, resource, ctx) {
  const c = conditions || {};
  const now = ctx?.now || new Date();
  for (const [key, val] of Object.entries(c)) {
    switch (key) {
      case 'mfa':
        if (Boolean(val) && !principal.mfa) return false;
        break;
      case 'ip':
        if (Array.isArray(val) && !val.map(String).includes(String(principal.ip || ''))) return false;
        break;
      case 'expires_at':
        if (new Date(val).getTime() < now.getTime()) return false;
        break;
      case 'shift':
        if (val === 'current' && !principal.onShift) return false;
        break;
      case 'time_between': {
        if (!Array.isArray(val) || val.length !== 2) return false;
        const hhmm = now.toTimeString().slice(0, 5);
        if (hhmm < String(val[0]) || hhmm > String(val[1])) return false;
        break;
      }
      case 'dept_in':
        if (Array.isArray(val) && !val.map(String).includes(String(resource.deptId || ''))) return false;
        break;
      case 'ward_in':
        if (Array.isArray(val) && !val.map(String).includes(String(resource.wardId || ''))) return false;
        break;
      case 'careteam_includes_me': {
        if (!val) break;
        const team = resource.careTeam || [];
        if (!team.map(String).includes(String(principal.id))) return false;
        break;
      }
      case 'sensitivity_not':
        if (Array.isArray(val) && val.map(String).includes(String(resource.sensitivity || 'standard'))) return false;
        break;
      case 'reason_required':
        if (val && !ctx?.reason) return false;
        break;
      case 'consent_required':
        if (val && !ctx?.consentGranted) return false;
        break;
      case 'emergency_flag':
        if (Boolean(val) !== Boolean(ctx?.emergency)) return false;
        break;
      default:
        return false; // unknown condition key → statement skipped (fail-closed)
    }
  }
  return true;
}

// --- effective statements (direct + group + role policies), cached ---
const stmtCache = new Map();
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 1000;

const cacheGet = (key, version) => {
  const hit = stmtCache.get(key);
  if (!hit) return null;
  if (hit.version !== version || hit.at + CACHE_TTL_MS < Date.now()) {
    stmtCache.delete(key);
    return null;
  }
  return hit.statements;
};
const cacheSet = (key, version, statements) => {
  if (stmtCache.size >= CACHE_MAX) stmtCache.delete(stmtCache.keys().next().value);
  stmtCache.set(key, { version, statements, at: Date.now() });
};
export const clearIamCache = () => stmtCache.clear();

export async function effectiveStatements(principal) {
  const version = principal.policyVersion ?? 0;
  const key = `${principal.id}:${version}`;
  const hit = cacheGet(key, version);
  if (hit) return hit;

  const now = new Date();
  const assignments = await IamAssignment.find({
    tenantId: principal.tenantId,
    principalId: principal.id,
    status: 'active',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).lean();
  const groupIds = await IamGroup.find({ tenantId: principal.tenantId, memberIds: principal.id })
    .select('_id').lean().then((g) => g.map((x) => x._id));
  const groupAssigns = groupIds.length ? await IamAssignment.find({
    tenantId: principal.tenantId,
    principalType: 'group',
    principalId: { $in: groupIds },
    status: 'active',
  }).lean() : [];

  const policyIds = new Set();
  const roleIds = new Set();
  for (const a of [...assignments, ...groupAssigns]) {
    if (a.policyId) policyIds.add(String(a.policyId));
    if (a.roleId) roleIds.add(String(a.roleId));
  }
  let boundaryIds = new Set();
  if (roleIds.size) {
    const roles = await IamRole.find({ _id: { $in: [...roleIds] } }).select('policyIds boundaryId').lean();
    for (const r of roles) {
      for (const p of (r.policyIds || [])) policyIds.add(String(p));
      if (r.boundaryId) boundaryIds.add(String(r.boundaryId));
    }
  }
  const policies = policyIds.size
    ? await IamPolicy.find({ _id: { $in: [...policyIds] }, status: 'active' }).select('statements').lean()
    : [];
  const statements = policies.flatMap((p) => p.statements || []);
  const boundaryPolicies = boundaryIds.size
    ? await IamPolicy.find({ _id: { $in: [...boundaryIds] }, status: 'active' }).select('statements').lean()
    : [];
  const out = {
    statements,
    boundaryStatements: boundaryPolicies.flatMap((p) => p.statements || []),
    scopes: [...assignments, ...groupAssigns],
  };
  cacheSet(key, version, out);
  return out;
}

// Boundary (§9): intersection — a boundary must ALSO allow. Boundary Deny
// always wins, same as identity Deny.
function withinBoundary(boundaryStatements, action, resource, principal, ctx) {
  let allowed = false;
  for (const s of boundaryStatements) {
    const actions = Array.isArray(s.actions) ? s.actions : [];
    const resources = Array.isArray(s.resources) ? s.resources : [];
    if (!actions.some((a) => matchAction(a, action))) continue;
    if (!resources.some((r) => matchResource(r, resource, principal))) continue;
    if (!evalConditions(s.conditions, principal, resource, ctx)) continue;
    if (s.effect === 'Deny') return false;
    allowed = true;
  }
  return allowed;
}

// --- main decision (§3.1), fail-closed ---
export async function can(principal, action, resource, ctx = {}) {
  try {
    const g = guardrailsAllow(principal, action);
    if (!g.ok) return { allow: false, reason: g.reason };
    if (!principal.isPlatform && String(resource.tenantId || '') !== String(principal.tenantId || '')) {
      return { allow: false, reason: 'tenant-mismatch' };
    }
    const { statements, boundaryStatements } = await effectiveStatements(principal);
    let allowed = false;
    let matchedSid = null;
    for (const s of statements) {
      const actions = Array.isArray(s.actions) ? s.actions : [];
      const resources = Array.isArray(s.resources) ? s.resources : [];
      if (!actions.some((a) => matchAction(a, action))) continue;
      if (!resources.some((r) => matchResource(r, resource, principal))) continue;
      if (!evalConditions(s.conditions, principal, resource, ctx)) continue;
      if (s.effect === 'Deny') return { allow: false, reason: `explicit-deny:${s.sid || 'unnamed'}` };
      allowed = true;
      matchedSid = s.sid || matchedSid;
    }
    if (!allowed) return { allow: false, reason: 'default-deny' };
    if (boundaryStatements.length && !withinBoundary(boundaryStatements, action, resource, principal, ctx)) {
      return { allow: false, reason: 'boundary' };
    }
    // Restricted sensitivity always needs reason + step-up obligation surface.
    const obligations = [];
    if (['restricted'].includes(String(resource.sensitivity || ''))) obligations.push('reason_required', 'step_up');
    return { allow: true, obligations, policy: matchedSid };
  } catch (e) {
    return { allow: false, reason: 'evaluator-error' };
  }
}

// --- query-level scope injection (§3.2): leak roko, fetch-all-then-filter nahi ---
export async function scopeFilter(principal, module = 'records') {
  try {
    const { scopes } = await effectiveStatements(principal);
    const filter = { tenantId: principal.tenantId };
    const depts = new Set();
    const wards = new Set();
    let careTeamOnly = false;
    for (const s of scopes) {
      const sc = s.scope || {};
      for (const d of (sc.deptIds || [])) depts.add(String(d));
      for (const w of (sc.wardIds || [])) wards.add(String(w));
      if (sc.careTeamOnly) careTeamOnly = true;
    }
    if (depts.size) filter.deptId = { $in: [...depts] };
    if (wards.size) filter.wardId = { $in: [...wards] };
    if (careTeamOnly) filter.careTeam = String(principal.id);
    void module;
    return filter;
  } catch {
    return { tenantId: principal.tenantId, _id: null }; // fail-closed: matches nothing
  }
}

/**
 * File 25 §11 step 3 — shadow mode. Runs the new evaluator alongside the
 * legacy authorize() decision WITHOUT enforcing: mismatches are logged for
 * review (1–2 sprints) while the old decision stays binding. Fire-and-forget
 * from routes so it can never break or slow a request.
 */
export async function iamShadow({ principal, action, resource, ctx, oldDecision, route }) {
  try {
    const next = await can(principal, action, resource, ctx);
    if (Boolean(next.allow) !== Boolean(oldDecision)) {
      const { default: logger } = await import('../config/logger.js');
      logger.warn(
        `IAM-SHADOW mismatch route=${route} action=${action} `
        + `old=${oldDecision ? 'allow' : 'deny'} new=${next.allow ? 'allow' : 'deny'} `
        + `reason=${next.reason || 'allow'}`,
      );
    }
    return next;
  } catch {
    return { allow: false, reason: 'shadow-error' };
  }
}

/** Builds a best-effort IAM principal from an authenticated request. */
export function principalFromRequest(req, over = {}) {
  const u = req.user || {};
  return {
    id: String(u._id || u.id || ''),
    tenantId: String(u.hospitalId || u.facilityId || ''),
    tenantKind: String(u.tenantKind || ''),
    isOwner: ['hospital_admin', 'superadmin'].includes(u.role),
    roles: [],
    deptIds: u.deptIds || [],
    wardIds: u.wardIds || [],
    careTeamPatientIds: [],
    mfa: Boolean(u.twoFactorEnabled),
    ip: req.ip,
    onShift: true,
    policyVersion: 0,
    ...over,
  };
}

export const IAM_CONDITION_KEYS = [
  'mfa', 'ip', 'expires_at', 'shift', 'time_between', 'dept_in', 'ward_in',
  'careteam_includes_me', 'sensitivity_not', 'reason_required', 'consent_required', 'emergency_flag',
];
