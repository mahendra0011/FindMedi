/**
 * PAY-B-06: one shared, mandatory webhook verification path.
 *
 * The finding was not "webhook.js is insecure" — it is that there was no SINGLE
 * definition of "a verified webhook", so each provider route re-implemented it and
 * the easy-to-get-wrong parts (raw body, constant-time compare, replay window,
 * replay cache) were opt-in. This module makes them the default and reusable.
 *
 * The four properties, in order:
 *   1. RAW BODY      — HMAC is computed over the exact bytes received. Any
 *       re-serialisation of the parsed body changes the bytes and breaks the
 *       signature.
 *   2. CONSTANT TIME — timingSafeEqual, so a byte-at-a-time oracle cannot recover
 *       the expected digest.
 *   3. TIMESTAMP     — MANDATORY. A signature older than WINDOW_SECONDS is
 *       rejected, and a MISSING timestamp is rejected too: without it the window
 *       means nothing and a captured event can be replayed forever.
 *   4. REPLAY CACHE  — the same signature inside the window is accepted ONCE.
 *       (3) alone still allows a replay inside the window, and (4) degrades to a
 *       no-op when Redis is absent — hence the fail-closed switch.
 *
 * Fails CLOSED: a missing secret is a 503, never an accept.
 */
import crypto from 'crypto';
import logger from '../config/logger.js';
import { redisClient, isRedisReady } from '../config/redis.js';

/** 5 minutes is the usual gateway tolerance; anything older is a capture. */
export const WEBHOOK_WINDOW_SECONDS = Number(process.env.WEBHOOK_WINDOW_SECONDS || 300);

/**
 * Whether an unavailable replay cache should REJECT the event.
 *
 * The trade-off is explicit rather than implicit:
 *   * production (or REQUIRE_WEBHOOK_REPLAY_PROTECTION=true) -> reject.
 *     A Redis outage must not silently remove replay protection; an operator
 *     capturing a legitimate webhook and replaying it inside the window is
 *     exactly the attack this cache exists to stop, and the HMAC check does not
 *     catch it.
 *   * development -> warn and accept, so a developer without Redis can still work
 *     on the webhook path.
 */
export const requireReplayProtection = () =>
  process.env.REQUIRE_WEBHOOK_REPLAY_PROTECTION === 'true'
  || process.env.NODE_ENV === 'production';

