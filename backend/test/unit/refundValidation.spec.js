import { refundPaymentSchema } from '../../src/utils/validate.js';

describe('refund request validation', () => {
  it('accepts a positive refund amount', () => {
    expect(refundPaymentSchema.safeParse({ refund_amount: 0.01 }).success).toBe(true);
  });

  it.each([0, -0.01, NaN, Infinity, '10'])('rejects invalid refund amount %s', (refund_amount) => {
    expect(refundPaymentSchema.safeParse({ refund_amount }).success).toBe(false);
  });
});
