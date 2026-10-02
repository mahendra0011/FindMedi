import bcrypt from 'bcryptjs';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

// CHAT-005: brute-force protection for short secrets.
//
// The app-lock PIN and the privacy passcode are 4–8 digit codes verified by
// bcrypt.compare with no attempt counter. A 4-digit code is 10,000 candidates
// and bcrypt.compare costs ~100ms, so an unauthenticated-ish attacker holding
// any valid session can grind it offline-speed over the API with nothing
// stopping them. The hash is the only thing between them and the chat contents.
//
// Design:
//  * attempts are counted per user in Redis, so the limit survives a restart and
//    is shared across instances
//  * after MAX_ATTEMPTS the account is locked for LOCKOUT_SECONDS
//  * a successful verify clears the counter
//  * every failure is audit-logged (subject, IP, UA) so a grind attempt leaves
//    a trail even if the attacker is inside the rate limiter
//  * if Redis is unavailable we fail CLOSED: a 4-digit code must not become
//    unlimited-guess merely because the counter store is down

const MAX_ATTEMPTS = Number(process.env.PIN_MAX_ATTEMPTS || 5);
const LOCKOUT_SECONDS = Number(process.env.PIN_LOCKOUT_SECONDS || 900); // 15 min
const KEY = (userId) => `chat:pinlock:${userId}`;

async function readState(userId) {
  if (!isRedisReady() || !redisClient.isOpen) return null;
  const raw = await redisClient.get(KEY(userId));
  if (!raw) return { attempts: 0, lockedUntil: 0 };
  try { return JSON.parse(raw); } catch { return { attempts: 0, lockedUntil: 0 }; }
}

async function writeState(userId, state, ttl) {
  if (!isRedisReady() || !redisClient.isOpen) return;
  await redisClient.set(KEY(userId), JSON.stringify(state), { EX: ttl });
}

export async function pinLockStatus(userId) {
  const state = await readState(userId);
  if (!state) return { locked: true, reason: 'counter_unavailable', attempts: MAX_ATTEMPTS };
  if (state.lockedUntil > Date.now()) {
    return { locked: true, retryAfterSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, attempts: state.attempts, remaining: Math.max(0, MAX_ATTEMPTS - state.attempts) };
}

async function registerFailure(userId, req) {
  const state = (await readState(userId)) || { attempts: 0, lockedUntil: 0 };
  state.attempts += 1;
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
    state.attempts = 0; // the lockout period is the punishment
  }
  await writeState(userId, state, LOCKOUT_SECONDS * 2);
  logger.warn(`chat pin verify failed user=${userId} attempts=${state.attempts} ip=${req.ip} locked=${state.lockedUntil > Date.now()}`);
  return state;
}

async function clearFailures(userId) {
  if (!isRedisReady() || !redisClient.isOpen) return;
  await redisClient.del(KEY(userId)).catch(() => {});
}

/**
 * verifyPin({ hash, pin }) -> { ok } | { locked: true, retryAfterSeconds }
 * Never throws for a wrong PIN; callers decide the HTTP shape.
 */
export async function verifyPin(userId, pin, hash, req) {
  const status = await pinLockStatus(userId);
  if (status.locked) {
    return {
      ok: false,
      locked: true,
      retryAfterSeconds: status.retryAfterSeconds ?? LOCKOUT_SECONDS,
      reason: status.reason,
    };
  }
  const ok = Boolean(pin) && Boolean(hash) && (await bcrypt.compare(String(pin), hash));
  if (ok) {
    await clearFailures(userId);
    return { ok: true };
  }
  const state = await registerFailure(userId, req);
  const nowLocked = state.lockedUntil > Date.now();
  return {
    ok: false,
    locked: nowLocked,
    retryAfterSeconds: nowLocked ? LOCKOUT_SECONDS : undefined,
    attempts: state.attempts,
    remaining: Math.max(0, MAX_ATTEMPTS - state.attempts),
  };
}

export const PIN_POLICY = { MAX_ATTEMPTS, LOCKOUT_SECONDS };
