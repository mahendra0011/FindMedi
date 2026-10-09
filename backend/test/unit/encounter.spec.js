/**
 * File 22 P0-3: encounter auto-create idempotency. Encounter model mocked;
 * the lib under test is real.
 */
import { jest } from '@jest/globals';

const findOne = jest.fn();
const create = jest.fn();

jest.unstable_mockModule('../../src/models/Encounter.js', () => ({
  default: { findOne, create },
}));

const { ensureEncounter } = await import('../../src/lib/encounter.js');

describe('ensureEncounter', () => {
  test('reuses the open same-appointment encounter', async () => {
    findOne.mockReset().mockResolvedValue({ _id: 'enc-old' });
    create.mockReset();
    const enc = await ensureEncounter({ hospitalId: 'h1', appointmentId: 'a1' });
    expect(enc._id).toBe('enc-old');
    expect(create).not.toHaveBeenCalled();
  });

  test('creates when none open, linking all refs', async () => {
    findOne.mockReset().mockResolvedValue(null);
    create.mockReset().mockImplementation(async (doc) => ({ _id: 'enc-new', ...doc }));
    const enc = await ensureEncounter({
      hospitalId: 'h1', patientId: 'p1', type: 'ER', emergencyId: 'e1',
    });
    expect(enc._id).toBe('enc-new');
    expect(create.mock.calls[0][0]).toMatchObject({
      hospitalId: 'h1', patientId: 'p1', type: 'ER', emergencyId: 'e1', status: 'Open',
    });
  });

  test('walk-in (no source refs) always creates', async () => {
    findOne.mockReset();
    create.mockReset().mockImplementation(async (doc) => ({ _id: 'enc-w', ...doc }));
    await ensureEncounter({ hospitalId: 'h1', patientId: 'p1' });
    expect(findOne).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });
});
