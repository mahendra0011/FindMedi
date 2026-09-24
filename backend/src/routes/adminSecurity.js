import express from 'express';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import AiSafetyEvent from '../models/AiSafetyEvent.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── SA-M5: active admin sessions (live refresh-token rows) ──
router.get('/sessions', protect, superadminOnly, async (req, res) => {
  try {
    const tokens = await RefreshToken.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const userIds = [...new Set(tokens.map((t) => String(t.userId)))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email role twoFactorEnabled lastLoginAt')
      .lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      sessions: tokens.map((t) => ({
        id: String(t._id),
        userId: String(t.userId),
        name: byId.get(String(t.userId))?.name || '',
        email: byId.get(String(t.userId))?.email || '',
        role: byId.get(String(t.userId))?.role || '',
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      })),
    });
  } catch (err) {
    logger.error(`Admin sessions error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// SA-M5: kill a session (revoke refresh token).
router.delete('/sessions/:id', protect, superadminOnly, async (req, res) => {
  try {
    const token = await RefreshToken.findByIdAndDelete(req.params.id);
    if (!token) return res.status(404).json({ message: 'Session not found' });
    try {
      await auditLog('kill_session', req.user._id, { tokenId: req.params.id, targetUserId: String(token.userId), ip: req.ip, userAgent: req.get('user-agent') });
    } catch (err) {
      logger.error('Audit error:', err);
    }
    res.json({ success: true });
  } catch (err) {
    logger.error(`Kill session error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// SA-M5: 2FA enrolment readout across superadmin accounts (real field values;
// there is no claim of enforcement — setup lives with each admin).
router.get('/2fa-status', protect, superadminOnly, async (req, res) => {
  try {
    const admins = await User.find({ role: 'superadmin' })
      .select('name email twoFactorEnabled lastLoginAt createdAt')
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      admins: admins.map((a) => ({
        id: String(a._id),
        name: a.name,
        email: a.email,
        twoFactorEnabled: Boolean(a.twoFactorEnabled),
        lastLoginAt: a.lastLoginAt || null,
      })),
    });
  } catch (err) {
    logger.error(`2FA status error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// SA-M5: reset another admin's 2FA (clears secret, forces re-setup on next login).
router.post('/2fa-reset/:userId', protect, superadminOnly, async (req, res) => {
  try {
    if (String(req.params.userId) === String(req.user._id)) {
      return res.status(400).json({ message: 'Use your own 2FA settings to change your own enrolment' });
    }
    const target = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { twoFactorEnabled: false, twoFactorSecret: '', twoFactorTempSecret: '', twoFactorBackupCodes: [] } },
      { new: true }
    ).select('name email role');
    if (!target) return res.status(404).json({ message: 'User not found' });
    try {
      await auditLog('reset_2fa', req.user._id, { targetUserId: String(target._id), ip: req.ip, userAgent: req.get('user-agent') });
    } catch (err) {
      logger.error('Audit error:', err);
    }
    res.json({ success: true, user: target.name || target.email });
  } catch (err) {
    logger.error(`2FA reset error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── SA-M4: AI safety events (logged by the AI chat route) ──
router.get('/ai-safety/events', protect, superadminOnly, async (req, res) => {
  try {
    const { kind, limit = 100 } = req.query;
    const filter = {};
    if (kind && kind !== 'all') filter.kind = kind;
    const events = await AiSafetyEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(500, Number(limit) || 100))
      .lean();
    res.json({ events });
  } catch (err) {
    logger.error(`AI safety events error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.get('/ai-safety/stats', protect, superadminOnly, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [total, last24h, redFlags, redFlags24h, latencyAgg, tokenAgg] = await Promise.all([
      AiSafetyEvent.countDocuments({}),
      AiSafetyEvent.countDocuments({ createdAt: { $gte: since } }),
      AiSafetyEvent.countDocuments({ kind: 'red_flag' }),
      AiSafetyEvent.countDocuments({ kind: 'red_flag', createdAt: { $gte: since } }),
      AiSafetyEvent.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, avgLatency: { $avg: '$latencyMs' }, maxLatency: { $max: '$latencyMs' }, n: { $sum: 1 } } },
      ]),
      AiSafetyEvent.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, promptTokens: { $sum: '$promptTokensEst' }, replyTokens: { $sum: '$replyTokensEst' } } },
      ]),
    ]);
    res.json({
      total,
      last24h,
      redFlags,
      redFlags24h,
      avgLatencyMs: Math.round(latencyAgg[0]?.avgLatency || 0),
      maxLatencyMs: Math.round(latencyAgg[0]?.maxLatency || 0),
      promptTokensEst24h: tokenAgg[0]?.promptTokens || 0,
      replyTokensEst24h: tokenAgg[0]?.replyTokens || 0,
      note: 'Token counts are estimated as chars/4 — provider-reported usage is not exposed by the API.',
    });
  } catch (err) {
    logger.error(`AI safety stats error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;
