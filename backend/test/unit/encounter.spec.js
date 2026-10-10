/**
 * File 22 P0-3: encounter auto-create idempotency. Encounter model mocked;
 * the lib under test is real.
 */
import { jest } from '@jest/globals';

const findOne = jest.fn();
const create = jest.fn();
const apptFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule('../../src/models/Encounter.js', () => ({
  default: { findOne, create },
}));

jest.unstable_mockModule('../../src/models/Appointment.js', () => ({
  default: { findByIdAndUpdate: (...a) => apptFindByIdAndUpdate(...a) },
}));

const { ensureEncounter, backfillAppointmentPrescription } = await import('../../src/lib/encounter.js');

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

describe('backfillAppointmentPrescription', () => {
  test('writes prescriptionId onto the appointment', async () => {
    apptFindByIdAndUpdate.mockReset().mockResolvedValue({ _id: 'a1', prescriptionId: 'rx1' });
    const row = await backfillAppointmentPrescription('a1', 'rx1');
    expect(row.prescriptionId).toBe('rx1');
    expect(apptFindByIdAndUpdate).toHaveBeenCalledWith('a1', { $set: { prescriptionId: 'rx1' } });
  });

  test('no-ops without an appointment or prescription id', async () => {
    apptFindByIdAndUpdate.mockReset();
    expect(await backfillAppointmentPrescription(null, 'rx1')).toBeNull();
    expect(await backfillAppointmentPrescription('a1', null)).toBeNull();
    expect(apptFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});
