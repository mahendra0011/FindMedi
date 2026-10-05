import crypto from 'node:crypto';
import mongoose from 'mongoose';
import SystemSetting from '../models/SystemSetting.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';
import { ADMIT_LUA } from '../lib/admitLua.js';
import { securityFailOpenTotal } from '../lib/metrics.js';

/**
 * ADM-M-06 - per-tenant API quotas ("one tenant can starve the platform").
 *
 * Before this, every throttle keyed on USER or IP (rateLimit.js). A hospital
 * with N staff accounts therefore had N independent buckets, so a single
 * tenant could multiply its share of Mongo/Redis/Kafka until everyone else
 * degraded - no amount of per-user tuning closes that gap. This service adds
 * the missing AGGREGATE dimension: one sliding-window bucket per hospital,
 * enforced from `protect` so it covers every authenticated tenant request
 * without touching 130+ route files.
 *
 * Design constraints (deliberate):
 *   - FAIL-OPEN: a quota is an abuse/capacity control, not a security gate.
 *     Redis down must never lock a hospital out of its own data (unlike
 *     authLimiter, which fails closed because brute-force defence is a gate).
 *   - SOS paths bypass, mirroring the GRL limiters: life safety is never
 *     throttled, and only the PATH counts - client-supplied flags don't.
 *   - SUPERADMIN exempt: platform operators are not tenant traffic.
 *   - Config in SystemSetting (`tenantQuota:<hospitalId>`, `tenantQuota:default`)
 *     so overrides survive restarts without a new collection; the hot path
 *     reads an in-process cache and only touches Mongo when the connection is
 *     actually up (readyState gate keeps tests/offline boots on the default).
 */

export const DEFAULT_QUOTA = Object.freeze({ windowMs: 60_000, max: 1_000 });

// Bounds shared by the setter and the DB reader: a corrupt or hostile
// SystemSetting row can never turn into an unbounded or zero-length window.
const WINDOW_MIN_MS = 1_000;
const WINDOW_MAX_MS = 3_600_000;
const MAX_MIN = 1;
const MAX_MAX = 1_000_000;

const QUOTA_CACHE_TTL_MS = 30_000;
const DEFAULT_KEY = 'tenantQuota:default';

/** hospitalId -> { quota, source, expiresAt } */
const quotaCache = new Map();

export function _resetQuotaCache() {
  quotaCache.clear();
}

function normalizeQuota(value) {
  if (!value || typeof value !== 'object') return null;
  const windowMs = Number(value.windowMs);
  const max = Number(value.max);
  if (!Number.isFinite(windowMs) || windowMs < WINDOW_MIN_MS || windowMs > WINDOW_MAX_MS) return null;
  if (!Number.isInteger(max) || max < MAX_MIN || max > MAX_MAX) return null;
  return { windowMs, max };
}

function quotaKey(hospitalId) {
  return hospitalId === 'default' ? DEFAULT_KEY : `tenantQuota:${hospitalId}`;
}

/**
 * Cold-path DB read. Returns { quota, source } or null when nothing is
 * configured. readyState gate: mongoose buffers queries for 10s when offline
 * and then rejects - a quota lookup must never add that latency to `protect`.
 */
async function loadQuotaFromDb(hospitalId) {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    const override = normalizeQuota(
      (await SystemSetting.findOne({ key: quotaKey(hospitalId) }).maxTimeMS(500).lean())?.value
    );
    if (override) return { quota: override, source: 'override' };
    if (hospitalId !== 'default') {
      const fallback = normalizeQuota(
        (await SystemSetting.findOne({ key: DEFAULT_KEY }).maxTimeMS(500).lean())?.value
      );
      if (fallback) return { quota: fallback, source: 'default' };
    }
  } catch (err) {
    // Availability again: a settings read failure degrades to the built-in
    // quota, it never fails the request.
    logger.warn(`tenant quota lookup failed for ${hospitalId}: ${err.message}. Using built-in default.`);
  }
  return null;
}

/** Effective quota for a tenant: cache -> SystemSetting -> built-in. */
export async function getQuota(hospitalId) {
  const cached = quotaCache.get(hospitalId);
  if (cached && cached.expiresAt > Date.now()) return cached.quota;

  const resolved = (await loadQuotaFromDb(hospitalId)) || { quota: DEFAULT_QUOTA, source: 'builtin' };
  quotaCache.set(hospitalId, { ...resolved, expiresAt: Date.now() + QUOTA_CACHE_TTL_MS });
  return resolved.quota;
}

