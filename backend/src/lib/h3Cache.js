import { latLngToCell, gridDisk } from 'h3-js';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';
import {
  H3_MAX_RING_K,
  H3_MIN_CANDIDATES,
  H3_PROVIDER_TTL_SECONDS,
  getResolutionForVertical,
} from '../config/h3.js';

function memberKey(providerId, providerType) {
  return `${providerId}:${providerType}`;
}

/**
 * Upserts provider location in Redis H3 cache.
 * Uses resolution tailored to the vertical:
 * - Res 6: SOS Ambulance
 * - Res 7: Lawyer, Doctor, Assistant
 * - Res 8: Urban Rider / Cab / Bike
 */
export async function upsertProviderLocationCache({
  providerId,
  providerType,
  lat,
  lng,
  bearing = 0,
  speed = 0,
  accuracy = 0,
}) {
  try {
    if (!isRedisReady() || !redisClient.isOpen) return null;

    const res = getResolutionForVertical(providerType);
    const h3Cell = latLngToCell(lat, lng, res);
    // Canonical res-8/res-9 cells (Mongo model fields + backfill consistency).
    const h3Index8 = res === 8 ? h3Cell : latLngToCell(lat, lng, 8);
    const h3Index9 = res === 9 ? h3Cell : latLngToCell(lat, lng, 9);
    const key = memberKey(providerId, providerType);
    const locKey = `provider:location:${key}`;

    const old = await redisClient.get(locKey);
    if (old) {
      try {
        const parsed = JSON.parse(old);
        if (parsed.h3Cell && parsed.h3Cell !== h3Cell) {
          // Remove from old cell set
          await redisClient.sRem(`geo:h3:${parsed.resolution || res}:${parsed.h3Cell}:${providerType}`, key);
          await redisClient.sRem(`hex:providers:${parsed.h3Cell}`, key); // legacy compat
        }
      } catch {
        // ignore JSON parse error on stale key
      }
    }

    // Add to standardized H3 Set
    const hexKey = `geo:h3:${res}:${h3Cell}:${providerType}`;
    await redisClient.sAdd(hexKey, key);
    await redisClient.expire(hexKey, H3_PROVIDER_TTL_SECONDS * 2);

    // Legacy compat key
    await redisClient.sAdd(`hex:providers:${h3Cell}`, key);
    await redisClient.expire(`hex:providers:${h3Cell}`, H3_PROVIDER_TTL_SECONDS * 2);

    // Store live ephemeral coordinate hash
    await redisClient.set(
      locKey,
      JSON.stringify({
        lat,
        lng,
        bearing,
        speed,
        accuracy,
        resolution: res,
        h3Cell,
        h3Index8,
        h3Index9,
        providerType,
        providerId,
        updatedAt: Date.now(),
      }),
      { EX: H3_PROVIDER_TTL_SECONDS }
    );

    return { resolution: res, h3Cell, h3Index8, h3Index9 };
  } catch (err) {
    logger.error(`upsertProviderLocationCache error: ${err.message}`);
    return null; // Fail-soft: callers fallback to MongoDB $geoNear
  }
}

/**
 * Removes provider from H3 cell and location cache on offline / off-duty toggle.
 */
export async function removeProviderFromCache({ providerId, providerType }) {
  try {
    if (!isRedisReady() || !redisClient.isOpen) return;
    const res = getResolutionForVertical(providerType);
    const key = memberKey(providerId, providerType);
    const locKey = `provider:location:${key}`;
    const old = await redisClient.get(locKey);
    if (old) {
      try {
        const { h3Cell, resolution } = JSON.parse(old);
        if (h3Cell) {
          await redisClient.sRem(`geo:h3:${resolution || res}:${h3Cell}:${providerType}`, key);
          await redisClient.sRem(`hex:providers:${h3Cell}`, key);
        }
      } catch {
        // ignore
      }
    }
    await redisClient.del(locKey);
  } catch (err) {
    logger.error(`removeProviderFromCache error: ${err.message}`);
  }
}

/**
 * Find candidate provider IDs via H3 k-ring expansion.
 * Dynamically queries matching resolution and expands outwards ring by ring.
 */
export async function findCandidatesByHex({
  lat,
  lng,
  providerType,
  maxRingK = H3_MAX_RING_K,
  excludeIds = [],
}) {
  try {
    if (!isRedisReady() || !redisClient.isOpen) {
      return { candidates: [], usedRingK: null, source: 'redis_unavailable' };
    }

    const res = getResolutionForVertical(providerType);
    const centerHex = latLngToCell(lat, lng, res);
    const excludeSet = new Set(excludeIds.map(String));
    const candidates = new Set();
    let usedRingK = 0;

    for (let k = 0; k <= maxRingK; k++) {
      const ring = k === 0 ? [centerHex] : gridDisk(centerHex, k);
      for (const hex of ring) {
        // 1. Check standardized key
        let members = await redisClient.sMembers(`geo:h3:${res}:${hex}:${providerType}`);
        // 2. Fallback to legacy key if needed
        if (!members || members.length === 0) {
          members = await redisClient.sMembers(`hex:providers:${hex}`);
        }

        for (const m of members) {
          const [id, type] = m.split(':');
          if (type === providerType && !excludeSet.has(id)) {
            candidates.add(id);
          }
        }
      }
      usedRingK = k;
      if (candidates.size >= H3_MIN_CANDIDATES) break;
    }

    return { candidates: [...candidates], usedRingK, source: 'h3_cache' };
  } catch (err) {
    logger.error(`findCandidatesByHex error: ${err.message}`);
    return { candidates: [], usedRingK: null, source: 'error' };
  }
}
