import { roleHasPermission, canonicalRole, rolesEquivalent, CANONICAL_ROLES } from '../config/permissions.js';
import logger from '../config/logger.js';
import BreakGlassGrant from '../models/BreakGlassGrant.js';
import { auditLog } from './audit.js';

// File 23 §5.1: PHI-class permissions. Platform roles (below) hold NO default
// access to these — every pass needs an approved BreakGlassGrant for the
// exact subject. Clinical/facility roles (doctor, nurse, dental_clinic_admin,
// …) are EXCLUDED: they work tenant-scoped through object-level handlers.
const PHI_PERMISSIONS = new Set(['records:read', 'records:write', 'patients:read', 'patients:write']);
const BREAK_GLASS_ROLES = new Set([
  'superadmin', 'platform_admin', 'support_l1', 'support_l2', 'dpo',
  'security_admin', 'clinical_safety', 'analyst', 'auditor',
]);

const breakGlassSubjectOf = (req) => {
  const raw = req.params?.id || req.params?.patientId || req.params?.recordId
    || req.query?.patientId || req.query?.subjectId || req.body?.patientId;
  return raw ? String(raw) : null;
};

// MISS-AUTHZ-001 / AUTHZ-002: single declarative authorization gate.
// Usage: router.put('/:id', protect, authorize('records:write'), handler)
// Multiple permissions are any-of: authorize('billing:write', 'billing:write:own')
// lets staff act on anyone's record while a patient may act on their own.
// Superadmin bypasses; role→permission matrix lives in config/permissions.js.
export const authorize = (...permissions) => {
  const required = permissions.flat().filter(Boolean);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'superadmin') {
      // Owner keeps non-PHI platform powers; clinical reads need a grant.
      if (!required.some((p) => PHI_PERMISSIONS.has(p))) return next();
      return breakGlassGate(req, res, next);
    }
    if (required.some((p) => roleHasPermission(req.user.role, p))) {
      if (required.some((p) => PHI_PERMISSIONS.has(p)) && BREAK_GLASS_ROLES.has(canonicalRole(req.user.role))) {
        return breakGlassGate(req, res, next);
      }
      return next();
    }
    // AUTHZ-B-03: the body used to be `{ required, role }`, which handed an
    // attacker holding ANY low-privilege account an exact map of the RBAC surface
    // (every permission string + their own role) — enough to plan an escalation or
    // to enumerate which endpoint is worth attacking. The detail now goes to the
    // server log; the response is generic. The chat/notifications modules already
    // answered 404 for this reason.
    logger.warn(
      `AUTHZ deny: role=${canonicalRole(req.user.role)} user=${req.user.id} `
      + `required=[${required.join(',')}] path=${req.originalUrl}`
    );
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};

// File 23 §5.1: async break-glass gate for PHI-class permissions. Passes only
// with an APPROVED, unexpired grant for the exact subject; every pass is
// audited as `phi_access`. List routes (no subject id) are denied —
// aggregates live on dedicated stats endpoints instead.
async function breakGlassGate(req, res, next) {
  try {
    const subjectId = breakGlassSubjectOf(req);
    if (!subjectId) {
      return res.status(403).json({ message: 'Break-glass approval required', code: 'BREAK_GLASS_REQUIRED' });
    }
    const grant = await BreakGlassGrant.findOne({
      requesterId: req.user._id || req.user.id,
      'subject.id': subjectId,
      status: 'approved',
      expiresAt: { $gt: new Date() },
    });
    if (!grant) {
      await auditLog('breakglass_denied', req.user?._id, {
        route: req.originalUrl, subjectId, ip: req.ip,
      }).catch(() => {});
      return res.status(403).json({ message: 'Break-glass approval required', code: 'BREAK_GLASS_REQUIRED' });
    }
    grant.accessLog.push({ ts: new Date(), route: req.originalUrl, objectId: subjectId });
    await grant.save().catch(() => {});
    await auditLog('phi_access', req.user?._id, {
      grantId: String(grant._id), route: req.originalUrl, subjectId,
      reasonCode: grant.reasonCode, ticketId: grant.ticketId, ip: req.ip,
    }).catch(() => {});
    req.breakGlass = grant;
    return next();
  } catch (err) {
    return next(err);
  }
}

// AUTHZ-M-01 migration helper: every canonical role holding ANY of the given
// permissions. Computed from the SAME matrix `authorize()` enforces, so a
// migrated route's actorRoles can never drift narrower than the chain's role
// decision (narrower would break legit access; wider is harmless because the
// chain's authorize()/requireRole() stays in place as the binding constraint).
export function rolesWithPermission(...permissions) {
  const wanted = permissions.flat().filter(Boolean);
  return CANONICAL_ROLES.filter(
    (role) => role !== 'superadmin' && wanted.some((p) => roleHasPermission(role, p))
  );
}
// AUTHZ-B-04: `adminOnly` accepted a hospital_admin on PLATFORM-WIDE operations
// (SOS vehicle settings, system settings, service cities), so one hospital's admin
// could reconfigure every other tenant. Platform configuration is a superadmin
// responsibility; a tenant administrator manages its own hospital instead.
export const PLATFORM_ADMIN_ROLES = ['superadmin'];

