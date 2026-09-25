import { latLngToCell, gridDisk } from 'h3-js';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';
import { H3_RESOLUTION_CITY, H3_RESOLUTION_FINE, H3_MAX_RING_K, H3_MIN_CANDIDATES } from '../config/h3.js';

const HEX_TTL_SECONDS = 300; // 5 min — stale providers auto-expire if heartbeat drops

function memberKey(providerId, providerType) {
  return `${providerId}:${providerType}`;
}

/**
 * Upserts provider location in Redis H3 cache.
 * Keeps Mongo as source of truth while keeping Redis synchronized.
 */
export async function upsertProviderLocationCache({ providerId, providerType, lat, lng }) {
  try {
    if (!isRedisReady() || !redisClient.isOpen) return null;

    const h3_8 = latLngToCell(lat, lng, H3_RESOLUTION_CITY);
    const h3_9 = latLngToCell(lat, lng, H3_RESOLUTION_FINE);
    const key = memberKey(providerId, providerType);
    const locKey = `provider:location:${key}`;

    const old = await redisClient.get(locKey);
    if (old) {
      try {
        const parsed = JSON.parse(old);
        if (parsed.h3Index8 && parsed.h3Index8 !== h3_8) {
          await redisClient.sRem(`hex:providers:${parsed.h3Index8}`, key);
        }
      } catch {
        // ignore JSON parse error on stale key
      }
    }

    await redisClient.sAdd(`hex:providers:${h3_8}`, key);
    await redisClient.expire(`hex:providers:${h3_8}`, HEX_TTL_SECONDS);
    await redisClient.set(
      locKey,
      JSON.stringify({ lat, lng, h3Index8: h3_8, h3Index9: h3_9, updatedAt: Date.now() }),
      { EX: HEX_TTL_SECONDS }
    );

    return { h3Index8: h3_8, h3Index9: h3_9 };
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
    const key = memberKey(providerId, providerType);
    const locKey = `provider:location:${key}`;
    const old = await redisClient.get(locKey);
    if (old) {
      try {
        const { h3Index8 } = JSON.parse(old);
        if (h3Index8) await redisClient.sRem(`hex:providers:${h3Index8}`, key);
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
 * Returns empty array if Redis is down or no candidates found.
 */
export async function findCandidatesByHex({ lat, lng, providerType, maxRingK = H3_MAX_RING_K, excludeIds = [] }) {
  try {
    if (!isRedisReady() || !redisClient.isOpen) {
      return { candidates: [], usedRingK: null, source: 'redis_unavailable' };
    }

    const centerHex = latLngToCell(lat, lng, H3_RESOLUTION_CITY);
    const excludeSet = new Set(excludeIds.map(String));
    const candidates = new Set();
    let usedRingK = 0;

    for (let k = 0; k <= maxRingK; k++) {
      const ring = k === 0 ? [centerHex] : gridDisk(centerHex, k);
      for (const hex of ring) {
        const members = await redisClient.sMembers(`hex:providers:${hex}`);
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