/** Upsert an override; the cache is updated in-process so PUT takes effect on the next request. */
export async function setQuota(hospitalId, { windowMs, max }, updatedBy) {
  const quota = normalizeQuota({ windowMs, max });
  if (!quota) throw Object.assign(new Error('Invalid quota'), { statusCode: 400 });
  await SystemSetting.findOneAndUpdate(
    { key: quotaKey(hospitalId) },
    { value: quota, description: 'Per-tenant API request quota (ADM-M-06)', updatedBy, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  if (hospitalId === 'default') {
    // Every cached tenant may be deriving from the default - drop them all.
    _resetQuotaCache();
  } else {
    quotaCache.set(hospitalId, { quota, source: 'override', expiresAt: Date.now() + QUOTA_CACHE_TTL_MS });
  }
  return quota;
}

/** Remove an override; the tenant falls back to default (or the built-in quota). */
export async function deleteQuota(hospitalId) {
  await SystemSetting.deleteOne({ key: quotaKey(hospitalId) });
  if (hospitalId === 'default') _resetQuotaCache();
  else quotaCache.delete(hospitalId);
}

/**
 * Live per-tenant usage from the actual counter keys (SCAN, never KEYS -
 * KEYS blocks Redis for the whole keyspace and this runs from an admin page).
 * Best-effort: Redis down -> empty usage object, quotas still listed.
 */
async function currentUsage() {
  const usage = {};
  if (!isRedisReady() || !redisClient.isOpen) return usage;
  try {
    for await (const batch of redisClient.scanIterator({ MATCH: 'rl:tenant:*', COUNT: 200 })) {
      const keys = Array.isArray(batch) ? batch : [batch];
      for (const key of keys) {
        const hospitalId = String(key).slice('rl:tenant:'.length);
        usage[hospitalId] = Number(await redisClient.zCard(key));
      }
    }
  } catch (err) {
    logger.warn(`tenant quota usage scan failed: ${err.message}`);
  }
  return usage;
}

/** Admin listing: platform default + every override + current window usage. */
export async function listQuotas() {
  let rows = [];
  if (mongoose.connection.readyState === 1) {
    try {
      rows = await SystemSetting.find({ key: { $regex: '^tenantQuota:' } }).lean();
    } catch (err) {
      logger.warn(`tenant quota listing failed: ${err.message}`);
    }
  }
  const defaultRow = rows.find((r) => r.key === DEFAULT_KEY);
  const overrides = rows
    .filter((r) => r.key !== DEFAULT_KEY)
    .map((r) => ({
      hospitalId: r.key.slice('tenantQuota:'.length),
      ...(normalizeQuota(r.value) || DEFAULT_QUOTA),
    }))
    .sort((a, b) => a.hospitalId.localeCompare(b.hospitalId));
  return {
    default: normalizeQuota(defaultRow?.value) || DEFAULT_QUOTA,
    defaultSource: defaultRow ? 'override' : 'builtin',
    overrides,
    usage: await currentUsage(),
  };
}

/**
 * The guard itself - the last thing `protect` calls before `next()`.
 *
 * Counts the request against `rl:tenant:<hospitalId>` with the SAME Lua
 * contract as the per-user limiters (>= at the cap, RL-01), then either
 * passes, or refuses with 429 TENANT_QUOTA_EXCEEDED + Retry-After.
 */
/** P2-15: opt-in fail-closed posture (TENANT_QUOTA_STRICT=true). */
const tenantQuotaStrict = () => /^(1|true|yes)$/i.test(String(process.env.TENANT_QUOTA_STRICT || ''));

/** Shared 503 for both strict-mode refusal paths. */
function refuseUnavailable(res) {
  res.setHeader('Retry-After', '30');
  return res.status(503).json({
    success: false,
    error: 'TENANT_QUOTA_UNAVAILABLE',
    message: 'Capacity control is temporarily unavailable. Please retry shortly.',
  });
}
export async function tenantQuotaGuard(req, res, next) {
  try {
    const hospitalId = req.user?.hospitalId;
    // Not tenant traffic: patients, platform staff, unlinked accounts.
    if (!hospitalId || req.user?.role === 'superadmin') return next();

    // Life-safety bypass - path only, never a body field (AUTH-006 rule).
    const url = req.originalUrl || req.url || '';
    if (url.includes('/emergency') || url.includes('/sos')) return next();

    // Fail-open: quota is capacity control, availability wins (see header).
    // F9: count it - a silent fail-open is indistinguishable from a healthy
    // one, and "how long were quotas unenforced?" must be graphable.
    if (!isRedisReady() || !redisClient.isOpen) {
      securityFailOpenTotal.inc({ control: 'tenant_quota' });
      // P2-15: default is the documented fail-open (quota = capacity control),
      // TENANT_QUOTA_STRICT=true flips it to 503 for deployments that would
      // rather refuse than run un-metered.
      if (tenantQuotaStrict()) {
        logger.warn('tenant quota guard: Redis unavailable and TENANT_QUOTA_STRICT set - failing closed');
        return refuseUnavailable(res);
      }
      return next();
    }

    const { windowMs, max } = await getQuota(hospitalId);
    const now = Date.now();
    const member = `${now}_${crypto.randomBytes(4).toString('hex')}`;

    const admitted = Number(await redisClient.eval(ADMIT_LUA, {
      keys: [`rl:tenant:${hospitalId}`],
      arguments: [String(now), String(windowMs), String(max), member],
    }));

    res.setHeader('X-TenantQuota-Limit', max);
    res.setHeader('X-TenantQuota-Remaining', Math.max(0, max - admitted));

    if (admitted >= max) {
      const retryAfterSeconds = Math.ceil(windowMs / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        error: 'TENANT_QUOTA_EXCEEDED',
        message: 'Hospital API quota exceeded. Contact the platform admin to raise the limit.',
        retryAfterSeconds,
      });
    }
    return next();
  } catch (err) {
    securityFailOpenTotal.inc({ control: 'tenant_quota' });
    if (tenantQuotaStrict()) {
      logger.warn(`tenant quota guard error: ${err.message}. TENANT_QUOTA_STRICT set - failing closed.`);
      return refuseUnavailable(res);
    }
    logger.warn(`tenant quota guard error: ${err.message}. Passing through.`);
    return next();
  }
}
