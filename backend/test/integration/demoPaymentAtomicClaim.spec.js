/**
 * PAY-B-12 + PAY-M-03: per-booking atomic claim.
 * Distinct idempotency keys racing on the SAME booking must not double-debit.
 * The unique index on {bookingType, <bookingId>} / bookingRef decides the
 * winner; the loser gets its debit compensated and reports "already paid".
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const demoPaymentCreate = jestApi.fn();
const demoPaymentFindOne = jestApi.fn();
const userFindOneAndUpdate = jestApi.fn();
const userUpdateOne = jestApi.fn();
const userFindById = jestApi.fn();
const assistantFindById = jestApi.fn();

jestApi.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));

const { as } = await mountApp('demoPayment', {
  '../../src/models/DemoPayment.js': () => ({
    default: {
      create: (...args) => demoPaymentCreate(...args),
      findOne: (...args) => demoPaymentFindOne(...args),
    },
  }),
  '../../src/models/AssistantBooking.js': () => ({ default: { findById: (...args) => assistantFindById(...args) } }),
  '../../src/models/LawyerBooking.js': () => ({ default: { findById: jestApi.fn() } }),
  '../../src/models/RideBooking.js': () => ({ default: { findById: jestApi.fn() } }),
  '../../src/models/EmergencyDoctorRequest.js': () => ({ default: { findById: jestApi.fn() } }),
  '../../src/models/Notification.js': () => ({ default: { create: jestApi.fn().mockResolvedValue({}) } }),
  '../../src/models/User.js': () => ({
    default: {
      findOneAndUpdate: (...args) => userFindOneAndUpdate(...args),
      updateOne: (...args) => userUpdateOne(...args),
      findById: (...args) => userFindById(...args),
    },
  }),
  '../../src/services/socketService.js': () => ({ getIO: () => null }),
  '../../src/config/logger.js': () => ({ default: { info: jestApi.fn(), warn: jestApi.fn(), error: jestApi.fn() } }),
});

const { bookingRefFor } = await import('../../src/routes/demoPayment.js');

const makeBooking = (overrides = {}) => ({
  _id: 'booking-race',
  patientId: 'patient-1',
  assistantId: 'assistant-1',
  cost: { total: 100 },
  payment: undefined,
  save: jestApi.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeEach(() => {
  jestApi.clearAllMocks();
  userFindOneAndUpdate.mockResolvedValue({ _id: 'patient-1', demoWallet: { balance: 9900 } });
  userUpdateOne.mockResolvedValue({ acknowledged: true });
  userFindById.mockReturnValue({ select: () => ({ lean: async () => ({ demoWallet: { balance: 10000 } }) }) });
  demoPaymentFindOne.mockResolvedValue(null);
});

describe('PAY-B-12 + PAY-M-03 · per-booking atomic claim', () => {
  it('derives a stable per-booking claim key', () => {
    expect(bookingRefFor('assistant', 'booking-race')).toBe('assistant:booking-race');
    expect(bookingRefFor('ride', 'ride-1')).toBe('ride:ride-1');
    expect(bookingRefFor('assistant', null)).toBeUndefined();
  });

  it('sequential duplicate with a DIFFERENT idempotency key single-debits via compensation', async () => {
    const winner = { _id: 'pay-winner', bookingType: 'assistant', bookingId: 'booking-race', status: 'paid' };
    assistantFindById
      .mockResolvedValueOnce(makeBooking())
      .mockResolvedValueOnce(makeBooking());
    demoPaymentCreate
      .mockResolvedValueOnce(winner)
      .mockRejectedValueOnce(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));
    demoPaymentFindOne.mockResolvedValue(winner);

    const first = await as({ _id: 'patient-1', role: 'patient' }).post('/pay')
      .set('Idempotency-Key', 'key-first')
      .send({ bookingType: 'assistant', bookingId: 'booking-race', method: 'demo_wallet' });
    expect(first.status).toBe(200);
    expect(first.body.demoPayment).toMatchObject({ _id: 'pay-winner' });

    const second = await as({ _id: 'patient-1', role: 'patient' }).post('/pay')
      .set('Idempotency-Key', 'key-SECOND-distinct')
      .send({ bookingType: 'assistant', bookingId: 'booking-race', method: 'demo_wallet' });
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    // Loser's debit was given back: exactly one compensating credit.
    expect(userUpdateOne).toHaveBeenCalledWith(
      { _id: expect.anything() },
      { $inc: { 'demoWallet.balance': 100 } },
    );
    // Both attempts carried the same per-booking claim key.
    const refs = demoPaymentCreate.mock.calls.map((c) => c[0]?.bookingRef);
    expect(refs[0]).toBe('assistant:booking-race');
    expect(refs[1]).toBe('assistant:booking-race');
  });

  it('concurrent-ish double submit leaves a single winner', async () => {
    const winner = { _id: 'pay-winner', bookingType: 'assistant', bookingId: 'booking-race', status: 'paid' };
    assistantFindById.mockImplementation(async () => makeBooking());
    let calls = 0;
    demoPaymentCreate.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) return winner;
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    });
    demoPaymentFindOne.mockResolvedValue(winner);

    const [a, b] = await Promise.all([
      as({ _id: 'patient-1', role: 'patient' }).post('/pay')
        .set('Idempotency-Key', 'race-a').send({ bookingType: 'assistant', bookingId: 'booking-race', method: 'demo_wallet' }),
      as({ _id: 'patient-1', role: 'patient' }).post('/pay')
        .set('Idempotency-Key', 'race-b').send({ bookingType: 'assistant', bookingId: 'booking-race', method: 'demo_wallet' }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 200]);
    const bodies = [a.body, b.body];
    expect(bodies.filter((x) => x.duplicate === true)).toHaveLength(1);
    expect(bodies.filter((x) => !x.duplicate)).toHaveLength(1);
  });
});
