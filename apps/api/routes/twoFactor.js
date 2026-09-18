import express from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';

const twoFactorVerifySchema = z.object({ token: z.string().regex(/^\d{6}$/, 'Valid 6-digit code is required') });
const twoFactorDisableSchema = z.object({ password: z.string().min(1, 'Password is required') });
const twoFactorValidateSchema = z.object({ email: z.string().email('Valid email is required'), token: z.string().optional(), backupCode: z.string().optional() });
import {
  generateSecret,
  generateOtpAuthUrl,
  verifyToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../services/twoFactorService.js';

const router = express.Router();

/**
 * POST /api/auth/2fa/setup
 * Generate 2FA secret and QR code URL (step 1)
 */
router.post('/setup', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled. Disable it first to regenerate.' });
    }

    const secret = generateSecret();
    user.twoFactorTempSecret = secret;
    await user.save();

    const otpAuthUrl = generateOtpAuthUrl(secret, user.email);

    res.json({
      secret,
      otpAuthUrl,
      message: 'Scan the QR code or enter the secret in your authenticator app, then verify with a code.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP token and enable 2FA (step 2)
 */
router.post('/verify', protect, validate(twoFactorVerifySchema), async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ message: 'Please call /api/auth/2fa/setup first' });
    }

    if (!verifyToken(token, user.twoFactorTempSecret)) {
      return res.status(400).json({ message: 'Invalid code. Try again.' });
    }

    // Enable 2FA
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

    user.twoFactorEnabled = true;
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = '';
    user.twoFactorBackupCodes = hashedBackupCodes;
    await user.save();

    res.json({
      message: '2FA enabled successfully',
      backupCodes, // Return plain text codes once — user must save them
      warning: 'Save these backup codes in a secure place. They will not be shown again.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA (requires current password)
 */
router.post('/disable', protect, validate(twoFactorDisableSchema), async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = '';
    user.twoFactorBackupCodes = [];
    user.twoFactorTempSecret = '';
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/auth/2fa/validate
 * Validate 2FA during login (called after password verification)
 */
router.post('/validate', validate(twoFactorValidateSchema), async (req, res) => {
  try {
    const { email, token, backupCode } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled for this account' });
    }

    // Try TOTP token first
    if (token) {
      if (verifyToken(token, user.twoFactorSecret)) {
        return res.json({ valid: true, method: 'totp' });
      }
      return res.status(400).json({ message: 'Invalid 2FA code' });
    }

    // Try backup code
    if (backupCode) {
      const { valid, codeIndex } = verifyBackupCode(backupCode, user.twoFactorBackupCodes);
      if (valid) {
        // Remove used backup code
        user.twoFactorBackupCodes.splice(codeIndex, 1);
        await user.save();
        return res.json({ valid: true, method: 'backup', remaining: user.twoFactorBackupCodes.length });
      }
      return res.status(400).json({ message: 'Invalid backup code' });
    }

    return res.status(400).json({ message: 'Either token or backupCode is required' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/auth/2fa/status
 * Check 2FA status for current user
 */
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('twoFactorEnabled');
    res.json({ enabled: user?.twoFactorEnabled || false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;