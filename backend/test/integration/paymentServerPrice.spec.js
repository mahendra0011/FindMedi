/**
 * A5 (5.md §15) — server-side price on the staff payment path, plus the
 * full-remaining refund default.
 *
 * PAY-B-01 already owns POST /api/billing/pay (the patient checkout). This
 * covers the OTHER writer: POST /api/payments, staff-only, which took
 * `amount` straight from the body and dropped the appointment linkage
 * entirely. Now a payment booked against an appointment must match the
 * doctor's listed fee (409 PRICE_MISMATCH) and carries a referenceId.
 *
 * Also pins PUT /:id/refund without `refund_amount` = "the rest of it".
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const payments = new Map();

jestApi.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));
jestApi.unstable_mockModule('../../src/middleware/stepUpAuth.js', () => ({
  requireStepUp: () => (_req, _res, next) => next(),
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: jestApi.fn(async () => {}),
}));
jestApi.unstable_mockModule('../../src/lib/pgDualWrite.js', () => ({
  mirrorPayment: jestApi.fn(),
}));
jestApi.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jestApi.fn(), warn: jestApi.fn(), error: jestApi.fn(), debug: jestApi.fn() },
}));
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { create: jestApi.fn(async () => ({})) },
}));

const { as } = await mountApp('payments', {
  // Payment: create captures into the store; findById serves the refund path.
  '../../src/models/Payment.js': () => ({
    default: {
      create: jestApi.fn(async (data) => {
        const row = { _id: `pay-${payments.size + 1}`, refund_amount: 0, ...data };
        payments.set(String(row._id), row);
        return row;
      }),
      findById: (id) => query(payments.get(String(id)) || null),
      findOne: () => query(null),
      find: () => query([]),
      aggregate: async () => [{ _id: null, total: 0 }],
    },
  }),
  // The patient tenant must resolve (POST /) — select-first AND plain await.
  '../../src/models/User.js': () => {
    const patient = { _id: 'pat-1', hospitalId: 'H1', role: 'patient', name: 'Ravi Kumar' };
    return {
      default: {
        findById: () => ({ ...patient, select: () => ({ lean: async () => patient }) }),
        findOne: async () => null,
      },
    };
  },
  // The appointment under payment: doctor-linked, priced by Doctor below.
  '../../src/models/Appointment.js': () => ({
    default: {
      findById: (id) => (String(id) === 'appt-9'
        ? query({ _id: 'appt-9', doctorId: { _id: 'doc-1' }, status: 'Confirmed', fees: 600 })
        : query(null)),
    },
  }),
  '../../src/models/Doctor.js': () => ({
    default: {
      findById: () => query({
        _id: 'doc-1', name: 'Dr Arai', consultation_fees: 600, email: 'dr@clinic.test',
      }),
      find: () => query([]),
    },
  }),
  '../../src/models/Refund.js': () => ({
    default: {
      requestRefund: jestApi.fn(async ({ paymentId, amount, reason, reasonCode, idempotencyKey }) => ({
        created: true,
        refund: {
          _id: 'ref-1', paymentId, amount, reason, reasonCode, idempotencyKey,
          status: 'PROCESSING', settledAt: null, save: async () => {},
        },
      })),
      settleRefund: jestApi.fn(async ({ paymentId, amount }) => {
        const payment = payments.get(String(paymentId));
        if (!payment) { const e = new Error('Payment not found'); e.status = 404; throw e; }
        payment.refund_amount = Math.round(((Number(payment.refund_amount) || 0) + amount) * 100) / 100;
        const full = payment.refund_amount >= Number(payment.amount);
        payment.status = full ? 'refunded' : 'partially_refunded';
        return { payment, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED', totalRefunded: payment.refund_amount };
      }),
    },
  }),
});

const STAFF = { _id: 'adm-1', id: 'adm-1', role: 'hospital_admin', hospitalId: 'H1' };

beforeEach(() => payments.clear());

describe('A5 · POST /api/payments prices an appointment link server-side', () => {
  it('refuses an amount that disagrees with the doctor\'s fee (409 PRICE_MISMATCH)', async () => {
    const res = await as(STAFF).post('/').send({
      patient_id: 'pat-1',
      amount: 1,
      method: 'cash',
      serviceType: 'appointment',
      appointment_id: 'appt-9',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRICE_MISMATCH');
    expect(res.body.authoritative).toBe(600);
    expect(res.body.received).toBe(1);
    expect(payments.size).toBe(0); // nothing recorded
  });

  it('accepts the authoritative amount and persists the linkage', async () => {
    const res = await as(STAFF).post('/').send({
      patient_id: 'pat-1',
      amount: 600,
      method: 'cash',
      serviceType: 'appointment',
      appointment_id: 'appt-9',
    });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(600);
    expect(res.body.referenceId).toBe('appt-9'); // the linkage used to be dropped
    expect(res.body.status).toBe('pending'); // server-set, never client-set
  });

  it('404s an unknown appointment instead of pricing against nothing', async () => {
    const res = await as(STAFF).post('/').send({
      patient_id: 'pat-1',
      amount: 600,
      method: 'cash',
      serviceType: 'appointment',
      appointment_id: 'appt-missing',
    });

    expect(res.status).toBe(404);
    expect(payments.size).toBe(0);
  });

  it('an unlinked staff payment keeps its old meaning (offline cash record)', async () => {
    const res = await as(STAFF).post('/').send({
      patient_id: 'pat-1',
      amount: 50,
      method: 'cash',
      serviceType: 'appointment',
    });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(50);
    expect(res.body.referenceId).toBeUndefined();
  });
});

describe('A5 · PUT /:id/refund defaults to the full remaining balance', () => {
  const seedRefundable = () => {
    const row = {
      _id: 'pay-r1', amount: 500, refund_amount: 0, status: 'completed',
      hospitalId: 'H1', serviceType: 'appointment', patient_id: 'pat-1',
    };
    payments.set(row._id, row);
    return row;
  };

  it('an empty body refunds the whole remaining capture', async () => {
    seedRefundable();

    const res = await as(STAFF).put('/pay-r1/refund').send({});

    expect(res.status).toBe(200);
    expect(res.body.totalRefunded).toBe(500);
    expect(payments.get('pay-r1').status).toBe('refunded');
  });

  it('an explicit amount still wins', async () => {
    seedRefundable();

    const res = await as(STAFF).put('/pay-r1/refund').send({ refund_amount: 150 });

    expect(res.status).toBe(200);
    expect(payments.get('pay-r1').refund_amount).toBe(150);
    expect(payments.get('pay-r1').status).toBe('partially_refunded');
  });

  it('a fully refunded payment refuses instead of refunding 0 or negative', async () => {
    const row = seedRefundable();
    row.refund_amount = 500;
    row.status = 'refunded';

    const res = await as(STAFF).put('/pay-r1/refund').send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ALREADY_REFUNDED');
  });
});
