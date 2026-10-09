/**
 * File 22 P1-11: ASTM framing + Westgard rules (pure, no DB).
 */
import { parseAstmFrame } from '../../src/lib/astm.js';
import { westgardFlags } from '../../src/models/QcRun.js';

const STX = '\x02';
const ETX = '\x03';
const CR = '\r';
const LF = '\n';

function frame(records) {
  // records: array of record strings (without framing)
  return records.map((r, i) => {
    const body = `${i + 1}${r}`;
    const cs = '00'; // checksum content irrelevant to the parser
    return `${STX}${body}${ETX}${cs}${CR}${LF}`;
  }).join('');
}

describe('parseAstmFrame', () => {
  test('parses H/O/R/L records', () => {
    const f = frame([
      'H|\\^&|||MyAnalyzer|||||||||E1394-97',
      'O|1|SMP42|^^^GLU|R',
      'R|1|^^^GLU|126|mg/dL|70-100|H||||F||20261009120000',
      'L|1|N',
    ]);
    const out = parseAstmFrame(f);
    expect(out.errors).toEqual([]);
    expect(out.header.sender).toBe('MyAnalyzer');
    expect(out.orders).toEqual([{ sampleId: 'SMP42', testCode: 'GLU', priority: 'R' }]);
    expect(out.results[0]).toMatchObject({
      testCode: 'GLU', value: '126', units: 'mg/dL', refRange: '70-100', flag: 'H',
    });
  });

  test('rejects garbage without STX', () => {
    expect(parseAstmFrame('hello').errors).toEqual(['no STX']);
  });
});

describe('westgardFlags', () => {
  test('1-2s warning, 1-3s rejection, R-4s range', () => {
    expect(westgardFlags(100, 100, 2, 100)).toEqual([]);
    expect(westgardFlags(105, 100, 2, 100)).toEqual(['1-2s']);
    expect(westgardFlags(107, 100, 2, 100)).toEqual(['1-3s']);
    expect(westgardFlags(104, 100, 1, 96)).toEqual(expect.arrayContaining(['R-4s']));
  });
  test('zero sd never flags', () => {
    expect(westgardFlags(999, 100, 0, null)).toEqual([]);
  });
});
