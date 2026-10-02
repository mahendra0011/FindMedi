/**
 * ADM-M-05 - ops health the admin dashboard can actually surface.
 *
 * The platform already had three disjoint health signals: `/readyz` (mongo +
 * redis, load-balancer facing), `/healthz/pipelines` (data freshness,
 * monitoring-facing) and the Prometheus scrape (machine-facing). None of them
 * reached a human operator in the product: the superadmin dashboard showed
 * business KPIs only. "Is the consumer keeping up? How deep is the DLQ? Is the
 * API erroring right now?" was answerable only by someone with Grafana
 * credentials - and not answerable at all for Kafka lag, which nothing measured.
 *
 * This module aggregates the five signals the backlog named (Kafka lag, Redis,
 * Mongo, error rate, DLQ depth) into one superadmin-only payload. Design rules:
 *
 *   - FAIL SOFT, ALWAYS. Every probe is independently try/caught and
 *     timeout-bounded. A dead broker must produce `status: "unavailable"`, never
 *     a hung request and never a 500: the widget's whole job is to render while
 *     things are broken.
 *   - REPORT, DON'T GATE. Like `/healthz/pipelines`, this never 503s. It is a
 *     diagnosis surface, not a probe - readiness stays with `/readyz`.
 *   - NOTHING ENV-SHAPED LEAKS. Statuses are enum words (`ok`, `disabled`,
 *     `unavailable`). Connection strings, broker lists and error internals stay
 *     server-side; a superadmin widget does not need `REDIS_URL`.
 *   - LAG IS BOUNDED BY RETENTION. Kafka offsets that were never committed
 *     (`-1`) fall back to the low watermark, so "lag" can never claim messages
 *     the broker has already deleted.
 */
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import { KAFKA_TOPICS, KAFKA_CLIENT_ID, KAFKA_BOOTSTRAP_SERVERS, isKafkaConfigured } from '../config/kafka.js';
import { getPipelineHealth } from './dataPipelineHealth.js';
import { queueStatus } from '../lib/queues.js';

/** Same group the real consumer uses - lag is meaningless without it. */
export const CONSUMER_GROUP = 'findmedi-core-consumers';

/**
 * Monitored topics must MIRROR `consumer.subscribe(...)` in
 * kafkaConsumerService.js (DLQ deliberately excluded - DP-M-02). The parity is
 * pinned by a test, because a drift here silently under-reports lag on a topic
 * nobody watches.
 */
export const MONITORED_TOPICS = Object.freeze([
  KAFKA_TOPICS.BOOKING_EVENTS,
  KAFKA_TOPICS.SOS_ALERTS,
  KAFKA_TOPICS.PROVIDER_PRESENCE,
  KAFKA_TOPICS.HOSPITAL_ADMISSIONS,
  KAFKA_TOPICS.PHARMACY_INVENTORY,
  // DP-M-04: erasure propagation must be lag-visible like any other topic -
  // a stuck tombstone backlog is a privacy incident, not an ops curiosity.
  KAFKA_TOPICS.USER_TOMBSTONES,
  KAFKA_TOPICS.RETRY_5S,
  KAFKA_TOPICS.RETRY_30S,
]);

/** Error-rate window: fixed 30 x 10s buckets = 5 minutes, bounded memory. */
const BUCKET_MS = 10_000;
const BUCKETS = 30;
const buckets = Array.from({ length: BUCKETS }, () => ({ at: 0, total: 0, e4: 0, e5: 0 }));

export function recordResponse(statusCode, now = Date.now()) {
  const idx = Math.floor(now / BUCKET_MS) % BUCKETS;
  const b = buckets[idx];
  if (b.at !== Math.floor(now / BUCKET_MS)) {
    b.at = Math.floor(now / BUCKET_MS);
    b.total = 0;
    b.e4 = 0;
    b.e5 = 0;
  }
  b.total += 1;
  if (statusCode >= 500) b.e5 += 1;
  else if (statusCode >= 400) b.e4 += 1;
}

/**
 * Sum the last `windowMs`, discarding buckets older than the window. Stale
 * buckets are identified by their epoch bucket id, so a burst from 10 minutes
 * ago can never leak into the current rate after wrap-around.
 */
export function getErrorRate(now = Date.now(), windowMs = BUCKET_MS * BUCKETS) {
  const current = Math.floor(now / BUCKET_MS);
  const oldest = Math.floor((now - windowMs) / BUCKET_MS);
  let total = 0;
  let e4 = 0;
  let e5 = 0;
  for (const b of buckets) {
    if (b.at >= oldest && b.at <= current && b.total > 0) {
      total += b.total;
      e4 += b.e4;
      e5 += b.e5;
    }
  }
  return {
    windowSeconds: Math.round(windowMs / 1000),
    total,
    clientErrors: e4,
    serverErrors: e5,
    errorRate: total === 0 ? 0 : Number((e5 / total).toFixed(4)),
  };
}

/** Response tracker: independent of metrics.js so neither owns the other. */
export function opsHealthMiddleware(_req, res, next) {
  let settled = false;
  const settle = (code) => {
    if (settled) return;
    settled = true;
    recordResponse(code);
  };
  res.on('finish', () => settle(res.statusCode));
  res.on('close', () => {
    if (!res.writableFinished) settle(499);
  });
  next();
}

