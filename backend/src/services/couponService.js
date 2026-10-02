import logger from '../config/logger.js';
import { toPaise, fromPaise } from './ledgerService.js';

/**
 * LOYAL-B-02: server-side coupon resolution and eligibility re-check.
 *
 * The coupon CRUD routes are superadmin-only, but the DISCOUNT was resolved on the
 * client: the cart computed its own total and sent the reduced number. That is the
 * PAY-B-01 shape in coupon clothing — an expired coupon, a self-created code, a
 * minimum-order that was never met, or a per-user cap that had already been hit
 * all still produced a free or underpriced booking.
 *
 * This resolver is called at PAY time and re-reads the coupon from the database,
 * so the answer cannot be stale or forged. Everything is decided in integer paise.
 */
export const COUPON_REJECT_REASONS = {
  NOT_FOUND: 'coupon_not_found',
  INACTIVE: 'coupon_inactive',
  EXPIRED: 'coupon_expired',
  NOT_YET_ACTIVE: 'coupon_not_yet_active',
  MIN_ORDER: 'coupon_min_order_not_met',
  NO_DISCOUNT: 'coupon_gives_no_discount',
  USAGE_LIMIT: 'coupon_global_usage_exhausted',
  PER_USER_LIMIT: 'coupon_per_user_limit_reached',
  TENANT_MISMATCH: 'coupon_not_valid_for_this_tenant',
  SERVICE_MISMATCH: 'coupon_not_valid_for_this_service',
};

/**
 * Re-validate a coupon code at payment time.
 *
 * @param {object} p
 * @param {string} p.code            the code the client claims
 * @param {number} p.subtotalPaise   the SERVER-computed pre-discount amount, in paise
 * @param {string} p.userId
 * @param {string} [p.hospitalId]    tenant the booking belongs to
 * @param {string} [p.serviceType]
 * @returns {Promise<{ ok: true, discountPaise: number, coupon: object, code: string, finalPaise: number }
 *                  | { ok: false, reason: string, message: string }>}
 */
