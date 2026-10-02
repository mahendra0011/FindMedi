import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Spec 20 rule 4 — Idempotency-Key replay guard for mutating dispatch endpoints.
 * Client sends `Idempotency-Key: <uuid>`; first completion stores status+body
 * in Redis (24h) and replays it on retry instead of double-executing.
 * Header absent → pass through (fail-open; existing clients keep working).
 * Redis down → pass through (fail-open).
 */
export function idempotencyGuard({ prefix = 'idem', ttlSeconds = 86400, failClosed = false } = {}) {
  return async (req, res, next) => {
    const key = req.header('Idempotency-Key') || req.header('idempotency-key');
    if (!key) {
      // PAY-003: payment routes opt into fail-closed — no key, no processing.
      if (failClosed) {
        return res.status(400).json({
          success: false,
          error: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'Idempotency-Key header is required for this endpoint',
        });
      }
      return next();
    }

    if (!isRedisReady() || !redisClient.isOpen) {
      // PAY-003: fail-closed — never execute a payment without the replay guard.
      if (failClosed) {
        return res.status(503).json({
          success: false,
          error: 'IDEMPOTENCY_UNAVAILABLE',
          message: 'Idempotency service unavailable — request not processed',
        });
      }
      return next();
    }

    // PAY-003: scope by user (or IP for anonymous callers) so one user's key can
    // never replay another user's stored response.
    const redisKey = `${prefix}:${req.user?._id || req.ip}:${key}`;
    try {
      // PAY-B-09: the reservation is acquired ATOMICALLY with SET .. NX. The old
      // `GET` then unconditional `SET` had a TOCTOU window the length of the
      // whole handler, so two concurrent retries with the same key both executed
      // the money path (double charge / double dispatch).
      const acquired = await redisClient.set(redisKey, JSON.stringify({ replayed: false, inFlight: true }), { EX: ttlSeconds, NX: true });
      if (acquired !== 'OK') {
        // Somebody else holds the reservation: replay the stored response when it
        // is ready, otherwise tell the caller the original is still in flight.
        const existing = await redisClient.get(redisKey);
        if (existing) {
          try {
            const stored = JSON.parse(existing);
            if (stored && stored.replayed) {
              return res.status(stored.status || 200).json(stored.body);
            }
          } catch {}
        }
        return res.status(409).json({
          success: false,
          error: 'IDEMPOTENT_IN_FLIGHT',
          message: 'Same request is already being processed. Retry shortly.',
        });
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        redisClient
          .set(redisKey, JSON.stringify({ replayed: true, status: res.statusCode, body }), { EX: ttlSeconds })
          .catch(() => {});
        return originalJson(body);
      };
      next();
    } catch (err) {
      // PAY-M-07: this catch used to call next() unconditionally, which silently
      // disabled the double-charge guard for exactly the endpoints that declared
      // themselves fail-closed. A Redis blip mid-reservation therefore turned
      // "charge once per key" into "charge every time" — and it failed OPEN, the
      // one direction a money path must never fail in.
      logger.error(`idempotency guard error on ${prefix}: ${err.message}`);
      if (failClosed) {
        // Deliberately no rollback. The reservation may or may not have been
        // taken, and guessing would either strand the key (every retry 409s) or
        // free it while the first request is still executing. Refusing is the
        // only state that cannot double-spend; the key expires on its own TTL.
        return res.status(503).json({
          success: false,
          // Same code as the Redis-down branch above, deliberately. To a client
          // these are one condition, and a client branching on the string must
          // not have to know which of the two fired.
          error: 'IDEMPOTENCY_UNAVAILABLE',
          message: 'Idempotency service unavailable — request not processed',
        });
      }
      next();
    }
  };
}
