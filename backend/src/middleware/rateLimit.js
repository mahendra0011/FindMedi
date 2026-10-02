import crypto from 'node:crypto';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';
import { ADMIT_LUA } from '../lib/admitLua.js';

/**
 * GRL-Style Distributed Rate Limiter with Redis Sliding-Window Token Bucket.
 * Admission is a single atomic Lua script (prune → count → conditional add),
 * so concurrent bursts cannot over-admit (AUTH-007). SOS *paths* bypass;
 * client-controlled `req.body.isEmergency` NEVER bypasses (AUTH-006 removed).
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default 60,000ms / 1 min)
 * @param {number} options.max - Maximum allowed requests in window
 * @param {string} options.keyPrefix - Prefix for Redis key (e.g. 'rl:auth', 'rl:booking')
 * @param {boolean} options.failClosed - 429 when Redis is down (auth/OTP only)
 */
// ADM-M-06: the admission script itself moved to lib/admitLua.js so the
// per-tenant quota guard shares one copy (and one RL-01 contract) with us.
export function createGrlRateLimiter({
  windowMs = 60000,
  max = 60,
  keyPrefix = 'rl:api',
  isEmergencyExempt = true,
  failClosed = false,
}) {
  return async (req, res, next) => {
    // 1. SOS *path* bypass only — NEVER rate-limit life-safety alerts.
    // Client body fields are attacker-controlled and must not switch off
    // auth/TOTP/payment throttles.
    if (isEmergencyExempt) {
      const url = req.originalUrl || req.url || '';
      if (url.includes('/emergency') || url.includes('/sos')) {
        return next();
      }
    }

    // 2. Identify client by User ID if authenticated, else IP address
    const identifier = req.user?._id ? `user:${req.user._id}` : `ip:${req.ip || 'unknown'}`;
    const redisKey = `${keyPrefix}:${identifier}`;

    // 3. Redis down: fail-closed for auth/OTP in production (brute-force
    // defence); fail-open in dev/test (no Redis) and elsewhere (availability).
    if (!isRedisReady() || !redisClient.isOpen) {
      if (failClosed && process.env.NODE_ENV === 'production') {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMITER_UNAVAILABLE',
          message: 'Security throttle unavailable. Please retry shortly.',
        });
      }
      return next();
    }

    const now = Date.now();
    const member = `${now}_${crypto.randomBytes(4).toString('hex')}`;

    try {
      // Atomic Lua admit: returns post-add count, or pre-add count at cap.
      const admitted = Number(await redisClient.eval(ADMIT_LUA, {
        keys: [redisKey],
        arguments: [String(now), String(windowMs), String(max), member],
      }));

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - admitted));

      // AUTH-B-04 / RL-01 / DL-04: the Lua script returns the PRE-add member count
      // when it refuses to admit (i.e. exactly `max`), so `admitted > max` was
      // never true at the cap and the counter could not grow past `max` — every
      // request above the cap was admitted (no effective throttle on /auth/*,
      // OTP verify, payouts...). The comparison must be `>=` (a window therefore
      // admits `max - 1` requests, the conservative reading of `max`).
      if (admitted >= max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please wait before attempting again.',
          retryAfterSeconds: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch (err) {
      logger.warn(`GRL rate-limiter error on [${redisKey}]: ${err.message}. Passing through.`);
      next(); // Fail-open on unexpected Redis error
    }
  };
}

// Pre-configured specialized limiters
export const authLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'rl:auth',
  failClosed: true,
});

export const bookingLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  keyPrefix: 'rl:booking',
});

export const paymentLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'rl:payment',
});

export const generalLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'rl:general',
});

// PHARMA-002: unauthenticated catalogue search. These are the only pharmacy
// endpoints reachable without a token, so they are the scraping surface — the
// limiter is what keeps one caller from enumerating the whole catalogue.
export const publicSearchLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'rl:publicsearch',
});

// TOTP / OTP verification and other short-code endpoints.
// Deliberately tight: a 6-digit code has only 1e6 combinations, so for
// 2FA/ABHA flows this limiter IS the brute-force defence — without it a
// script can attempt ~1000 codes/sec against an unauthenticated endpoint.
export const totpLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'rl:totp',
  failClosed: true,
});

/**
 * REV-B-01 (a): reviews are the cheapest reputation-manipulation surface in the
 * product — one extra `POST /reviews` is a fake five-star rating.
 *
 * The limiter is tight on the write path and deliberately absent from the public
 * read, because the read is a cached catalogue while the write is the asset being
 * protected.
 */
export const reviewWriteLimiter = createGrlRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyPrefix: 'rl:review-write',
  failClosed: true,
});

/**
 * AUD-B-01: the audit-log search endpoint.
 *
 * Distinct from the other limiters because it is EXPENSIVE, not because it is
 * dangerous to repeat: every request runs a `$or` over users AND over the audit
 * collection, and `audit:read` is held by a hospital_admin — i.e. by a role that
 * may only ever see its OWN rows. Even escaped, an unbounded number of such
 * queries is a cheap way to burn database CPU, so the window is deliberately
 * tight.
 */
export const auditSearchLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: 'rl:audit-search',
  // Never fail open: the limiter exists to protect the database, and a bypass
  // under load is exactly when it is needed.
  failClosed: true,
});
