import express from 'express';
import { protect, superadminOnly } from '../middleware/auth.js';
import {
  ensureGuard,
  walletLimits,
  setKycStatus,
  freezeWallet,
  unfreezeWallet,
} from '../services/walletGuard.js';

const router = express.Router();

const KYC_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];

// PAY-M-02: the provider-facing view of their own wallet policy — what limit
// they are on, how much of today's cap is used, whether KYC/freeze is in the
// way of a withdrawal. Read-only and self-scoped.
// authz: self
router.get('/me', protect, async (req, res, next) => {
  try {
    const guard = await ensureGuard(String(req.user._id));
    res.json({
      kycStatus: guard.kycStatus,
      frozen: Boolean(guard.frozen?.active),
      frozenReason: guard.frozen?.reason || '',
      limits: walletLimits(),
      daily: guard.daily,
      hourly: guard.hourly,
    });
  } catch (err) { next(err); }
});

// PAY-M-02: admin view of any user's wallet policy (support/debugging).
router.get('/:userId', protect, superadminOnly, async (req, res, next) => {
  try {
    const guard = await ensureGuard(String(req.params.userId));
    res.json(guard);
  } catch (err) { next(err); }
});

// PAY-M-02: superadmin sets KYC state or freezes/unfreezes a wallet. Every
// mutation is audited inside the service (`wallet.kyc` / `wallet.freeze` /
// `wallet.unfreeze`), so the trail lives with the decision.
router.put('/:userId', protect, superadminOnly, async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const { kycStatus, frozen, reason } = req.body || {};

    if (kycStatus !== undefined && !KYC_STATUSES.includes(kycStatus)) {
      return res.status(400).json({ message: `kycStatus must be one of ${KYC_STATUSES.join(', ')}` });
    }
    if (frozen !== undefined && typeof frozen !== 'boolean') {
      return res.status(400).json({ message: 'frozen must be a boolean' });
    }

    if (kycStatus !== undefined) await setKycStatus(userId, kycStatus, String(req.user._id));
    if (frozen === true) await freezeWallet(userId, reason || 'manual', String(req.user._id));
    if (frozen === false) await unfreezeWallet(userId, String(req.user._id));

    const guard = await ensureGuard(userId);
    return res.json({ success: true, guard });
  } catch (err) { return next(err); }
});

export default router;
