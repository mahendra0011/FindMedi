/**
 * File 22 P0-1: approval wiring helpers. Pure functions (unit-tested) so
 * every money-moving route enforces the SAME rule:
 *
 *  - over-policy amounts need an APPROVED ApprovalRequest (consumed once);
 *  - the requester can NEVER decide their own request (self-approval block);
 *  - thresholds come from the hospital's ApprovalPolicy, else these defaults.
 */
export const APPROVAL_DEFAULTS = {
  'billing-discount': { pct: 10, roles: ['hospital_admin'] },
  'credit-note': { amount: 5000, roles: ['hospital_admin'] },
  expense: { amount: 10000, roles: ['hospital_admin'] },
  'purchase-order': { amount: 25000, roles: ['hospital_admin'] },
  'stock-adjust': { qty: 100, roles: ['hospital_admin'] },
  'discharge-waiver': { amount: 1, roles: ['hospital_admin'] }, // any dues waiver needs eyes
};

/** Await a query that may fail (no DB in harness) — null instead of throw. */
export async function safeFirst(queryPromise) {
  try {
    return await queryPromise;
  } catch {
    return null;
  }
}

/** Discount % of a bill (0 when no base). */
export function discountPct({ amount, subTotal, discount }) {
  const base = Number(amount ?? subTotal ?? 0);
  const d = Number(discount ?? 0);
  if (!(base > 0) || !(d > 0)) return 0;
  return (d / base) * 100;
}

/** True when pct exceeds the caller's DiscountPolicy max (or default). */
export function overDiscountPolicy(pct, policy, role) {
  if (policy && policy.role === role) return pct > Number(policy.maxPercent ?? 0);
  if (policy && !policy.role) return pct > Number(policy.maxPercent ?? 0);
  return pct > APPROVAL_DEFAULTS['billing-discount'].pct;
}

/** Who must approve when over policy (policy approverRole or default). */
export function approverRolesFor(policy, policyKey) {
  if (policy?.approverRole) return [policy.approverRole];
  if (Array.isArray(policy?.roles) && policy.roles.length) return policy.roles;
  return APPROVAL_DEFAULTS[policyKey]?.roles || ['hospital_admin'];
}

/** True when the decider IS the requester — always forbidden. */
export function isSelfApproval(requestedBy, actorId) {
  if (!requestedBy || !actorId) return false;
  return String(requestedBy) === String(actorId);
}

/**
 * Resolve the effective threshold for a policyKey: the hospital's active
 * ApprovalPolicy tier (lowest `min` wins for limit purposes) else defaults.
 * Returns { limit, roles, policyFound }.
 */
export function resolveThreshold(policy, policyKey) {
  const fb = APPROVAL_DEFAULTS[policyKey] || { amount: 0, roles: ['hospital_admin'] };
  if (!policy) return { limit: fb.amount ?? fb.pct ?? fb.qty ?? 0, roles: fb.roles, policyFound: false };
  const tiers = [...(policy.tiers || [])].sort((a, b) => Number(a.min) - Number(b.min));
  const first = tiers[0];
  const limit = first ? Number(first.min) : (fb.amount ?? fb.pct ?? fb.qty ?? 0);
  const roles = first?.roles?.length ? first.roles : approverRolesFor(policy, policyKey);
  return { limit, roles, policyFound: true };
}
