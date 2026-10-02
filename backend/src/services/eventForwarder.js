import { KAFKA_TOPICS } from '../config/kafka.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import { emitKafkaEvent } from '../lib/kafkaProducer.js';
// ADM-M-05: the forwarder is the in-memory backbone every consumer sits
// behind; before this it was one of two pipelines that never reported
// freshness (always `unknown` on /healthz/pipelines and the ops widget).
import { recordPipelineEvent } from './dataPipelineHealth.js';
import logger from '../config/logger.js';

// ─── uForwarder-style EventForwarder Gateway (Spec 11 remainder) ─────────────
// Decouples producers/poller from consumers: adaptive micro-batch pull
// (50 events / 20ms), backpressure pause, 5s→30s→DLQ cascading retries,
// 24h idempotent delivery gate. Consumers register via `registerHandler`;
// poller + Kafka consumer route through `forwardEvent`, never direct calls.

const MAX_BATCH = Number(process.env.FORWARDER_BATCH_SIZE || 50);
const FLUSH_MS = Number(process.env.FORWARDER_FLUSH_MS || 20);
const LAG_PAUSE_MS = 100; // event-loop lag threshold (Spec 17 parity)
const CPU_PAUSE_PCT = 85;

const handlers = new Map(); // topic -> Set<fn>
const buffers = new Map(); // topic -> Array<{event,attempt}>
let flushTimer = null;
let paused = false;
let lastLagCheck = 0;
let lastCpu = process.cpuUsage();
let lastCpuAt = Date.now();

export function registerHandler(topic, fn) {
  if (!handlers.has(topic)) handlers.set(topic, new Set());
  handlers.get(topic).add(fn);
  return () => handlers.get(topic)?.delete(fn);
}

function sampleBackpressure() {
  const now = Date.now();
  if (now - lastLagCheck < 1000) return paused;
  lastLagCheck = now;
  // event-loop lag probe
  const t0 = process.hrtime.bigint();
  setImmediate(() => {
    const lagMs = Number(process.hrtime.bigint() - t0) / 1e6;
    const cpu = process.cpuUsage(lastCpu);
    const dtMs = Math.max(1, Date.now() - lastCpuAt);
    const cpuPct = ((cpu.user + cpu.system) / 1000 / dtMs) * 100;
    lastCpu = process.cpuUsage();
    lastCpuAt = Date.now();
    const overloaded = lagMs > LAG_PAUSE_MS || cpuPct > CPU_PAUSE_PCT;
    if (overloaded && !paused) logger.warn(`[forwarder] backpressure PAUSE (lag=${lagMs.toFixed(1)}ms cpu=${cpuPct.toFixed(1)}%)`);
    if (!overloaded && paused) logger.info('[forwarder] backpressure RESUME');
    paused = overloaded;
  });
  return paused;
}

export function isForwarderPaused() {
  sampleBackpressure();
  return paused;
}

async function isDuplicate(event) {
  const id = event?.eventId || event?.outboxId || event?.payload?.eventId;
  if (!id) return false;
  try {
    if (isRedisReady() && redisClient.isOpen) {
      const set = await redisClient.set(`event:seen:${id}`, '1', { NX: true, EX: 86400 });
      if (set !== 'OK') return true;
    }
  } catch {}
  return false;
}

async function routeToRetry(topic, event, attempt, err) {
  const next = (attempt || 0) + 1;
  const envelope = { ...event, retryCount: next, retryFrom: topic, lastError: err?.message || 'handler-failed' };
  try {
    if (next <= 2) await emitKafkaEvent(KAFKA_TOPICS.RETRY_5S, event?.key || event?.aggregateId || 'unknown', envelope);
    else if (next <= 4) await emitKafkaEvent(KAFKA_TOPICS.RETRY_30S, event?.key || event?.aggregateId || 'unknown', envelope);
    else {
      await emitKafkaEvent(KAFKA_TOPICS.DLQ, event?.key || event?.aggregateId || 'unknown', envelope);
      logger.error(`[forwarder:DLQ] topic=${topic} event=${event?.eventType} attempt=${next}. Manual triage required.`);
    }
  } catch (e) {
    logger.warn(`[forwarder] retry publish skipped: ${e.message}`);
  }
  return next;
}

async function deliver(topic, entry) {
  const { event, attempt } = entry;
  if (await isDuplicate(event)) return { delivered: false, reason: 'duplicate-suppressed' };
  const fns = handlers.get(topic) || handlers.get('*') || new Set();
  if (fns.size === 0) return { delivered: true, reason: 'no-handlers' };
  for (const fn of fns) {
    try {
      await fn(topic, event);
    } catch (err) {
      logger.warn(`[forwarder] handler failed topic=${topic} type=${event?.eventType}: ${err.message}`);
      // Handler failure is the forwarder's real failure mode: the event was
      // accepted, buffered and dispatched, and the consumer said no. Without
      // this the forwarder kept looking fresh while every handler 500'd.
      recordPipelineEvent('event_forwarder', 'error', { error: err });
      const next = await routeToRetry(topic, event, attempt, err);
      return { delivered: false, reason: 'handler-failed', nextAttempt: next };
    }
  }
  try {
    if (isRedisReady() && redisClient.isOpen && (event?.outboxId || event?.eventId)) {
      await redisClient.set(`event:done:${event.outboxId || event.eventId}`, '1', { EX: 86400 });
    }
  } catch {}
  // Only real handler completion counts as success - `duplicate-suppressed`
  // and `no-handlers` deliberately record nothing, because neither proves the
  // pipeline processed anything (an absent signal is not a healthy signal).
  recordPipelineEvent('event_forwarder', 'success');
  return { delivered: true };
}

async function flush() {
  if (isForwarderPaused()) return; // backpressure: hold buffers until resume
  for (const [topic, queue] of buffers) {
    if (!queue.length) continue;
    const batch = queue.splice(0, MAX_BATCH);
    for (const entry of batch) {
      try {
        await deliver(topic, entry);
      } catch (err) {
        logger.warn(`[forwarder] deliver error: ${err.message}`);
      }
    }
  }
}

function ensureTimer() {
  if (!flushTimer) flushTimer = setInterval(() => { flush().catch(() => {}); }, FLUSH_MS);
}

export async function forwardEvent(topic, event, opts = {}) {
  if (!topic || !event) return { delivered: false, reason: 'bad-event' };
  // Arrival signal: separates "events are coming in" from "handlers are
  // succeeding" - the two-faced failure where traffic looks healthy while
  // nothing is being written (dataPipelineHealth's documented purpose).
  recordPipelineEvent('event_forwarder', 'event');
  if (!buffers.has(topic)) buffers.set(topic, []);
  buffers.get(topic).push({ event, attempt: opts.attempt || 0 });
  ensureTimer();
  if (buffers.get(topic).length >= MAX_BATCH) await flush();
  return { delivered: true, reason: 'buffered' };
}

export async function flushForwarder() {
  await flush();
}

export function stopForwarder() {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  buffers.clear();
}