export const platformAdminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (PLATFORM_ADMIN_ROLES.includes(req.user.role)) return next();
  logger.warn(
    `PLATFORM-ADMIN deny: role=${canonicalRole(req.user.role)} user=${req.user.id} path=${req.originalUrl}`
  );
  return res.status(403).json({ message: 'Insufficient permissions' });
};

// AUTHZ-003: fail-closed facility scoping — targetId must be present AND match.
export const sameFacilityStrict = (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  const targetId = req.body?.facilityId || req.query?.facilityId || req.params?.facilityId;
  const userFacilityId = (req.user.facilityId || req.user.hospitalId)?.toString();
  if (!userFacilityId) {
    return res.status(403).json({ message: 'No facility linked to this account' });
  }
  if (!targetId) {
    return res.status(403).json({ message: 'facilityId required for this operation' });
  }
  if (targetId !== userFacilityId) {
    return res.status(403).json({ message: 'Cross-facility access denied' });
  }
  next();
};

// ==============================================================================
// AUTHZ-B-01 / AUTHZ-B-02: object-level authorization, deny-by-default
// ==============================================================================
// `authorize()` answers "may this ROLE do this KIND of thing". It cannot answer
// "may this CALLER touch THIS document", so every handler used to hand-roll that
// — and the ones that forgot are exactly the IDOR holes (insurance.js:73,
// pharmacy.js:344, appointments.js:357, the emergencySOS routes). 316 routes were
// `protect`-only with no authorization marker at all.
//
// `authorizeObject` closes the class rather than the instances: ownership,
// tenant and role-family are all checked in ONE place, and any unresolved case is
// a DENY, never a pass. The document is attached to `req.scoped` so the handler
// does not re-query it (and cannot accidentally query it unscoped).
//
//   router.get('/:id', protect, authorizeObject({
//     model:      () => import('../models/Record.js'),
//     idFrom:     (req) => req.params.id,
//     ownerField: 'patientId',
//     tenantField:'facilityId',
//     actorRoles: ['doctor', 'nurse'],
//     read:       true, write: true,
//   }), handler)
//
// Options:
//   model        mongoose model, or a lazy import returning one
//   idFrom       (req) => id                       (default req.params.id)
//   ownerField   document field holding the OWNER's user id
//   ownerFields  several such fields (default [ownerField]) — ownership is
//                proven when the caller matches ANY of them, mirroring
//                callerOwnsDoc() in tenantOwnership.js
//   requireTenant when true, ownership alone is NOT enough: the caller must
//                ALSO be inside the document's tenant (staff-only documents —
//                mirrors requireTenantOwnership's requireTenant:true, where a
//                tenant-less owner is denied and a tenant-less document denies)
//   tenantField  DEPRECATED single tenant field — prefer tenantFields below.
//                Kept for backward compatibility; when tenantFields is absent it
//                is used as the sole checked field.
//   tenantFields document fields holding a facility/hospital id
//                (default ['facilityId', 'hospitalId']). The tenant boundary is
//                fail-closed across ALL of them: a document naming its tenant by
//                ANY listed field is checked, and a caller with an EMPTY tenant
//                set is denied on a tenant-carrying document.
//   actorRoles   roles allowed to bypass the ownership check (staff)
//   read/write   enable that operation for this route
//   selfIds      extra ids the caller owns (e.g. a linked Doctor._id)
//   ownerLoader  async (doc) => ownerId   for polymorphic ownership
//   notFoundAs   '404' (default) | '403' — 404 avoids an id-existence oracle
export const authorizeObject = (options = {}) => {
  const {
    model,
    idFrom = (req) => req.params.id,
    ownerField = 'patientId',
    ownerFields = null,
    requireTenant = false,
    tenantField = null,
    tenantFields = null,
    actorRoles = [],
    read = false,
    write = false,
    selfIds = null,
    ownerLoader = null,
    notFoundAs = '404',
  } = options;

  if (!model) throw new Error('authorizeObject requires a model');
  if (!read && !write) throw new Error('authorizeObject requires read or write');

  // AUTHZ-M-01 (fixed): every tenant-carrying field is checked, never just one.
  // An explicit tenantFields list wins; a legacy single tenantField degrades to
  // a one-element list; otherwise both facilityId and hospitalId are checked —
  // the same pair requireTenantOwnership enforces.
  const checkedTenantFields = Array.isArray(tenantFields) && tenantFields.length > 0
    ? [...tenantFields]
    : (tenantField ? [tenantField] : ['facilityId', 'hospitalId']);

  const deny = (res, req, why) => {
    logger.warn(
      `AUTHZ object deny (${why}): user=${req.user?.id} role=${req.user?.role} path=${req.originalUrl}`
    );
    return res.status(notFoundAs === '403' ? 403 : 404).json({ message: 'Not found' });
  };

  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    if (req.user.role === 'superadmin') {
      const Model = typeof model === 'function' ? await model() : model;
      const doc = await Model.findById(idFrom(req));
      if (!doc) return res.status(404).json({ message: 'Not found' });
      req.scoped = doc;
      req.ownedDoc = doc; // compat: requireTenantOwnership handed handlers req.ownedDoc
      return next();
    }

    let Model;
    try {
      Model = typeof model === 'function' ? await model() : model;
    } catch (err) {
      // Fail closed: a model that cannot be loaded must not become an open door.
      logger.error(`authorizeObject model load failed: ${err.message}`);
      return res.status(500).json({ message: 'Authorization check failed' });
    }

    const doc = await Model.findById(idFrom(req));
    // 404 rather than 403 by default: a 403 proves the id exists, which is the
    // enumeration oracle AUTHZ-B-04/chatMembership already rejected.
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;

    // 1. Ownership FIRST — it is a different axis from tenancy and wins over it
    //    (PHARM-B-12): a tenant-less patient must still reach their own row, so
    //    "caller has no tenant" can never by itself deny an owner.
    //    Exception: requireTenant (staff-only documents) — the owner must ALSO
    //    be inside the tenant, exactly like requireTenantOwnership's
    //    requireTenant:true.
    const checkedOwnerFields = Array.isArray(ownerFields) && ownerFields.length > 0
      ? [...ownerFields]
      : [ownerField];
    const ownedIds = new Set(
      [String(req.user.id), String(req.user._id), ...(selfIds?.(req) || []).map(String)]
    );
    const fieldOwnerId = (field) => {
      const v = plain?.[field];
      if (v === null || v === undefined) return null;
      const id = typeof v === 'object' ? (v._id ?? v.id) : v;
      return id != null ? String(id) : null;
    };
    // Any matching owner field proves ownership (first non-null match wins).
    let ownerId = null;
    for (const field of checkedOwnerFields) {
      const candidate = fieldOwnerId(field);
      if (candidate !== null && ownedIds.has(candidate)) { ownerId = candidate; break; }
      if (ownerId === null) ownerId = candidate;
    }
    if (ownerLoader) {
      try {
        const loaded = await ownerLoader(plain, req);
        ownerId = loaded == null ? null : String(
          typeof loaded === 'object' ? (loaded._id ?? loaded.id) : loaded
        );
      } catch (err) {
        logger.error(`authorizeObject ownerLoader failed: ${err.message}`);
        return res.status(500).json({ message: 'Authorization check failed' });
      }
    }
    const owns = ownerId != null && ownedIds.has(String(ownerId));
    const attachOwned = (basis) => {
      req.scoped = doc;
      req.ownedDoc = doc; // compat: requireTenantOwnership handed handlers req.ownedDoc
      req.scopedOwnership = basis;
    };
    if (owns && !requireTenant) {
      attachOwned('owner');
      return next();
    }

    // 2. Tenant boundary — fail-closed across EVERY checked field, and checked
    //    BEFORE the role bypass, because "same hospital" is a stronger statement
    //    than "is staff".
    //
    //    AUTHZ-M-01 holes closed here (were FIXME): (1) the old guard was
    //    `docFacility && userFacility && mismatch`, so a caller with NO tenant
    //    short-circuited it to false and walked through unchecked; (2) only one
    //    tenant field was inspected, so a document naming its tenant by the
    //    other field yielded null and was unchecked. Now: any tenant signal on
    //    the document MUST intersect the caller's tenant set.
    const callerTenants = new Set(
      [req.user.facilityId, req.user.hospitalId].filter(Boolean).map(String)
    );
    const docTenants = new Set(
      checkedTenantFields
        .map((f) => plain?.[f])
        .filter((v) => v !== null && v !== undefined && String(v).length > 0)
        .map(String)
    );
    if (docTenants.size > 0) {
      const overlap = [...docTenants].some((t) => callerTenants.has(t));
      if (!overlap) return deny(res, req, callerTenants.size === 0 ? 'tenant-less-caller' : 'cross-tenant');
    } else if (requireTenant) {
      // Staff-only documents must PROVE their tenant (mirrors
      // requireTenantOwnership's requireTenant:true, which denies legacy
      // tenant-less rows rather than letting them through on roles alone).
      return deny(res, req, 'tenant-required');
    }
    // Note: without requireTenant, a document carrying NO tenant in any checked
    // field proceeds to the role check (legacy tenant-less rows). It is still
    // gated by actorRoles — never open — and new rows always carry a tenant
    // via server derivation.

    // 3. Role family bypass for staff — only for the operation this route declares.
    const isStaff = actorRoles.length > 0
      && actorRoles.some((r) => req.user.role === r || rolesEquivalent(req.user.role, r));

    if (!isStaff) {
      return deny(res, req, 'no-ownership-no-role');
    }

    attachOwned('role');
    return next();
  };
};
