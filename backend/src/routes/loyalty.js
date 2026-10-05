import express from 'express';
import { z } from 'zod';
import { protect, authorize, adminOnly } from '../middleware/auth.js';
// LOYAL-B-01: points are money — every mutation is replay-guarded and audited.
import { idempotencyGuard } from '../middleware/idempotency.js';
import { auditLog } from '../middleware/audit.js';
import { sendServerError } from '../utils/safeError.js';
import { validate } from '../utils/validate.js';
import { loyaltyService } from '../services/loyaltyService.js';
import LoyaltyLedger from '../models/LoyaltyLedger.js';
import RewardRedemption from '../models/RewardRedemption.js';
import RewardCatalogItem from '../models/RewardCatalogItem.js';
import LoyaltyEarnRule from '../models/LoyaltyEarnRule.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const router = express.Router();

// LAW-004: zod schema for loyalty adjustment — non-zero, bounded, reason required
const adjustSchema = z.object({
  points: z.number().int().refine(v => v !== 0, 'points must be non-zero'),
  reason: z.string().min(5, 'reason required (min 5 chars)'),
});


// ─── Patient: Get loyalty summary ───
router.get('/summary', protect, authorize('loyalty:read:own'), async (req, res) => {
  try {
    const summary = await loyaltyService.getSummary(req.user._id);
    if (!summary) return res.status(404).json({ message: 'User not found' });
    res.json(summary);
  } catch (err) {
    logger.error(`Get loyalty summary error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Patient: Get loyalty ledger ───
router.get('/ledger', protect, authorize('loyalty:read:own'), async (req, res) => {
  try {
    const ledger = await LoyaltyLedger.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(ledger);
  } catch (err) {
    logger.error(`Get loyalty ledger error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Patient: Get rewards catalog ───
router.get('/catalog', protect, authorize('loyalty:read:own'), async (req, res) => {
  try {
    const catalog = await loyaltyService.getCatalog(req.user._id);
    res.json(catalog);
  } catch (err) {
    logger.error(`Get rewards catalog error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Patient: Redeem reward ───
// LOYAL-B-01: every points mutation is audited and idempotent.
//
// The route delegated straight to `loyaltyService.redeemReward`, so a retried
// POST (network timeout, double tap) redeemed the reward twice — points are money,
// and a silent double-spend is exactly what the ledger exists to prevent.
//
// The replay guard makes the call exactly-once, and the audit row records WHO
// spent WHAT, which is what makes an unexplained balance change investigable.
router.post('/redeem/:itemId', protect, authorize('loyalty:write:own'), idempotencyGuard({ prefix: 'loyalty-redeem', failClosed: true }), async (req, res) => {
  try {
    const result = await loyaltyService.redeemReward(req.user._id, req.params.itemId);
    if (result.success) {
      await auditLog('redeem_loyalty_reward', req.user._id, {
        itemId: req.params.itemId,
        rewardCode: result.code,
        pointsSpent: result.pointsSpent,
        newBalance: result.newBalance,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.json({ success: true, code: result.code, pointsSpent: result.pointsSpent, newBalance: result.newBalance, expiresAt: result.expiresAt });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (err) {
    logger.error(`Redeem reward error: ${err.message}`);
    sendServerError(res, err, 'Could not redeem reward', { itemId: req.params.itemId });
  }
});

// ─── Patient: Get my redemptions ───
router.get('/my-redemptions', protect, authorize('loyalty:read:own'), async (req, res) => {
  try {
    const redemptions = await loyaltyService.getRedemptions(req.user._id);
    res.json(redemptions);
  } catch (err) {
    logger.error(`Get my redemptions error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Initialize earn rules ───
router.post('/admin/init-rules', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    await loyaltyService.initializeEarnRules();
    res.json({ message: 'Earn rules initialized' });
  } catch (err) {
    logger.error(`Init earn rules error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Get all earn rules ───
router.get('/admin/earn-rules', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const rules = await LoyaltyEarnRule.find().lean();
    res.json(rules);
  } catch (err) {
    logger.error(`Get earn rules error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Create/Update earn rule ───
router.post('/admin/earn-rule', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { action, points, isActive } = req.body;
    const rule = await LoyaltyEarnRule.findOneAndUpdate(
      { action },
      { points, isActive, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json(rule);
  } catch (err) {
    logger.error(`Create earn rule error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Get all redemptions ───
router.get('/admin/redemptions', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const redemptions = await RewardRedemption.find()
      .populate('userId', 'name email')
      .populate('rewardCatalogItemId', 'title pointsRequired')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(redemptions);
  } catch (err) {
    logger.error(`Get admin redemptions error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Manual points adjust ───
// LOYAL-B-01: an admin balance adjustment is an unaudited read-modify-write.
//
// `user.loyalty.pointsBalance += points` loaded the document, added in JS and
// saved the whole thing — so two concurrent adjustments each read the same
// balance and one overwrote the other. The increment is now an ATOMIC $inc (no
// read-modify-write), it cannot drive a balance negative, it is idempotent under
// retry, and the audit row records before/after so an unexplained change is
// traceable.
router.post('/admin/adjust/:userId', protect, adminOnly, idempotencyGuard({ prefix: 'loyalty-adjust', failClosed: true }), validate(adjustSchema), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { points, reason } = req.body;

    const before = await User.findById(req.params.userId).select('loyalty').lean();
    if (!before) return res.status(404).json({ message: 'User not found' });

    const current = before.loyalty?.pointsBalance ?? 0;
    if (current + points < 0) {
      return res.status(400).json({
        message: 'Adjustment would drive the points balance negative',
        currentBalance: current,
        requested: points,
      });
    }

    // Atomic: the server applies the delta, it never receives a new total.
    const updated = await User.findOneAndUpdate(
      { _id: req.params.userId },
      { $inc: { 'loyalty.pointsBalance': points, 'loyalty.lifetimePoints': points } },
      { new: true }
    ).select('loyalty');
    if (!updated) return res.status(404).json({ message: 'User not found' });

    await LoyaltyLedger.create({
      userId: req.params.userId,
      type: 'admin_adjustment',
      points,
      reason: reason || 'admin_adjustment',
      balanceAfter: updated.loyalty?.pointsBalance ?? 0,
    });
    await auditLog('adjust_loyalty_points', req.user._id, {
      userId: req.params.userId,
      points,
      balanceBefore: current,
      balanceAfter: updated.loyalty?.pointsBalance ?? 0,
      reason: reason || 'admin_adjustment',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, newBalance: updated.loyalty?.pointsBalance ?? 0 });
  } catch (err) {
    logger.error(`Admin adjust points error: ${err.message}`);
    sendServerError(res, err, 'Could not adjust points', { userId: req.params.userId });
  }
});

// ─── Admin: Get all reward catalog items (active + inactive) ───
router.get('/admin/reward-catalog', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const items = await RewardCatalogItem.find().sort({ pointsRequired: 1 }).lean();
    res.json(items);
  } catch (err) {
    logger.error(`Get reward catalog error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Create a new reward catalog item ───
router.post('/admin/reward-catalog', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const {
      title, description, category, pointsRequired,
      rewardType, rewardValue, applicableService,
      maxCapAmount, validityDays, stockLimit,
    } = req.body;

    if (!title || !category || !pointsRequired || !rewardType) {
      return res.status(400).json({ message: 'title, category, pointsRequired, rewardType required hain' });
    }

    const item = await RewardCatalogItem.create({
      title, description, category, pointsRequired,
      rewardType, rewardValue, applicableService,
      maxCapAmount, validityDays, stockLimit,
      isActive: true,
    });
    res.status(201).json(item);
  } catch (err) {
    logger.error(`Create reward catalog item error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Update a reward catalog item ───
router.put('/admin/reward-catalog/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    // mass-assignment-guard: allowlist — a raw req.body here let callers
    // overwrite non-editable fields (e.g. the redeemedCount redemption counter).
    const UPDATABLE = [
      'title', 'description', 'category', 'pointsRequired', 'rewardType',
      'rewardValue', 'applicableService', 'maxCapAmount', 'validityDays',
      'stockLimit', 'isActive',
    ];
    const patch = Object.fromEntries(
      UPDATABLE.filter((key) => key in req.body).map((key) => [key, req.body[key]])
    );
    const item = await RewardCatalogItem.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!item) return res.status(404).json({ message: 'Reward item nahi mila' });
    res.json(item);
  } catch (err) {
    logger.error(`Update reward catalog item error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Delete (soft — deactivate) a reward catalog item ───
router.delete('/admin/reward-catalog/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Soft delete — existing redemptions ki history tootegi nahi
    const item = await RewardCatalogItem.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) return res.status(404).json({ message: 'Reward item nahi mila' });
    res.json({ success: true, item });
  } catch (err) {
    logger.error(`Delete reward catalog item error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;