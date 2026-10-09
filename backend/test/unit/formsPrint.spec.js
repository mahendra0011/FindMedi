/**
 * File 14: form engine parity + injection resistance, print lint, doc seal.
 * Schema→zod parity, formula sandbox, showIf fail-closed, tamper-evident seal.
 */
import { describe, it, expect } from '@jest/globals';
import { schemaFromTemplate, evalFormula, evalCondition, bandFor } from '../../src/lib/formEngine.js';
import { lintTemplate } from '../../src/lib/printEngine.js';
import { sealDoc, verifySeal } from '../../src/lib/docSeal.js';
import { PRIORITY_WEIGHT } from '../../src/models/Queue.js';

const TEMPLATE = {
  definition: {
    sections: [{
      id: 's1',
      fields: [
        { id: 'age', type: 'number', label: 'Age', required: true, min: 0, max: 120 },
        { id: 'pain', type: 'scale', label: 'Pain', min: 0, max: 10 },
        { id: 'guardian', type: 'text', label: 'Guardian', requiredIf: { '<': [{ var: 'age' }, 18] } },
        { id: 'bmi', type: 'calculated', label: 'BMI', formula: 'weight / ((height/100) * (height/100))' },
      ],
    }],
  },
  scoring: [{ id: 'painBand', formula: 'pain', bands: [{ from: 0, to: 3, label: 'Mild', color: 'green' }, { from: 4, to: 10, label: 'High', color: 'red' }] }],
};

describe('form engine parity + injection resistance', () => {
  it('validates required + requiredIf the same way twice', () => {
    const schema = schemaFromTemplate(TEMPLATE);
    expect(schema.safeParse({ age: 30 }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ age: 10 }).success).toBe(false); // guardian requiredIf
    expect(schema.safeParse({ age: 10, guardian: 'Mom' }).success).toBe(true);
  });

  it('rejects formula injection, computes real math', () => {
    expect(evalFormula('weight / ((height/100) * (height/100))', { weight: 70, height: 175 })).toBeCloseTo(22.86, 1);
    expect(evalFormula('process.exit(1)', {})).toBeNull();
    expect(evalFormula('a; require("fs")', { a: 1 })).toBeNull();
    expect(evalFormula('__proto__.x', {})).toBeNull();
    expect(evalFormula('', {})).toBeNull();
  });

  it('fails closed on unknown condition ops', () => {
    expect(evalCondition({ exec: 'x' }, {})).toBe(false);
    expect(evalCondition({ '==': [{ var: 'a' }, 1] }, { a: 1 })).toBe(true);
    expect(bandFor([{ from: 0, to: 3, label: 'Mild' }], 2)?.label).toBe('Mild');
    expect(bandFor([], 2)).toBeNull();
  });
});

describe('print lint + doc seal', () => {
  it('blocks unknown template variables, allows helpers', () => {
    expect(lintTemplate('bill', 'Total {{bill.amount}} ({{inWords bill.amount}})')).toEqual([]);
    const unknown = lintTemplate('bill', 'Pay {{hacker.field}} {{bill.amount}}');
    expect(unknown).toContain('hacker.field');
  });

  it('seals and detects tampering', () => {
    const s = sealDoc('consent', 'abc123', Buffer.from('bytes'));
    expect(verifySeal({ digest: s.digest, signature: s.signature, nonce: s.nonce })).toBe(true);
    expect(verifySeal({ digest: 'tampered', signature: s.signature, nonce: s.nonce })).toBe(false);
    expect(verifySeal({ digest: s.digest, signature: s.signature, nonce: 'wrong' })).toBe(false);
  });
});

describe('queue priority order', () => {
  it('orders Emergency first, Walkin last', () => {
    const order = Object.entries(PRIORITY_WEIGHT).sort((a, b) => a[1] - b[1]).map(([k]) => k);
    expect(order[0]).toBe('Emergency');
    expect(order[order.length - 1]).toBe('Walkin');
  });
});
