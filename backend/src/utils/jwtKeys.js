import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import logger from '../config/logger.js';

/**
 * AUTH-M-06: signing keys with `kid`, and a rotation window.
 *
 * THE PROBLEM THIS SOLVES
 * `JWT_SECRET` was read directly in six places across three files. Rotating it
 * meant editing all of them, and the moment the env var changed, EVERY token in
 * the wild failed verification at once - every user on the platform logged out,
 * with no overlap. There was no `kid` in the header, so a verifier had no way to
 * know which key a token was signed with even if two were live.
 *
 * THE MODEL
 * A keyset, not a secret. `JWT_KEYS` is a JSON array:
 *
 *   JWT_KEYS=[{"kid":"k2","secret":"...","status":"active"},
 *             {"kid":"k1","secret":"...","status":"retiring"}]
 *
 * - `active`   - signs new tokens. Exactly one.
 * - `retiring` - still VERIFIES, signs nothing. This is the overlap window: a
 *                key can be retired, kept for as long as the longest-lived
 *                token signed with it (15 days for refresh), and only then
 *                dropped. Rotation becomes a no-op for existing sessions.
 * - absent     - anything else. A token whose `kid` matches no known key is
 *                REJECTED rather than falling back, because "fall back to the
 *                default secret" is exactly the downgrade an attacker wants.
 *
 * With no JWT_KEYS set, this degrades to a single key derived from JWT_SECRET
 * with a fixed kid, so behaviour is unchanged for every existing deployment and
 * no migration is required.
 *
 * KEYS ARE NOT LOGGED. `describeKeyset()` returns ids and status only.
 */

const LEGACY_KID = 'default';

let cache = null;

/** @returns {Array<{kid:string, secret:string, status:'active'|'retiring'}>} */
export function loadKeyset() {
  if (cache) return cache;

  const raw = process.env.JWT_KEYS;
  if (!raw) {
    const secret = process.env.JWT_SECRET || '';
    cache = secret ? [{ kid: LEGACY_KID, secret, status: 'active' }] : [];
    return cache;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Refuse to start signing on a keyset we cannot read. Falling back to
    // JWT_SECRET here would silently downgrade a configured rotation policy to a
    // single key, which is the failure this module exists to prevent.
    logger.error(`JWT_KEYS is not valid JSON - refusing to fall back to JWT_SECRET: ${err.message}`);
    throw new Error('JWT_KEYS is not valid JSON');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    logger.error('JWT_KEYS must be a non-empty JSON array of {kid, secret, status}');
    throw new Error('JWT_KEYS must be a non-empty array');
  }

  const seen = new Set();
  const active = [];
  for (const k of parsed) {
    if (!k?.kid || !k?.secret) {
      logger.error(`JWT_KEYS entry missing kid or secret: ${JSON.stringify(Object.keys(k || {}))}`);
      throw new Error('JWT_KEYS entry missing kid or secret');
    }
    if (seen.has(k.kid)) {
      logger.error(`JWT_KEYS contains duplicate kid "${k.kid}"`);
      throw new Error('JWT_KEYS contains duplicate kid');
    }
    seen.add(k.kid);
    active.push({ kid: k.kid, secret: k.secret, status: k.status === 'retiring' ? 'retiring' : 'active' });
  }

  const activeCount = active.filter((k) => k.status === 'active').length;
  if (activeCount !== 1) {
    // Two active keys means "which one signs?" is ambiguous. Zero means nothing
    // can be issued at all.
    logger.error(`JWT_KEYS must have exactly one active key, found ${activeCount}`);
    throw new Error(`JWT_KEYS must have exactly one active key, found ${activeCount}`);
  }

  cache = active;
  return cache;
}

/** Test hook: forget the parsed keyset so a new env takes effect. */
export function resetKeysetCache() {
  cache = null;
}

const activeKey = () => loadKeyset().find((k) => k.status === 'active');

/** Operational view - safe to log. Never returns secret material. */
export function describeKeyset() {
  return loadKeyset().map((k) => ({ kid: k.kid, status: k.status, fingerprint: crypto.createHash('sha256').update(k.secret).digest('hex').slice(0, 12) }));
}

export const currentKid = () => activeKey()?.kid || null;

/**
 * Sign with the active key and stamp `kid` into the header.
 *
 * `jsonid` (RFC 7519) is generated here rather than in each caller, so a token
 * always has an id to trace and the refresh-rotation `jti` chain has something
 * to hang off.
 */
export function signToken(payload, options = {}) {
  const key = activeKey();
  if (!key) throw new Error('No active signing key');
  return jwt.sign({ jti: crypto.randomUUID(), ...payload }, key.secret, {
    ...options,
    keyid: key.kid,
  });
}

/**
 * Verify against the key named in the token's own header.
 *
 * Throws on unknown kid - deliberately. The alternative (try every key) turns a
 * compromised retired key into a permanent forgery oracle for anything it ever
 * signed, and makes key removal impossible to audit.
 */
export function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.header?.kid;
  if (!kid) {
    throw new Error('Token has no kid header');
  }
  let key = loadKeyset().find((k) => k.kid === kid);

  // Zero-downtime migration path. Tokens minted BEFORE this module existed were
  // signed with the bare JWT_SECRET and carry no kid, so their header decodes to
  // undefined above - but if JWT_KEYS is now configured, falling through to
  // "unknown kid" would reject every live session the instant an operator set
  // the env var. That is a self-inflicted mass logout, discovered in
  // production, by the act of rotating a key.
  //
  // Only for a token with NO kid, and only against JWT_SECRET. A token that
  // CLAIMS some other kid is never given the legacy fallback: claiming a kid you
  // do not hold the secret for must fail, or `kid` becomes advisory.
  // A token with no kid at all predates this module; one with kid=LEGACY_KID was
  // minted by this module running WITHOUT JWT_KEYS, which is the same situation
  // from the verifier's point of view and was caught by the first version of
  // this function testing only `!kid`.
  if (!key && (kid === LEGACY_KID || !kid) && process.env.JWT_SECRET) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  if (!key) {
    throw new Error(`Unknown kid "${kid}"`);
  }
  return jwt.verify(token, key.secret);
}

export { LEGACY_KID };
