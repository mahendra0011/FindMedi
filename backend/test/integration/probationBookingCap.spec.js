/**
 * 2.md §6 — probation booking cap, through a real HTTP route.
 *
 * applicationToProvider seeds every new listing with
 * `probation: { active: true, bookingCap: 10, payoutHold: true }` and an
 * operator clears or tunes it via POST /providers/:id/probation. The cap is
 * enforced in routes/appointments.js wherever a booking carries a providerId
 * (the service-attribution path), reading the policy through lib/probation.js.
 *
 * What it pins:
 *  - a provider NOT on probation books exactly as before (201);
 *  - `active` with bookingCap 0 → 409 PROBATION_BOOKING_CAP, nothing created;
 *  - used < cap → 201; used >= cap → 409;
 *  - the cap count is per provider + date and excludes Cancelled bookings.
 *
 * Mock graph copied from appointmentServiceAttribution.spec.js (which this
 * guard must not disturb) plus a controllable Provider row.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const chain = (value) => {
  const q = {
    select: () => q, populate: () => q, sort: () => q, limit: () => q,
    skip: () => q, lean: () => q, exec: () => q,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return q;
};

const istSlot = (hoursFromNow) => {
  const shifted = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000 + 5.5 * 60 * 60 * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    time: `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`,
  };
};

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: jestApi.fn(async () => {}),
}));
jestApi.unstable_mockModule('../../src/services/socketService.js', () => ({
  emitAppointmentUpdate: jestApi.fn(async () => {}),
  getIO: jestApi.fn(() => null),
}));
jestApi.unstable_mockModule('../../src/services/waitlistService.js', () => ({
  onSlotFreed: jestApi.fn(async () => {}),
}));
jestApi.unstable_mockModule('../../src/services/loyaltyService.js', () => ({
  loyaltyService: { reversePoints: jestApi.fn(async () => {}) },
}));
jestApi.unstable_mockModule('../../src/services/slotCapacity.js', () => ({
  reserveSlotSeat: jestApi.fn(async () => ({ ok: true, count: 1 })),
  releaseSlotSeat: jestApi.fn(async () => ({ ok: true })),
}));
jestApi.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jestApi.fn(), warn: jestApi.fn(), error: jestApi.fn(), debug: jestApi.fn() },
}));

const created = [];
let providerDoc = null;
let usedCount = 0;
let capCountFilter = null;

jestApi.unstable_mockModule('../../src/models/Appointment.js', () => ({
  default: {
    findById: (id) => chain(null),
    findOne: () => chain(null),
    find: () => chain([]),
    create: (data) => {
      const row = { _id: `appt-${created.length + 1}`, ...data };
      row.populate = async () => row;
      created.push(row);
      return row;
    },
    countDocuments: async (filter = {}) => {
      // Only lib/probation.js counts with a providerId; the route's other
      // counts (today's OPD volume, estimated wait) stay at zero.
      if (filter?.providerId) {
        capCountFilter = filter;
        return usedCount;
      }
      return 0;
    },
  },
}));
jestApi.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { findOne: () => chain(null), findById: () => chain(null) },
}));
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { create: jestApi.fn(async () => ({})) },
}));
jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: {
    findById: () => chain({
      _id: 'doc-1', name: 'Dr Arai', consultation_fees: 600, maxBookingsPerSlot: 1,
      hospitalId: null, user_id: null, email: 'dr@clinic.test',
    }),
    find: () => chain([]),
  },
}));
jestApi.unstable_mockModule('../../src/models/Patient.js', () => ({
  default: { findOne: () => chain(null), create: jestApi.fn(async (data) => ({ _id: 'prec-1', ...data })) },
}));
let serviceRow = null;
jestApi.unstable_mockModule('../../src/models/Service.js', () => ({
  default: { findById: () => chain(serviceRow) },
}));
// lib/probation.js reads the Provider row for every provider-attributed
// booking — this is the controllable probation policy under test.
jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: {
    findById: () => query(providerDoc),
    findOne: () => query(null),
  },
}));

const USER_STUB = () => {
  const doc = { _id: 'u-admin-1', twoFactorEnabled: false };
  return {
    default: {
      findById: () => ({
        ...doc,
        select: () => Promise.resolve(doc),
        then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
      }),
      findOne: async () => null,
    },
  };
};

const { as } = await mountApp('appointments', {
  '../../src/models/User.js': USER_STUB,
});

const ADMIN = { _id: 'adm-1', id: 'adm-1', role: 'hospital_admin', hospitalId: 'H1' };
const DOC_ID = '507f1f77bcf86cd7994390d1';
const SVC_ID = '507f1f77bcf86cd7994390e1';
const PROV_ID = '507f1f77bcf86cd7994390f2';

let lastSlot = null;
const book = (over = {}) => {
  lastSlot = istSlot(48);
  return as(ADMIN).post('/').send({
    patient: 'Ravi Kumar', doctor: 'Dr Arai', doctorId: DOC_ID,
    department: 'General', date: lastSlot.date, time: lastSlot.time,
    serviceId: SVC_ID, ...over,
  });
};

beforeEach(() => {
  created.length = 0;
  providerDoc = null;
  usedCount = 0;
  capCountFilter = null;
  serviceRow = { _id: SVC_ID, providerId: PROV_ID, practitionerId: DOC_ID, isActive: true };
});

describe('POST / — 2.md §6 probation booking cap', () => {
  it('books normally when the provider is NOT on probation', async () => {
    providerDoc = { _id: PROV_ID, name: 'Smile Dental', probation: { active: false, bookingCap: 10, payoutHold: true } };
    const res = await book();
    expect(res.status).toBe(201);
    expect(created).toHaveLength(1);
    expect(created[0].providerId).toBe(PROV_ID);
    expect(capCountFilter).toBeNull(); // the guard never counts when inactive
  });

  it('409s every booking while probation is active with a cap of 0', async () => {
    providerDoc = { _id: PROV_ID, name: 'Smile Dental', probation: { active: true, bookingCap: 0, payoutHold: true } };
    const res = await book();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROBATION_BOOKING_CAP');
    expect(res.body.message).toContain('probation');
    expect(created).toHaveLength(0);
  });

  it('allows a booking while used < cap', async () => {
    providerDoc = { _id: PROV_ID, name: 'Smile Dental', probation: { active: true, bookingCap: 2, payoutHold: true } };
    usedCount = 1;
    const res = await book();
    expect(res.status).toBe(201);
    expect(created).toHaveLength(1);
  });

  it('409s once the day count reaches the cap', async () => {
    providerDoc = { _id: PROV_ID, name: 'Smile Dental', probation: { active: true, bookingCap: 2, payoutHold: true } };
    usedCount = 2;
    const res = await book();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROBATION_BOOKING_CAP');
    expect(res.body.message).toContain('daily booking limit of 2');
    expect(created).toHaveLength(0);
  });

  it('counts the provider + date and excludes Cancelled bookings', async () => {
    providerDoc = { _id: PROV_ID, name: 'Smile Dental', probation: { active: true, bookingCap: 5, payoutHold: false } };
    usedCount = 0;
    const res = await book();
    expect(res.status).toBe(201);
    expect(capCountFilter).toMatchObject({
      providerId: PROV_ID,
      date: lastSlot.date,
      status: { $nin: ['Cancelled'] },
    });
  });

  it('a service without a providerId bypasses the guard entirely', async () => {
    serviceRow = { _id: SVC_ID, providerId: null, practitionerId: DOC_ID, isActive: true };
    providerDoc = { _id: PROV_ID, name: 'Smile Dental', probation: { active: true, bookingCap: 0, payoutHold: true } };
    const res = await book();
    expect(res.status).toBe(201);
    expect(capCountFilter).toBeNull();
  });
});
