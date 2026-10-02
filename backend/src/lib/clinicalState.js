import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

// Tech 04 clinical distributed state: sub-ms guards where races endanger
// safety. All helpers are fail-soft (return { ok:false, reason }) so clinical
// HTTP paths degrade to Mongo checks when Redis is down.

function redisOrSkip() {
  if (!isRedisReady() || !redisClient.isOpen) return false;
  return true;
}

// ─── ICU/Ventilator bed lock: lock:hospital:bed:<hid>:<bid>, 5-min hold ─────
export function bedLockKey(hospitalId, bedId) {
  return `lock:hospital:bed:${hospitalId}:${bedId}`;
}

export async function holdBedLock(hospitalId, bedId, token, ttlMs = 300000) {
  if (!redisOrSkip()) return { ok: false, reason: 'redis_unavailable' };
  try {
    const { acquireLock } = await import('./redlock.js');
    const secret = await acquireLock(bedLockKey(hospitalId, bedId), token, ttlMs);
    return secret ? { ok: true } : { ok: false, reason: 'locked' };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// ─── Blood reservation: atomic DECRBY blood:stock:<bank>:<GROUP> ─────────────
// Seed key must equal Mongo available-unit count (reconciled at boot/sync).
// Returns { ok, remaining }; negative → rollback + inter-bank transfer signal.
export function bloodStockKey(bankId, group) {
  return `blood:stock:${bankId}:${String(group).toUpperCase().replace(/[^A-Z+-]/g, '')}`;
}

// Seed from Mongo available-unit count on first use (reconcile path).
export async function seedBloodStock(bankId, group, count) {
  if (!redisOrSkip()) return { ok: false, reason: 'redis_unavailable' };
  const key = bloodStockKey(bankId, group);
  const exists = await redisClient.exists(key);
  if (!exists) await redisClient.set(key, String(Math.max(0, Number(count) || 0)));
  return { ok: true };
}

export async function reserveBloodUnits(bankId, group, units) {  if (!redisOrSkip()) return { ok: false, reason: 'redis_unavailable' };
  try {
    const remaining = await redisClient.decrBy(bloodStockKey(bankId, group), Number(units));
    if (remaining < 0) {
      await redisClient.incrBy(bloodStockKey(bankId, group), Number(units)); // rollback
      logger.warn(`[blood] ${group} short at ${bankId}: inter-bank transfer required`);
      return { ok: false, reason: 'insufficient_transfer_required', remaining: remaining + Number(units) };
    }
    return { ok: true, remaining };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// ─── Telemedicine lobby: ZADD telemed:queue:<doctorId> (arrival-ordered) ─────
export function telemedQueueKey(doctorId) {
  return `telemed:queue:${doctorId}`;
}

export async function joinTelemedLobby(doctorId, patientId) {
  if (!redisOrSkip()) return { ok: false, reason: 'redis_unavailable' };
  const score = Date.now();
  await redisClient.zAdd(telemedQueueKey(doctorId), { score, value: String(patientId) });
  const rank = await redisClient.zRank(telemedQueueKey(doctorId), String(patientId));
  return { ok: true, position: (rank ?? 0) + 1 };
}

export async function nextTelemedPatient(doctorId) {
  if (!redisOrSkip()) return { ok: false, reason: 'redis_unavailable' };
  const [first] = await redisClient.zRange(telemedQueueKey(doctorId), 0, 0);
  if (!first) return { ok: false, reason: 'empty' };
  await redisClient.zRem(telemedQueueKey(doctorId), first);
  return { ok: true, patientId: first };
}

// ─── Controlled-substance limiter: ≤5 psychotropic dispenses/hour/patient ────
export function narcoticKey(aadhaarHash) {
  return `narcotic:dispense:user:${aadhaarHash}`;
}

export async function checkNarcoticLimit(aadhaarHash, maxPerHour = 5) {
  if (!redisOrSkip()) return { ok: true, reason: 'redis_unavailable_fail_open_clinical' };
  try {
    const now = Date.now();
    const key = narcoticKey(aadhaarHash);
    await redisClient.zRemRangeByScore(key, 0, now - 3600 * 1000);
    const count = await redisClient.zCard(key);
    if (count >= maxPerHour) return { ok: false, reason: 'doctor_shopping_blocked', count };
    await redisClient.zAdd(key, { score: now, value: `${now}` });
    await redisClient.expire(key, 3600);
    return { ok: true, count: count + 1 };
  } catch (err) {
    return { ok: true, reason: `fail_open:${err.message}` };
  }
}
