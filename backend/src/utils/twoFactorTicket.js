/**
 * Pending two-factor tickets (AUTH-B-03 / DL-03).
 *
 * A successful password check on a 2FA-enrolled account must NOT hand out a
 * session. Instead a short-lived, single-use, signed "ticket" is issued which
 * can only be exchanged (in POST /api/auth/2fa/complete) for a real session by
 * presenting a valid TOTP code or backup code.
 */
import crypto from 'node:crypto';
import { signToken, verifyToken } from './jwtKeys.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

const TICKET_PURPOSE = '2fa_pending';
export const TWO_FACTOR_TICKET_TTL_SECONDS = 600; // 10 minutes

const key = (jti) => `2fa:ticket:${jti}`;

/**
 * Issue a pending-2FA ticket for a user who has just passed the password check.
 */
export const issueTwoFactorTicket = (user) => {
  const jti = crypto.randomBytes(16).toString('hex');
  const token = signToken(
    { id: user._id.toString(), purpose: TICKET_PURPOSE, jti, tv: user.tokenVersion || 0 },
    { expiresIn: `${TWO_FACTOR_TICKET_TTL_SECONDS}s` }
  );

  // Single-use enforcement. Best effort: without Redis the ticket is still
  // signature-bound + time limited, it just cannot be replay-blocked.
  (async () => {
    try {
      if (isRedisReady() && redisClient.isOpen) {
        await redisClient.set(key(jti), user._id.toString(), { EX: TWO_FACTOR_TICKET_TTL_SECONDS });
      }
    } catch (err) {
      logger.warn(`2FA ticket store failed: ${err.message}`);
    }
  })();

  return { ticket: token, expiresIn: TWO_FACTOR_TICKET_TTL_SECONDS };
};

/**
 * Verify + burn a pending-2FA ticket.
 * @returns {{ ok: true, userId: string } | { ok: false, reason: string }}
 */
export const consumeTwoFactorTicket = async (ticket) => {
  if (!ticket || typeof ticket !== 'string') {
    return { ok: false, reason: 'missing' };
  }

  let payload;
  try {
    payload = verifyToken(ticket);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  if (payload.purpose !== TICKET_PURPOSE || !payload.id || !payload.jti) {
    return { ok: false, reason: 'invalid' };
  }

  // Replay protection: a ticket may be exchanged exactly once.
  try {
    if (isRedisReady() && redisClient.isOpen) {
      const stored = await redisClient.getDel(key(payload.jti));
      if (!stored) return { ok: false, reason: 'used' };
      if (String(stored) !== String(payload.id)) return { ok: false, reason: 'invalid' };
    }
  } catch (err) {
    logger.warn(`2FA ticket replay check skipped: ${err.message}`);
  }

  return { ok: true, userId: payload.id, tokenVersion: payload.tv ?? 0 };
};