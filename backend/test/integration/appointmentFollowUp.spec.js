/**
 * Item 6 (checklist §1.6) — appointment auto follow-up booking.
 *
 * A doctor completes a consult and asks for a follow-up in N days; the desk
 * sends ONE write (status=Completed + followUpDays) and the system books the
 * next visit itself. Pinned here through the real PUT /:id route:
 *  - the parent's `followUpDate` is derived SERVER-SIDE (date + N calendar
 *    days) and lands in the same commit as the completion;
 *  - a child appointment is created with status Pending, linked back via
 *    `followUpFor`, and the patient is notified;
 *  - the booking is IDEMPOTENT: a retried completion cannot double-book;
 *  - if the target slot is taken, the parent stays Completed and the response
 *    reports `followUpSkipped: 'slot-taken'` (no 500, no re-complete);
 *  - completing WITHOUT followUpDays books nothing (no behaviour change).
 *
 * Mock graph copied from appointmentCancellation.spec.js.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const appointments = new Map();
const notifications = [];

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

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const seedAppointment = (over = {}) => {
  const slot = istSlot(over.hoursFromNow ?? 48);
  const doc = {
    _id: `appt-${appointments.size + 1}`,
    patient: 'Ravi Kumar',
    patientId: 'pat-1',
    doctor: 'Dr Arai',
    doctorId: { _id: 'doc-1', name: 'Dr Arai' },
    department: 'General',
    date: slot.date,
    time: slot.time,
    status: 'Confirmed',
    fees: 500,
    hospitalId: 'H1',
    ...over,
  };
  delete doc.hoursFromNow;
  appointments.set(String(doc._id), doc);
  return doc;
};

// findOne answers the lookups the follow-up block makes: the idempotency
// check (`followUpFor`) and the slot-conflict check (doctor+date+time).
const findOneAppointment = (filter = {}) => {
  for (const a of appointments.values()) {
    if (filter.followUpFor !== undefined && String(a.followUpFor) !== String(filter.followUpFor)) continue;
    if (filter.doctorId !== undefined && String(a.doctorId?._id ?? a.doctorId) !== String(filter.doctorId?._id ?? filter.doctorId)) continue;
    if (filter.date !== undefined && a.date !== filter.date) continue;
    if (filter.time !== undefined && a.time !== filter.time) continue;
    if (filter.status?.$nin && filter.status.$nin.includes(a.status)) continue;
    return chain(a);
  }
  return chain(null);
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
    findById: (id) => chain(appointments.get(String(id)) || null),
    findByIdAndUpdate: (id, updates) => {
      const doc = appointments.get(String(id));
      if (doc) Object.assign(doc, updates);
      return chain(doc || null);
    },
    findOne: (filter) => findOneAppointment(filter),
    find: () => chain([]),
    create: (data) => {
      const row = { _id: `appt-${appointments.size + 1}`, ...data };
      appointments.set(String(row._id), row);
      return row;
    },
    countDocuments: async () => 0,
  },
}));
jestApi.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { findOne: () => chain(null), findById: () => chain(null) },
}));
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: {
    create: jestApi.fn(async (data) => {
      notifications.push(data);
      return data;
    }),
  },
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
  default: { findById: () => chain(null) },
}));

const USER_STUB = () => {
  const doc = { _id: 'u-notif-1', twoFactorEnabled: false };
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

beforeEach(() => {
  appointments.clear();
  notifications.length = 0;
});

describe('Item 6 · auto follow-up booking on completion', () => {
  it('derives followUpDate server-side and books a linked Pending child', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });

    const res = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Completed', followUpDays: 7 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Completed');
    // Parent stamped with the derived date (original date + 7 calendar days).
    expect(res.body.followUpDate).toBeDefined();
    expect(res.body.followUpDate.slice(0, 10)).toBe(addDays(appt.date, 7));

    // Child booked, Pending, linked back to the parent.
    const child = [...appointments.values()].find((a) => a.followUpFor === appt._id);
    expect(child).toBeDefined();
    expect(child.status).toBe('Pending');
    expect(child.date).toBe(addDays(appt.date, 7));
    expect(child.time).toBe(appt.time);
    expect(child.patientId).toBe('pat-1');
    expect(res.body.followUp?.id).toBe(String(child._id));

    // Patient notified.
    expect(notifications.some((n) => n.userId === 'pat-1' && n.title === 'Follow-up booked')).toBe(true);
  });

  it('a retried completion does not double-book (idempotent via followUpFor)', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });

    const first = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Completed', followUpDays: 7 });
    expect(first.status).toBe(200);

    // A repeat write with the SAME terminal status is a no-op (the lifecycle
    // guard only fires on a status CHANGE), so it returns 200 — but the
    // follow-up block also requires `oldStatus !== 'Completed'`, so no second
    // child is minted. That double-gating is what makes the booking idempotent.
    const second = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Completed', followUpDays: 7 });
    expect(second.status).toBe(200);
    const children = [...appointments.values()].filter((a) => a.followUpFor === appt._id);
    expect(children).toHaveLength(1);
  });

  it('a taken follow-up slot skips the booking, not the completion', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });
    // An unrelated active booking already occupies the doctor at the target
    // follow-up slot (same doctor, date+7, same time).
    const fuDate = addDays(appt.date, 7);
    seedAppointment({ date: fuDate, time: appt.time, doctorId: { _id: 'doc-1', name: 'Dr Arai' } });

    const res = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Completed', followUpDays: 7 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Completed'); // the consult still finished
    expect(res.body.followUpSkipped).toBe('slot-taken');
    expect(res.body.followUp).toBeUndefined();
    const children = [...appointments.values()].filter((a) => a.followUpFor === appt._id);
    expect(children).toHaveLength(0);
  });

  it('completing without followUpDays books nothing (no behaviour change)', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });

    const res = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Completed');
    expect(res.body.followUp).toBeUndefined();
    expect(res.body.followUpSkipped).toBeUndefined();
    expect(res.body.followUpDate).toBeUndefined();
    const children = [...appointments.values()].filter((a) => a.followUpFor === appt._id);
    expect(children).toHaveLength(0);
  });

  it('an out-of-range followUpDays is refused by the schema (400)', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });

    const tooBig = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Completed', followUpDays: 4000 });
    expect(tooBig.status).toBe(400);

    const zero = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Completed', followUpDays: 0 });
    expect(zero.status).toBe(400);

    // Nothing was written.
    expect(appointments.get(appt._id).status).toBe('Confirmed');
    expect([...appointments.values()].filter((a) => a.followUpFor === appt._id)).toHaveLength(0);
  });
});

