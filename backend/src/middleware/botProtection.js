import logger from '../config/logger.js';

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

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function isBotProtectionConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
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
      // Provider unreachable/misbehaving: fail open, but loudly.
      logger.error(`botProtection provider failure (${verdict.reason}); allowing request through`);
      return next();
    }
    logger.warn(`botProtection reject for ${req.ip} codes=${(verdict.codes || []).join(',')}`);
    return res.status(403).json({ message: 'Bot check failed', code: 'BOT_CHECK_FAILED' });
  } catch (err) {
    logger.error(`botProtection error (${err.message}); allowing request through`);
    return next();
  }
};
