/**
 * A5 (5.md §2.4, §15) — cancellation tiers, auto-refund, server-side walk-in price.
 *
 * Seeded HTTP through mountApp('appointments') with in-memory models: the
 * route, its middleware chain and the shared lifecycle lib are all production
 * code; only the storage is substituted.
 *
 * What this pins:
 *  - a patient cancel is settled against the TIER TABLE (early full /
 *    mid 50 / late nil) and the decision lands on the row
 *    (cancelledBy/tier/fee/refund);
 *  - a provider cancel is a FULL REFUND even inside the late band, with its
 *    own refund reason code;
 *  - the refund is idempotent — a retried cancel cannot pay twice;
 *  - a Completed booking cannot be cancelled at all (409 from the table);
 *  - a walk-in fee comes from the doctor's listed price, never the body.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

// ─── in-memory stores ────────────────────────────────────────────────────────
const appointments = new Map();
const payments = new Map();
const refundRows = [];

const chain = (value) => {
  const q = {
    select: () => q, populate: () => q, sort: () => q, limit: () => q,
    skip: () => q, lean: () => q, exec: () => q,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return q;
};

// A slot N hours from now, as IST wall-clock strings (the format slotDate/
// slotTime enforce and slotStartAt parses).
const istSlot = (hoursFromNow) => {
  const shifted = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000 + 5.5 * 60 * 60 * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    time: `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`,
  };
};

const seedAppointment = (over = {}) => {
  const slot = istSlot(over.hoursFromNow ?? 48);
  const doc = {
    _id: `appt-${appointments.size + 1}`,
    patient: 'Ravi Kumar',
    patientId: 'pat-1',
    doctor: 'Dr Arai',
    // Emulates the populated shape the route's .populate('doctorId') returns.
    doctorId: { _id: 'doc-1', name: 'Dr Arai' },
    department: 'General',
    date: slot.date,
    time: slot.time,
    status: 'Confirmed',
    fees: 500,
    hospitalId: 'H1',
    cancellationReason: '',
    ...over,
  };
  delete doc.hoursFromNow;
  appointments.set(String(doc._id), doc);
  return doc;
};

const seedPayment = (apptId, over = {}) => {
  const doc = {
    _id: `pay-${payments.size + 1}`,
    serviceType: 'appointment',
    referenceId: String(apptId),
    amount: 500,
    refund_amount: 0,
    status: 'completed',
    hospitalId: 'H1',
    ...over,
  };
  payments.set(String(doc._id), doc);
  return doc;
};

// ─── module substitutions (registered BEFORE the route is imported) ─────────
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
    findOne: () => chain(null),
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
  default: {
    findOne: (filter = {}) => {
      for (const p of payments.values()) {
        if (filter.serviceType && p.serviceType !== filter.serviceType) continue;
        if (filter.referenceId !== undefined && String(p.referenceId) !== String(filter.referenceId)) continue;
        if (filter.status?.$in && !filter.status.$in.includes(p.status)) continue;
        return chain(p);
      }
      return chain(null);
    },
    findById: (id) => chain(payments.get(String(id)) || null),
  },
}));

jestApi.unstable_mockModule('../../src/models/Refund.js', () => ({
  default: {
    requestRefund: jestApi.fn(async ({ paymentId, amount, reason, reasonCode, idempotencyKey, requestedBy }) => {
      const existing = refundRows.find((r) => r.idempotencyKey === idempotencyKey);
      if (existing) return { created: false, refund: existing };
      const row = {
        _id: `ref-${refundRows.length + 1}`,
        paymentId, amount, reason, reasonCode, idempotencyKey, requestedBy,
        status: 'PROCESSING', settledAt: null, failureReason: null,
        save: async () => {},
      };
      refundRows.push(row);
      return { created: true, refund: row };
    }),
    settleRefund: jestApi.fn(async ({ paymentId, amount }) => {
      const payment = [...payments.values()].find((p) => String(p._id) === String(paymentId));
      if (!payment) { const e = new Error('Payment not found'); e.status = 404; throw e; }
      const already = Number(payment.refund_amount) || 0;
      const original = Number(payment.amount) || 0;
      if (already + amount > original) { const e = new Error('Refund would exceed the captured amount'); e.status = 400; throw e; }
      payment.refund_amount = Math.round((already + amount) * 100) / 100;
      const full = payment.refund_amount >= original;
      payment.status = full ? 'refunded' : 'partially_refunded';
      return { payment, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED', totalRefunded: payment.refund_amount };
    }),
  },
}));

jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { create: jestApi.fn(async () => ({})) },
}));
jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: {
    // One doctor, priced — the walk-in and pricingService both resolve through
    // this, so `fees` assertions are end-to-end against the pricing lib.
    findById: () => chain({
      _id: 'doc-1', name: 'Dr Arai', consultation_fees: 600, maxBookingsPerSlot: 1,
      hospitalId: null, user_id: null, email: 'dr@clinic.test',
    }),
    find: () => chain([]),
  },
}));
jestApi.unstable_mockModule('../../src/models/Patient.js', () => ({
  default: {
    findOne: () => chain(null),
    create: jestApi.fn(async (data) => ({ _id: 'prec-1', userId: null, ...data })),
  },
}));

// User must go through mountApp's `models` map: the harness registers its own
// User stub AFTER a spec's direct mocks, so a direct registration here would be
// overwritten. The route awaits findById() WITHOUT .select() on the cancel
// path and then reads `user._id`, so this stub is both a thenable yielding the
// doc and a select-first chain; findOne answers createNotification's
// doctor→user resolution with null (the test doctor has no linked account).
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

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };
const ADMIN = { _id: 'adm-1', id: 'adm-1', role: 'hospital_admin', hospitalId: 'H1' };

beforeEach(() => {
  appointments.clear();
  payments.clear();
  refundRows.length = 0;
});

describe('A5 · patient cancel settles against the tier table', () => {
  it('early (>24 h): full refund, decision recorded on the row', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });
    const pay = seedPayment(appt._id);

    const res = await as(PATIENT).put(`/${appt._id}`).send({
      status: 'Cancelled',
      cancellationReason: 'travel plans changed',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Cancelled');
    expect(res.body.cancelledBy).toBe('patient');
    expect(res.body.cancellationTier).toBe('early');
    expect(res.body.refundAmount).toBe(500);
    expect(res.body.cancellationFee).toBe(0);
    expect(res.body.cancellationReason).toBe('travel plans changed');
    expect(typeof res.body.cancelledAt).toBe('string');

    expect(pay.refund_amount).toBe(500);
    expect(pay.status).toBe('refunded');
    expect(refundRows).toHaveLength(1);
    expect(refundRows[0].reasonCode).toBe('appointment_cancelled');
    expect(refundRows[0].amount).toBe(500);
    expect(refundRows[0].idempotencyKey).toBe(`appt-cancel:${appt._id}:${pay._id}`);
  });

  it('mid (24–4 h): 50 % back, 50 % kept', async () => {
    const appt = seedAppointment({ hoursFromNow: 10 });
    const pay = seedPayment(appt._id);

    const res = await as(PATIENT).put(`/${appt._id}`).send({ status: 'Cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.cancellationTier).toBe('mid');
    expect(res.body.refundAmount).toBe(250);
    expect(res.body.cancellationFee).toBe(250);
    expect(pay.refund_amount).toBe(250);
    expect(pay.status).toBe('partially_refunded');
    expect(refundRows[0].amount).toBe(250);
  });

  it('late (<4 h): no refund, the fee stays with the provider', async () => {
    const appt = seedAppointment({ hoursFromNow: 1 });
    const pay = seedPayment(appt._id);

    const res = await as(PATIENT).put(`/${appt._id}`).send({ status: 'Cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.cancellationTier).toBe('late');
    expect(res.body.refundAmount).toBe(0);
    expect(res.body.cancellationFee).toBe(500);
    expect(pay.refund_amount).toBe(0);
    expect(pay.status).toBe('completed');
    expect(refundRows).toHaveLength(0); // nothing owed -> no refund row minted
  });

  it('an unpaid cancel records the decision with zero on both sides', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 }); // no payment seeded

    const res = await as(PATIENT).put(`/${appt._id}`).send({ status: 'Cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.cancelledBy).toBe('patient');
    expect(res.body.refundAmount).toBe(0);
    expect(res.body.cancellationFee).toBe(0);
    expect(refundRows).toHaveLength(0);
  });
});

describe('A5 · provider cancel is always a full refund (5.md §2.4 provider column)', () => {
  it('one hour out, late band: still 100 % with the provider reason code', async () => {
    const appt = seedAppointment({ hoursFromNow: 1 });
    const pay = seedPayment(appt._id);

    const res = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.cancelledBy).toBe('provider');
    expect(res.body.cancellationTier).toBe('late'); // tier is still recorded...
    expect(res.body.refundAmount).toBe(500);        // ...but the actor overrides it
    expect(res.body.cancellationFee).toBe(0);
    expect(pay.refund_amount).toBe(500);
    expect(refundRows[0].reasonCode).toBe('provider_cancelled');
  });
});

describe('A5 · idempotent cancel retry', () => {
  it('a repeated cancel does not pay twice', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });
    const pay = seedPayment(appt._id);

    const first = await as(PATIENT).put(`/${appt._id}`).send({ status: 'Cancelled' });
    expect(first.status).toBe(200);
    expect(refundRows).toHaveLength(1);
    expect(pay.refund_amount).toBe(500);

    // The client retries (network timeout, double tap). The row is already
    // Cancelled and the payment already carries the refund.
    const second = await as(PATIENT).put(`/${appt._id}`).send({ status: 'Cancelled' });
    expect(second.status).toBe(200);
    expect(refundRows).toHaveLength(1); // same idempotency key, no second row
    expect(pay.refund_amount).toBe(500); // no double money
  });
});

describe('A5 · transition table refuses illegal moves (409)', () => {
  it('a Completed booking cannot be cancelled', async () => {
    const appt = seedAppointment({ status: 'Completed', hoursFromNow: -1 });

    const res = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Cancelled' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ILLEGAL_STATE_TRANSITION');
    expect(res.body.from).toBe('Completed');
    expect(res.body.to).toBe('Cancelled');
    expect(appointments.get(appt._id).status).toBe('Completed'); // nothing written
    expect(refundRows).toHaveLength(0);
  });

  it('a Cancelled booking cannot be flipped back to Confirmed', async () => {
    const appt = seedAppointment({ status: 'Cancelled', hoursFromNow: 48 });

    const res = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Confirmed' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ILLEGAL_STATE_TRANSITION');
    expect(appointments.get(appt._id).status).toBe('Cancelled');
  });

  it('the legacy `Rescheduled` value gets the structured 409, not a cast error', async () => {
    const appt = seedAppointment({ hoursFromNow: 48 });

    const res = await as(ADMIN).put(`/${appt._id}`).send({ status: 'Rescheduled' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ILLEGAL_STATE_TRANSITION');
    expect(res.body.to).toBe('Rescheduled');
  });
});

describe('A5 · walk-in price is server-owned (5.md §15)', () => {
  it('ignores a client-sent fee and stamps the doctor\'s listed price', async () => {
    const slot = istSlot(6);

    const res = await as(ADMIN).post('/walk-in').send({
      patient: { name: 'Walk-In Ravi', phone: '5551234567' },
      doctorId: 'doc-1',
      department: 'General',
      date: slot.date,
      time: slot.time,
      fees: 99999, // stripped by the schema AND untrusted by the route
    });

    expect(res.status).toBe(201);
    expect(res.body.appointment.fees).toBe(600); // doctor.consultation_fees
    expect(res.body.appointment.status).toBe('Confirmed');
    // Nothing anywhere recorded the client's number.
    expect(JSON.stringify(res.body)).not.toContain('99999');
  });

  it('a body without fees prices identically (the fee is not optional)', async () => {
    const slot = istSlot(7);

    const res = await as(ADMIN).post('/walk-in').send({
      patient: { name: 'No-Fee Ravi', phone: '9999999998' },
      doctorId: 'doc-1',
      department: 'General',
      date: slot.date,
      time: slot.time,
    });

    expect(res.status).toBe(201);
    expect(res.body.appointment.fees).toBe(600);
  });
});
