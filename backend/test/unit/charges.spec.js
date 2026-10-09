/**
 * File 22 P0-4: charge posting doorway. ChargeItem model mocked.
 */
import { jest } from '@jest/globals';

const findOne = jest.fn();
const create = jest.fn();
const save = jest.fn();

jest.unstable_mockModule('../../src/models/ChargeItem.js', () => ({
  default: { findOne, create },
}));

jest.unstable_mockModule('../../src/models/Admission.js', () => ({
  default: { findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }) },
}));

const { postCharge, trueUpCharge, openAdmissionFor } = await import('../../src/lib/charges.js');

// Mocked findOne returns a lean-able query stub like the harness `query()`.
const leanValue = (value) => ({ lean: () => Promise.resolve(value) });

describe('postCharge', () => {
  test('posts a fresh line with computed amount', async () => {
    findOne.mockReset().mockReturnValue(leanValue(null));
    create.mockReset().mockImplementation(async (doc) => ({ _id: 'c1', save, ...doc }));
    const { charge, deduped } = await postCharge({
      hospitalId: 'h1', patientId: 'p1', source: 'lab',
      sourceRef: { model: 'LabOrder', id: 'o1' },
      description: 'Lab: CBC', qty: 2, unitPrice: 150,
    });
    expect(deduped).toBe(false);
    expect(charge.amount).toBe(300);
    expect(create.mock.calls[0][0]).toMatchObject({ source: 'lab', status: 'Pending' });
  });

  test('re-post for the same ref+description dedupes', async () => {
    findOne.mockReset().mockReturnValue(leanValue({ _id: 'c0', amount: 300 }));
    create.mockReset();
    const { charge, deduped } = await postCharge({
      hospitalId: 'h1', source: 'lab',
      sourceRef: { model: 'LabOrder', id: 'o1' }, description: 'Lab: CBC',
    });
    expect(deduped).toBe(true);
    expect(charge._id).toBe('c0');
    expect(create).not.toHaveBeenCalled();
  });

  test('different description on same ref posts separately', async () => {
    findOne.mockReset().mockReturnValue(leanValue(null));
    create.mockReset().mockImplementation(async (doc) => ({ _id: 'c2', ...doc }));
    const { deduped } = await postCharge({
      hospitalId: 'h1', source: 'pharmacy',
      sourceRef: { model: 'Prescription', id: 'rx1' }, description: 'Paracetamol (dispense)',
    });
    expect(deduped).toBe(false);
  });
});

describe('openAdmissionFor', () => {
  test('null-safe without ids', async () => {
    expect(await openAdmissionFor(null, 'p1')).toBeNull();
    expect(await openAdmissionFor('h1', null)).toBeNull();
  });
});

describe('trueUpCharge', () => {
  test('returns null when no placeholder line exists', async () => {
    findOne.mockReset().mockResolvedValue(null);
    const row = await trueUpCharge({
      hospitalId: 'h1', source: 'pharmacy', sourceRef: {}, description: 'X',
    });
    expect(row).toBeNull();
  });
});
