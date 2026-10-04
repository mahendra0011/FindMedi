import { canCollectPharmacyCod, canTransitionPharmacyOrder } from '../../src/services/pharmacyOrderLifecycle.js';

describe('pharmacy order lifecycle', () => {
  it('allows a delivered COD order to be collected exactly once', () => {
    const order = { paymentMethod: 'COD', status: 'Delivered', paymentStatus: 'Unpaid' };
    expect(canCollectPharmacyCod(order)).toBe(true);
    expect(canCollectPharmacyCod({ ...order, paymentStatus: 'Paid' })).toBe(false);
  });

  it('does not allow COD collection before delivery or for an online order', () => {
    expect(canCollectPharmacyCod({ paymentMethod: 'COD', status: 'Shipped', paymentStatus: 'Unpaid' })).toBe(false);
    expect(canCollectPharmacyCod({ paymentMethod: 'UPI', status: 'Delivered', paymentStatus: 'Unpaid' })).toBe(false);
  });

  it('allows unpaid COD fulfillment but holds online fulfillment until payment', () => {
    expect(canTransitionPharmacyOrder({ status: 'Pending', paymentMethod: 'COD', paymentStatus: 'Unpaid' }, 'Shipped'))
      .toMatchObject({ ok: true });
    expect(canTransitionPharmacyOrder({ status: 'Pending', paymentMethod: 'UPI', paymentStatus: 'Pending' }, 'Confirmed'))
      .toMatchObject({ ok: false, code: 'PAYMENT_REQUIRED' });
  });

  it('requires refund settlement before cancelling a paid order', () => {
    expect(canTransitionPharmacyOrder({ status: 'Confirmed', paymentMethod: 'UPI', paymentStatus: 'Paid' }, 'Cancelled'))
      .toMatchObject({ ok: false, code: 'REFUND_REQUIRED' });
  });

  it('rejects invalid transitions and treats a repeated state as idempotent', () => {
    expect(canTransitionPharmacyOrder({ status: 'Delivered', paymentMethod: 'COD', paymentStatus: 'Paid' }, 'Shipped'))
      .toMatchObject({ ok: false, code: 'INVALID_ORDER_TRANSITION' });
    expect(canTransitionPharmacyOrder({ status: 'Shipped', paymentMethod: 'COD', paymentStatus: 'Unpaid' }, 'Shipped'))
      .toMatchObject({ ok: true, idempotent: true });
  });
});
