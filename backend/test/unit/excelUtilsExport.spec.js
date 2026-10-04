import { exportToCSV } from '../../src/utils/excelUtils.js';

describe('CSV spreadsheet formula neutralization', () => {
  test.each(['=1+1', '+SUM(A1:A2)', '-2+3', '@SUM(A1)'])(
    'prefixes spreadsheet formula text %s', (value) => {
      const csv = exportToCSV([{ value }], ['value']);
      expect(csv).toContain(`'${value}`);
    },
  );

  test('prefixes a whitespace-prefixed formula before CSV quote escaping', () => {
    const csv = exportToCSV([{ value: '  =HYPERLINK("https://attacker.test")' }], ['value']);
    expect(csv).toContain("'  =HYPERLINK(");
    expect(csv).toContain('attacker.test');
  });

  test('does not rewrite numeric negative values', () => {
    const csv = exportToCSV([{ value: -12 }], ['value']);
    expect(csv).toContain('-12');
    expect(csv).not.toContain("'-12");
  });
});
