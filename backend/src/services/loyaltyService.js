import mongoose from 'mongoose';
import LoyaltyLedger from '../models/LoyaltyLedger.js';
import LoyaltyEarnRule from '../models/LoyaltyEarnRule.js';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import RewardCatalogItem from '../models/RewardCatalogItem.js';
import RewardRedemption from '../models/RewardRedemption.js';
import logger from '../config/logger.js';
import { randomInt } from 'node:crypto';

export const loyaltyService = {
  /**
   * Initialize default earn rules if they don't exist
   */
  async initializeEarnRules() {
    const rules = [
      { action: 'ride_completed', points: 25 },
      { action: 'consultation_completed', points: 30 },
      { action: 'blood_donation_completed', points: 500 },
      { action: 'appointment_completed', points: 20 },
      { action: 'lab_order_completed', points: 50 },
      { action: 'pharmacy_order_completed', points: 30 },
      { action: 'review_submitted', points: 10 },
      { action: 'referral_qualified', points: 100 },
      { action: 'profile_completed', points: 50 },
    ];

    for (const rule of rules) {
      const exists = await LoyaltyEarnRule.findOne({ action: rule.action }).lean();
      if (!exists) {
        await LoyaltyEarnRule.create(rule);
      }
    }
  },

  /**
   * Earn points for a qualifying action.
   * LOY-M-01: idempotent per (user, action, refId). Dispatch/booking retries
   * and double webhook deliveries used to credit the same completion twice
   * with no unique guard on `earn` rows. A pre-check plus the
   * `loyalty_earn_once` partial unique index (see LoyaltyLedger) makes a
   * duplicate earn a no-op returning 0.
   */
  async earnPoints(userId, actionType, refId = null) {
    if (refId) {
      const dupe = await LoyaltyLedger.findOne({ userId, type: 'earn', reason: actionType, refId }).lean();
      if (dupe) return 0;
    }
    const rule = await LoyaltyEarnRule.findOne({ action: actionType, isActive: true }).lean();
    if (!rule) return 0;

    const user = await User.findById(userId);
    if (!user) return 0;

    const points = rule.points;

    // Update user balances
    user.loyalty.pointsBalance += points;
    user.loyalty.lifetimePoints += points;

    // Tier recalculation based on lifetime points
    if (user.loyalty.lifetimePoints >= 500) user.loyalty.tier = 'Silver';
    if (user.loyalty.lifetimePoints >= 1500) user.loyalty.tier = 'Gold';
    if (user.loyalty.lifetimePoints >= 3000) user.loyalty.tier = 'Platinum';

    await user.save();

    // Log in ledger (LOY-M-01: concurrent double-earns lose the race here).
    try {
      await LoyaltyLedger.create({
        userId,
        type: 'earn',
        points,
        reason: actionType,
        refId,
        balanceAfter: user.loyalty.pointsBalance,
      });
    } catch (err) {
      if (err?.code === 11000) return 0;
      throw err;
    }

    return points;
  },

  /**
   * LOY-M-01 reconciliation: ledger truth vs cached user balances.
   * Returns the earn/reverse/redeem totals, the ledger-derived balance, the
   * stored balance, and whether they agree. Callers (jobs/support) use the
   * mismatch to decide on a repair; this function never writes.
   */
  async reconcileBalance(userId) {
    const rows = await LoyaltyLedger.find({ userId }).select('type points').lean();
    let earned = 0;
    let reversed = 0;
    let redeemed = 0;
    for (const r of rows) {
      if (r.type === 'earn') earned += Number(r.points) || 0;
      else if (r.type === 'reverse') reversed += Number(r.points) || 0; // negative
      else if (r.type === 'redeem') redeemed += Number(r.points) || 0; // negative
    }
    const ledgerBalance = earned + reversed + redeemed;
    const user = await User.findById(userId).select('loyalty').lean();
    const storedBalance = user?.loyalty?.pointsBalance ?? null;
    return {
      earned, reversed, redeemed, ledgerBalance, storedBalance,
      matches: storedBalance === null ? null : storedBalance === ledgerBalance,
      entries: rows.length,
    };
  },

  /**
   * Reverse a previous earn when the booking it belongs to is cancelled
   * (LOYAL-M-02). Guarantees:
   * - Idempotent: at most one `reverse` ledger row per (user, action, refId),
   *   enforced by a partial unique index and a cheap pre-check, so a retried
   *   cancel never deducts twice.
   * - Exact: claws back the points the earn ACTUALLY credited (read from the
   *   ledger), not the current rule amount — a rule edit between earn and
   *   cancel must not change the refund.
   * - No earn → no-op: cancelling a booking that never earned (rides only earn
   *   on completion) must not move balances or create rows.
   * - Reverses BOTH balances: pointsBalance (spendable) and lifetimePoints
   *   (drives tier), then walks the tier down the same 500/1500/3000 ladder
   *   earnPoints climbs. The spendable balance may go negative when the user
   *   already redeemed the points — an honest visible debt; clamping to zero
   *   would keep exactly the inflated points this removes (redeemReward
   *   already refuses to spend a negative balance).
   * Fail-soft by design: callers fire-and-forget with a .catch — a reversal
   * failure must never fail the cancellation it accompanies.
   */
  async reversePoints(userId, actionType, refId = null) {
    const reversalReason = `reversed:${actionType}`;

    const existing = await LoyaltyLedger.findOne({
      userId,
      type: 'reverse',
      reason: reversalReason,
      ...(refId ? { refId } : {}),
    }).lean();
    if (existing) return { reversed: 0, alreadyReversed: true };

    const earn = await LoyaltyLedger.findOne({
      userId,
      type: 'earn',
      reason: actionType,
      ...(refId ? { refId } : {}),
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!earn || !(earn.points > 0)) return { reversed: 0 };

    const points = earn.points;
    const updated = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { 'loyalty.pointsBalance': -points, 'loyalty.lifetimePoints': -points } },
      { new: true },
    ).select('loyalty');
    if (!updated) return { reversed: 0 };

    try {
      await LoyaltyLedger.create({
        userId,
        type: 'reverse',
        points: -points,
        reason: reversalReason,
        refId,
        balanceAfter: updated.loyalty.pointsBalance,
      });
    } catch (err) {
      if (err?.code === 11000) {
        // A concurrent reversal won the unique-index race — give the points
        // back so the balance is decremented exactly once, then report the
        // no-op.
        try {
          await User.updateOne(
            { _id: userId },
            { $inc: { 'loyalty.pointsBalance': points, 'loyalty.lifetimePoints': points } },
          );
        } catch (undoErr) {
          logger.error(
            `loyalty reversePoints: undo of double-decrement failed for user ${userId}: ${undoErr.message}`,
          );
        }
        return { reversed: 0, alreadyReversed: true };
      }
      throw err;
    }

    const lifetime = updated.loyalty.lifetimePoints;
    const tier =
      lifetime >= 3000 ? 'Platinum' : lifetime >= 1500 ? 'Gold' : lifetime >= 500 ? 'Silver' : 'Bronze';
    if (tier !== updated.loyalty.tier) {
      await User.updateOne({ _id: userId }, { $set: { 'loyalty.tier': tier } });
    }

    return { reversed: points, newBalance: updated.loyalty.pointsBalance, tier };
  },

  /**
   * Redeem reward - user spends points
   */
  async redeemReward(userId, catalogItemId) {
    const catalogItem = await RewardCatalogItem.findById(catalogItemId).lean();
    if (!catalogItem || !catalogItem.isActive) return { success: false, message: 'Reward not available' };

    const user = await User.findById(userId);
    if (!user || user.loyalty.pointsBalance < catalogItem.pointsRequired) {
      return { success: false, message: 'Insufficient points' };
    }

    // Check stock limit
    if (catalogItem.stockLimit > 0 && catalogItem.redeemedCount >= catalogItem.stockLimit) {
      return { success: false, message: 'Reward out of stock' };
    }

    // Create redemption record
    const code = generateUniqueCode(8).toUpperCase();
    const expiresAt = new Date(Date.now() + catalogItem.validityDays * 24 * 60 * 60 * 1000);

    const redemption = new RewardRedemption({
      userId,
      rewardCatalogItemId: catalogItemId,
      pointsSpent: catalogItem.pointsRequired,
      code,
      expiresAt,
    });
    await redemption.save();

    // Deduct points
    user.loyalty.pointsBalance -= catalogItem.pointsRequired;
    await user.save();

    // Log in ledger
    await LoyaltyLedger.create({
      userId,
      type: 'redeem',
      points: -catalogItem.pointsRequired,
      reason: `reward_redeemed:${catalogItem.code}`,
      refId: catalogItemId,
      balanceAfter: user.loyalty.pointsBalance,
    });

    // Update catalog redeemed count
    await RewardCatalogItem.findByIdAndUpdate(catalogItemId, { $inc: { redeemedCount: 1 } });

    return {
      success: true,
      code,
      pointsSpent: catalogItem.pointsRequired,
      newBalance: user.loyalty.pointsBalance,
      expiresAt,
    };
  },

  /**
   * Get user's loyalty summary
   */
  async getSummary(userId) {
    const user = await User.findById(userId).select('loyalty');
    if (!user) return null;

    return {
      pointsBalance: user.loyalty.pointsBalance,
      lifetimePoints: user.loyalty.lifetimePoints,
      tier: user.loyalty.tier,
    };
  },

  /**
   * Get user's redemption history
   */
  async getRedemptions(userId) {
    return await RewardRedemption.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Get active rewards catalog (filtered by user's balance)
   */
  async getCatalog(userId) {
    const catalog = await RewardCatalogItem.find({ isActive: true }).lean();

    const user = await User.findById(userId);
    if (!user) return catalog;

    return catalog.map(item => ({
      ...item,
      isUnlocked: user.loyalty.pointsBalance >= item.pointsRequired,
      pointsNeeded: item.pointsRequired - user.loyalty.pointsBalance,
    }));
  },

  /**
   * Apply reward at checkout - validate and calculate discount
   */
  async applyRewardAtCheckout(userId, code, orderType) {
    const redemption = await RewardRedemption.findOne({
      code,
      userId,
      status: 'active',
    }).lean();

    if (!redemption) return { success: false, message: 'Invalid or expired reward code' };

    if (redemption.expiresAt < new Date()) {
      return { success: false, message: 'Reward code expired' };
    }

    // Check applicable service
    const catalogItem = await RewardCatalogItem.findById(redemption.rewardCatalogItemId).lean();
    if (!catalogItem) return { success: false, message: 'Reward catalog item not found' };

    // Check if this reward applies to this order type
    const serviceMap = {
      pharmacy: 'pharmacy',
      lab: 'lab',
      delivery: 'delivery',
      consultation: 'consultation',
    };

    if (catalogItem.applicableService !== 'all' && catalogItem.applicableService !== serviceMap[orderType]) {
      return { success: false, message: 'This reward does not apply to this order type' };
    }

    // Calculate discount
    let discount = 0;
    let discountType = 'fixed';
    const capAmount = catalogItem.maxCapAmount || 0;

    if (catalogItem.rewardType === 'percentage') {
      // percentage discount - will be calculated at checkout based on order total
      discount = catalogItem.rewardValue; // e.g. 20 means 20%
      discountType = 'percentage';
    } else if (catalogItem.rewardType === 'fixed') {
      discount = catalogItem.rewardValue; // e.g. 300 means ₹300 off
      discountType = 'fixed';
    } else if (catalogItem.rewardType === 'free_item') {
      discount = capAmount; // free delivery up to cap amount
      discountType = 'free_item';
    }

    return {
      success: true,
      discount,
      discountType,
      capAmount,
      rewardTitle: catalogItem.title,
    };
  },
};

/**
 * Generate a unique code (helper)
 */
function generateUniqueCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(randomInt(0, chars.length));
  }
  return code;
}