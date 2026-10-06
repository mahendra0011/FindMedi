import RefreshToken from '../models/RefreshToken.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// P2-10: session lifetime policy.
//
// - Concurrent cap: a user can hold only N live refresh sessions; the oldest
//   are evicted on the next login. Privileged roles (the ones that can read
//   PHI in bulk) get the tighter admin cap. Defaults: 10 / 3.
// - Idle timeout: a refresh family that has seen no rotation for longer than
//   SESSION_IDLE_TIMEOUT_MS is dead on next refresh. Default 0 = disabled
//   (rotation + 7d expiry already bound lifetime); set e.g. 1800000 (30m)
//   for admin workstations via env.
// - Absolute timeout: a refresh family older than SESSION_ABSOLUTE_TIMEOUT_MS
//   (measured from the family's FIRST token) cannot rotate anymore, forcing
//   full re-authentication. Default 0 = disabled; e.g. 43200000 (12h).
//
// All three are read live from env (no restart needed for policy tuning) and
// are enforced at exactly two choke points: sign() (cap) and POST /refresh
// (idle + absolute). Revocation is family-scoped + audited; theft-reuse stays
// user-wide in the refresh handler.

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const SESSION_POLICY = {
  get maxConcurrent() { return Math.max(1, Math.floor(num(process.env.SESSION_MAX_CONCURRENT, 10))); },
  get adminMaxConcurrent() { return Math.max(1, Math.floor(num(process.env.SESSION_ADMIN_MAX_CONCURRENT, 3))); },
  get idleTimeoutMs() { return num(process.env.SESSION_IDLE_TIMEOUT_MS, 0); },
  get absoluteTimeoutMs() { return num(process.env.SESSION_ABSOLUTE_TIMEOUT_MS, 0); },
};

const ADMIN_ROLES = new Set(['superadmin', 'hospital_admin', 'doctor', 'pharmacy_owner']);

export const sessionCapsFor = (role) => ({
  maxConcurrent: ADMIN_ROLES.has(String(role || '').toLowerCase())
    ? SESSION_POLICY.adminMaxConcurrent
    : SESSION_POLICY.maxConcurrent,
});

// Pure helpers (unit-tested without a DB).
export const idleExceeded = (lastActivityAt, now = Date.now()) => {
  const idle = SESSION_POLICY.idleTimeoutMs;
  if (!idle) return false;
  const t = new Date(lastActivityAt).getTime();
  if (!Number.isFinite(t)) return true; // no activity marker at all → treat as stale
  return now - t > idle;
};

export const absoluteExceeded = (familyCreatedAt, now = Date.now()) => {
  const abs = SESSION_POLICY.absoluteTimeoutMs;
  if (!abs) return false;
  const t = new Date(familyCreatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t > abs;
};

// Evict oldest live sessions beyond the role cap. Fire-and-forget safe.
export async function enforceConcurrentCap(userId, role) {
  try {
    const { maxConcurrent } = sessionCapsFor(role);
    const live = await RefreshToken.find(
      { userId, replacedBy: null, revokedAt: null },
      { _id: 1 },
    ).sort({ createdAt: 1 });
    if (live.length > maxConcurrent) {
      const victims = live.slice(0, live.length - maxConcurrent).map((d) => d._id);
      const res = await RefreshToken.deleteMany({ _id: { $in: victims } });
      try {
        await auditLog('session_concurrent_evicted', userId, { evicted: res.deletedCount || victims.length, cap: maxConcurrent });
      } catch {}
      logger.warn(`[auth] evicted ${victims.length} oldest sessions for user ${userId} (cap ${maxConcurrent})`);
    }
  } catch (err) {
    logger.error(`[auth] concurrent-cap enforcement failed: ${err.message}`);
  }
}

// Check idle + absolute timeouts for a presented refresh doc. Returns
// { ok: true } or { ok: false, reason } and revokes the family on expiry.
export async function enforceRefreshTimeouts(stored, { ip, userAgent } = {}) {
  try {
    if (idleExceeded(stored.updatedAt || stored.createdAt)) {
      await RefreshToken.deleteMany({ userId: stored.userId, familyId: stored.familyId }).catch(() => {});
      try {
        await auditLog('session_idle_expired', stored.userId, { ip, userAgent, familyId: stored.familyId });
      } catch {}
      return { ok: false, reason: 'idle' };
    }
    if (SESSION_POLICY.absoluteTimeoutMs) {
      const oldest = await RefreshToken.findOne(
        { userId: stored.userId, familyId: stored.familyId },
      ).sort({ createdAt: 1 });
      if (oldest && absoluteExceeded(oldest.createdAt)) {
        await RefreshToken.deleteMany({ userId: stored.userId, familyId: stored.familyId }).catch(() => {});
        try {
          await auditLog('session_absolute_expired', stored.userId, { ip, userAgent, familyId: stored.familyId });
        } catch {}
        return { ok: false, reason: 'absolute' };
      }
    }
  } catch (err) {
    logger.error(`[auth] refresh-timeout enforcement failed: ${err.message}`);
  }
  return { ok: true };
}
