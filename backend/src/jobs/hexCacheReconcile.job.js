/**
 * File 03 — H3 hex-cache reconciler (every 5 min).
 * Redis is a fast-path cache; MongoDB stays source of truth. This job fixes
 * drift in both directions:
 *  1. DB → Redis: recently-active providers missing from hex sets get re-added.
 *  2. Redis → DB: hex members whose location key expired (stale/offline) get pruned.
 * Fail-soft everywhere: Redis down or DB down must never crash the server.
 */
import { redisClient, isRedisReady } from '../config/redis.js';
import { upsertProviderLocationCache } from '../lib/h3Cache.js';
import logger from '../config/logger.js';

const RECENT_MS = Number(process.env.HEX_RECONCILE_RECENT_MS || 10 * 60 * 1000);

const TARGETS = [
  {
    model: 'RiderProfile', providerType: 'rider',
    locPath: 'currentLocation', idField: 'userId',
    onlineFilter: { isOnline: true, riderStatus: 'active' },
  },
  {
    model: 'LawyerProfile', providerType: 'lawyer',
    locPath: 'currentLocation', idField: 'userId',
    onlineFilter: { isAvailable: true, lawyerStatus: 'active' },
  },
  {
    model: 'AssistantProfile', providerType: 'assistant',
    locPath: 'currentLocation', idField: 'userId',
    onlineFilter: { isAvailable: true, assistantStatus: 'active' },
  },
  {
    model: 'Doctor', providerType: 'doctor',
    locPath: 'emergencyDoctorLocation', idField: 'user_id',
    onlineFilter: { isEmergencyDutyActive: true, emergencySupport: true },
  },
  {
    model: 'Ambulance', providerType: 'ambulance',
    locPath: 'currentLocation', idField: 'userId',
    onlineFilter: { isOnline: true },
  },
];

function coordsOf(loc) {
  if (!loc) return null;
  const lat = loc.lat ?? (Array.isArray(loc.coordinates) ? loc.coordinates[1] : null);
  const lng = loc.lng ?? (Array.isArray(loc.coordinates) ? loc.coordinates[0] : null);
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

async function reconcileModel(target) {
  const { default: Model } = await import(`../models/${target.model}.js`);
  const since = new Date(Date.now() - RECENT_MS);
  const docs = await Model.find({
    ...target.onlineFilter,
    [`${target.locPath}.updatedAt`]: { $gte: since },
  }).select(`${target.idField} ${target.locPath}`).lean();
  let synced = 0;
  for (const d of docs) {
    const id = d[target.idField] || d._id;
    const coords = coordsOf(d[target.locPath]);
    if (!id || !coords) continue;
    const res = await upsertProviderLocationCache({
      providerId: String(id),
      providerType: target.providerType,
      ...coords,
    });
    if (res) synced += 1;
  }
  return synced;
}

async function pruneStaleMembers() {
  // SCAN hex keys (never KEYS on prod) and drop members whose location key expired.
  let cursor = 0;
  let pruned = 0;
  do {
    const reply = await redisClient.scan(cursor, { MATCH: 'hex:providers:*', COUNT: 200 });
    cursor = Number(reply.cursor);
    for (const key of reply.keys) {
      const members = await redisClient.sMembers(key);
      for (const m of members) {
        const alive = await redisClient.exists(`provider:location:${m}`);
        if (!alive) {
          await redisClient.sRem(key, m);
          pruned += 1;
        }
      }
    }
  } while (cursor !== 0);
  return pruned;
}

export async function runHexCacheReconcileOnce() {
  if (!isRedisReady()) return { skipped: 'redis_unavailable', synced: 0, pruned: 0 };
  let synced = 0;
  try {
    for (const target of TARGETS) {
      try {
        synced += await reconcileModel(target);
      } catch (err) {
        logger.warn(`hexCacheReconcile ${target.model} skipped: ${err.message}`);
      }
    }
    const pruned = await pruneStaleMembers();
    logger.info(`hexCacheReconcile done: synced=${synced} pruned=${pruned}`);
    return { synced, pruned };
  } catch (err) {
    logger.error(`hexCacheReconcile error: ${err.message}`);
    return { synced, pruned: 0, error: err.message };
  }
}

export function startHexCacheReconcile(intervalMs = 5 * 60 * 1000) {
  const timer = setInterval(() => {
    runHexCacheReconcileOnce().catch(() => {});
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}
