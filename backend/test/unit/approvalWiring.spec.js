/**
 * File 22 P0-1: pure approval-wiring helpers. No DB, no routes.
 */
import {
  APPROVAL_DEFAULTS, discountPct, overDiscountPolicy, approverRolesFor,
  isSelfApproval, resolveThreshold,
} from '../../src/lib/approvalWiring.js';

describe('discountPct', () => {
  test('computes percent of amount', () => {
    expect(discountPct({ amount: 1000, discount: 150 })).toBeCloseTo(15);
  });
  test('zero-safe', () => {
    expect(discountPct({ amount: 0, discount: 50 })).toBe(0);
    expect(discountPct({})).toBe(0);
  });
});

describe('overDiscountPolicy', () => {
  test('role policy max wins', () => {
    expect(overDiscountPolicy(15, { role: 'receptionist', maxPercent: 10 }, 'receptionist')).toBe(true);
    expect(overDiscountPolicy(5, { role: 'receptionist', maxPercent: 10 }, 'receptionist')).toBe(false);
  });
  test('no policy falls back to default 10%', () => {
    expect(overDiscountPolicy(15, null, 'receptionist')).toBe(true);
    expect(overDiscountPolicy(10, null, 'receptionist')).toBe(false);
  });
});

describe('approverRolesFor', () => {
  test('policy approverRole first, then defaults', () => {
    expect(approverRolesFor({ approverRole: 'finance_admin' }, 'billing-discount')).toEqual(['finance_admin']);
    expect(approverRolesFor(null, 'billing-discount')).toEqual(APPROVAL_DEFAULTS['billing-discount'].roles);
  });
});

describe('isSelfApproval', () => {
  test('same id (either key) is self-approval', () => {
    expect(isSelfApproval('u1', 'u1')).toBe(true);
    expect(isSelfApproval('u1', 'u2')).toBe(false);
    expect(isSelfApproval(null, 'u2')).toBe(false);
  });
});

describe('resolveThreshold', () => {
  test('no policy returns defaults', () => {
    const r = resolveThreshold(null, 'credit-note');
    expect(r.limit).toBe(APPROVAL_DEFAULTS['credit-note'].amount);
    expect(r.policyFound).toBe(false);
  });
  test('policy lowest tier wins', () => {
    const r = resolveThreshold({ tiers: [{ min: 20000, roles: ['cfo'] }, { min: 5000, roles: ['finance_admin'] }] }, 'credit-note');
    expect(r.limit).toBe(5000);
    expect(r.roles).toEqual(['finance_admin']);
    expect(r.policyFound).toBe(true);
  });
});
