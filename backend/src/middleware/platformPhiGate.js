/**
 * Platform-role PHI shadow gate (file 23 §5.3 / §5.4).
 *
 * The policy the platform intends to enforce: a PLATFORM role (superadmin,
 * platform_admin, support, analyst, ...) may not read clinical PHI across
 * tenants. Today several routes still let `superadmin` skip the tenant check
 * outright (nursing, triage, ipd, lab, billing, pharmacy, insurance) so the
 * platform team can operate - but that is exactly the tenant-bypass the
 * access-control spec says platform roles must not have.
 *
 * Flipping that off in one step would break operations, so the gate starts in
 * SHADOW mode: the violation is audited (`shadow_violation`) and the request
 * is ALLOWED. Once ops has reviewed the audit trail, enforcement is switched on
 * per module:
 *
 *   SHADOW_ENFORCE=true                     # every module
 *   SHADOW_ENFORCE_MODULES=phi-platform     # only this module
 *
 * A platform role that holds an APPROVED, UNEXPIRED break-glass grant for the
 * subject is never a violation - that is the sanctioned path.
 *
 * The check is deliberately route-agnostic: it looks at WHO is asking and
 * whether they carry a grant, so it can be mounted on any PHI route without
 * knowing the subject id up front.
 */
import { shadowGate } from './shadowMode.js';
import BreakGlassGrant from '../models/BreakGlassGrant.js';

/** Roles that operate across tenants and therefore may see other tenants' PHI. */
export const PLATFORM_PHI_ROLES = Object.freeze([
  'superadmin', 'super_admin', 'platform_admin',
  'support_l1', 'support_l2', 'support_agent',
  'analyst', 'auditor', 'compliance_officer',
  'finance_admin', 'catalog_manager', 'moderator', 'kyc_reviewer', 'city_manager',
]);

export const isPlatformRole = (user) => PLATFORM_PHI_ROLES.includes(String(user?.role || ''));

/** Any approved, unexpired grant the caller holds (any subject type). */
async function hasActiveGrant(req) {
  const userId = req.user?._id || req.user?.id;
  if (!userId) return false;
  try {
    const grant = await BreakGlassGrant.findOne({
      requesterId: userId,
      status: 'approved',
      expiresAt: { $gt: new Date() },
    }).select('_id reasonCode subject expiresAt');
    return grant ? { grant } : null;
  } catch {
    // A lookup failure must not turn a shadow gate into an outage: the gate
    // stays open and the request proceeds (enforcement mode decides later).
    return null;
  }
}

/**
 * The check itself: `true` = no violation.
 *
 * A platform role with no active grant WOULD be denied under the target
 * policy, so it reports a violation. The gate decides whether that becomes a
 * 403 or only an audit line.
 */
export async function platformPhiViolation(req) {
  if (!isPlatformRole(req.user)) return false;
  const grant = await hasActiveGrant(req);
  if (grant) {
    req.breakGlass = grant.grant;
    return false;
  }
  return true;
}

/**
 * Middleware for a PHI route. `module` names the rollout lane so a single
 * module can be enforced on its own.
 */
export const platformPhiGate = (module = 'phi-platform') => shadowGate(module, platformPhiViolation);

export default platformPhiGate;
