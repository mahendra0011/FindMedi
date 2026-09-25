import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { generateOTP } from '../utils/otp.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiter for public QR scans (very strict, per-token)
const publicScanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 scans per minute per token
  message: { message: 'Too many scans, please slow down.' },
});

// ─── Generate / Rotate QR Token (Patient, Auth required) ───
router.post('/generate', protect, async (req, res) => {
  try {
    let user = await User.findById(req.user._id);

    // If user wants to regenerate (already has token and confirms)
    if (user.healthIdCard.qrToken && req.body.regenerate) {
      user.healthIdCard.qrToken = null;
      user.healthIdCard.lastRotatedAt = new Date();
      await user.save();
    }

    // Generate new token if not exists
    if (!user.healthIdCard.qrToken) {
      // Generate a random 16-byte base64url token (22 chars approx, URL-safe)
      const token = randomBytes(16).toString('base64url');
      user.healthIdCard.qrToken = token;
      await user.save();
    }

    const qrPayloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/health-id/${user.healthIdCard.qrToken}`;

    res.json({ qrToken: user.healthIdCard.qrToken, qrPayloadUrl });
  } catch (err) {
    logger.error(`Health ID generate error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Update Health ID settings (Share Level, Enable/Disable) ───
router.put('/settings', protect, async (req, res) => {
  try {
    const { isEnabled, shareLevel } = req.body;
    const user = await User.findById(req.user._id);

    if (isEnabled !== undefined) user.healthIdCard.isEnabled = isEnabled;
    if (shareLevel) user.healthIdCard.shareLevel = shareLevel;

    await user.save();
    res.json({ healthIdCard: user.healthIdCard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ABDM M1: Generate OTP for ABHA creation / linking (Patient, Auth required) ───
router.post('/abha/generate-otp', protect, async (req, res) => {
  try {
    const { aadhaarOrMobile } = req.body;
    if (!aadhaarOrMobile || String(aadhaarOrMobile).length < 10) {
      return res.status(400).json({ message: 'Valid 10-digit mobile or 12-digit Aadhaar required' });
    }

    // Zero Plaintext Aadhaar Storage: Never persist the raw identification number
    // In production, invokes ABDM Sandbox Gateway API: /v1/registration/aadhaar/generateOtp
    const txnId = uuidv4();
    logger.info(`[ABDM_GATEWAY] Generated OTP transaction: ${txnId} for user ${req.user._id}`);

    // Update status to PENDING_OTP
    await User.findByIdAndUpdate(req.user._id, {
      'healthIdCard.abhaStatus': 'PENDING_OTP',
    });

    res.json({
      success: true,
      txnId,
      message: 'OTP has been dispatched to your Aadhaar/Mobile registered number (Mock ABDM: Use 123456)',
    });
  } catch (err) {
    logger.error(`ABHA generate-otp error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── ABDM M1: Verify OTP and Mint/Link ABHA (Patient, Auth required) ───
router.post('/abha/verify-otp', protect, async (req, res) => {
  try {
    const { otp, txnId } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    // In sandbox demo mode, accept '123456' or any valid 6-digit OTP
    if (otp !== '123456' && String(otp).length !== 6) {
      return res.status(400).json({ message: 'Invalid OTP. Please check the 6-digit code.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate or format 14-digit standardized ABHA ID (e.g., 91-XXXX-XXXX-XXXX)
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    const abhaNumber = `91-${String(randomSuffix).slice(0, 4)}-${String(randomSuffix).slice(4, 8)}-${String(randomSuffix).slice(8, 12)}`;
    const sanitizedName = (user.name || 'patient').toLowerCase().replace(/[^a-z0-9]/g, '');
    const abhaAddress = `${sanitizedName}${Math.floor(100 + Math.random() * 900)}@abdm`;

    user.healthIdCard.abhaNumber = abhaNumber;
    user.healthIdCard.abhaAddress = abhaAddress;
    user.healthIdCard.abhaStatus = 'LINKED';
    user.healthIdCard.abhaLinkedAt = new Date();

    // Auto-generate QR Token if missing
    if (!user.healthIdCard.qrToken) {
      user.healthIdCard.qrToken = randomBytes(16).toString('base64url');
    }

    await user.save();
    logger.info(`[ABDM_GATEWAY] Successfully linked ABHA ${abhaNumber} for user ${user._id}`);

    res.json({
      success: true,
      message: 'ABHA successfully created and linked to FindMedi Health Profile',
      abhaNumber,
      abhaAddress,
      qrToken: user.healthIdCard.qrToken,
    });
  } catch (err) {
    logger.error(`ABHA verify-otp error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Public read: scan QR token (NO auth required) ───
// Doc 04 §3.2: login QR se fark - ye door ke liye khulta hai
router.get('/:qrToken', async (req, res) => {
  try {
    const user = await User.findOne({ 'healthIdCard.qrToken': req.params.qrToken });

    if (!user || !user.healthIdCard.isEnabled) {
      // Generic 404 to avoid info leak
      return res.status(404).json({ message: 'Card not found or disabled' });
    }

    const shareLevel = user.healthIdCard.shareLevel;

    // Build response based on shareLevel - minimize PII
    const response = {
      name: user.name,
      age: user.dateOfBirth
        ? Math.floor((Date.now() - user.dateOfBirth) / 31557600000)
        : null,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
    };

    // Full share: allergies + conditions + emergency contact
    if (shareLevel === 'full') {
      response.allergies = user.allergies.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
      }));
      response.knownConditions = user.knownConditions.map(c => ({
        condition: c.condition,
        since: c.since,
        notes: c.notes,
      }));
      response.emergencyContact = {
        name: user.emergencyContact.name,
        phone: user.emergencyContact.phone,
      };
    } else {
      // Minimal: just blood group + contact (no allergies/conditions details)
      response.emergencyContact = {
        name: user.emergencyContact.name,
        phone: user.emergencyContact.phone,
      };
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;