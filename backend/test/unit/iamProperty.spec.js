import fc from 'fast-check';
import { guardrailsAllow, matchAction, matchResource } from '../../src/lib/iamEvaluator.js';

describe('iamEvaluator property-based', () => {
  it('T3 tenants never get clinical actions (guardrail holds for all clinical prefixes)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('wellness', 'commerce', 'community'),
        fc.constantFrom('records:read', 'prescriptions:write', 'patients:read', 'vitals:read', 'lab:read', 'radiology:read', 'nursing:read', 'ipd:read'),
        (tenantKind, action) => {
          const r = guardrailsAllow({ tenantKind, isOwner: true }, action);
          return r.ok === false;
        }
      )
    );
  });

  it('non-T3 tenants are not blanket-denied by the T3 guardrail', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('clinical', 'hospital', 'lab'),
        fc.constantFrom('records:read', 'appointments:read'),
        (tenantKind, action) => {
          const r = guardrailsAllow({ tenantKind, isOwner: true }, action);
          return r.ok === true;
        }
      )
    );
  });

  it('IAM administration requires owner', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isOwner) => {
          const r = guardrailsAllow({ tenantKind: 'clinical', isOwner }, 'iam:role-change');
          return isOwner ? r.ok === true : r.ok === false;
        }
      )
    );
  });

  it('matchAction is reflexive for exact strings', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (a) => matchAction(a, a) === true));
  });

  it('matchAction wildcard "*" matches anything', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (a) => matchAction('*', a) === true));
  });

  it('matchResource never throws and returns a boolean', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), fc.string({ maxLength: 20 }), (pattern, id) => {
        const res = { type: 'record', id, tenantId: 't1' };
        const principal = { tenantId: 't1' };
        const out = matchResource(pattern, res, principal);
        return typeof out === 'boolean';
      })
    );
  });

  it('matchResource wildcard "*" matches any resource', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (id) => {
        const res = { type: 'record', id, tenantId: 't1' };
        const principal = { tenantId: 't1' };
        return matchResource('*', res, principal) === true;
      })
    );
  });

  it('guardrailsAllow is fail-closed-ish: returns an object with ok boolean', () => {
    fc.assert(
      fc.property(fc.anything(), fc.string(), (principal, action) => {
        const r = guardrailsAllow(principal || {}, action);
        return typeof r === 'object' && typeof r.ok === 'boolean';
      })
    );
  });
});
