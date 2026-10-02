/**
 * INF-M-02: scrape-endpoint authentication.
 *
 * Prometheus does not log in — it sends a bearer token (or the
 * `x-metrics-token` header for scrape configs that prefer it). So this gate is
 * a shared-secret comparison, NOT session `protect`, and it FAILS CLOSED:
 * with no `METRICS_TOKEN` in the environment the endpoint answers 403 rather
 * than serving request rates and error counts to whoever asks. An unauthenticated
 * metrics endpoint is a free map of your traffic shape and your busiest routes.
 *
 * Comparison is length-checked first, then `timingSafeEqual` — a plain `===`
 * on a secret leaks its value through response timing.
 */
import crypto from 'node:crypto';

export function requireMetricsToken(req, res, next) {
  const expected = process.env.METRICS_TOKEN;
  if (!expected) {
    return res.status(403).json({ message: 'metrics endpoint disabled: set METRICS_TOKEN to enable it' });
  }

  const header = req.get('authorization') || '';
  const bearer = header.replace(/^Bearer\s+/i, '');
  const got = bearer || req.get('x-metrics-token') || '';

  const a = Buffer.from(String(got), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ message: 'invalid metrics token' });
  }
  return next();
}
