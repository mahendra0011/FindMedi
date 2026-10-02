/**
 * ADM-M-05 - admin dashboard freshness/health widgets.
 *
 * The platform had three health surfaces (readyz, healthz/pipelines, /metrics)
 * and none of them reached a human in the product. This suite pins the fourth:
 * the superadmin snapshot that aggregates Kafka lag, DLQ depth, Mongo/Redis
 * reachability, BullMQ depths, pipeline freshness and the in-app error rate.
 *
 * What carries the finding:
 *   - GUARD: topology (brokers lagging, DLQ depth) is reconnaissance. 401 for
 *     nobody, 403 for anyone who is not superadmin, asserted behaviourally.
 *   - REPORT, DON'T GATE: `degraded` travels in the body, never in the status.
 *     A 503 here would blank the dashboard exactly when an operator opens it,
 *     so the 200-even-when-degraded contract is asserted, not documented.
 *   - NO ENV SHAPES OUT: statuses are enum words. A widget payload containing
 *     a connection string or an env var name would make the endpoint an info
 *     leak behind an auth bug.
 *   - LAG PARITY: MONITORED_TOPICS must mirror consumer.subscribe(...) or lag
 *     is silently unmeasured on a topic nobody watches (DLQ excluded per
 *     DP-M-02 - the parity assertion checks BOTH directions).
 *   - ERROR WINDOW: bounded 30 x 10s buckets; stale bursts must not leak into
 *     the current rate after the ring wraps.
 *
 * ONE mount per file (harness mock registry). Note the harness mounts the
 * router at '/', so the route path here is '/', not '/ops-health' - the
 * '/api/ops-health' prefix only exists in index.js.
 */
import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mountApp } from '../helpers/appHarness.js';

const {
  recordResponse,
  getErrorRate,
  _resetErrorRate,
  MONITORED_TOPICS,
  CONSUMER_GROUP,
} = await import('../../src/services/opsHealthService.js');
const { KAFKA_TOPICS } = await import('../../src/config/kafka.js');
const { buildInventory } = await import('../../scripts/lib/authzClassify.mjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(__dirname, '..', '..', 'src', 'routes');

const SUPER = { _id: '64b0000000000000000000cc', role: 'superadmin' };
const ADMIN = { _id: '64b0000000000000000000dd', role: 'hospital_admin' };
const PATIENT = { _id: '64b0000000000000000000ee', role: 'patient' };

let as;
beforeAll(async () => {
  ({ as } = await mountApp('opsHealth'));
});

afterEach(() => {
  _resetErrorRate();
});

describe('ADM-M-05 GET /ops-health guard', () => {
  it('is 401 for an unauthenticated caller', async () => {
    const r = await as().get('/');
    expect(r.status).toBe(401);
  });

  it.each([['hospital_admin', ADMIN], ['patient', PATIENT]])(
    'is 403 for role %s',
    async (_role, user) => {
      const r = await as(user).get('/');
      expect(r.status).toBe(403);
    }
  );

  it('is 200 for a superadmin with the full snapshot shape', async () => {
    const r = await as(SUPER).get('/');
    expect(r.status).toBe(200);
    for (const key of ['checkedAt', 'uptimeSeconds', 'degraded', 'mongo', 'redis', 'queues', 'kafka', 'pipelines', 'http']) {
      expect(r.body).toHaveProperty(key);
    }
    expect(typeof r.body.degraded).toBe('boolean');
    expect(r.headers['cache-control']).toBe('no-store');
  });

  it('reports, never gates: degraded state still answers 200', async () => {
    // In the test env Mongo is not connected, so the snapshot IS degraded -
    // which is precisely the moment the widget must still render.
    const r = await as(SUPER).get('/');
    expect(r.status).toBe(200);
    expect(r.body.degraded).toBe(true);
    expect(r.body.mongo.status).toBe('unavailable');
  });
});

describe('ADM-M-05 payload hygiene', () => {
  it('leaks no env shapes: no connection strings, brokers or env var names', async () => {
    const r = await as(SUPER).get('/');
    const text = JSON.stringify(r.body);
    expect(text).not.toMatch(/redis:\/\//i);
    expect(text).not.toMatch(/mongodb(\+srv)?:\/\//i);
    expect(text).not.toMatch(/localhost:\d/);
    expect(text).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}:\d+/);
    expect(text).not.toMatch(/REDIS_URL|KAFKA_BOOTSTRAP/);
  });

  it('uses enum status words only', async () => {
    const r = await as(SUPER).get('/');
    const allowed = new Set(['ok', 'disabled', 'unavailable', 'error']);
    expect(allowed.has(r.body.mongo.status)).toBe(true);
    expect(allowed.has(r.body.redis.status)).toBe(true);
    expect(allowed.has(r.body.kafka.status)).toBe(true);
  });

  it('kafka and redis report `disabled`, not `unavailable`, when unconfigured', async () => {
    // Unconfigured must not read as broken: a dev box has no broker by default.
    const r = await as(SUPER).get('/');
    expect(r.body.kafka.status).toBe('disabled');
    expect(r.body.redis.status).toBe('disabled');
  });
});

describe('ADM-M-05 lag topic parity with the real consumer', () => {
  const consumerSrc = fs.readFileSync(
    new URL('../../src/services/kafkaConsumerService.js', import.meta.url),
    'utf8'
  );

  const subscribed = () => {
    const at = consumerSrc.indexOf('consumer.subscribe(');
    const open = consumerSrc.indexOf('[', at);
    const close = consumerSrc.indexOf(']', open);
    return consumerSrc
      .slice(open, close)
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, '').trim().replace(/,$/, ''))
      .filter((l) => l.startsWith('KAFKA_TOPICS.'));
  };

  it('MONITORED_TOPICS mirrors the consumer subscribe list exactly', () => {
    const sourceTopics = subscribed().map((t) => KAFKA_TOPICS[t.replace('KAFKA_TOPICS.', '')]);
    expect([...MONITORED_TOPICS].sort()).toEqual([...sourceTopics].sort());
  });

  it('excludes the DLQ from lag (DP-M-02: unsubscribed is deliberate)', () => {
    expect(MONITORED_TOPICS).not.toContain(KAFKA_TOPICS.DLQ);
    expect(subscribed()).not.toContain('KAFKA_TOPICS.DLQ');
  });

  it('tracks the same consumer group the real consumer joins', () => {
    expect(consumerSrc).toContain(`'${CONSUMER_GROUP}'`);
    expect(CONSUMER_GROUP).toBe('findmedi-core-consumers');
  });
});

