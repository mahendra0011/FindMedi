import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
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
      const token = require('crypto').randomBytes(16).toString('base64url');
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
        ? Math.floor((Date.now() - user.dateOfBirth) / 31557600000 / 365.25)
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