/**
 * File 22 P0-9: gateway webhook replay-safety + signature gate.
 * Mock gateway accepts everything by design; tamper tests target razorpay.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const paymentFindOne = jestApi.fn();

const { as } = await mountApp('checkout', {
  '../../src/models/Payment.js': () => ({ default: { findOne: (...a) => paymentFindOne(...a) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const evt = { event: 'payment.captured', orderId: 'order_1', paymentId: 'pay_1', amount: 500 };

describe('POST /webhooks/:gateway replay safety', () => {
  test('first delivery completes a pending intent', async () => {
    const row = {
      _id: 'p1', status: 'pending', gatewayPaymentId: '', attempts: [],
      save: async function save() { return this; },
    };
    paymentFindOne.mockReset().mockImplementation(async (filter) => {
      if (filter.gatewayPaymentId) return null;
      if (filter.gatewayOrderId) return row;
      return null;
    });
    const res = await as(null).post('/webhooks/mock').send(evt);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(row.gatewayPaymentId).toBe('pay_1');
  });

  test('replay of the same payment id short-circuits without transition', async () => {
    const seen = {
      _id: 'p1', status: 'completed', gatewayPaymentId: 'pay_1', attempts: [],
      save: jestApi.fn(),
    };
    paymentFindOne.mockReset().mockImplementation(async (filter) => {
      if (filter.gatewayPaymentId) return seen;
      return null;
    });
    const res = await as(null).post('/webhooks/mock').send(evt);
    expect(res.status).toBe(200);
    expect(res.body.replay).toBe(true);
    expect(res.body.status).toBe('completed');
    expect(seen.save).not.toHaveBeenCalled();
  });

  test('unknown order is a 404, not a 500', async () => {
    paymentFindOne.mockReset().mockResolvedValue(null);
    const res = await as(null).post('/webhooks/mock').send(evt);
    expect(res.status).toBe(404);
  });

  test('razorpay webhook without signature is rejected', async () => {
    const res = await as(null).post('/webhooks/razorpay').send({ event: 'payment.captured' });
    expect(res.status).toBe(401);
  });
});
