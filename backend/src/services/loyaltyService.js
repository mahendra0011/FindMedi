import mongoose from 'mongoose';
import LoyaltyLedger from '../models/LoyaltyLedger.js';
import LoyaltyEarnRule from '../models/LoyaltyEarnRule.js';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import RewardCatalogItem from '../models/RewardCatalogItem.js';
import RewardRedemption from '../models/RewardRedemption.js';

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
   * Earn points for a qualifying action
   */
  async earnPoints(userId, actionType, refId = null) {
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

    // Log in ledger
    await LoyaltyLedger.create({
      userId,
      type: 'earn',
      points,
      reason: actionType,
      refId,
      balanceAfter: user.loyalty.pointsBalance,
    });

    return points;
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
    let capAmount = catalogItem.maxCapAmount || 0;

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
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}