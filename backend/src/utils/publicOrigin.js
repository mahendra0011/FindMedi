/**
 * The public origin to stamp into PERSISTED file URLs (avatar images,
 * local-fallback upload links).
 *
 * AUTH host-header: building these from `req.get('host')` in production lets
 * a request with a forged Host header write a URL pointing at an arbitrary
 * origin into the database — every later viewer of that record then loads the
 * file from the attacker's server. Production therefore uses the
 * env-configured public origin (`FRONTEND_URL`, a startup requirement since
 * HI-B-01 — see envValidator) and fails closed if it is missing. Development
 * keeps the request host: the vite dev server does not proxy /uploads, so
 * only the API's own localhost origin works there, and only a local attacker
 * can poison it.
 */
export function publicOrigin(req) {
  const configured = String(process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    if (!configured) {
      const err = new Error('FRONTEND_URL must be configured in production to build file URLs');
      err.status = 500;
      throw err;
    }
    return configured;
  }
  return `${req.protocol}://${req.get('host')}`;
}
