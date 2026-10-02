import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import { indexAuditLog } from '../services/opensearchIndexer.js';

const SENSITIVE_DETAIL_KEYS = /token|secret|password|passwd|otp|cookie|authorization|api[_-]?key|session/i;

/** Recursively redact secret-shaped keys from audit details (DP-B-03). */
export function scrubAuditDetails(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => scrubAuditDetails(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_DETAIL_KEYS.test(k) ? '[redacted]' : scrubAuditDetails(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Writes an audit entry to MongoDB (system of record) and fans it out to
 * OpenSearch so compliance/security teams can query across the retention
 * window with full-text search.
 *
 * The Mongo write is authoritative and MUST succeed; the OpenSearch document
 * is fire-and-forget and never blocks or fails the request. OpenSearch is
 * unconfigured in dev/test, in which case indexAuditLog() is a no-op.
 *
 * AUTH-B-05: the AuditLog model runs with `bufferCommands: false`, so a Mongo
 * outage rejects immediately instead of stalling the caller for mongoose' 10 s
 * buffering timeout. Failures are counted (`audit:write_failures`) and logged.
 */
export const auditLog = async (action, userId, details) => {
  try {
    // DP-B-03 (partial): `details` is Mixed with no schema, so a caller can
    // persist (and mirror into OpenSearch) anything — including tokens, OTPs
    // or cookies. Scrub secret-shaped keys before the write; structure kept.
    const safeDetails = scrubAuditDetails(details);
    const entry = await AuditLog.create({
      userId,
      action,
      details: safeDetails,
      ip: safeDetails?.ip || null,
      userAgent: safeDetails?.userAgent || null,
      timestamp: new Date(),
    });

    // Keep the search document flat — Mongo `details` is Mixed and can be
    // arbitrarily nested, which OpenSearch's text mapping cannot index.
    let flattened = '';
    try {
      flattened = JSON.stringify(safeDetails ?? {});
    } catch {
      flattened = '[unserializable details]';
    }

    void indexAuditLog({
      logId: String(entry._id),
      actorId: userId ? String(userId) : '',
      action,
      resourceType: safeDetails?.resourceType || '',
      resourceId: safeDetails?.resourceId ? String(safeDetails.resourceId) : '',
      ip: safeDetails?.ip || '',
      details: flattened,
      timestamp: entry.timestamp?.toISOString?.() || new Date().toISOString(),
    }).catch((mirrorErr) => {
      // AUTH-016: mirror failures are counted + logged (Pino), never silent.
      try {
        if (isRedisReady() && redisClient.isOpen) {
          redisClient.incr('audit:mirror_failures').catch(() => {});
        }
      } catch {}
      logger.error(`Audit OpenSearch mirror failed for ${action}: ${mirrorErr.message}`);
    });
  } catch (error) {
    // AUTH-B-05: a write failure is never silent — count it so the gap in the
    // compliance trail is visible on a dashboard.
    try {
      if (isRedisReady() && redisClient.isOpen) {
        redisClient.incr('audit:write_failures').catch(() => {});
      }
    } catch {}
    logger.error(`Audit log failed: ${error.message}`);
  }
};
