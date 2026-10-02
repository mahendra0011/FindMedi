import mongoose from 'mongoose';

// PHARMA-001 / LAB-002 / AUTHZ-003: fail-closed tenant ownership.
//
// The inline checks these replace all had the same shape:
//
//   if (req.user.hospitalId && req.user.role !== 'superadmin'
//       && doc.hospitalId?.toString() !== req.user.hospitalId.toString()) return 403;
//
// which FAILS OPEN: an account with no hospitalId (a provider, or a staff record
// created without one) skips the first clause, so the whole condition is false
// and the caller is let through with no tenant check at all.
//
// requireTenantOwnership inverts that: an account must either be superadmin or
// positively match the document's tenant. Anything unproven is a 403.

const TENANT_FIELDS = ['facilityId', 'hospitalId'];

/** The tenant ids the caller can act within, or null for a cross-tenant caller. */
function callerTenants(user) {
  const out = new Set();
  if (user?.facilityId) out.add(String(user.facilityId));
  if (user?.hospitalId) out.add(String(user.hospitalId));
  return out;
}

/** True when the caller is allowed to act on `doc`'s tenant. Fails closed. */
export function callerMayActOnDoc(doc, user) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  const owned = callerTenants(user);
  if (owned.size === 0) return false; // no tenant at all -> deny
  for (const field of TENANT_FIELDS) {
    const v = doc?.[field];
    if (v && owned.has(String(v))) return true;
  }
  return false;
}

/**
 * PHARM-B-12: true when the caller is the SUBJECT of the document.
 *
 * A patient has no facilityId/hospitalId, so `callerMayActOnDoc` denies them —
 * which made the `pharmacy:order:own` grant unreachable and, worse, would have
 * been "fixed" by loosening the tenant rule. Self-service must be decided by
 * OWNERSHIP (a patient id on the row), which is a different axis from tenancy and
 * must not weaken it.
 */
export function callerOwnsDoc(doc, user, ownerFields = ['patientId', 'patient_id', 'userId']) {
  if (!user || !doc) return false;
  if (user.role === 'superadmin') return true;
  const me = String(user._id ?? user.id ?? '');
  if (!me) return false;
  return ownerFields.some((field) => {
    const v = doc?.[field];
    if (!v) return false;
    // A populated field is a document; compare its id.
    const id = typeof v === 'object' ? (v._id ?? v.id) : v;
    return id != null && String(id) === me;
  });
}

/**
 * Middleware factory. `load(req)` must resolve the target document (or null).
 * 404 when absent, 403 when the caller neither owns it nor acts in its tenant.
 *
 * Options:
 *   ownerFields  fields that identify the SUBJECT. When the caller matches one of
 *                them, ownership is proven and the tenant rule is not applied —
 *                this is what keeps `:own` self-service routes reachable for
 *                patients, who have no tenant of their own (PHARM-B-12).
 *   requireTenant when true, ownership alone is NOT enough (staff-only documents).
 */
export function requireTenantOwnership(load, { param = 'id', message, ownerFields = ['patientId', 'patient_id', 'userId'], requireTenant = false } = {}) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'superadmin') return next();
      const id = req.params[param];
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ message: message || 'Not found' });
      }
      const doc = await load(req);
      if (!doc) return res.status(404).json({ message: message || 'Not found' });

      // PHARM-B-12: ownership is checked FIRST and is sufficient on its own for a
      // self-service document. It never widens the tenant rule — a patient can
      // only ever act on a row that names them.
      if (!requireTenant && callerOwnsDoc(doc, req.user, ownerFields)) {
        req.ownedDoc = doc;
        req.ownershipBasis = 'owner';
        return next();
      }

      if (!callerMayActOnDoc(doc, req.user)) {
        return res.status(403).json({ message: 'Not authorized for this store/facility' });
      }
      // Hand the resolved doc on so the handler need not re-query.
      req.ownedDoc = doc;
      req.ownershipBasis = 'tenant';
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/** Convenience wrapper for a Mongoose model resolved by req.params[param]. */
export function requireOwnershipOf(modelPromise, opts = {}) {
  return requireTenantOwnership(
    async (req) => {
      const Model = await modelPromise;
      return Model.findById(req.params[opts.param || 'id']);
    },
    opts
  );
}