export const verifyWebhook = (providerOrResolver, {
  secretEnv = null,
  resolveSecret = null,
  signatureHeaders = ['x-signature', 'x-hub-signature-256', 'x-razorpay-signature'],
  timestampHeaders = ['x-webhook-timestamp', 'x-signature-timestamp', 'x-timestamp'],
  algorithm = 'sha256',
  windowSeconds = WEBHOOK_WINDOW_SECONDS,
  prefix = 'webhook',
  requireReplayCache = requireReplayProtection(),
} = {}) => async (req, res, next) => {
  const provider = typeof providerOrResolver === 'function'
    ? providerOrResolver(req)
    : providerOrResolver;

  // Either a fixed WEBHOOK_SECRET_<PROVIDER> env var, or a resolver for routes
  // where the provider is a path segment (e.g. /webhooks/:provider).
  const secret = resolveSecret
    ? resolveSecret(req, provider)
    : process.env[secretEnv || `WEBHOOK_SECRET_${String(provider).toUpperCase()}`];

  if (!secret) {
    logger.error(`Webhook secret for ${provider} is not configured — refusing the callback`);
    return res.status(503).json({ error: 'Webhook provider not configured' });
  }

  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  const provided = signatureHeaders.map((h) => req.headers[h]).find(Boolean);

  if (!provided) {
    logger.warn(`Webhook for ${provider} had no signature header`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // The timestamp is part of the signed material; accept `ts.digest` (some
  // gateways) or a separate timestamp header.
  const tsHeader = timestampHeaders.map((h) => req.headers[h]).find(Boolean);
  let timestamp = tsHeader ? Number(tsHeader) : null;
  let signature = provided;

  if (provided.includes('.')) {
    const [maybeTs, maybeSig] = provided.split('.', 2);
    if (/^\d+$/.test(maybeTs)) {
      timestamp = Number(maybeTs);
      signature = maybeSig;
    }
  }

  const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), raw]);

  // A missing timestamp is a FAILURE, not a pass.
  //
  // `if (timestamp !== null)` meant a provider that simply omits the header got
  // an unlimited-lifetime signature: capture one valid webhook, and replay it
  // forever. The freshness window is only meaningful if the timestamp is
  // MANDATORY — an absent timestamp is indistinguishable from an attacker
  // stripping it.
  if (timestamp === null || !Number.isFinite(timestamp)) {
    logger.warn(`Webhook for ${provider} arrived without a usable timestamp`);
    return res.status(401).json({ error: 'Missing timestamp' });
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > windowSeconds) {
    logger.warn(`Webhook for ${provider} outside the ${windowSeconds}s window (age ${ageSeconds}s)`);
    return res.status(401).json({ error: 'Expired signature' });
  }

  const expected = crypto.createHmac(algorithm, secret).update(signedPayload).digest('hex');
  if (!constantTimeEqual(signature, expected)) {
    logger.warn(`Invalid webhook signature for ${provider}`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

// Replay cache: the signature is single-use inside the window.
  const replayKey = `${prefix}:${provider}:${crypto.createHash('sha256').update(String(signature)).digest('hex')}`;
  try {
    if (isRedisReady() && redisClient.isOpen) {
      const firstUse = await redisClient.set(replayKey, '1', { EX: windowSeconds + 60, NX: true });
      if (firstUse !== 'OK') {
        logger.warn(`Replayed webhook signature rejected for ${provider}`);
        return res.status(401).json({ error: 'Replayed signature' });
      }
    } else if (requireReplayCache) {
      logger.error(
        `Webhook replay protection unavailable for ${provider} and `
        + 'REQUIRE_WEBHOOK_REPLAY_PROTECTION is set — refusing the event.'
      );
      return res.status(503).json({ error: 'Webhook verification temporarily unavailable' });
    } else {
      logger.warn(
        `Webhook replay cache not active for ${provider}. The HMAC was verified, but `
        + `a captured event could be replayed inside the ${windowSeconds}s window. `
        + 'Set REDIS_URL, or REQUIRE_WEBHOOK_REPLAY_PROTECTION=true to fail closed.'
      );
    }
  } catch (err) {
    // An exception is an outage, and an outage must not mean "accept everything".
    logger.error(`Webhook replay cache error for ${provider}: ${err.message}`);
    if (requireReplayCache) {
      return res.status(503).json({ error: 'Webhook verification temporarily unavailable' });
    }
  }

  req.webhook = { provider, raw, verifiedAt: new Date() };
  return next();
};

/**
 * PAY-B-06: freshness + single-use check for a caller that has already verified
 * the HMAC itself (e.g. a route that resolves its secret dynamically).
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export async function assertWebhookFresh(req, {
  windowSeconds = WEBHOOK_WINDOW_SECONDS,
  provider = 'webhook',
  timestampHeaders = ['x-webhook-timestamp', 'x-signature-timestamp', 'x-timestamp'],
  signatureHeaders = ['x-signature', 'x-hub-signature-256', 'x-razorpay-signature'],
  prefix = 'webhook',
  // Same default as verifyWebhook: production fails closed.
  requireReplayCache = requireReplayProtection(),
} = {}) {
  const tsHeader = timestampHeaders.map((h) => req.headers?.[h]).find(Boolean);
  let timestamp = tsHeader ? Number(tsHeader) : null;
  let signature = signatureHeaders.map((h) => req.headers?.[h]).find(Boolean);

  // `ts.digest` form (several gateways): the timestamp is inside the signature.
  if (signature?.includes('.')) {
    const [maybeTs, maybeSig] = signature.split('.', 2);
    if (/^\d+$/.test(maybeTs)) {
      timestamp = Number(maybeTs);
      signature = maybeSig;
    }
  }

  // Same rule as verifyWebhook: a missing timestamp is a FAILURE.
  //
  // `if (timestamp !== null && ...)` meant a caller that verifies the HMAC itself
  // and forgets to send a timestamp got an unlimited-lifetime verdict — the same
  // replay exposure, in the sibling entry point. Fixing only the middleware would
  // have left a second door open.
  if (timestamp === null || !Number.isFinite(timestamp)) {
    logger.warn(`Webhook for ${provider} arrived without a usable timestamp`);
    return { ok: false, reason: 'missing-timestamp' };
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > windowSeconds) return { ok: false, reason: 'expired' };

  if (signature) {
    const replayKey = `${prefix}:${provider}:${crypto.createHash('sha256').update(String(signature)).digest('hex')}`;
    try {
      if (isRedisReady() && redisClient.isOpen) {
        const firstUse = await redisClient.set(replayKey, '1', { EX: windowSeconds + 60, NX: true });
        if (firstUse !== 'OK') return { ok: false, reason: 'replayed' };
      } else if (requireReplayCache) {
        logger.error(
          `Webhook replay protection unavailable for ${provider} and `
          + 'REQUIRE_WEBHOOK_REPLAY_PROTECTION is set — refusing the event.'
        );
        return { ok: false, reason: 'replay-cache-unavailable' };
      } else {
        logger.warn(
          `Webhook replay cache not active for ${provider}. The HMAC was verified, but `
          + `a captured event could be replayed inside the ${windowSeconds}s window.`
        );
      }
    } catch (err) {
      logger.error(`Webhook replay cache error for ${provider}: ${err.message}`);
      if (requireReplayCache) return { ok: false, reason: 'replay-cache-unavailable' };
    }
  }

  return { ok: true };
}

/**
 * Length-checked constant-time comparison. `timingSafeEqual` throws on a length
 * mismatch, so the lengths are compared first (that check leaks only the length).
 */
export function constantTimeEqual(a, b) {
  const given = Buffer.from(String(a ?? ''), 'utf8');
  const want = Buffer.from(String(b ?? ''), 'utf8');
  if (given.length !== want.length) return false;
  return crypto.timingSafeEqual(given, want);
}

export default verifyWebhook;