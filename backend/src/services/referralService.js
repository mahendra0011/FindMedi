import mongoose from 'mongoose';
import Referral from '../models/Referral.js';
import ReferralSettings from '../models/ReferralSettings.js';
import User from '../models/User.js';
import crypto from 'crypto';

const generateReferralCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.toUpperCase();
};

export const referralService = {
  /**
   * Generate and save a referral code for a user (called on first access to Referral page)
   */
  async generateReferralCode(userId) {
    let user = await User.findById(userId);
    if (!user.referral.code) {
      let code = generateReferralCode(6);
      // Unique check loop
      let exists = await Referral.findOne({ code }).lean();
      while (exists) {
        code = generateReferralCode(6);
        exists = await Referral.findOne({ code }).lean();
      }
      user.referral.code = code;
      await user.save();
    }
    return user.referral.code;
  },

  /**
   * Apply referral code during signup
   * Called from auth signup handler
   */
  async applyReferralCode(userId, referralCode) {
    if (!referralCode) return;

    const referrer = await User.findOne({ 'referral.code': referralCode }).select('_id email');
    if (!referrer) return; // invalid code

    // Self-referral block
    if (String(referrer._id) === String(userId)) return;

    // Check if this referee already has a referrer
    const existingReferral = await Referral.findOne({ refereeId: userId }).lean();
    if (existingReferral) return; // already referred

    // Create pending referral record
    const referral = new Referral({
      referrerId: referrer._id,
      refereeId: userId,
      code: referralCode,
      status: 'pending',
    });
    await referral.save();

    // Update user referral fields
    await User.findByIdAndUpdate(userId, {
      $set: { 'referral.referredBy': referrer._id, 'referral.referredByCode': referralCode },
    });

    return referral;
  },

  /**
   * Check if a qualifying event should trigger rewards
   * Called when referee completes a qualifying action (appointment, order, etc.)
   */
  async checkAndRewardReferral(refereeId, actionType) {
    const settings = await ReferralSettings.findOne().lean();
    if (!settings?.isEnabled) return;

    const referral = await Referral.findOne({
      refereeId,
      status: 'pending',
    }).populate('referrerId');

    if (!referral) return;

    // Check if qualifying action matches config
    const qualifyingActions = {
      signup_only: true,
      first_appointment: actionType === 'first_appointment' || actionType === 'appointment_completed',
      first_order: actionType === 'first_order' || actionType === 'order_completed',
      first_lab_test: actionType === 'first_lab_test' || actionType === 'lab_test_completed',
    };

    if (!qualifyingActions[settings.qualifyingAction]) return;

    // Update referral status
    await Referral.findByIdAndUpdate(referral._id, {
      status: 'qualified',
      qualifyingAction: actionType,
      qualifiedAt: new Date(),
    });

    // Credit rewards to both via Loyalty/Points ledger
    // (This doc assumes points ledger exists elsewhere; here we just mark as rewarded)
    await Referral.findByIdAndUpdate(referral._id, {
      status: 'rewarded',
      rewardedAt: new Date(),
      referrerRewardPoints: settings.referrerPoints,
      refereeRewardPoints: settings.refereePoints,
    });

    // TODO: Actually credit points to user wallets via the existing points ledger system
    // Example: await LoyaltyService.creditPoints(referrerId, settings.referrerPoints, 'referral');
    // Example: await LoyaltyService.creditPoints(refereeId, settings.refereePoints, 'referral_welcome');

    return {
      referrerId: referral.referrerId._id,
      refereeId: refereeId,
      referrerPoints: settings.referrerPoints,
      refereePoints: settings.refereePoints,
    };
  },

  /**
   * Get user's referral stats
   */
  async getReferralStats(userId) {
    const [totalReferred, qualified, rewarded, pending] = await Promise.all([
      Referral.countDocuments({ referrerId: userId }),
      Referral.countDocuments({ referrerId: userId, status: 'qualified' }),
      Referral.countDocuments({ referrerId: userId, status: 'rewarded' }),
      Referral.countDocuments({ referrerId: userId, status: 'pending' }),
    ]);

    return {
      totalReferred,
      qualified,
      rewarded,
      pending,
    };
  },

  /**
   * Get recent referrals (admin)
   */
  async getRecentReferrals(filter = {}) {
    return await Referral.find(filter)
      .populate('referrerId', 'name email')
      .populate('refereeId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
  },
};