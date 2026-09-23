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
  const joinRooms = (socket, userId, role) => {
    if (!userId) return;
    try {
      socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
      socket.emit('realtime:ready', { userId: String(userId), role: role || 'user' });
    } catch { /* best-effort */ }
  };
  mainIo.on('connection', (socket) => {
    try {
      const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId || '';
      const role = socket.handshake.auth?.role || socket.handshake.query?.role || '';
      if (userId) joinRooms(socket, userId, role);
      // Token-based join (frontend sends { token })
      const token = socket.handshake.auth?.token || socket.handshake.query?.token || '';
      if (token && !userId) {
        import('jsonwebtoken').then(({ default: jwt }) => {
          try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            const uid = payload.id || payload._id || payload.userId;
            if (uid) joinRooms(socket, String(uid), payload.role || role);
          } catch { /* invalid token, ignore */ }
        }).catch(() => {});
      }
    } catch {
      // realtime rooms are best-effort; never break the main connection
    }
    // Explicit join event from mind socket lib
    socket.on('join', (payload) => {
      try {
        if (typeof payload === 'string') {
          joinRooms(socket, payload, '');
          return;
        }
        const uid = payload?.userId || payload?.user_id || '';
        const r = payload?.role || '';
        if (uid) {
          joinRooms(socket, String(uid), r);
          return;
        }
        const t = payload?.token || '';
        if (t) {
          import('jsonwebtoken').then(({ default: jwt }) => {
            try {
              const p = jwt.verify(t, process.env.JWT_SECRET);
              const id = p.id || p._id || p.userId;
              if (id) joinRooms(socket, String(id), p.role || r);
            } catch { /* ignore */ }
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    });
    // Bridge mind chat events: allow clients to trigger refresh for peers
    socket.on('message:new', (msg) => {
      try {
        if (msg?.toId) mainIo.to(`user:${msg.toId}`).emit('message:new', msg);
        if (msg?.fromId) mainIo.to(`user:${msg.fromId}`).emit('message:new', msg);
      } catch { /* ignore */ }
    });
  });
  // Expose bridge so mindsupport routes can push via mainIo too
  try {
    global.__mainIo = mainIo;
  } catch { /* ignore */ }
}

export default router;
