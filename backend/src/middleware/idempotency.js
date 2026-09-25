import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Spec 20 rule 4 — Idempotency-Key replay guard for mutating dispatch endpoints.
 * Client sends `Idempotency-Key: <uuid>`; first completion stores status+body
 * in Redis (24h) and replays it on retry instead of double-executing.
 * Header absent → pass through (fail-open; existing clients keep working).
 * Redis down → pass through (fail-open).
 */
export function idempotencyGuard({ prefix = 'idem', ttlSeconds = 86400 } = {}) {
  return async (req, res, next) => {
    const key = req.header('Idempotency-Key') || req.header('idempotency-key');
    if (!key || !isRedisReady() || !redisClient.isOpen) return next();

    const redisKey = `${prefix}:${key}`;
    try {
      const existing = await redisClient.get(redisKey);
      if (existing) {
        try {
          const stored = JSON.parse(existing);
          if (stored && stored.replayed) {
            return res.status(stored.status || 200).json(stored.body);
          }
        } catch {}
        return res.status(409).json({
          success: false,
          error: 'IDEMPOTENT_IN_FLIGHT',
          message: 'Same request is already being processed. Retry shortly.',
        });
      }
      await redisClient.set(redisKey, JSON.stringify({ replayed: false }), { EX: ttlSeconds });

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        redisClient
          .set(redisKey, JSON.stringify({ replayed: true, status: res.statusCode, body }), { EX: ttlSeconds })
          .catch(() => {});
        return originalJson(body);
      };
      next();
    } catch (err) {
      logger.warn(`idempotency guard bypass: ${err.message}`);
      next();
    }
  };
}
