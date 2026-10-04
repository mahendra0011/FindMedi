/**
 * PAY-B-08: PUT /:id/refund must fail closed in production BEFORE any mutation,
 * mirroring the PUT /:id 503 REFUND_PROVIDER_UNAVAILABLE guard.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const paymentFindById = jestApi.fn();
const refundRequestRefund = jestApi.fn();
const refundSettleRefund = jestApi.fn();

jestApi.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));
jestApi.unstable_mockModule('../../src/middleware/stepUpAuth.js', () => ({
  requireStepUp: () => (_req, _res, next) => next(),
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: jestApi.fn().mockResolvedValue(undefined),
}));
jestApi.unstable_mockModule('../../src/lib/pgDualWrite.js', () => ({
  mirrorPayment: jestApi.fn(),
}));
jestApi.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jestApi.fn(), warn: jestApi.fn(), error: jestApi.fn() },
}));

const { as } = await mountApp('payments', {
  '../../src/models/Payment.js': () => ({ default: { findById: (...args) => paymentFindById(...args) } }),
  '../../src/models/Notification.js': () => ({ default: { create: jestApi.fn() } }),
  '../../src/models/User.js': () => ({ default: { findById: jestApi.fn() } }),
  '../../src/models/Refund.js': () => ({
    default: { requestRefund: (...args) => refundRequestRefund(...args), settleRefund: (...args) => refundSettleRefund(...args) },
  }),
});

beforeEach(() => {
  jestApi.clearAllMocks();
});

describe('PAY-B-08 · PUT /:id/refund production fail-closed guard', () => {
  it('returns 503 REFUND_PROVIDER_UNAVAILABLE in production before any DB read or mutation', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const response = await as({ _id: 'admin-1', role: 'superadmin' })
        .put('/pay-1/refund')
        .send({ refund_amount: 10 });

      expect(response.status).toBe(503);
      expect(response.body.code).toBe('REFUND_PROVIDER_UNAVAILABLE');
      // No mutation path may run: not even the initial Payment lookup.
      expect(paymentFindById).not.toHaveBeenCalled();
      expect(refundRequestRefund).not.toHaveBeenCalled();
      expect(refundSettleRefund).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it('does not 503 outside production (guard is production-only)', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    paymentFindById.mockResolvedValueOnce(null);
    try {
      const response = await as({ _id: 'admin-1', role: 'superadmin' })
        .put('/pay-1/refund')
        .send({ refund_amount: 10 });

      // Passes the guard, then 404s on the missing payment — never 503.
      expect(response.status).toBe(404);
      expect(paymentFindById).toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});
