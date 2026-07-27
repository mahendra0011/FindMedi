import { createClient } from 'redis';
import logger from './logger.js';

// REDIS_URL comes from Render's environment variables, e.g.
// redis://red-d9j5n2vlk1mc73fl28gg:6379  (internal, no TLS — works because
// this server also runs on Render, same region)
export const redisClient = createClient({ url: process.env.REDIS_URL });
export const redisPub = redisClient.duplicate();
export const redisSub = redisClient.duplicate();

redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));

export async function connectRedis() {
  await redisClient.connect();
  await redisPub.connect();
  await redisSub.connect();
  logger.info('Redis connected (main + pub + sub)');

  // Free-tier cleanup: GEO entries don't auto-expire; the cache key next to
  // them does (120s TTL below). Every 3 min, drop any GEO entry whose cache
  // key has already expired — keeps the 25MB tier from accumulating dead pins.
  setInterval(cleanupStaleLocations, 3 * 60 * 1000);
}

const GEO_KEY = 'delivery_boys_location';

export async function updateDeliveryBoyLocation(deliveryPartnerId, lat, lng) {
  await redisClient.geoAdd(GEO_KEY, { longitude: lng, latitude: lat, member: String(deliveryPartnerId) });
  await redisClient.set(
    `delivery:${deliveryPartnerId}:location`,
    JSON.stringify({ lat, lng, ts: Date.now() }),
    { EX: 120 }
  );
}

export async function getNearbyDeliveryBoys(lat, lng, radiusKm = 5) {
  return redisClient.geoSearch(GEO_KEY, { longitude: lng, latitude: lat }, { radius: radiusKm, unit: 'km' });
}

export async function removeDeliveryBoyLocation(deliveryPartnerId) {
  await redisClient.zRem(GEO_KEY, String(deliveryPartnerId));
  await redisClient.del(`delivery:${deliveryPartnerId}:location`);
}

export async function cleanupStaleLocations() {
  const members = await redisClient.zRange(GEO_KEY, 0, -1);
  for (const id of members) {
    const cached = await redisClient.get(`delivery:${id}:location`);
    if (!cached) await redisClient.zRem(GEO_KEY, id);
  }
  if (members.length) logger.info(`Redis cleanup checked ${members.length} delivery pins`);
}
