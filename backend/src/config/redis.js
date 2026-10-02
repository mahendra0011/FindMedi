import { createClient } from 'redis';
import logger from './logger.js';
import { randomDigits } from '../utils/secureRandom.js';

let isConnected = false;

// INF-B-09: REDIS_URL is the single source of truth for the Redis endpoint —
// never inline an internal host/port in source. A rediss:// URL (or an explicit
// REDIS_TLS=true) enables TLS for the session/OTP/lockout store so a compromised
// sibling container can neither sniff nor inject those keys.
const REDIS_TLS_ENABLED = process.env.REDIS_TLS === 'true'
  || String(process.env.REDIS_URL || '').startsWith('rediss://');

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    // Never silently accept an unverifiable certificate: TLS without
    // verification is just obfuscation. Point REDIS_TLS_CA_FILE at the CA
    // (or leave REDIS_TLS_REJECT_UNAUTHORIZED=true for a managed provider).
    ...(REDIS_TLS_ENABLED
      ? {
        tls: {
          rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
          ...(process.env.REDIS_TLS_CA_FILE ? { ca: [process.env.REDIS_TLS_CA_FILE] } : {}),
        },
      }
      : {}),
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Redis max retries exceeded');
      return Math.min(retries * 500, 3000);
    },
  },
});

export const redisPub = redisClient.duplicate();
export const redisSub = redisClient.duplicate();

redisClient.on('error', (err) => {
  isConnected = false;
  logger.error(`Redis error: ${err.message}`);
});
redisClient.on('ready', () => { isConnected = true; });
redisClient.on('end', () => { isConnected = false; });

redisPub.on('error', (err) => logger.error(`Redis pub error: ${err.message}`));
redisSub.on('error', (err) => logger.error(`Redis sub error: ${err.message}`));

export function isRedisReady() {
  return isConnected && !!process.env.REDIS_URL;
}

