/**
 * Spec 14 (in-process edition): sliding-window demand surge per H3 cell.
 * Reads demand:h3:* counters written by the event consumer, applies the
 * spec's surge ladder (>50 → 1.8x, >25 → 1.4x, else 1.0x) and publishes
 * surge:h3:<cell> for fare/ETA paths. Runs every 60s; fully fail-soft.
 * (A Flink cluster can replace this job without changing key formats.)
 */
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

export function surgeForDemand(demand) {
  if (demand > 50) return 1.8;
  if (demand > 25) return 1.4;
  return 1.0;
}

export async function runSurgeCalcOnce() {
  if (!isRedisReady()) return { skipped: 'redis_unavailable', cells: 0 };
  let cells = 0;
  try {
    let cursor = 0;
    do {
      const reply = await redisClient.scan(cursor, { MATCH: 'demand:h3:*', COUNT: 200 });
      cursor = Number(reply.cursor);
      for (const key of reply.keys) {
        const demand = Number(await redisClient.get(key)) || 0;
        const cell = key.replace('demand:h3:', '');
        await redisClient.set(
          `surge:h3:${cell}`,
          JSON.stringify({ multiplier: surgeForDemand(demand), demand, updatedAt: Date.now() }),
          { EX: 3600 }
        );
        cells += 1;
      }
    } while (cursor !== 0);
    return { cells };
  } catch (err) {
    logger.error(`surgeCalc error: ${err.message}`);
    return { cells, error: err.message };
  }
}

export async function getSurgeForCell(cell) {
  try {
    if (!isRedisReady() || !cell) return { multiplier: 1.0, source: 'default' };
    const raw = await redisClient.get(`surge:h3:${cell}`);
    if (!raw) return { multiplier: 1.0, source: 'default' };
    return { ...JSON.parse(raw), source: 'surge_job' };
  } catch {
    return { multiplier: 1.0, source: 'default' };
  }
}

export function startSurgeCalc(intervalMs = 60 * 1000) {
  const timer = setInterval(() => {
    runSurgeCalcOnce().catch(() => {});
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}
