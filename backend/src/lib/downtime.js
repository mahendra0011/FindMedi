/**
 * File 22 P2-31: downtime read-only mode. When SystemSetting
 * `downtime.readOnly` is "true", all state-changing methods 503 with
 * Retry-After — except the allowlisted paths (auth refresh/logout, reads,
 * and the toggle itself). The flag is cached 30s so the check costs nothing.
 */
import logger from '../config/logger.js';

let cached = { value: false, at: 0 };
const TTL_MS = 30000;

export async function isReadOnly() {
  if (Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const { default: SystemSetting } = await import('../models/SystemSetting.js');
    const row = await SystemSetting.findOne({ key: 'downtime.readOnly' }).lean();
    cached = { value: row ? String(row.value) === 'true' : false, at: Date.now() };
  } catch (e) {
    logger.warn(`downtime flag read failed: ${e.message}`);
  }
  return cached.value;
}

export function bustDowntimeCache() {
  cached = { value: false, at: 0 };
}

const ALLOW_PREFIXES = [
  '/api/auth/refresh', '/api/auth/logout', '/api/auth/pin/unlock',
  '/api/system-settings',
];

export function downtimeGuard(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (ALLOW_PREFIXES.some((p) => req.path.startsWith(p))) return next();
  isReadOnly().then((ro) => {
    if (!ro) return next();
    return res.status(503).set('Retry-After', '60').json({
      message: 'System is in read-only downtime mode. Reads work; writes are paused.',
      code: 'DOWNTIME_READ_ONLY',
    });
  }).catch(() => next());
}