export async function connectRedis() {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL is not set — running in-memory fallback mode.');
    return;
  }
  try {
    await redisClient.connect();
    await redisPub.connect();
    await redisSub.connect();
    isConnected = true;
    logger.info('Redis connected (main + pub + sub)');

    // Periodic cleanup of stale geo & cache keys
    setInterval(cleanupStaleLocations, 3 * 60 * 1000);
  } catch (err) {
    isConnected = false;
    logger.warn(`Redis connection failed (${err.message}) — using in-memory fallbacks.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERIC CACHE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getCache(key) {
  if (!isRedisReady()) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn(`Redis getCache failed for ${key}: ${err.message}`);
    return null;
  }
}

export async function setCache(key, value, ttlSeconds = 300) {
  if (!isRedisReady()) return false;
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (err) {
    logger.warn(`Redis setCache failed for ${key}: ${err.message}`);
    return false;
  }
}

export async function delCache(key) {
  if (!isRedisReady()) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    logger.warn(`Redis delCache failed for ${key}: ${err.message}`);
    return false;
  }
}

export async function flushCachePattern(pattern) {
  if (!isRedisReady()) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Redis invalidated ${keys.length} keys matching ${pattern}`);
    }
    return true;
  } catch (err) {
    logger.warn(`Redis flushCachePattern failed for ${pattern}: ${err.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONCURRENCY SLOT BOOKING LOCK (Double-Booking Prevention)
// ─────────────────────────────────────────────────────────────────────────────

export async function lockAppointmentSlot(doctorId, date, timeSlot, patientId, ttlSeconds = 300) {
  if (!isRedisReady()) return { success: true, fallback: true };
  const key = `slot_lock:${doctorId}:${date}:${timeSlot}`;
  try {
    const existing = await redisClient.get(key);
    if (existing) {
      const data = JSON.parse(existing);
      // Same patient re-locking their own slot -> allowed
      if (data.patientId === String(patientId)) {
        await redisClient.expire(key, ttlSeconds);
        return { success: true, lockKey: key, expiresAt: Date.now() + ttlSeconds * 1000 };
      }
      return {
        success: false,
        lockedByOther: true,
        message: `This slot (${timeSlot}) is currently being booked by another patient. Please choose a different slot.`,
      };
    }

    const acquired = await redisClient.set(
      key,
      JSON.stringify({ patientId: String(patientId), lockedAt: Date.now() }),
      { EX: ttlSeconds, NX: true }
    );

    if (acquired) {
      return { success: true, lockKey: key, expiresAt: Date.now() + ttlSeconds * 1000 };
    }

    return {
      success: false,
      lockedByOther: true,
      message: `This slot (${timeSlot}) is currently being booked by another patient.`,
    };
  } catch (err) {
    logger.warn(`Redis slot lock error: ${err.message}`);
    return { success: true, fallback: true };
  }
}

export async function releaseAppointmentSlot(doctorId, date, timeSlot, patientId) {
  if (!isRedisReady()) return true;
  const key = `slot_lock:${doctorId}:${date}:${timeSlot}`;
  try {
    const existing = await redisClient.get(key);
    if (existing) {
      const data = JSON.parse(existing);
      // Only the holding patient or admin can release the lock
      if (!patientId || data.patientId === String(patientId)) {
        await redisClient.del(key);
      }
    }
    return true;
  } catch (err) {
    logger.warn(`Redis release slot error: ${err.message}`);
    return false;
  }
}

export async function getLockedSlotsForDoctor(doctorId, date) {
  if (!isRedisReady()) return [];
  const pattern = `slot_lock:${doctorId}:${date}:*`;
  try {
    const keys = await redisClient.keys(pattern);
    const lockedSlots = [];
    for (const key of keys) {
      const parts = key.split(':');
      const timeSlot = parts.slice(3).join(':');
      if (timeSlot) lockedSlots.push(timeSlot);
    }
    return lockedSlots;
  } catch (err) {
    logger.warn(`Redis getLockedSlotsForDoctor error: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LIVE PRESENCE TRACKING (Doctor / Staff / Delivery Online Status)
// ─────────────────────────────────────────────────────────────────────────────

export async function setUserPresence(userId, role, metadata = {}) {
  if (!isRedisReady()) return;
  const key = `presence:${userId}`;
  try {
    await redisClient.set(
      key,
      JSON.stringify({ userId: String(userId), role, ...metadata, lastSeen: Date.now() }),
      { EX: 90 } // 90-sec TTL; kept alive by WebSocket heartbeat
    );
    if (role === 'doctor' || role === 'clinic_doctor') {
      await redisClient.sAdd('online_doctors', String(userId));
    }
  } catch (err) {
    logger.warn(`Redis setUserPresence error: ${err.message}`);
  }
}

export async function removeUserPresence(userId, role) {
  if (!isRedisReady()) return;
  const key = `presence:${userId}`;
  try {
    await redisClient.del(key);
    if (role === 'doctor' || role === 'clinic_doctor') {
      await redisClient.sRem('online_doctors', String(userId));
    }
  } catch (err) {
    logger.warn(`Redis removeUserPresence error: ${err.message}`);
  }
}

export async function getOnlinePresence(userIds = []) {
  if (!isRedisReady() || !userIds.length) return {};
  try {
    const results = {};
    for (const id of userIds) {
      const exists = await redisClient.exists(`presence:${id}`);
      results[id] = exists === 1;
    }
    return results;
  } catch (err) {
    logger.warn(`Redis getOnlinePresence error: ${err.message}`);
    return {};
  }
}

export async function getOnlineDoctorsList() {
  if (!isRedisReady()) return [];
  try {
    const doctorIds = await redisClient.sMembers('online_doctors');
    const liveIds = [];
    for (const id of doctorIds) {
      const active = await redisClient.exists(`presence:${id}`);
      if (active) {
        liveIds.push(id);
      } else {
        await redisClient.sRem('online_doctors', id);
      }
    }
    return liveIds;
  } catch (err) {
    logger.warn(`Redis getOnlineDoctorsList error: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATOMIC LIVE OPD TOKEN GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export async function getNextOPDTokenNumber(doctorId, date) {
  if (!isRedisReady()) {
    // Fallback: random numeric token
    return `OPD-${randomDigits(3)}`;
  }
  const key = `opd_token:${doctorId}:${date}`;
  try {
    const nextNum = await redisClient.incr(key);
    if (nextNum === 1) {
      await redisClient.expire(key, 86400 * 2); // 2-day TTL
    }
    return `OPD-${String(nextNum).padStart(3, '0')}`;
  } catch (err) {
    logger.warn(`Redis getNextOPDTokenNumber error: ${err.message}`);
    return `OPD-${randomDigits(3)}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FAST AUTO-EXPIRING OTP & RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────

export async function setRedisOTP(email, otpHash, ttlSeconds = 600) {
  if (!isRedisReady()) return false;
  try {
    await redisClient.set(`otp:${email.toLowerCase()}`, otpHash, { EX: ttlSeconds });
    return true;
  } catch (err) {
    logger.warn(`Redis setRedisOTP error: ${err.message}`);
    return false;
  }
}

export async function getRedisOTP(email) {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.get(`otp:${email.toLowerCase()}`);
  } catch (err) {
    logger.warn(`Redis getRedisOTP error: ${err.message}`);
    return null;
  }
}

export async function delRedisOTP(email) {
  if (!isRedisReady()) return false;
  try {
    await redisClient.del(`otp:${email.toLowerCase()}`);
    return true;
  } catch (err) {
    logger.warn(`Redis delRedisOTP error: ${err.message}`);
    return false;
  }
}

export async function setOTPCooldown(email, seconds = 60) {
  if (!isRedisReady()) return true;
  try {
    const acquired = await redisClient.set(`otp_cooldown:${email.toLowerCase()}`, '1', { EX: seconds, NX: true });
    return !!acquired;
  } catch (err) {
    logger.warn(`Redis setOTPCooldown error: ${err.message}`);
    return true;
  }
}

export async function checkOTPCooldown(email) {
  if (!isRedisReady()) return { allowed: true };
  try {
    const ttl = await redisClient.ttl(`otp_cooldown:${email.toLowerCase()}`);
    if (ttl > 0) {
      return { allowed: false, waitSeconds: ttl };
    }
    return { allowed: true };
  } catch (err) {
    return { allowed: true };
  }
}

export async function checkOTPLockout(email, type = 'email') {
  if (!isRedisReady()) return { locked: false };
  const key = `otp_lockout:${email.toLowerCase()}:${type}`;
  try {
    const ttl = await redisClient.ttl(key);
    if (ttl > 0) return { locked: true, waitSeconds: ttl };
    return { locked: false };
  } catch {
    return { locked: false };
  }
}

export async function incrementOTPFailures(email, type = 'email', maxFailures = 5, lockoutSeconds = 900) {
  if (!isRedisReady()) return { failures: 0, locked: false };
  const failKey = `otp_fails:${email.toLowerCase()}:${type}`;
  const lockKey = `otp_lockout:${email.toLowerCase()}:${type}`;
  try {
    const failures = await redisClient.incr(failKey);
    if (failures === 1) {
      await redisClient.expire(failKey, lockoutSeconds);
    }
    if (failures >= maxFailures) {
      await redisClient.set(lockKey, '1', { EX: lockoutSeconds });
      await redisClient.del(failKey);
      return { failures, locked: true, waitSeconds: lockoutSeconds };
    }
    return { failures, locked: false };
  } catch {
    return { failures: 0, locked: false };
  }
}

export async function resetOTPFailures(email, type = 'email') {
  if (!isRedisReady()) return;
  try {
    await redisClient.del(`otp_fails:${email.toLowerCase()}:${type}`);
    await redisClient.del(`otp_lockout:${email.toLowerCase()}:${type}`);
  } catch {
    // ignore
  }
}

// ── AUTH-M-03: per-account login lockout with exponential backoff ───────────
//
// WHAT REPLACED WHAT
// The previous implementation was a flat counter: 10 failures -> a hard 15-minute
// lock, with no delay in between. Two problems, and the second is the one that
// matters on a healthcare platform.
//
// 1. A flat counter is 10 free guesses per 15 minutes - 960 a day against a
//    single account, with no penalty for guessing faster. Exponential backoff
//    makes the 10th guess cost 512s, so an online attack collapses to a handful
//    of attempts an hour while an honest user who fat-fingers twice waits 2-4
//    seconds and never notices.
//
// 2. ACCOUNT-LOCKOUT DoS. Because the lock is keyed on the email, anyone who
//    knows a patient's email address can lock that patient out of their own
//    account every 15 minutes, indefinitely, by failing the password 10 times.
//    No password guess is required - only the address. On a platform where
//    being locked out of your records has clinical consequences that is a
//    denial-of-service primitive, and OWASP's position is that hard lockout is
//    the wrong tool on its own.
//
//    Two things blunt it here: the backoff is applied BEFORE the hard lock, so
//    an attacker has to sit through the growing delay to reach a lock at all;
//    and a per-IP budget means one host cannot spray many accounts in a window.
//    The hard lock still exists - removing it would abandon the surface and
//    remove the incentive to stop guessing.
//
// FAIL-OPEN IS DELIBERATE and unchanged: without Redis there is no counter
// store, and denying every login when the cache is down turns a dependency
// outage into a total authentication outage. The honest consequence is that a
// Redis outage removes brute-force protection, and that belongs on an alert
// rather than being papered over.

const LOGIN_FAILURE_TTL = 900;      // counters live 15 min
const LOGIN_MAX_BACKOFF = 900;      // ceiling on a single backoff window
const LOGIN_IP_FAILURE_BUDGET = 50; // per-IP failures across the window

/** 2^failures, capped. 1 -> 2s, 2 -> 4s, ... 10 -> 900s. */
export const loginBackoffSeconds = (failures) => {
  const n = Math.max(0, Number(failures) || 0);
  return Math.min(LOGIN_MAX_BACKOFF, 2 ** n);
};

/**
 * @returns {Promise<{locked:boolean, retryAfterSeconds:number, scope:'account'|'ip'|null}>}
 */
export async function checkLoginLockout(email, ip = null) {
  if (!isRedisReady()) return { locked: false, retryAfterSeconds: 0, scope: null };
  const key = `login:backoff:${String(email).toLowerCase()}`;
  try {
    const accountTtl = await redisClient.ttl(key);
    if (accountTtl > 0) return { locked: true, retryAfterSeconds: accountTtl, scope: 'account' };

    if (ip) {
      const ipBlockTtl = await redisClient.ttl(`login:ipblock:${ip}`);
      if (ipBlockTtl > 0) return { locked: true, retryAfterSeconds: ipBlockTtl, scope: 'ip' };
    }
    return { locked: false, retryAfterSeconds: 0, scope: null };
  } catch {
    return { locked: false, retryAfterSeconds: 0, scope: null };
  }
}

/**
 * Record one failed attempt and say how long the caller must now wait.
 *
 * @returns {Promise<{failures:number, retryAfterSeconds:number, locked:boolean}>}
 */
export async function registerLoginFailure(email, ip = null) {
  if (!isRedisReady()) return { failures: 0, retryAfterSeconds: 0, locked: false };
  const mail = String(email).toLowerCase();
  const failKey = `login:fail:${mail}`;
  try {
    const failures = await redisClient.incr(failKey);
    if (failures === 1) await redisClient.expire(failKey, LOGIN_FAILURE_TTL);

    if (ip) {
      const ipKey = `login:ipfail:${ip}`;
      const ipFails = await redisClient.incr(ipKey);
      if (ipFails === 1) await redisClient.expire(ipKey, LOGIN_FAILURE_TTL);
      if (ipFails >= LOGIN_IP_FAILURE_BUDGET) {
        const ipTtl = await redisClient.ttl(ipKey);
        await redisClient.set(`login:ipblock:${ip}`, '1', { EX: ipTtl > 0 ? ipTtl : LOGIN_FAILURE_TTL });
      }
    }

    const retryAfterSeconds = loginBackoffSeconds(failures);
    // The backoff marker is what `checkLoginLockout` reads, so the wait is
    // enforced on the NEXT request rather than only in this response.
    if (retryAfterSeconds > 0) {
      await redisClient.set(`login:backoff:${mail}`, String(failures), { EX: retryAfterSeconds });
    }
    return { failures, retryAfterSeconds, locked: failures >= 10 };
  } catch {
    return { failures: 0, retryAfterSeconds: 0, locked: false };
  }
}

/**
 * Clear the account's counter on a successful login.
 *
 * The IP budget is deliberately NOT cleared: a run of correct logins from one
 * host is not a signal that its failure budget should reset - only the passage
 * of time does that.
 */
export async function resetLoginFailures(email) {
  if (!isRedisReady()) return;
  const mail = String(email).toLowerCase();
  try {
    await redisClient.del(`login:fail:${mail}`);
    await redisClient.del(`login:backoff:${mail}`);
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. GEMINI AI HEALTH CHATBOT RESPONSE CACHING
// ─────────────────────────────────────────────────────────────────────────────

export async function getCachedAIReply(promptKey) {
  if (!isRedisReady()) return null;
  try {
    const cached = await redisClient.get(`ai_cache:${promptKey}`);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    logger.warn(`Redis getCachedAIReply error: ${err.message}`);
    return null;
  }
}

export async function setCachedAIReply(promptKey, replyData, ttlSeconds = 86400) {
  if (!isRedisReady()) return false;
  try {
    await redisClient.set(`ai_cache:${promptKey}`, JSON.stringify(replyData), { EX: ttlSeconds });
    return true;
  } catch (err) {
    logger.warn(`Redis setCachedAIReply error: ${err.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. REAL-TIME DELIVERY GEO LOCATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const GEO_KEY = 'delivery_boys_location';

export async function updateDeliveryBoyLocation(deliveryPartnerId, lat, lng) {
  if (!isRedisReady()) return;
  try {
    await redisClient.geoAdd(GEO_KEY, { longitude: lng, latitude: lat, member: String(deliveryPartnerId) });
    await redisClient.set(
      `delivery:${deliveryPartnerId}:location`,
      JSON.stringify({ lat, lng, ts: Date.now() }),
      { EX: 120 }
    );
  } catch (err) {
    logger.warn(`Redis updateDeliveryBoyLocation error: ${err.message}`);
  }
}

export async function getNearbyDeliveryBoys(lat, lng, radiusKm = 5) {
  if (!isRedisReady()) return [];
  try {
    return await redisClient.geoSearch(GEO_KEY, { longitude: lng, latitude: lat }, { radius: radiusKm, unit: 'km' });
  } catch (err) {
    logger.warn(`Redis getNearbyDeliveryBoys error: ${err.message}`);
    return [];
  }
}

export async function removeDeliveryBoyLocation(deliveryPartnerId) {
  if (!isRedisReady()) return;
  try {
    await redisClient.zRem(GEO_KEY, String(deliveryPartnerId));
    await redisClient.del(`delivery:${deliveryPartnerId}:location`);
  } catch (err) {
    logger.warn(`Redis removeDeliveryBoyLocation error: ${err.message}`);
  }
}

export async function cleanupStaleLocations() {
  if (!isRedisReady()) return;
  try {
    const members = await redisClient.zRange(GEO_KEY, 0, -1);
    for (const id of members) {
      const cached = await redisClient.get(`delivery:${id}:location`);
      if (!cached) await redisClient.zRem(GEO_KEY, id);
    }
    if (members.length) logger.info(`Redis cleanup checked ${members.length} delivery pins`);
  } catch (err) {
    logger.warn(`Redis cleanupStaleLocations error: ${err.message}`);
  }
}