describe('ADM-M-05 error-rate window', () => {
  const T0 = 1_800_000_000_000; // fixed epoch, bucket-aligned (idx 0)

  it('counts 5xx as server errors and 4xx as client errors', () => {
    recordResponse(200, T0);
    recordResponse(200, T0);
    recordResponse(404, T0);
    recordResponse(500, T0);
    const w = getErrorRate(T0);
    expect(w.total).toBe(4);
    expect(w.clientErrors).toBe(1);
    expect(w.serverErrors).toBe(1);
    expect(w.errorRate).toBe(0.25);
  });

  it('reports 0 with an empty window (no NaN, no divide-by-zero)', () => {
    const w = getErrorRate(T0);
    expect(w.total).toBe(0);
    expect(w.errorRate).toBe(0);
  });

  it('drops bursts older than the 5-minute window', () => {
    recordResponse(500, T0); // stale burst, bucket 0
    recordResponse(200, T0 + 6 * 60 * 1000); // 6 min later, bucket 6
    const w = getErrorRate(T0 + 6 * 60 * 1000);
    expect(w.total).toBe(1);
    expect(w.serverErrors).toBe(0);
  });

  it('stale buckets cannot leak back in after the ring wraps', () => {
    // Fill every slot with a 500, then read TWO full rings later (60 slots =
    // 10 min): all 30 stale slots are past the window, and the fresh write
    // lands on a slot whose old epoch id must be discarded, not summed.
    for (let i = 0; i < 30; i++) recordResponse(500, T0 + i * 10_000);
    const later = T0 + 60 * 10_000;
    recordResponse(200, later);
    const w = getErrorRate(later);
    expect(w.serverErrors).toBe(0);
    expect(w.total).toBe(1);
  });
});

describe('ADM-M-05 wiring', () => {
  const indexSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');

  it('index.js mounts the route AND the response tracker', () => {
    expect(indexSrc).toContain("app.use('/api/ops-health', opsHealthRoutes)");
    expect(indexSrc).toContain('app.use(opsHealthMiddleware)');
  });

  it('the authz classifier records the route as role-gated', () => {
    const row = buildInventory(ROUTES_DIR).find((r) => r.file === 'opsHealth.js');
    expect(row).toBeDefined();
    expect(row.tag).toBe('role');
  });
});
