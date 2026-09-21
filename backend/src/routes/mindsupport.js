import express from 'express';
import mongoose from 'mongoose';

// ─── Phase 5 (merge): MindSupport sub-app bridge ─────────────────────────────
// MindSupport (`backend/mindsupport/src/app.js`) runs IN-PROCESS, mounted at
// `/api/mindsupport/*`. Its routes are registered as `/api/*` internally, so
// this bridge rewrites `/counsellors` → `/api/counsellors` before delegating.
// The mind app is imported LAZILY (first request) so that:
//   1. `dotenv` in `src/index.js` has loaded (MONGO_URI available → single DB),
//   2. the main mongoose connection is up (`isDatabaseReady()` passes),
//   3. `Mind*` models register after main models (no OverwriteModelError).
// Body parsing: main `express.json()` already ran and sets `req._body`, which
// makes the mind app's own json parser skip — `req.body` is preserved.

let mindAppPromise = null;

function getMindApp() {
  if (!mindAppPromise) {
    if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
      process.env.MONGODB_URI = process.env.MONGO_URI;
    }
    if (!process.env.MIND_DNS_OVERRIDE) {
      process.env.MIND_DNS_OVERRIDE = '0';
    }
    // Phase 11 (security parity): let the inner MindSupport CORS layer also
    // accept the main app's client origins (outer main CORS already does).
    if (!process.env.CORS_ORIGIN && process.env.CLIENT_URL) {
      process.env.CORS_ORIGIN = process.env.CLIENT_URL;
    }
    mindAppPromise = import('../../mindsupport/src/app.js').then((m) => m.app);
  }
  return mindAppPromise;
}

const router = express.Router();

// Merge-health endpoint (Phase 13 tests assert this).
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mindsupport',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    user: req.user ? { id: String(req.user._id || req.user.id), role: req.user.role } : null,
    time: new Date(),
  });
});

// Delegate everything else to the MindSupport Express app.
router.use(async (req, res, next) => {
  try {
    const mindApp = await getMindApp();
    const suffix = req.url.startsWith('/') ? req.url : `/${req.url}`;
    req.url = `/api${suffix}`;
    mindApp(req, res, next);
  } catch (err) {
    next(err);
  }
});

// ─── Phase 6 (merge): realtime rooms on the MAIN Socket.IO server ────────────
// Mirrors `mindsupport/src/realtime/socket.js`: clients handshaking with
// `{ userId, role }` join `user:<id>` / `role:<role>` rooms and get
// `realtime:ready`. Called from `src/index.js` after `initSocket(server)`.
export function attachMindRealtime(mainIo) {
  if (!mainIo || mainIo.__mindAttached) return;
  mainIo.__mindAttached = true;
  mainIo.on('connection', (socket) => {
    try {
      const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId || '';
      const role = socket.handshake.auth?.role || socket.handshake.query?.role || '';
      if (userId) {
        socket.join(`user:${userId}`);
        if (role) socket.join(`role:${role}`);
        socket.emit('realtime:ready', { userId: String(userId), role: role || 'user' });
      }
    } catch {
      // realtime rooms are best-effort; never break the main connection
    }
  });
}

export default router;
