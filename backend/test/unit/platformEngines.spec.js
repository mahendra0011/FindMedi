/**
 * File 13 §13.1/§13.2/§13.5/§13.6: pure-logic tests for the platform engines.
 * No DB: workflow validator + transition table, rule DNF matcher, approval
 * tier selection, field masks.
 */
import { validateDefinition, guardPasses, fireTransition } from '../../src/lib/workflowEngine.js';
import { ruleMatches } from '../../src/lib/ruleEngine.js';
import { selectTier } from '../../src/routes/approvals.js';
import { applyFieldMask, maskField } from '../../src/lib/fieldMask.js';

const DEF = {
  states: [
    { id: 's0', type: 'start' },
    { id: 's1', type: 'task' },
    { id: 's2', type: 'end' },
  ],
  transitions: [
    { from: 's0', to: 's1', event: 'submit' },
    { from: 's1', to: 's2', event: 'approve', guard: { roles: ['hospital_admin'] } },
  ],
};

describe('workflowEngine.validateDefinition', () => {
  test('accepts a well-formed graph', () => {
    expect(validateDefinition(DEF)).toEqual([]);
  });
  test('flags orphan + unreachable + dead-end states', () => {
    const bad = {
      states: [
        { id: 'a', type: 'start' },
        { id: 'b', type: 'task' },
        { id: 'c', type: 'end' },
        { id: 'iso', type: 'task' },
      ],
      transitions: [
        { from: 'a', to: 'zzz', event: 'go' },
        { from: 'a', to: 'b', event: 'next' },
      ],
    };
    const errors = validateDefinition(bad);
    expect(errors.join('|')).toMatch(/orphan/);
    expect(errors.join('|')).toMatch(/unreachable state iso/);
    expect(errors.join('|')).toMatch(/dead-end state b/);
  });
});

describe('workflowEngine.fireTransition', () => {
  test('fires unguarded transition', () => {
    const out = fireTransition(DEF, { state: 's0', activeStates: ['s0'] }, 'submit', { role: 'nurse' }, () => false);
    expect(out.to).toBe('s1');
  });
  test('denies guard when role missing', () => {
    expect(() => fireTransition(DEF, { state: 's1', activeStates: ['s1'] }, 'approve', { role: 'nurse' }, () => false))
      .toThrow(/Guard denied/);
  });
  test('passes guard for allowed role', () => {
    const out = fireTransition(DEF, { state: 's1', activeStates: ['s1'] }, 'approve', { role: 'hospital_admin' }, () => false);
    expect(out.to).toBe('s2');
  });
  test('throws NO_TRANSITION for unknown event', () => {
    try {
      fireTransition(DEF, { state: 's0', activeStates: ['s0'] }, 'nope', {}, () => false);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('NO_TRANSITION');
    }
  });
});

describe('workflowEngine.guardPasses', () => {
  test('open guard passes', () => { expect(guardPasses(null, {}, () => false)).toBe(true); });
  test('permission allowlist works', () => {
    expect(guardPasses({ permissions: ['billing:write'] }, {}, (p) => p === 'billing:write')).toBe(true);
  });
});

describe('ruleEngine.ruleMatches', () => {
  const rule = { groups: [[{ field: 'balance', op: '>', value: 0 }, { field: 'status', op: '=', value: 'Overdue' }], [{ field: 'status', op: '=', value: 'Partial' }]] };
  test('AND group matches', () => {
    expect(ruleMatches(rule, { balance: 100, status: 'Overdue' })).toBe(true);
  });
  test('second OR group matches', () => {
    expect(ruleMatches(rule, { balance: 0, status: 'Partial' })).toBe(true);
  });
  test('no group matches', () => {
    expect(ruleMatches(rule, { balance: 0, status: 'Paid' })).toBe(false);
  });
  test('contains + between ops', () => {
    expect(ruleMatches({ groups: [[{ field: 'name', op: 'contains', value: 'ram' }]] }, { name: 'Ramesh' })).toBe(true);
    expect(ruleMatches({ groups: [[{ field: 'n', op: 'between', value: [1, 5] }]] }, { n: 3 })).toBe(true);
  });
});

describe('approvals.selectTier', () => {
  const policy = { tiers: [{ min: 0, roles: ['a'], steps: 1 }, { min: 10000, roles: ['b'], steps: 2 }] };
  test('picks highest qualifying tier', () => {
    expect(selectTier(policy, 500).roles).toEqual(['a']);
    expect(selectTier(policy, 50000).roles).toEqual(['b']);
  });
});

describe('fieldMask', () => {
  test('masks phone for non-clinical roles, keeps for clinical', () => {
    const doc = { name: 'X', phone: '9876543210' };
    expect(applyFieldMask('Patient', doc, 'accountant').phone).not.toBe('9876543210');
    expect(applyFieldMask('Patient', doc, 'doctor').phone).toBe('9876543210');
  });
  test('maskField keeps last 4', () => {
    expect(maskField('9876543210')).toBe('••••3210');
  });
});
