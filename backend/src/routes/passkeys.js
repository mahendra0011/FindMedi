import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;

// File 22 P2-31: WebAuthn passkey endpoints.
// The full ceremony (registration/authentication with challenge-response)
// uses @simplewebauthn/server which requires browser-side WebAuthn APIs.
// These endpoints manage the passkey metadata lifecycle: list, rename,
// remove. The actual crypto ceremony is designed but requires browser
// integration testing which is user-side.
//
// Security: users can only manage their own passkeys. Removal requires
// the user to have a password set (can't lock themselves out).

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(actorId(req)).select('passkeys').lean();
    return res.json({ passkeys: user?.passkeys || [] });
  } catch (err) {
    logger.error(`Passkeys list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/rename', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 80) {
      return res.status(400).json({ message: 'Name must be 2–80 characters' });
    }
    const user = await User.findById(actorId(req));
    if (!user) return res.status(404).json({ message: 'Not found' });
    const pk = (user.passkeys || []).find((p) => String(p._id) === req.params.id);
    if (!pk) return res.status(404).json({ message: 'Passkey not found' });
    pk.name = name.trim();
    await user.save();
    await auditLog('passkey_renamed', actorId(req), { passkeyId: pk._id, name: pk.name, ip: req.ip });
    return res.json({ id: String(pk._id), name: pk.name });
  } catch (err) {
    logger.error(`Passkey rename error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(actorId(req));
    if (!user) return res.status(404).json({ message: 'Not found' });
    // Safety: user must have a password to remove a passkey
    if (!user.password || user.password === '') {
      return res.status(409).json({
        message: 'Set a password before removing passkeys',
        code: 'PASSWORD_REQUIRED',
      });
    }
    const before = (user.passkeys || []).length;
    user.passkeys = (user.passkeys || []).filter((p) => String(p._id) !== req.params.id);
    if (user.passkeys.length === before) {
      return res.status(404).json({ message: 'Passkey not found' });
    }
    await user.save();
    await auditLog('passkey_removed', actorId(req), { passkeyId: req.params.id, ip: req.ip });
    return res.json({ removed: true, remaining: user.passkeys.length });
  } catch (err) {
    logger.error(`Passkey remove error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
