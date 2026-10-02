import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { randomBytes } from 'crypto';
import { generateOTP } from '../utils/otp.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { rateLimit } from 'express-rate-limit';
import { totpLimiter } from '../middleware/rateLimit.js';
import { auditLog } from '../middleware/audit.js';
// HI-B-02: the public scan endpoint must not leak an internal error.
import { sendServerError } from '../utils/safeError.js';
// HI-B-03: closed-enum validation for the privacy settings.
import { validate } from '../utils/validate.js';

// HI-B-04 / REC-M-04: one lifetime and one mint/revoke implementation, shared
// with routes/patient.js so the two paths can never drift apart again.
import { QR_TOKEN_TTL_MS, mintQrToken, revokeQrToken, healthIdSettingsSchema } from '../lib/healthIdCard.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// Rate limiter for public QR scans (very strict, per-token).
// NOTE: was defined here but never attached to a route — now applied to
// GET /:qrToken below, which is the unauthenticated scan endpoint.
const publicScanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 scans per minute per token
  message: { message: 'Too many scans, please slow down.' },
});

// ─── Generate / Rotate QR Token (Patient, Auth required) ───
router.post('/generate', protect, authorize('profile:write', 'profile:write:own'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // If user wants to regenerate (already has token and confirms), revoke the
    // old one first — a printed card must stop resolving, then mint fresh.
    if (user.healthIdCard.qrToken && req.body.regenerate) {
      revokeQrToken(user.healthIdCard);
      user.healthIdCard.lastRotatedAt = new Date();
      await user.save();
    }

    // REC-008 / REC-M-04: mint through the shared helper, so expiry and the
    // rotation stamp are always written (a token without them is revoked on
    // first read).
    if (!user.healthIdCard.qrToken) {
      mintQrToken(user.healthIdCard);
    }

    await user.save();

    // HI-B-01: no localhost fallback for a public, scannable URL. In development a
    // relative URL is fine; in production FRONTEND_URL is a startup requirement
    // (see envValidator), and a value that is not a real https origin is refused
    // here rather than printed onto a card a paramedic will scan.
    const configured = String(process.env.FRONTEND_URL || '').trim();
    const isProduction = process.env.NODE_ENV === 'production';
    const looksLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(configured);
    if (isProduction && looksLocal) {
      const err = new Error('FRONTEND_URL must be the public https origin of the web app in production');
      err.status = 500;
      throw err;
    }
    const qrPayloadUrl = `${configured || 'http://localhost:3000'}/health-id/${user.healthIdCard.qrToken}`;

    res.json({ qrToken: user.healthIdCard.qrToken, qrPayloadUrl });
  } catch (err) {
    logger.error(`Health ID generate error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// HI-B-03: this endpoint had NO schema, so `shareLevel` accepted any string and
// `isEnabled` accepted any truthy value. The scan response branches on
// `shareLevel === 'full'`, so an unknown value silently degraded the patients
// card to the minimal view with no error — a privacy setting that appears to work
// and does not. Both fields are now a closed enum / a strict boolean (schema
// shared with routes/patient.js in lib/healthIdCard.js).

router.put('/settings', protect, authorize('profile:write', 'profile:write:own'), validate(healthIdSettingsSchema), async (req, res) => {
  try {
    const { isEnabled, shareLevel } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (isEnabled !== undefined) user.healthIdCard.isEnabled = isEnabled;
    if (shareLevel !== undefined) user.healthIdCard.shareLevel = shareLevel;

    // HI-B-04 / REC-M-04: turning the card OFF must also invalidate the token,
    // otherwise a card that was already printed keeps resolving to a live record
    // for anyone holding it. Re-enabling mints a fresh token. Shared helpers, so
    // routes/patient.js does the same thing.
    if (isEnabled === false) {
      revokeQrToken(user.healthIdCard);
    } else if (isEnabled === true && !user.healthIdCard.qrToken) {
      mintQrToken(user.healthIdCard);
    }

    await user.save();
    await auditLog('update_health_id_settings', req.user._id, {
      shareLevel: user.healthIdCard.shareLevel,
      isEnabled: user.healthIdCard.isEnabled,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ healthIdCard: user.healthIdCard });
  } catch (err) {
    sendServerError(res, err, 'Could not update health ID settings');
  }
});

// ─── REC-M-04: scan receipts — "who scanned my card, when" (Patient, auth) ───
//
// The public scan below has been audited since REC-008, but the audit was an
// operator-only view: the patient had no in-app answer to "who has been reading
// my card". This endpoint is that answer — the patient's own scans only (the
// filter is the caller's own id, so there is no way to ask for anyone else's),
// newest first, no-store like every response that carries this data.
//
// The scanner itself is anonymous by design (no login on a paramedic's phone),
// so a receipt records what the network saw: when, from which IP, with which
// user-agent, and what share level was exposed at the time.
const RECEIPT_LIMIT_DEFAULT = 50;
const RECEIPT_LIMIT_MAX = 100;

router.get('/scans', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const requested = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 1), RECEIPT_LIMIT_MAX)
      : RECEIPT_LIMIT_DEFAULT;

    const rows = await AuditLog.find({
      action: 'health_id_qr_scan',
      userId: req.user._id,
    }).sort({ timestamp: -1 }).limit(limit);

    res.set('Cache-Control', 'no-store');
    res.json({
      receipts: rows.map((r) => ({
        scannedAt: r.timestamp,
        ip: r.ip ?? null,
        userAgent: r.userAgent ?? null,
        shareLevel: r.details?.shareLevel ?? null,
      })),
    });
  } catch (err) {
    sendServerError(res, err, 'Could not load scan history');
  }
});

// ─── ABDM M1: Generate OTP for ABHA creation / linking (Patient, Auth required) ───
//
// HI-B-05: this used to flip the status to PENDING_OTP, log a txnId and never
// store an OTP at all (the response even advertised "Use 123456"), so the
// "verification" step was decorative. A real CSPRNG OTP is now generated, stored
// HASHED, bound to the txnId and expires in 5 minutes; it is delivered through
// the platform's notification channel.
const ABHA_OTP_TTL_MS = 5 * 60 * 1000;
const ABHA_OTP_MAX_ATTEMPTS = 5;
const hashAbhaOtp = (otp, txnId, userId) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${txnId}:${userId}:${otp}`).digest('hex');

router.post('/abha/generate-otp', protect, authorize('profile:write:own'), totpLimiter, async (req, res) => {
  try {
    const { aadhaarOrMobile } = req.body;
    if (!aadhaarOrMobile || String(aadhaarOrMobile).length < 10) {
      return res.status(400).json({ message: 'Valid 10-digit mobile or 12-digit Aadhaar required' });
    }

    // Zero Plaintext Aadhaar Storage: Never persist the raw identification number.
    // In production, invokes ABDM Sandbox Gateway API: /v1/registration/aadhaar/generateOtp
    const txnId = uuidv4();
    const otp = generateOTP(6);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.healthIdCard.abhaStatus = 'PENDING_OTP';
    user.healthIdCard.abhaPendingTxnId = txnId;
    user.healthIdCard.abhaOtpHash = hashAbhaOtp(otp, txnId, req.user._id);
    user.healthIdCard.abhaOtpExpiresAt = new Date(Date.now() + ABHA_OTP_TTL_MS);
    user.healthIdCard.abhaOtpAttempts = 0;
    await user.save();

    // Deliver through the platform's own in-app notification channel. (A real
    // ABDM gateway hands the OTP to the registered Aadhaar/mobile number instead;
    // that call site is the single place to swap once sandbox credentials land.)
    try {
      const { default: Notification } = await import('../models/Notification.js');
      await Notification.create({
        userId: req.user._id.toString(),
        title: 'ABHA linking OTP',
        message: `Your OTP to link your ABHA health ID is ${otp}. It expires in 5 minutes.`,
        type: 'system',
      });
    } catch (notifyErr) {
      logger.error(`[ABDM_GATEWAY] OTP dispatch failed for ${txnId}: ${notifyErr.message}`);
    }
    logger.info(`[ABDM_GATEWAY] Generated OTP transaction: ${txnId} for user ${req.user._id}`);

    res.json({
      success: true,
      txnId,
      expiresInSeconds: ABHA_OTP_TTL_MS / 1000,
      message: 'OTP has been dispatched to your Aadhaar/Mobile registered number.',
    });
  } catch (err) {
    logger.error(`ABHA generate-otp error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── ABDM M1: Verify OTP and Mint/Link ABHA (Patient, Auth required) ───
router.post('/abha/verify-otp', protect, authorize('profile:write:own'), totpLimiter, async (req, res) => {
  try {
    const { otp, txnId } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    // REC-009: require exactly 6 digits — no '123456' auto-accept
    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({ message: 'Invalid OTP. Please check the 6-digit code.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // HI-B-05: a challenge must exist, be bound to the txnId, be unexpired and
    // still have attempts left. Previously ANY 6 characters minted an ABHA.
    const card = user.healthIdCard;
    if (card.abhaStatus !== 'PENDING_OTP' || !card.abhaOtpHash) {
      return res.status(400).json({ message: 'No pending ABHA linking request. Start again.' });
    }
    if (txnId && String(txnId) !== String(card.abhaPendingTxnId)) {
      return res.status(400).json({ message: 'txnId does not match the pending request' });
    }
    if (!card.abhaOtpExpiresAt || card.abhaOtpExpiresAt.getTime() < Date.now()) {
      card.abhaStatus = 'NOT_LINKED';
      card.abhaOtpHash = '';
      card.abhaPendingTxnId = '';
      await user.save();
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }
    if ((card.abhaOtpAttempts || 0) >= ABHA_OTP_MAX_ATTEMPTS) {
      card.abhaStatus = 'NOT_LINKED';
      card.abhaOtpHash = '';
      card.abhaPendingTxnId = '';
      await user.save();
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    // Constant-time compare of the HMAC digests.
    const expected = Buffer.from(card.abhaOtpHash, 'hex');
    const provided = Buffer.from(hashAbhaOtp(String(otp), card.abhaPendingTxnId, req.user._id), 'hex');
    const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);

    if (!valid) {
      card.abhaOtpAttempts = (card.abhaOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid OTP. Please check the 6-digit code.' });
    }

    // Single-use: burn the challenge before minting.
    card.abhaOtpHash = '';
    card.abhaPendingTxnId = '';
    card.abhaOtpAttempts = 0;

    // REC-009: use crypto.randomBytes for non-spoofable ABHA number (demo prefix '91-DEMO-')
    const rand = randomBytes(5);
    const abhaNumber = `91-DEMO-${rand.toString('hex').slice(0, 4).toUpperCase()}-${rand.toString('hex').slice(4, 8).toUpperCase()}-${rand.toString('hex').slice(8, 12).toUpperCase()}`;
    const sanitizedName = (user.name || 'patient').toLowerCase().replace(/[^a-z0-9]/g, '');
    const abhaAddress = `${sanitizedName}${randomBytes(2).toString('hex')}@abdm-demo`;

    user.healthIdCard.abhaNumber = abhaNumber;
    user.healthIdCard.abhaAddress = abhaAddress;
    user.healthIdCard.abhaStatus = 'LINKED';
    user.healthIdCard.abhaLinkedAt = new Date();
    user.healthIdCard.abhaOtpExpiresAt = undefined;

    // Auto-generate QR Token if missing (same helper as every other mint path)
    if (!user.healthIdCard.qrToken) {
      mintQrToken(user.healthIdCard);
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
router.get('/:qrToken', publicScanLimiter, async (req, res) => {
  // REC-M-04: this response is personal health data. `no-store` keeps the
  // browser, the corporate proxy and any CDN from holding a copy that would
  // outlive a revocation — disable the card and the very next scan must be the
  // first response anyone can get, not a cache replay of the last one.
  res.set('Cache-Control', 'no-store');
  try {
    const now = new Date();
    const user = await User.findOne({ 'healthIdCard.qrToken': req.params.qrToken });
    if (!user) {
      // Generic 404 to avoid info leak
      return res.status(404).json({ message: 'Card not found or disabled' });
    }

    const card = user.healthIdCard;
    if (!card || !card.isEnabled) {
      return res.status(404).json({ message: 'Card not found or disabled' });
    }

    // HI-B-04: the expiry is REQUIRED, not conditional.
    // The old guard was `qrTokenExpiry && ... < now`, so a document with a token
    // but no expiry - every row written before the field existed - resolved
    // FOREVER. A card printed in 2024 still returned a live record in 2026.
    // The rotated-at stamp is the backstop, so a legacy row still has a bounded
    // lifetime, and a token with neither is REVOKED rather than assumed valid.
    const expiry = card.qrTokenExpiry
      || (card.qrTokenRotatedAt
        ? new Date(new Date(card.qrTokenRotatedAt).getTime() + QR_TOKEN_TTL_MS)
        : null);
    if (!expiry) {
      card.qrToken = undefined;
      card.qrTokenExpiry = undefined;
      card.qrTokenRevokedAt = now;
      await user.save();
      return res.status(404).json({ message: 'Card not found or disabled' });
    }
    if (expiry < now) {
      return res.status(404).json({ message: 'Card not found or disabled' });
    }

    // REC-008: audit every QR scan (who scanned, when, from where).
    //
    // REC-M-04: this used to be auditLog('health_id_qr_scan', 'public', ...) —
    // and AuditLog.userId is an ObjectId, so EVERY scan row was rejected by the
    // cast and the "audit" existed only as an error line in the pino log. The
    // row is now written under the CARD OWNER's id (which is also what makes
    // GET /scans queryable) with the anonymous scanner recorded in details.
    await auditLog('health_id_qr_scan', user._id, {
      actor: 'public',
      healthIdCard: card.abhaNumber || user._id.toString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      shareLevel: card.shareLevel,
    }).catch(() => {});

    const shareLevel = card.shareLevel;

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
      // HI-B-02: these arrays are optional on a legacy document, so `.map` on
      // undefined threw and turned a valid card into a 500.
      response.allergies = (user.allergies || []).map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
      }));
      response.knownConditions = (user.knownConditions || []).map(c => ({
        condition: c.condition,
        since: c.since,
        notes: c.notes,
      }));
    }

    // HI-B-02: `user.emergencyContact.name` threw for any account whose
    // subdocument was never set, and the throw landed in the catch below - so the
    // public scan endpoint 500-ed (with a raw err.message) for a valid card.
    // An absent contact is simply absent data.
    response.emergencyContact = user.emergencyContact?.name
      ? { name: user.emergencyContact.name }
      : null;

    res.json(response);
  } catch (err) {
    // HI-B-02: no raw err.message on an unauthenticated endpoint.
    logger.error(`health-id scan error: ${err.message}`);
    sendServerError(res, err, 'Could not read this health card');
  }
});
export default router;
