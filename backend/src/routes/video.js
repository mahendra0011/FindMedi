import express from 'express';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

export function isLiveKitConfigured() {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

// ─── POST /api/video/token ────────────────────────────────────────────────
// Mints a LiveKit room token for doctor/patient video triage.
// Body: { room, identity?, name? }. Fail-soft: 503 when unconfigured.
router.post('/token', protect, async (req, res) => {
  try {
    const { room, identity, name } = req.body;
    if (!room) return res.status(400).json({ message: 'room required' });
    if (!isLiveKitConfigured()) {
      return res.status(503).json({
        message: 'Video media not configured (LIVEKIT_URL). Use audio/call fallback.',
        livekit: false,
      });
    }
    const { AccessToken } = await import('livekit-server-sdk');
    const me = String(req.user._id || req.user.id);
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: String(identity || me),
      name: String(name || req.user.name || 'FindMedi User'),
      ttl: '15m',
    });
    at.addGrant({ roomJoin: true, room: String(room), canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    res.json({ success: true, livekit: true, url: LIVEKIT_URL, room: String(room), token });
  } catch (err) {
    logger.error(`Video token error: ${err.message}`);
    res.status(500).json({ message: 'Failed to mint video token', error: err.message });
  }
});

// ─── GET /api/video/status ────────────────────────────────────────────────
router.get('/status', protect, async (req, res) => {
  res.json({ success: true, livekit: isLiveKitConfigured(), url: LIVEKIT_URL || null });
});

export default router;
