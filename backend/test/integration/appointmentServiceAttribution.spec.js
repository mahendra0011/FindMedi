/**
 * A3-part-2 — provider-service attribution on bookings: the slot a patient
 * picks on a provider page carries its service, and the booking stores the
 * link (serviceId + derived providerId) so dashboards, bills and follow-ups
 * can attribute it.
 *
 * What it pins (mock graph copied from appointmentCancellation.spec.js, plus
 * a Service mock — User still goes through mountApp's models map):
 *  - POST without serviceId behaves exactly as before (no new fields);
 *  - POST with an active service whose practitioner matches the doctor
 *    persists serviceId AND the service's providerId;
 *  - missing/inactive services are 400; a service assigned to ANOTHER doctor
 *    is 400 (no cross-doctor laundering);
 *  - a practitioner-less service (lab panel) rides along with any doctor;
 *  - garbage serviceIds never reach the route (zod 400).
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const created = [];
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
    countDocuments: async () => 0,
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
jestApi.unstable_mockModule('../../src/models/Service.js', () => ({
  default: { findById: (id) => chain(globalThis.__serviceRow ?? null) },
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

beforeEach(() => {
  created.length = 0;
  globalThis.__serviceRow = null;
});

const book = (over = {}) => {
  const slot = istSlot(48);
  return as(ADMIN).post('/').send({
    patient: 'Ravi Kumar', doctor: 'Dr Arai', doctorId: DOC_ID,
    department: 'General', date: slot.date, time: slot.time, ...over,
  });
};

describe('POST / — service attribution', () => {
  it('books unchanged without a serviceId', async () => {
    const res = await book();
    expect(res.status).toBe(201);
    expect(created[0].serviceId).toBeUndefined();
    expect(created[0].providerId).toBeUndefined();
  });

  it('persists serviceId and the derived providerId on a matched service', async () => {
    globalThis.__serviceRow = {
      _id: SVC_ID, providerId: 'prov-9', practitionerId: DOC_ID, isActive: true,
    };
    const res = await book({ serviceId: SVC_ID });
    expect(res.status).toBe(201);
    expect(String(created[0].serviceId)).toBe(SVC_ID);
    expect(created[0].providerId).toBe('prov-9');
  });

  it('400s missing, inactive and cross-doctor services', async () => {
    globalThis.__serviceRow = null;
    expect((await book({ serviceId: SVC_ID })).status).toBe(400);

    globalThis.__serviceRow = { _id: SVC_ID, providerId: 'prov-9', practitionerId: DOC_ID, isActive: false };
    expect((await book({ serviceId: SVC_ID })).status).toBe(400);

    globalThis.__serviceRow = {
      _id: SVC_ID, providerId: 'prov-9', practitionerId: '507f1f77bcf86cd7994390d9', isActive: true,
    };
    const mismatch = await book({ serviceId: SVC_ID });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.message).toBe('Service does not belong to this doctor');
  });

  it('accepts practitioner-less services with any doctor', async () => {
    globalThis.__serviceRow = { _id: SVC_ID, providerId: 'prov-9', practitionerId: null, isActive: true };
    const res = await book({ serviceId: SVC_ID });
    expect(res.status).toBe(201);
    expect(String(created[0].serviceId)).toBe(SVC_ID);
  });

  it('400s a malformed serviceId at the schema boundary', async () => {
    expect((await book({ serviceId: 'nope' })).status).toBe(400);
    expect(created).toHaveLength(0);
  });
});