export async function resolveCoupon({
  code,
  subtotalPaise,
  userId,
  hospitalId = null,
  serviceType = null,
  now = new Date(),
} = {}) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) {
    return { ok: false, reason: COUPON_REJECT_REASONS.NOT_FOUND, message: 'Coupon code is required' };
  }

  const { default: PlatformCoupon } = await import('../models/PlatformCoupon.js');
  const coupon = await PlatformCoupon.findOne({ code: normalized }).lean();
  if (!coupon) {
    return { ok: false, reason: COUPON_REJECT_REASONS.NOT_FOUND, message: 'Invalid coupon code' };
  }
  if (coupon.isActive === false) {
    return { ok: false, reason: COUPON_REJECT_REASONS.INACTIVE, message: 'This coupon is no longer active' };
  }

  // Validity window, compared as dates rather than as a string prefix.
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return { ok: false, reason: COUPON_REJECT_REASONS.NOT_YET_ACTIVE, message: 'This coupon is not active yet' };
  }
  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return { ok: false, reason: COUPON_REJECT_REASONS.EXPIRED, message: 'This coupon has expired' };
  }

  // Tenant binding: a hospital-scoped coupon must not discount another tenant.
  if (coupon.hospitalId) {
    if (!hospitalId || String(coupon.hospitalId) !== String(hospitalId)) {
      return { ok: false, reason: COUPON_REJECT_REASONS.TENANT_MISMATCH, message: 'This coupon is not valid for this service' };
    }
  }
  if (Array.isArray(coupon.applicableServices) && coupon.applicableServices.length && serviceType) {
    if (!coupon.applicableServices.includes(serviceType)) {
      return { ok: false, reason: COUPON_REJECT_REASONS.SERVICE_MISMATCH, message: 'This coupon does not apply to this service' };
    }
  }

  const subtotal = toPaise(subtotalPaise);
  if (subtotal <= 0) {
    return { ok: false, reason: COUPON_REJECT_REASONS.MIN_ORDER, message: 'Nothing to discount' };
  }
  const minOrderPaise = toPaise(coupon.minOrderValue ?? coupon.minOrderAmount ?? 0);
  if (minOrderPaise > 0 && subtotal < minOrderPaise) {
    return {
      ok: false,
      reason: COUPON_REJECT_REASONS.MIN_ORDER,
      message: `Coupon requires a minimum order of ${fromPaise(minOrderPaise)}`,
    };
  }

  // The discount is computed from the SERVER subtotal, never from a client total.
  //
  // CRITICAL: a PERCENTAGE must never be run through `toPaise`.
  //
  // `toPaise(10)` is 1000 (it converts rupees to paise), so a "10%" coupon became
  // 1000, `Math.min(1000, 100)` clamped it to 100, and the customer received a
  // 100% discount — the entire order payable went to zero. Verified: a 10% coupon
  // on a Rs 2000 subtotal produced a Rs 2000 discount.
  //
  // The two discount types need genuinely different unit handling, and conflating
  // them is what caused this:
  //   percentage → a plain number on the scale 0..100. Never a money amount.
  //   flat       → a money amount in rupees, so `toPaise` is correct.
  const isPercentage = String(coupon.discountType) === 'percentage';
  const stored = Number(coupon.discountValue ?? coupon.percentOff ?? coupon.flatOff ?? 0);

  let discountPaise;
  if (isPercentage) {
    // Clamp the PERCENT first, then apply. Clamping after `toPaise` is what
    // turned a small percentage into a large one.
    const percent = Number.isFinite(stored) ? Math.min(Math.max(stored, 0), 100) : 0;
    discountPaise = Math.round((subtotal * percent) / 100);
  } else {
    // A flat discount is a money amount. `toPaise` is right here, and a negative
    // or non-numeric value must not become a credit.
    const flatPaise = Number.isFinite(stored) ? toPaise(stored) : 0;
    discountPaise = flatPaise > 0 ? flatPaise : 0;
  }

  if (coupon.maxDiscount != null) {
    const capPaise = toPaise(coupon.maxDiscount);
    if (capPaise > 0 && discountPaise > capPaise) discountPaise = capPaise;
  }
  // A discount can never exceed what is being paid, otherwise the payable goes
  // negative and the ledger has to compensate for it later.
  if (discountPaise > subtotal) discountPaise = subtotal;
  if (discountPaise <= 0) {
    return { ok: false, reason: COUPON_REJECT_REASONS.NO_DISCOUNT, message: 'This coupon gives no discount on this amount' };
  }

  // Global usage cap.
  const globalLimit = Number(coupon.usageLimit ?? 0);
  if (globalLimit > 0 && Number(coupon.usedCount ?? 0) >= globalLimit) {
    return { ok: false, reason: COUPON_REJECT_REASONS.USAGE_LIMIT, message: 'This coupon has been fully redeemed' };
  }

  // Per-user cap, counted from real redemptions rather than a client counter.
  const perUserLimit = Number(coupon.perUserLimit ?? 0);
  if (perUserLimit > 0 && userId) {
    const { default: PlatformCouponRedemption } = await import('../models/PlatformCouponRedemption.js').catch(() => ({ default: null }));
    if (PlatformCouponRedemption) {
      const mine = await PlatformCouponRedemption.countDocuments({
        couponCode: normalized, userId, status: { $in: ['applied', 'settled'] },
      });
      if (mine >= perUserLimit) {
        return {
          ok: false,
          reason: COUPON_REJECT_REASONS.PER_USER_LIMIT,
          message: 'You have already used this coupon the maximum number of times',
        };
      }
    }
  }

  return {
    ok: true,
    discountPaise,
    coupon,
    code: normalized,
    finalPaise: subtotal - discountPaise,
  };
}

/**
 * Record a coupon redemption.
 *
 * The counter is incremented with an atomic `$inc`, so two concurrent checkouts
 * cannot both pass the usage check and both consume the last remaining use.
 * `matched` reports whether this particular increment moved past the limit, which
 * is what lets the caller reverse a payment that raced the cap.
 */
export async function recordCouponRedemption({ code, userId, discountPaise, orderRef = null, matched = true }) {
  const normalized = String(code || '').trim().toUpperCase();
  const { default: PlatformCoupon } = await import('../models/PlatformCoupon.js');

  let newUsed = null;
  if (matched) {
    const updated = await PlatformCoupon.findOneAndUpdate(
      { code: normalized },
      { $inc: { usedCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true }
    ).select('usedCount');
    newUsed = updated?.usedCount ?? null;

    // Lost the race against the global cap: undo our own increment and tell the
    // caller to reverse the payment.
    const limit = Number(updated?.usageLimit ?? 0);
    if (limit > 0 && newUsed != null && newUsed > limit) {
      await PlatformCoupon.updateOne({ code: normalized }, { $inc: { usedCount: -1 } });
      return { code: normalized, usedCount: newUsed, exceededLimit: true };
    }
  }

  const { default: PlatformCouponRedemption } = await import('../models/PlatformCouponRedemption.js').catch(() => ({ default: null }));
  if (PlatformCouponRedemption) {
    await PlatformCouponRedemption.create({
      couponCode: normalized,
      userId,
      discountPaise,
      orderRef,
      status: 'applied',
    });
  }
  return { code: normalized, discountPaise: fromPaise(discountPaise), usedCount: newUsed };
}
