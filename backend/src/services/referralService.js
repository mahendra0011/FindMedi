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
  async applyReferralCode(userId, referralCode, context = {}) {
    if (!referralCode) return;

    const referrer = await User.findOne({ 'referral.code': referralCode }).select('_id email');
    if (!referrer) return; // invalid code

    // Self-referral block
    if (String(referrer._id) === String(userId)) return;

    // Check if this referee already has a referrer
    const existingReferral = await Referral.findOne({ refereeId: userId }).lean();
    if (existingReferral) return; // already referred

    // Spec 25 §4: device/IP ring detection — hash PII, never store raw IP.
    const ipHash = context.ip ? crypto.createHash('sha256').update(String(context.ip)).digest('hex').slice(0, 32) : '';
    const deviceHash = context.userAgent ? crypto.createHash('sha256').update(String(context.userAgent)).digest('hex').slice(0, 32) : '';

    // Create pending referral record
    const referral = new Referral({
      referrerId: referrer._id,
      refereeId: userId,
      code: referralCode,
      status: 'pending',
      ipHash,
      deviceHash,
    });

    // Fraud ring: 3+ referees from the same IP within 24h → flag, no rewards ever.
    if (ipHash) {
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const sameIpCount = await Referral.countDocuments({ ipHash, createdAt: { $gte: since } });
      if (sameIpCount >= 3) {
        referral.status = 'fraud_flagged';
      }
    }
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

    // Credit rewards to both via the loyalty points ledger (cooling-off over:
    // credits land only after the referee's first qualifying trip, never at signup).
    let referrerCredited = 0;
    let refereeCredited = 0;
    try {
      const { loyaltyService } = await import('./loyaltyService.js');
      referrerCredited = await loyaltyService.earnPoints(referral.referrerId._id, 'referral_qualified', referral._id);
      refereeCredited = await loyaltyService.earnPoints(refereeId, 'referral_qualified', referral._id);
    } catch {
      // Ledger failure must not roll back the qualified referral state.
    }
    await Referral.findByIdAndUpdate(referral._id, {
      status: 'rewarded',
      rewardedAt: new Date(),
      referrerRewardPoints: settings.referrerPoints,
      refereeRewardPoints: settings.refereePoints,
    });

    return {
      referrerId: referral.referrerId._id,
      refereeId: refereeId,
      referrerPoints: settings.referrerPoints,
      refereePoints: settings.refereePoints,
      referrerCredited,
      refereeCredited,
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