/**
 * File 22 P1-20: scored selects ("3 — ≤8" → 3) feed formulas; bands classify.
 */
import { scoreValues, computeTemplate, bandFor } from '../../src/lib/formEngine.js';

const news2 = {
  definition: {
    sections: [{
      id: 's1', fields: [
        { id: 'resp', type: 'select' }, { id: 'spo2', type: 'select' },
        { id: 'oxygen', type: 'select' }, { id: 'consc', type: 'select' },
      ],
    }],
  },
  scoring: [{
    id: 'news2', formula: 'resp + spo2 + oxygen + consc',
    bands: [
      { from: 0, to: 4, label: 'Low', color: 'green' },
      { from: 5, to: 6, label: 'Medium', color: 'amber' },
      { from: 7, to: 100, label: 'High', color: 'red' },
    ],
  }],
};

describe('scoreValues', () => {
  test('parses leading numbers, leaves text answers out', () => {
    const out = scoreValues(news2, { resp: '3 — ≤8', spo2: '0 — ≥96', oxygen: 'No', cons: 'x' });
    expect(out.resp).toBe(3);
    expect(out.spo2).toBe(0);
    expect(out.oxygen).toBe('No');
  });
});

describe('computeTemplate scoring', () => {
  test('NEWS2 sums to band', () => {
    const { scores } = computeTemplate(news2, {
      resp: '3 — ≤8', spo2: '2 — 92–93', oxygen: '2 — Yes', consc: '0 — Alert',
    });
    expect(scores.news2.value).toBe(7);
    expect(scores.news2.band).toBe('High');
  });

  test('missing answers refuse instead of guessing', () => {
    const { scores } = computeTemplate(news2, { resp: '3 — ≤8' });
    expect(scores.news2).toBeUndefined();
  });

  test('bandFor boundaries', () => {
    expect(bandFor([{ from: 0, to: 4, label: 'Low' }], 4).label).toBe('Low');
    expect(bandFor([{ from: 0, to: 4, label: 'Low' }], 5)).toBeNull();
  });
});
