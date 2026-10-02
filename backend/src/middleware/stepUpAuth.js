/**
 * AUTHZ-M-03: step-up authentication for sensitive actions.
 *
 * 2FA at LOGIN proves who you are once, at the start of a session. It says
 * nothing about whether the *same* person is still there when they, say, an hour
 * later add a payout account, read a full export, or change a patient's
 * diagnosis. A session token is a long-lived bearer credential; a stolen one gets
 * everything it can reach, including the endpoints that move money.
 *
 * Step-up closes that window: the sensitive action demands a FRESH proof, and the
 * result is short-lived, single-use, and bound to one action scope.
 *
 * Three deliberate properties:
 *
 *  1. FAIL CLOSED when the user HAS enabled 2FA. Someone who opted into a second
 *     factor and then finds it skipped on a payout edit has been silently
 *     downgraded. A user who never enabled 2FA is allowed through — demanding a
 *     factor they do not have locks them out of their own account, which is not a
 *     security improvement.
 *
 *  2. The grant is CONSUMED on use and bound to a scope string. A step-up granted
 *     to authorise "view export" must not also authorise "add payout account" five
 *     minutes later; that would just be a second session token with extra steps.
 *
 *  3. Opaque single-use tokens, so a grant cannot be forged or replayed. The
 *     grant is keyed by user AND scope internally as well, so a stolen token is
 *     useless against a different endpoint.
 */
import crypto from 'node:crypto';
import User from '../models/User.js';
import { verifyToken, verifyBackupCode } from '../services/twoFactorService.js';

const DEFAULT_TTL_SECONDS = 300; // 5 min: long enough for one task, short enough to matter.

/** Grants live in-process. A multi-instance deployment needs Redis for these. */
const grants = new Map();

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of grants) if (v.expiresAt <= now) grants.delete(k);
}, 60_000);
sweep.unref?.();

export const recordStepUp = (userId, scope, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const grant = { userId: String(userId), scope, expiresAt: Date.now() + ttlSeconds * 1000 };
  grants.set(`${grant.userId}:${scope}`, grant);
  return grant;
};

export const consumeStepUp = (userId, scope) => {
  const key = `${String(userId)}:${scope}`;
  const grant = grants.get(key);
  if (!grant) return null;
  grants.delete(key); // single-use, even if the action then fails partway
  return grant.expiresAt > Date.now() ? grant : null;
};

/** Read-only, for a route that wants to say "verification needed" without consuming. */
export const hasStepUp = (userId, scope) => {
  const grant = grants.get(`${String(userId)}:${scope}`);
  return Boolean(grant && grant.expiresAt > Date.now());
};

export const clearStepUps = (userId) => {
  for (const k of [...grants.keys()]) {
    if (k.startsWith(`${String(userId)}:`)) grants.delete(k);
  }
};

/** Opaque single-use token, so a grant is neither guessable nor forgeable. */
const tokenIndex = new Map();

export const issueStepUpToken = (grant) => {
  const token = crypto.randomBytes(24).toString('base64url');
  tokenIndex.set(token, grant);
  setTimeout(() => tokenIndex.delete(token), Math.max(0, grant.expiresAt - Date.now())).unref?.();
  return token;
};

const consumeStepUpToken = (token) => {
  const grant = tokenIndex.get(token);
  if (!grant) return null;
  tokenIndex.delete(token);
  return grant.expiresAt > Date.now() ? grant : null;
};

/**
 * Issue a step-up grant after the user proves possession.
 * Separate from the middleware so a client can obtain one and then make the
 * sensitive call.
 */
export const issueStepUpFor = async (userId, code, scope, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const user = await User.findById(userId)
    .select('twoFactorEnabled twoFactorSecret twoFactorBackupCodes email');
  if (!user) return { ok: false, reason: 'no-user' };
  if (!user.twoFactorEnabled) return { ok: false, reason: 'not-enabled' };

  const clean = String(code || '').trim();
  let ok = false;
  if (/^\d{6}$/.test(clean)) ok = verifyToken(clean, user.twoFactorSecret);
  else if (clean) ok = verifyBackupCode(clean, user.twoFactorBackupCodes || []);

  if (!ok) return { ok: false, reason: 'bad-code' };
  const grant = recordStepUp(user._id, scope, ttlSeconds);
  return { ok: true, grant, token: issueStepUpToken(grant) };
};

/**
 * Express middleware.
 *   router.post('/payouts', protect, requireStepUp('payouts:add'), handler)
 */
export const requireStepUp = (scope, { ttlSeconds = DEFAULT_TTL_SECONDS } = {}) =>
  async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authorized' });

      const presented = req.get('x-step-up-token');
      if (presented) {
        const grant = consumeStepUpToken(String(presented));
        // Both the user AND the scope must match. A token minted for an export
        // must not open a payout, and one user's token must not work for another.
        if (grant && String(grant.userId) === String(req.user._id) && grant.scope === scope) {
          req.stepUp = { scope, expiresAt: grant.expiresAt };
          return next();
        }
      }

      const user = await User.findById(req.user._id).select('twoFactorEnabled');
      if (!user) return res.status(401).json({ message: 'Not authorized' });

      if (!user.twoFactorEnabled) {
        // Property 1: no second factor on the account means no step-up is
        // possible, and refusing would lock those users out of their own account.
        req.stepUp = { scope, skipped: 'two-factor-not-enabled' };
        return next();
      }

      return res.status(403).json({
        message: 'This action requires verification',
        requiresStepUp: true,
        scope,
        error: 'STEP_UP_REQUIRED',
      });
    } catch (err) {
      return next(err);
    }
  };

export default requireStepUp;
