import { randomUUID } from 'crypto';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

// Safe release Lua script ensures we only delete our own lock
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

/**
 * Attempts to acquire an exclusive distributed lock in Redis.
 * Returns the lock secret if successful, or null if lock is already held.
 */
export async function acquireLock(resourceKey, ttlMs = 15000) {
  if (!isRedisReady() || !redisClient.isOpen) {
    logger.warn(`Redis unavailable for lock on ${resourceKey}; proceeding with local lock`);
    return `local_${randomUUID()}`;
  }

  const lockSecret = randomUUID();
  try {
    const result = await redisClient.set(resourceKey, lockSecret, {
      PX: ttlMs,
      NX: true, // Only set if key does not exist
    });

    if (result === 'OK') {
      return lockSecret;
    }
    return null; // Resource is already locked
  } catch (err) {
    logger.error(`acquireLock error on ${resourceKey}: ${err.message}`);
    return null;
  }
}

/**
 * Safely releases an acquired distributed lock using atomic Lua evaluation.
 */
export async function releaseLock(resourceKey, lockSecret) {
  if (!lockSecret || lockSecret.startsWith('local_')) return true;
  if (!isRedisReady() || !redisClient.isOpen) return false;

  try {
    const result = await redisClient.eval(RELEASE_LOCK_LUA, {
      keys: [resourceKey],
      arguments: [lockSecret],
    });
    return result === 1;
  } catch (err) {
    logger.error(`releaseLock error on ${resourceKey}: ${err.message}`);
    return false;
  }
}

/**
 * Executes a critical section function wrapped with distributed lock protection.
 */
export async function withLock(resourceKey, ttlMs, fn) {
  const secret = await acquireLock(resourceKey, ttlMs);
  if (!secret) {
    throw new Error(`LOCK_ACQUISITION_FAILED: Resource [${resourceKey}] is currently busy`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(resourceKey, secret);
  }
}
