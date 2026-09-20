import express from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth.js';
import { referralService } from '../services/referralService.js';
import Referral from '../models/Referral.js';
import ReferralSettings from '../models/ReferralSettings.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── Patient: Get my referral code ───
router.get('/my-code', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('referral');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ code: user.referral.code, referral: user.referral });
  } catch (err) {
    logger.error(`Get referral code error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Patient: Get referral stats ───
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await referralService.getReferralStats(req.user._id);
    res.json(stats);
  } catch (err) {
    logger.error(`Get referral stats error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Get all referrals ───
router.get('/admin/all', protect, async (req, res) => {
  try {
    // Only superadmin or hospital_admin can view
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const referrals = await Referral.find()
      .populate('referrerId', 'name email')
      .populate('refereeId', 'name email')
      .sort({ createdAt: -1 });
    res.json(referrals);
  } catch (err) {
    logger.error(`Get all referrals error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Get referrals by status ───
router.get('/admin/status/:status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const referrals = await Referral.find({ status: req.params.status })
      .populate('referrerId', 'name email')
      .populate('refereeId', 'name email')
      .sort({ createdAt: -1 });
    res.json(referrals);
  } catch (err) {
    logger.error(`Get referrals by status error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Flag/unflag referral for fraud ───
router.put('/admin/flag/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { flagged } = req.body;
    await Referral.findByIdAndUpdate(req.params.id, { status: flagged ? 'fraud_flagged' : 'pending' });
    res.json({ message: flagged ? 'Referral flagged as fraud' : 'Referral unflagged' });
  } catch (err) {
    logger.error(`Flag referral error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Get referral settings ───
router.get('/admin/settings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const settings = await ReferralSettings.findOne();
    res.json(settings || {});
  } catch (err) {
    logger.error(`Get referral settings error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: Update referral settings ───
router.put('/admin/settings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const {
      isEnabled,
      qualifyingAction,
      referrerPoints,
      refereePoints,
      maxReferralsPerMonth,
    } = req.body;

    let settings = await ReferralSettings.findOne();
    if (!settings) {
      settings = new ReferralSettings();
    }

    if (isEnabled !== undefined) settings.isEnabled = isEnabled;
    if (qualifyingAction) settings.qualifyingAction = qualifyingAction;
    if (referrerPoints !== undefined) settings.referrerPoints = referrerPoints;
    if (refereePoints !== undefined) settings.refereePoints = refereePoints;
    if (maxReferralsPerMonth !== undefined) settings.maxReferralsPerMonth = maxReferralsPerMonth;

    await settings.save();
    res.json(settings);
  } catch (err) {
    logger.error(`Update referral settings error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;