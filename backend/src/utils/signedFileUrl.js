import crypto from 'node:crypto';

/**
 * Signed, short-lived URLs for private upload fetches (2.md 5 — the KYC
 * documents live behind the reviewer console, never behind a public URL).
 *
 * A route that has ALREADY done the authz (the review workspace's GET
 * /admin/applications/:id, for example) mints `url?exp=…&sig=…` bound to the
 * EXACT path and the calling user. The /uploads access check in index.js
 * accepts a valid signature as proof of that earlier authorization, so the
 * reviewer can preview without the Record-ownership rule that governs
 * unsigned fetches.
 *
 * Properties:
 *   - short-lived (SIGNED_FILE_TTL_SECONDS): a copied link dies on its own;
 *   - user-bound: sig covers the session's user id, so even inside the TTL a
 *     leaked URL is useless to any other account;
 *   - path-bound: a signature for one file cannot be transplanted onto
 *     another (or another directory);
 *   - constant-time compare; a wrong/expired/tampered sig simply falls
 *     through to the normal session + ownership rules.
 *
 * Secret: FILE_URL_SIGNING_SECRET, falling back to JWT_SECRET, then a
 * per-boot dev key (same doctrine as docSeal / fieldEncryption — dev links
 * do not survive a restart, which is correct for non-production data).
 */
let bootSecret = null;

const getSecret = () => {
  const configured = process.env.FILE_URL_SIGNING_SECRET || process.env.JWT_SECRET;
  if (configured) return configured;
  bootSecret ||= crypto.randomBytes(32).toString('hex');
  return bootSecret;
};

/** Only paths this module will ever sign (private application uploads). */
const SIGNABLE_UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/** 10 minutes: long enough to open a preview, short enough to be useless later. */
export const SIGNED_FILE_TTL_SECONDS = 600;

const signingPayload = (path, exp, userId) => `${path}|${exp}|${userId}`;

export const fileUrlSignature = (path, exp, userId) =>
  crypto.createHmac('sha256', getSecret()).update(signingPayload(path, exp, userId)).digest('hex');

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

/**
 * @param {string} path absolute upload path, e.g. `/uploads/documents/x.pdf`
 * @param {{userId: string, ttlSeconds?: number, now?: number}} options
 * @returns {string} the path with `?exp=&sig=` appended (input returned
 *   unchanged when it is not a signable upload path)
 */
export function signFileUrl(path, { userId, ttlSeconds = SIGNED_FILE_TTL_SECONDS, now = Date.now() } = {}) {
  const p = String(path || '');
  if (!SIGNABLE_UPLOAD_PATH.test(p)) return p;
  const exp = Math.floor(now / 1000) + Math.max(1, Number(ttlSeconds) || SIGNED_FILE_TTL_SECONDS);
  const sig = fileUrlSignature(p, exp, String(userId ?? ''));
  return `${p}?exp=${exp}&sig=${sig}`;
}

/**
 * Verifier for the access check. Expects the raw query values from the
 * request (`exp`/`sig` as strings) and the SESSION's user id — a signature
 * issued to somebody else never verifies.
 */
export function verifyFileUrlSignature({ path, exp, sig, userId, now = Date.now() }) {
  const p = String(path || '');
  if (!SIGNABLE_UPLOAD_PATH.test(p)) return false;
  const expNum = Number(exp);
  if (!Number.isInteger(expNum)) return false;
  if (expNum < Math.floor(now / 1000)) return false; // expired
  if (typeof sig !== 'string' || sig.length !== 64) return false;
  return safeEqual(sig, fileUrlSignature(p, expNum, String(userId ?? '')));
}