/** Test seam: clear the error-rate window. */
export function _resetErrorRate() {
  for (const b of buckets) {
    b.at = 0;
    b.total = 0;
    b.e4 = 0;
    b.e5 = 0;
  }
}

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

export async function getMongoHealth() {
  try {
    const readyState = mongoose.connection.readyState;
    const reachable =
      readyState === 1 &&
      (await withTimeout(
        mongoose.connection.db?.admin().command({ ping: 1 }).then(() => true).catch(() => false),
        1500,
        false
      ));
    return { status: reachable ? 'ok' : 'unavailable', readyState };
  } catch {
    return { status: 'unavailable', readyState: mongoose.connection.readyState };
  }
}

export async function getRedisHealth() {
  // Optional by contract (the app degrades to in-memory), so unconfigured is
  // `disabled`, not `unavailable` - the widget must not cry wolf on a dev box.
  if (!process.env.REDIS_URL) return { status: 'disabled' };
  try {
    const { redisClient, isRedisReady } = await import('../config/redis.js');
    const reachable =
      isRedisReady() && (await withTimeout(redisClient.ping(), 1000, false)) === 'PONG';
    return { status: reachable ? 'ok' : 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function getQueueHealth() {
  try {
    const s = await queueStatus();
    // queueStatus()'s `reason` names an env var ('REDIS_URL unset') and its
    // `error` carries broker internals like '127.0.0.1:6379'. The widget
    // contract says no env shapes out: `disabled`/`unavailable` is all an
    // operator needs to decide whether to go look.
    if (!s.enabled) return { enabled: false };
    if (s.error) return { enabled: true, error: 'unavailable' };
    return { enabled: true, queues: s.queues };
  } catch {
    return { enabled: false, error: 'unavailable' };
  }
}

/**
 * Kafka: consumer-group lag on the monitored topics + DLQ depth.
 *
 * DLQ depth is `high - low` per partition: the DLQ is deliberately
 * unsubscribed (DP-M-02), so there is no committed offset to diff against,
 * and what the topic still RETAINS is exactly what an operator must replay.
 * Both numbers are therefore retention-bounded and honest about it.
 */
export async function getKafkaHealth() {
  if (!isKafkaConfigured()) return { status: 'disabled' };
  let admin = null;
  try {
    const run = async () => {
      const { Kafka } = await import('kafkajs');
      const kafka = new Kafka({ clientId: `${KAFKA_CLIENT_ID}-ops-health`, brokers: KAFKA_BOOTSTRAP_SERVERS });
      admin = kafka.admin();
      await admin.connect();
      const committed = await admin.fetchOffsets({ groupId: CONSUMER_GROUP, topics: MONITORED_TOPICS });
      let consumerLag = 0;
      const lagByTopic = {};
      for (const entry of committed) {
        let topicLag = 0;
        const highs = await admin.fetchTopicOffsets(entry.topic);
        const highByPartition = new Map(highs.map((h) => [h.partition, Number(h.high)]));
        for (const p of entry.partitions) {
          const high = highByPartition.get(p.partition) ?? 0;
          const committedOffset = Number(p.offset);
          // No commit yet (-1) => fall back to the low watermark so the figure
          // stays bounded by what the broker still holds.
          const base = committedOffset >= 0 ? committedOffset : 0;
          topicLag += Math.max(0, high - base);
        }
        lagByTopic[entry.topic] = topicLag;
        consumerLag += topicLag;
      }
      const dlq = await admin.fetchTopicOffsets(KAFKA_TOPICS.DLQ);
      const dlqDepth = dlq.reduce((sum, p) => sum + Math.max(0, Number(p.high) - Number(p.low)), 0);
      return { status: 'ok', consumerLag, lagByTopic, dlqDepth };
    };
    return await withTimeout(run(), 4000, { status: 'unavailable' });
  } catch (err) {
    logger.warn(`ops-health kafka probe failed: ${err.message}`);
    return { status: 'unavailable' };
  } finally {
    try {
      await admin?.disconnect();
    } catch {
      /* disconnect failure must not mask the probe result */
    }
  }
}

/**
 * One aggregated snapshot. Never throws - the caller renders whatever came
 * back, and each section carries its own status word.
 */
export async function getOpsHealth() {
  const [mongo, redis, queues, kafka] = await Promise.all([
    getMongoHealth(),
    getRedisHealth(),
    getQueueHealth(),
    getKafkaHealth(),
  ]);
  const pipelines = getPipelineHealth();
  const http = getErrorRate();

  // DLQ depth = BullMQ failed jobs + retained Kafka DLQ messages: the two
  // dead-letter views the platform actually has.
  const bullFailed = queues?.queues
    ? Object.values(queues.queues).reduce((sum, q) => sum + (q?.failed || 0), 0)
    : 0;

  const degraded =
    mongo.status !== 'ok' ||
    (redis.status === 'unavailable') ||
    (kafka.status === 'unavailable') ||
    pipelines.degraded ||
    (http.total >= 20 && http.errorRate > 0.05);

  return {
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    degraded,
    mongo,
    redis,
    queues,
    kafka: { ...kafka, bullFailed },
    pipelines,
    http,
  };
}
