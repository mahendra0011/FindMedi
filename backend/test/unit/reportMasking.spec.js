/**
 * File 22 P2-36: PHI masking (clinical sees clear, others masked).
 * Separate file because importing the runner top-level in a harness spec
 * would poison the mock registry with real dataset models.
 */
import { maskRow, maskValue } from '../../src/lib/reportRunner.js';

describe('maskRow', () => {
  const row = { _id: 'x', patient: 'Ramesh Kumar', status: 'Pending' };

  test('clinical roles see cleartext', () => {
    expect(maskRow('bills_unpaid', row, 'doctor').patient).toBe('Ramesh Kumar');
    expect(maskRow('bills_unpaid', row, 'hospital_admin').patient).toBe('Ramesh Kumar');
    expect(maskRow('lab_critical', { patientName: 'Sita' }, 'nurse').patientName).toBe('Sita');
  });

  test('non-clinical roles get masked PHI, non-PHI untouched', () => {
    const m = maskRow('bills_unpaid', row, 'accountant');
    expect(m.patient).not.toBe('Ramesh Kumar');
    expect(m.patient).toBe(maskValue('Ramesh Kumar'));
    expect(m.status).toBe('Pending');
    expect(m._id).toBe('x');
  });

  test('unknown dataset/column passes through', () => {
    expect(maskRow('nope', row, 'accountant')).toEqual(row);
  });
});
