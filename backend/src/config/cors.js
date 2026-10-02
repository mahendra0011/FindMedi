/**
 * MIND-B-03 — the SINGLE CORS policy for every Node app in this repository.
 *
 * Why this file exists: `src/index.js` (main API) and `mindsupport/src/app.js`
 * each carried their own allowlist, and they had already drifted — the drift was
 * a security bug, not a tidiness problem:
 *
 *   main API   : exact string match against a normalised origin list
 *   mindsupport: hostname+port comparison, PLUS `allowedOrigin === "*"`
 *                short-circuits to "allow everything"
 *
 * So `CORS_ORIGIN=*` — a value an operator reaches for in staging — silently
 * opened the mindsupport marketplace to every origin on the internet while the
 * main API stayed closed, and a hostname comparison would accept
 * `https://evil-findmedi.online` if `findmedi.online` were configured. Two
 * copies of one security control is two chances to get it wrong, and only one of
 * them is under review when a fix lands.
 *
 * The policy below is the strict one, and it is the strict one everywhere:
 *   - production requires an EXACT normalised origin match, always;
 *   - non-production permits any origin, because the dev servers move ports;
 *   - a `*` entry is rejected outright rather than honoured;
 *   - non-browser requests (no Origin: server-to-server, mobile, curl) pass,
 *     which is required for the webhooks and the native apps.
 *
 * Both apps import this, so a change here changes both.
 */

const NON_PRODUCTION_DEFAULT_ORIGINS = Object.freeze([
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5001',
]);

const PRODUCTION_DEFAULT_ORIGINS = Object.freeze([
  'https://findmedi.online',
  'https://www.findmedi.online',
]);

/** Strip trailing slashes and whitespace so `https://a.com/` === `https://a.com`. */
export function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

/**
 * The effective allowlist.
 *
 * A configured `*` is DROPPED, not honoured. In production an explicit wildcard
 * is the classic way a CORS policy silently becomes "any website may read this
 * response with the user's cookies"; refusing to expand it means the safe
 * interpretation wins when the config is ambiguous.
 */
export function getAllowedOrigins({ env = process.env, includeExtra = [] } = {}) {
  const configured = [
    ...(env.CLIENT_URL ? String(env.CLIENT_URL).split(',') : []),
    ...(env.CORS_ORIGIN ? String(env.CORS_ORIGIN).split(',') : []),
    ...includeExtra,
  ];

  const wildcard = configured.some((o) => normalizeOrigin(o) === '*');
  const defaults = env.NODE_ENV === 'production'
    ? PRODUCTION_DEFAULT_ORIGINS
    : NON_PRODUCTION_DEFAULT_ORIGINS;

  const origins = Array.from(new Set([...configured, ...defaults]))
    .map(normalizeOrigin)
    // A wildcard in the list is a misconfiguration, not a permission.
    .filter((o) => o && o !== '*');

  return { origins, wildcardRequested: wildcard };
}

/**
 * The decision for one request.
 *
 * @returns {{ allow: boolean, reason: string }}
 *   `allow` is the value to hand to the cors callback. `reason` exists so the
 *   caller can log WHY a request was refused — a silent `callback(null, false)`
 *   is indistinguishable in the logs from a browser that never asked.
 */
export function evaluateCorsOrigin(origin, opts = {}) {
  // No Origin header: curl, mobile clients, server-to-server webhooks. CORS does
  // not apply to these, and blocking them would break the payment webhooks.
  if (!origin) return { allow: true, reason: 'no_origin' };

  const env = opts.env || process.env;
  if (opts.requireExact !== true && env.NODE_ENV !== 'production') {
    return { allow: true, reason: 'non_production_permissive' };
  }

  const { origins, wildcardRequested } = getAllowedOrigins(opts);
  const normalized = normalizeOrigin(origin);

  if (origins.includes(normalized)) {
    return { allow: true, reason: 'exact_match' };
  }

  if (wildcardRequested) {
    return {
      allow: false,
      reason: 'wildcard_configured_but_refused',
    };
  }

  return { allow: false, reason: 'origin_not_allowlisted' };
}

/**
 * Build a `cors` options object.
 *
 * @param {object} [opts]
 * @param {(message: string, meta: object) => void} [opts.onBlocked] optional logger
 * @param {string[]} [opts.extraOrigins] additional origins for this app only
 */
export function buildCorsOptions(opts = {}) {
  const { onBlocked, extraOrigins = [], ...rest } = opts;

  return {
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'X-CSRF-Token',
      'x-csrf-token',
      'Accept',
      'Origin',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: (origin, callback) => {
      const decision = evaluateCorsOrigin(origin, {
        ...rest,
        includeExtra: extraOrigins,
      });

      if (decision.allow) {
        return callback(null, true);
      }

      if (onBlocked) {
        onBlocked(`CORS blocked ${decision.reason}: ${origin}`, decision);
      }
      // An explicit error, not `callback(null, false)`: a refused origin must be
      // visible in the logs, and a false-y callback is silently ignored by the
      // cors package in some versions.
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  };
}