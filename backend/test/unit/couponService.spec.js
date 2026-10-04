import { jest as jestApi } from '@jest/globals';

const coupon = {
  code: 'SAVE10', isActive: true, discountType: 'percentage', discountValue: 10,
  perUserLimit: 1, usedCount: 0, usageLimit: 20,
};
const couponFindOne = jestApi.fn();
const couponFindOneAndUpdate = jestApi.fn();
const couponUpdateOne = jestApi.fn();
const redemptionCount = jestApi.fn();
const redemptionCreate = jestApi.fn();
const userUsageUpdate = jestApi.fn();
const userUsageClaim = jestApi.fn();

jestApi.unstable_mockModule('../../src/models/PlatformCoupon.js', () => ({
  default: { findOne: couponFindOne, findOneAndUpdate: couponFindOneAndUpdate, updateOne: couponUpdateOne },
}));
jestApi.unstable_mockModule('../../src/models/PlatformCouponRedemption.js', () => ({
  default: { countDocuments: redemptionCount, create: redemptionCreate },
}));
jestApi.unstable_mockModule('../../src/models/PlatformCouponUserUsage.js', () => ({
  default: { updateOne: userUsageUpdate, findOneAndUpdate: userUsageClaim },
}));
jestApi.unstable_mockModule('../../src/services/ledgerService.js', () => ({
  toPaise: (value) => Math.round(Number(value)),
  fromPaise: (value) => Number(value),
}));
jestApi.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jestApi.fn(), error: jestApi.fn() } }));

const { resolveCoupon, recordCouponRedemption } = await import('../../src/services/couponService.js');

describe('couponService per-user redemption enforcement', () => {
  beforeEach(() => {
    jestApi.clearAllMocks();
    couponFindOne.mockReturnValue({ lean: async () => ({ ...coupon }) });
    redemptionCount.mockResolvedValue(0);
    userUsageUpdate.mockResolvedValue({ upsertedCount: 1 });
    userUsageClaim.mockResolvedValue({ usedCount: 1 });
    couponFindOneAndUpdate.mockReturnValue({ select: async () => ({ usedCount: 1, usageLimit: 20 }) });
    redemptionCreate.mockResolvedValue({});
  });

  it('rejects a coupon once this user has reached the configured cap', async () => {
    redemptionCount.mockResolvedValue(1);
    const result = await resolveCoupon({ code: ' save10 ', subtotalPaise: 20000, userId: 'user-1' });
    expect(result).toMatchObject({ ok: false, reason: 'coupon_per_user_limit_reached' });
    expect(redemptionCount).toHaveBeenCalledWith({
      couponCode: 'SAVE10', userId: 'user-1', status: { $in: ['applied', 'settled'] },
    });
    expect(userUsageUpdate).toHaveBeenCalledWith(
      { couponCode: 'SAVE10', userId: 'user-1' },
      { $setOnInsert: { usedCount: 1 } },
      { upsert: true },
    );
  });

  it('fails closed when redemption eligibility cannot be read', async () => {
    redemptionCount.mockRejectedValue(new Error('database unavailable'));
    await expect(resolveCoupon({ code: 'SAVE10', subtotalPaise: 20000, userId: 'user-1' }))
      .rejects.toThrow('database unavailable');
  });

  it('calculates discount from the server subtotal when under the user cap', async () => {
    const result = await resolveCoupon({ code: 'SAVE10', subtotalPaise: 20000, userId: 'user-1' });
    expect(result).toMatchObject({ ok: true, discountPaise: 2000, finalPaise: 18000 });
  });

  it('persists an applied redemption with order reference and discount', async () => {
    await recordCouponRedemption({ code: 'save10', userId: 'user-1', discountPaise: 2000, orderRef: 'order-1', perUserLimit: 1 });
    expect(userUsageClaim).toHaveBeenCalledWith(
      { couponCode: 'SAVE10', userId: 'user-1', usedCount: { $lt: 1 } },
      { $inc: { usedCount: 1 } },
      { new: true },
    );
    expect(redemptionCreate).toHaveBeenCalledWith([{
      couponCode: 'SAVE10', userId: 'user-1', discountPaise: 2000, orderRef: 'order-1', status: 'applied',
    }], {});
  });

  it('rejects a global-cap race so the surrounding payment transaction can abort', async () => {
    couponFindOneAndUpdate.mockReturnValue({ select: async () => ({ usedCount: 21, usageLimit: 20 }) });
    await expect(recordCouponRedemption({ code: 'SAVE10', userId: 'user-1', discountPaise: 2000, orderRef: 'order-1' }))
      .rejects.toMatchObject({ code: 'coupon_global_usage_exhausted', status: 409 });
    expect(redemptionCreate).not.toHaveBeenCalled();
  });

  it('rejects when another checkout consumed the final per-user slot', async () => {
    userUsageClaim.mockResolvedValue(null);
    await expect(recordCouponRedemption({
      code: 'SAVE10', userId: 'user-1', discountPaise: 2000, orderRef: 'order-2', perUserLimit: 1,
    })).rejects.toMatchObject({ code: 'coupon_per_user_limit_reached', status: 409 });
    expect(redemptionCreate).not.toHaveBeenCalled();
  });

  it('writes the per-user counter and redemption using the payment transaction session', async () => {
    const session = { id: 'payment-session' };
    await recordCouponRedemption({
      code: 'SAVE10', userId: 'user-1', discountPaise: 2000, orderRef: 'order-3', perUserLimit: 3, session,
    });
    expect(couponFindOneAndUpdate.mock.calls[0][2]).toEqual({ new: true, session });
    expect(userUsageClaim.mock.calls[0][2]).toEqual({ new: true, session });
    expect(redemptionCreate.mock.calls[0][1]).toEqual({ session });
  });
});
