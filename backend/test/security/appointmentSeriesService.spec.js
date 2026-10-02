/**
 * APPT-M-02 - recurring appointment series (service contracts).
 *
 * The design's load-bearing rules, each a way the feature could silently do
 * harm:
 *
 *   - THE SERIES IS A CONTAINER: every occurrence is a real Appointment child
 *     (seriesId + seriesIndex) created up front, so queueing, reminders,
 *     billing, per-occurrence cancel/reschedule and waitlist fan-out keep
 *     working without knowing what a "series" is.
 *   - OCCURRENCE MATH is UTC and calendar-correct: weekly +7d, biweekly +14d,
 *     monthly keeps the start day-of-month and CLAMPS to shorter months
 *     (Jan 31 -> Feb 28/29) - a naive setDate(31) silently skips February.
 *   - CAPACITY per occurrence is the atomic reservation (compare-and-set), the
 *     same primitive walk-in and reschedule use; any failed claim hands back
 *     every seat already taken so the slot ledger never runs ahead of data.
 *   - CHILDREN are Pending with the normal 15-minute checkout hold: money moves
 *     through the EXISTING checkout (referenceId pay loop) and an abandoned
 *     series dies via the existing stale sweeps. No second expiry mechanism.
 *   - BULK CANCEL bypasses the per-row transition logic in routes/appointments.js
 *     (release + onSlotFreed), so cancelSeries applies both itself - and only
 *     for seats actually given back (terminal children already released).
 *
 * Models are module-mocked here; route/validation/audit behaviour lives in
 * appointmentSeries.spec.js.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ---- doubles (registered before any src import - ESM mock contract) ----

const seriesStub = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
};
jest.unstable_mockModule('../../src/models/AppointmentSeries.js', () => ({ default: seriesStub }));

const apptStub = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
  updateMany: jest.fn(),
  countDocuments: jest.fn(),
};
jest.unstable_mockModule('../../src/models/Appointment.js', () => ({ default: apptStub }));

const doctorStub = { findById: jest.fn() };
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: doctorStub }));

const reserveMock = jest.fn();
const releaseMock = jest.fn();
jest.unstable_mockModule('../../src/services/slotCapacity.js', () => ({
  reserveSlotSeat: reserveMock,
  releaseSlotSeat: releaseMock,
}));

const onSlotFreedMock = jest.fn();
jest.unstable_mockModule('../../src/services/waitlistService.js', () => ({
  onSlotFreed: onSlotFreedMock,
}));

const tokenMock = jest.fn();
jest.unstable_mockModule('../../src/utils/idGenerator.js', () => ({
  generateTokenNumber: tokenMock,
}));

const svc = await import('../../src/services/appointmentSeriesService.js');

/** mongoose-like chainable thenable: any method returns itself, await resolves. */
const q = (value) => {
  const chain = {
    select: () => chain, populate: () => chain, sort: () => chain,
    limit: () => chain, skip: () => chain, lean: () => chain, exec: () => chain,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return chain;
};

const DOCTOR = {
  _id: '64b0000000000000000000d1',
  name: 'Dr Asha',
  specialization: 'Cardiology',
  hospitalId: '64b0000000000000000000a1',
  maxBookingsPerSlot: 2,
};
const PATIENT = { _id: '64b0000000000000000000p1', name: 'Ravi' };
const BASE = {
  patientId: PATIENT._id,
  patientName: 'Ravi',
  doctorId: DOCTOR._id,
  date: '2026-10-05',
  time: '10:00',
  frequency: 'weekly',
  count: 3,
  feesPerOccurrence: 500,
};

let saveMock;
const makeSeries = (doc) => {
  saveMock = jest.fn().mockResolvedValue(doc);
  return { _id: '64b0000000000000000000s1', save: saveMock, ...doc };
};

beforeEach(() => {
  // resetAllMocks, not clearAllMocks: implementations set by one scenario
  // (mockReturnValue/Once queues) must not leak into the next.
  jest.resetAllMocks();
  tokenMock.mockReturnValue('TOK-1');
  reserveMock.mockResolvedValue({ ok: true, count: 1 });
  releaseMock.mockResolvedValue(true);
  onSlotFreedMock.mockResolvedValue(undefined);
  apptStub.create.mockImplementation((doc) => Promise.resolve({ _id: `appt-${doc.seriesIndex}`, ...doc }));
  seriesStub.create.mockImplementation((doc) => Promise.resolve(makeSeries({ occurrenceIds: [], ...doc })));
});

describe('computeOccurrences', () => {
  it('weekly steps 7 days from the start date', () => {
    expect(svc.computeOccurrences('2026-10-05', 'weekly', 3))
      .toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it('biweekly steps 14 days', () => {
    expect(svc.computeOccurrences('2026-10-05', 'biweekly', 2))
      .toEqual(['2026-10-05', '2026-10-19']);
  });

  it('monthly keeps day-of-month across a year rollover', () => {
    expect(svc.computeOccurrences('2026-11-15', 'monthly', 3))
      .toEqual(['2026-11-15', '2026-12-15', '2027-01-15']);
  });

  it('monthly CLAMPS to the last day of shorter months (Jan 31 series)', () => {
    expect(svc.computeOccurrences('2026-01-31', 'monthly', 4))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('rejects an impossible calendar date with 422 BAD_DATE', () => {
    expect(() => svc.computeOccurrences('2026-02-30', 'weekly', 2))
      .toThrow(expect.objectContaining({ status: 422, code: 'BAD_DATE' }));
  });

  it('rejects a non-enum frequency with 422 BAD_FREQUENCY', () => {
    expect(() => svc.computeOccurrences('2026-10-05', 'yearly', 2))
      .toThrow(expect.objectContaining({ status: 422, code: 'BAD_FREQUENCY' }));
  });
});

describe('createSeries', () => {
  it('404s when the doctor does not exist', async () => {
    doctorStub.findById.mockReturnValue(q(null));
    await expect(svc.createSeries(BASE)).rejects.toMatchObject({ status: 404, code: 'DOCTOR_NOT_FOUND' });
    expect(seriesStub.create).not.toHaveBeenCalled();
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it.each([
    ['too few', 1],
    ['too many', 13],
    ['not an integer', 2.5],
  ])('422s on count that is %s', async (_label, count) => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    await expect(svc.createSeries({ ...BASE, count })).rejects.toMatchObject({ status: 422, code: 'BAD_COUNT' });
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it('409s when the patient already holds one of the occurrence slots', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.find.mockReturnValue(q([{ date: '2026-10-12' }]));
    await expect(svc.createSeries(BASE)).rejects.toMatchObject({ status: 409, code: 'ALREADY_BOOKED' });
    expect(reserveMock).not.toHaveBeenCalled();
    expect(seriesStub.create).not.toHaveBeenCalled();
  });

  it('409s on a full occurrence and releases the seats already claimed', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.find.mockReturnValue(q([]));
    reserveMock
      .mockResolvedValueOnce({ ok: true, count: 1 })
      .mockResolvedValueOnce({ ok: false, reason: 'full', count: 2 });

    await expect(svc.createSeries(BASE)).rejects.toMatchObject({ status: 409, code: 'SLOT_FULL' });
    // First seat was claimed - it must be handed back (the ledger never runs ahead).
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(releaseMock).toHaveBeenCalledWith({ doctorId: DOCTOR._id, date: '2026-10-05', time: '10:00' });
    expect(seriesStub.create).not.toHaveBeenCalled();
    expect(apptStub.create).not.toHaveBeenCalled();
  });

  it('creates the container plus one Pending child per occurrence with holds and indexes', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.find.mockReturnValue(q([]));

    const { series, appointments } = await svc.createSeries(BASE);

    expect(reserveMock).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i += 1) {
      expect(reserveMock).toHaveBeenNthCalledWith(i + 1, {
        doctorId: DOCTOR._id,
        date: ['2026-10-05', '2026-10-12', '2026-10-19'][i],
        time: '10:00',
        capacity: 2,
      });
    }

    expect(seriesStub.create).toHaveBeenCalledTimes(1);
    const seriesDoc = seriesStub.create.mock.calls[0][0];
    expect(seriesDoc).toMatchObject({
      patientId: PATIENT._id,
      doctorId: DOCTOR._id,
      frequency: 'weekly',
      count: 3,
      startDate: '2026-10-05',
      occurrenceDates: ['2026-10-05', '2026-10-12', '2026-10-19'],
      feesPerOccurrence: 500,
      totalFees: 1500,
      status: 'active',
    });

    expect(apptStub.create).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i += 1) {
      const child = apptStub.create.mock.calls[i][0];
      expect(child).toMatchObject({
        status: 'Pending',
        patientId: PATIENT._id,
        doctorId: DOCTOR._id,
        date: ['2026-10-05', '2026-10-12', '2026-10-19'][i],
        time: '10:00',
        fees: 500,
        seriesId: '64b0000000000000000000s1',
        seriesIndex: i,
      });
      // Checkout-shaped hold: the EXISTING sweeps are the only expiry mechanism.
      expect(child.checkoutExpiresAt).toBeInstanceOf(Date);
      expect(child.checkoutExpiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(child.checkoutExpiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 16 * 60 * 1000);
      expect(child.tokenNumber).toBe('TOK-1');
    }

    expect(series.occurrenceIds).toEqual(['appt-0', 'appt-1', 'appt-2']);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(appointments).toHaveLength(3);
  });

  it('rolls back children, container and ALL seats when a child create fails', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.find.mockReturnValue(q([]));
    apptStub.create
      .mockImplementationOnce((doc) => Promise.resolve({ _id: 'appt-0', ...doc }))
      .mockImplementationOnce(() => Promise.reject(new Error('db down')));
    apptStub.deleteMany.mockResolvedValue({ acknowledged: true });
    seriesStub.deleteOne.mockResolvedValue({ acknowledged: true });

    await expect(svc.createSeries(BASE)).rejects.toThrow('db down');

    expect(apptStub.deleteMany).toHaveBeenCalledWith({ seriesId: '64b0000000000000000000s1' });
    expect(seriesStub.deleteOne).toHaveBeenCalledWith({ _id: '64b0000000000000000000s1' });
    // Every claimed seat goes back, not just the ones whose children exist.
    expect(releaseMock).toHaveBeenCalledTimes(3);
  });
});

describe('listSeries', () => {
  it('returns [] for a patient with no series', async () => {
    seriesStub.find.mockReturnValue(q([]));
    expect(await svc.listSeries(PATIENT._id)).toEqual([]);
    expect(apptStub.find).not.toHaveBeenCalled();
  });

  it('groups occurrences under their series sorted by seriesIndex', async () => {
    seriesStub.find.mockReturnValue(q([
      { _id: 's1', patientId: PATIENT._id, frequency: 'weekly' },
    ]));
    apptStub.find.mockReturnValue(q([
      { seriesId: 's1', _id: 'a2', date: '2026-10-19', time: '10:00', status: 'Confirmed', fees: 500, seriesIndex: 2 },
      { seriesId: 's1', _id: 'a0', date: '2026-10-05', time: '10:00', status: 'Cancelled', fees: 500, seriesIndex: 0 },
      { seriesId: 's1', _id: 'a1', date: '2026-10-12', time: '10:00', status: 'Pending', fees: 500, seriesIndex: 1 },
    ]));

    const out = await svc.listSeries(PATIENT._id);
    expect(out).toHaveLength(1);
    expect(out[0].occurrences.map((o) => o._id)).toEqual(['a0', 'a1', 'a2']);
    expect(out[0].occurrences.map((o) => o.status)).toEqual(['Cancelled', 'Pending', 'Confirmed']);
  });
});

describe('cancelSeries', () => {
  const ACTIVE_CHILDREN = [
    { _id: 'a0', doctorId: DOCTOR._id, date: '2026-10-05', time: '10:00' },
    { _id: 'a1', doctorId: DOCTOR._id, date: '2026-10-12', time: '10:00' },
  ];

  it('404s for a series the patient does not own', async () => {
    seriesStub.findOne.mockResolvedValue(null);
    await expect(svc.cancelSeries({ seriesId: '64b0000000000000000000f9', patientId: PATIENT._id }))
      .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(apptStub.updateMany).not.toHaveBeenCalled();
  });

  it('is idempotent: a second cancel reports cancelledCount 0 and touches nothing', async () => {
    seriesStub.findOne.mockResolvedValue({
      _id: 's1', patientId: PATIENT._id, status: 'cancelled', save: jest.fn(),
    });
    const out = await svc.cancelSeries({ seriesId: 's1', patientId: PATIENT._id });
    expect(out.cancelledCount).toBe(0);
    expect(apptStub.find).not.toHaveBeenCalled();
    expect(apptStub.updateMany).not.toHaveBeenCalled();
    expect(releaseMock).not.toHaveBeenCalled();
    expect(onSlotFreedMock).not.toHaveBeenCalled();
  });

  it('cancels only non-terminal children, releasing and fanning out per freed seat', async () => {
    const save = jest.fn().mockResolvedValue(true);
    seriesStub.findOne.mockResolvedValue({ _id: 's1', patientId: PATIENT._id, status: 'active', save });
    apptStub.find.mockReturnValue(q(ACTIVE_CHILDREN));
    apptStub.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const out = await svc.cancelSeries({ seriesId: 's1', patientId: PATIENT._id, reason: 'no longer needed' });

    expect(apptStub.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['a0', 'a1'] } },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'Cancelled', cancellationReason: 'no longer needed' }),
      }),
    );
    expect(releaseMock).toHaveBeenCalledTimes(2);
    expect(onSlotFreedMock).toHaveBeenCalledTimes(2);
    expect(onSlotFreedMock).toHaveBeenCalledWith({ doctorId: DOCTOR._id, date: '2026-10-05', time: '10:00' });
    expect(save).toHaveBeenCalledTimes(1);
    expect(out.cancelledCount).toBe(2);
    expect(out.series.status).toBe('cancelled');
  });

  it('still marks the series cancelled when every occurrence is already terminal', async () => {
    const save = jest.fn().mockResolvedValue(true);
    seriesStub.findOne.mockResolvedValue({ _id: 's1', patientId: PATIENT._id, status: 'active', save });
    apptStub.find.mockReturnValue(q([]));

    const out = await svc.cancelSeries({ seriesId: 's1', patientId: PATIENT._id });

    expect(out.cancelledCount).toBe(0);
    expect(apptStub.updateMany).not.toHaveBeenCalled();
    // Terminal children already released their seats when they turned terminal -
    // releasing again would double-count a seat that never existed.
    expect(releaseMock).not.toHaveBeenCalled();
    expect(onSlotFreedMock).not.toHaveBeenCalled();
    expect(out.series.status).toBe('cancelled');
  });
});
