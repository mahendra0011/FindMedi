/**
 * File 14: form engine parity + injection resistance, print lint, doc seal.
 * Schema→zod parity, formula sandbox, showIf fail-closed, tamper-evident seal.
 */
import { describe, it, expect } from '@jest/globals';
import { schemaFromTemplate, evalFormula, evalCondition, bandFor } from '../../src/lib/formEngine.js';
import { lintTemplate } from '../../src/lib/printEngine.js';
import { sealDoc, verifySeal } from '../../src/lib/docSeal.js';
import { PRIORITY_WEIGHT } from '../../src/models/Queue.js';
import { parseHl7, isCriticalFlag } from '../../src/lib/hl7.js';

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

describe('HL7 mini-parser (fail-closed)', () => {
  const MSG = 'MSH|^~\\&|ANALYZER|LAB|HMS|HOSP|202610090900||ORU^R01|M1|P|2.5\r'
    + 'PID|||PAT-77||Sharma^Rahul\r'
    + 'OBR|1|LAB-99||CBC\r'
    + 'OBX|1|NM|WBC^White cells||13.2|10^9/L|4.0-11.0|HH\r'
    + 'OBX|2|NM|HGB^Hemoglobin||9.1|g/dL|13-17|L\r';

  it('parses ORU results with order links and flags', () => {
    const p = parseHl7(MSG);
    expect(p.ok).toBe(true);
    expect(p.orders).toEqual([{ setId: '1', orderId: 'LAB-99', test: 'CBC' }]);
    expect(p.results).toHaveLength(2);
    expect(p.results[0]).toMatchObject({ code: 'WBC', value: '13.2', flag: 'HH' });
    expect(isCriticalFlag('HH')).toBe(true);
    expect(isCriticalFlag('L')).toBe(false);
    expect(isCriticalFlag('N')).toBe(false);
  });

  it('rejects non-HL7 and unsupported types', () => {
    expect(parseHl7('hello').ok).toBe(false);
    expect(parseHl7(null).ok).toBe(false);
    expect(parseHl7('MSH|^~\\&|A|B|C|D|E||ADT^A08|X|P|2.5').ok).toBe(true);
  });
});

describe('queue priority order', () => {
  it('orders Emergency first, Walkin last', () => {
    const order = Object.entries(PRIORITY_WEIGHT).sort((a, b) => a[1] - b[1]).map(([k]) => k);
    expect(order[0]).toBe('Emergency');
    expect(order[order.length - 1]).toBe('Walkin');
  });
});
