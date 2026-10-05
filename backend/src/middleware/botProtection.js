import logger from '../config/logger.js';
import { securityFailOpenTotal } from '../lib/metrics.js';

// AUTH-M-05: bot protection on signup & OTP request.
//
// Automated account farming (many fake accounts -> many rate-limit identities)
// defeats per-account/per-IP throttling, so high-farming-risk endpoints carry a
// proof-of-humanity check: Cloudflare Turnstile (privacy-preserving, no puzzle
// in most cases; hCaptcha-compatible field names accepted).
//
//   TURNSTILE_SECRET_KEY=<secret>   verification enforced
//   (unset)                         middleware is a no-op (dev/test safe)
//
// Token carriage: `cf-turnstile-response` body field (the widget default) or
// the same header. Posture on provider outage is fail-OPEN with a logged
// error: this control fights spam, not account takeover — refusing every
// signup because Cloudflare is unreachable would turn a spam control into a
// self-inflicted outage. A missing/invalid token while configured is 403.
// F8: every fail-open is counted (security_fail_open_total), and
// TURNSTILE_STRICT=true flips the outage posture to fail-CLOSED (503) for
// deployments that would rather refuse signups than admit unverified ones.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function isBotProtectionConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/** F8: opt-in fail-closed posture when Cloudflare itself is unreachable. */
export function isTurnstileStrict() {
  return /^(1|true|yes)$/i.test(String(process.env.TURNSTILE_STRICT || ''));
}

/**
 * The single choke point for "the provider is broken, not the token".
 * Counts the fail-open either way - even in strict mode the ATTEMPTED
 * pass-through is what the metric is about - then either allows (default)
 * or refuses with 503 (TURNSTILE_STRICT).
 */
function providerUnavailable(res, reason, next) {
  securityFailOpenTotal.inc({ control: 'bot_protection' });
  if (isTurnstileStrict()) {
    logger.error(`botProtection provider failure (${reason}); TURNSTILE_STRICT set - failing closed`);
    return res.status(503).json({
      message: 'Bot verification is temporarily unavailable. Please retry shortly.',
      code: 'BOT_CHECK_UNAVAILABLE',
    });
  }
  logger.error(`botProtection provider failure (${reason}); allowing request through`);
  return next();
}

export async function verifyTurnstileToken(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: 'unconfigured' };
  const body = new URLSearchParams({ secret, response: String(token) });
  if (remoteip) body.set('remoteip', String(remoteip));
  const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return { ok: false, reason: `provider-http-${res.status}` };
  const data = await res.json().catch(() => ({}));
  return data?.success === true
    ? { ok: true }
    : { ok: false, reason: 'invalid-token', codes: data?.['error-codes'] };
}

export const botProtection = () => async (req, res, next) => {
  if (!isBotProtectionConfigured()) return next();
  const token = req.body?.['cf-turnstile-response']
    ?? req.headers?.['cf-turnstile-response']
    ?? req.body?.turnstileToken;
  if (!token) {
    return res.status(403).json({ message: 'Bot check required', code: 'BOT_CHECK_REQUIRED' });
  }
  try {
    const verdict = await verifyTurnstileToken(token, req.ip);
    if (verdict.ok) return next();
    if (verdict.reason !== 'invalid-token') {
      // Provider unreachable/misbehaving: fail open (or closed under
      // TURNSTILE_STRICT), but always loudly and always counted.
      return providerUnavailable(res, verdict.reason, next);
    }
    logger.warn(`botProtection reject for ${req.ip} codes=${(verdict.codes || []).join(',')}`);
    return res.status(403).json({ message: 'Bot check failed', code: 'BOT_CHECK_FAILED' });
  } catch (err) {
    return providerUnavailable(res, err.message, next);
  }
};
