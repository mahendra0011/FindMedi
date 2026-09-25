import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * GRL-Style Distributed Rate Limiter with Redis Sliding-Window Token Bucket.
 * Automatically bypasses critical Emergency SOS endpoints.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default 60,000ms / 1 min)
 * @param {number} options.max - Maximum allowed requests in window
 * @param {string} options.keyPrefix - Prefix for Redis key (e.g. 'rl:auth', 'rl:booking')
 */
export function createGrlRateLimiter({
  windowMs = 60000,
  max = 60,
  keyPrefix = 'rl:api',
  isEmergencyExempt = true,
}) {
  return async (req, res, next) => {
    // 1. Strict Emergency SOS bypass - NEVER rate-limit life-safety alerts
    if (isEmergencyExempt) {
      const url = req.originalUrl || req.url || '';
      if (
        url.includes('/emergency') ||
        url.includes('/sos') ||
        req.body?.isEmergency === true
      ) {
        return next();
      }
    }

    // 2. Identify client by User ID if authenticated, else IP address
    const identifier = req.user?._id ? `user:${req.user._id}` : `ip:${req.ip || 'unknown'}`;
    const redisKey = `${keyPrefix}:${identifier}`;

    // 3. Fallback to next() if Redis cluster is down (fail-open for platform availability)
    if (!isRedisReady() || !redisClient.isOpen) {
      return next();
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Redis pipeline: prune old requests, count active requests, and add current timestamp
      const multi = redisClient.multi();
      multi.zRemRangeByScore(redisKey, '-inf', windowStart);
      multi.zCard(redisKey);
      multi.zAdd(redisKey, { score: now, value: `${now}_${Math.random().toString(36).substring(2, 7)}` });
      multi.pExpire(redisKey, windowMs);

      const results = await multi.exec();
      const currentCount = Number(results[1] || 0);

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - (currentCount + 1)));

      if (currentCount >= max) {
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
});

export const bookingLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  keyPrefix: 'rl:booking',
});

export const generalLimiter = createGrlRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'rl:general',
});
