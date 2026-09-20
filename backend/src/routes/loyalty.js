import express from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth.js';
import { loyaltyService } from '../services/loyaltyService.js';
import LoyaltyLedger from '../models/LoyaltyLedger.js';
import RewardRedemption from '../models/RewardRedemption.js';
import RewardCatalogItem from '../models/RewardCatalogItem.js';
import LoyaltyEarnRule from '../models/LoyaltyEarnRule.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── Patient: Get loyalty summary ───
router.get('/summary', protect, async (req, res) => {
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
router.get('/ledger', protect, async (req, res) => {
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
router.get('/catalog', protect, async (req, res) => {
  try {
    const catalog = await loyaltyService.getCatalog(req.user._id);
    res.json(catalog);
  } catch (err) {
    logger.error(`Get rewards catalog error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Patient: Redeem reward ───
router.post('/redeem/:itemId', protect, async (req, res) => {
  try {
    const result = await loyaltyService.redeemReward(req.user._id, req.params.itemId);
    if (result.success) {
      res.json({ success: true, code: result.code, pointsSpent: result.pointsSpent, newBalance: result.newBalance, expiresAt: result.expiresAt });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (err) {
    logger.error(`Redeem reward error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Patient: Get my redemptions ───
router.get('/my-redemptions', protect, async (req, res) => {
  try {
    const redemptions = await loyaltyService.getRedemptions(req.user._id);
    res.json(redemptions);
  } catch (err) {
    logger.error(`Get my redemptions error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Initialize earn rules ───
router.post('/admin/init-rules', protect, async (req, res) => {
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
router.get('/admin/earn-rules', protect, async (req, res) => {
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
router.post('/admin/earn-rule', protect, async (req, res) => {
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
router.get('/admin/redemptions', protect, async (req, res) => {
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
router.post('/admin/adjust/:userId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { points, reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.loyalty.pointsBalance += points;
    user.loyalty.lifetimePoints += points;
    await user.save();

    await LoyaltyLedger.create({
      userId: user._id,
      type: 'admin_adjustment',
      points,
      reason: reason || 'admin_adjustment',
      balanceAfter: user.loyalty.pointsBalance,
    });

    res.json({ success: true, newBalance: user.loyalty.pointsBalance });
  } catch (err) {
    logger.error(`Admin adjust points error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Get all reward catalog items (active + inactive) ───
router.get('/admin/reward-catalog', protect, async (req, res) => {
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
router.post('/admin/reward-catalog', protect, async (req, res) => {
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
router.put('/admin/reward-catalog/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const item = await RewardCatalogItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Reward item nahi mila' });
    res.json(item);
  } catch (err) {
    logger.error(`Update reward catalog item error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Delete (soft — deactivate) a reward catalog item ───
router.delete('/admin/reward-catalog/:id', protect, async (req, res) => {
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