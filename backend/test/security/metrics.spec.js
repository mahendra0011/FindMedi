/**
 * INF-M-02: Prometheus metrics endpoint + HTTP instrumentation.
 *
 * Three things this suite has to prove, in order of how badly they fail when
 * wrong:
 *
 *   1. THE GATE — `/metrics` is token-guarded and FAILS CLOSED. An
 *      unauthenticated metrics endpoint hands an attacker request rates,
 *      busiest routes and error counts for free; a default-open endpoint is
 *      worse than no endpoint, which is why "disabled when METRICS_TOKEN is
 *      unset" is asserted, not just documented.
 *   2. THE LABELS — the `route` label must be the matched PATTERN
 *      (`/probe/:id`), never the raw URL. A raw-path label is a cardinality
 *      bomb: one time series per id, and the metrics endpoint becomes the
 *      outage it was installed to describe.
 *   3. THE WIRING — index.js mounts both the middleware and the route, and the
 *      authz classifier records the route as role-gated (not public), because
 *      a scanner that sees a guardless /metrics will (correctly) flag it.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { mountApp } = await import('../helpers/appHarness.js');
const { registry, metricsMiddleware, httpRequestsInFlight } = await import('../../src/lib/metrics.js');
const { buildInventory } = await import('../../scripts/lib/authzClassify.mjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(__dirname, '..', '..', 'src', 'routes');

const TOKEN = 'test-metrics-token-0123456789';
const { as } = await mountApp('metrics');

beforeEach(() => {
  process.env.METRICS_TOKEN = TOKEN;
});

afterEach(() => {
  delete process.env.METRICS_TOKEN;
});

const scrape = (headers = {}) => as().get('/metrics').set(headers);

describe('INF-M-02 /metrics gate', () => {
  it('is disabled (403) when METRICS_TOKEN is not configured — fail closed, not open', async () => {
    delete process.env.METRICS_TOKEN;
    const r = await scrape({ Authorization: `Bearer ${TOKEN}` });
    expect(r.status).toBe(403);
    expect(r.body.message).toContain('disabled');
  });

  it('rejects a wrong bearer token with 403 and no metric payload', async () => {
    const r = await scrape({ Authorization: 'Bearer wrong-token' });
    expect(r.status).toBe(403);
    expect(r.body.message).toContain('invalid metrics token');
    expect(r.text).not.toContain('http_requests_total');
  });

  it('rejects a request with no credentials at all', async () => {
    const r = await scrape();
    expect(r.status).toBe(403);
  });

  it('serves the registry with the Prometheus content type on a valid bearer token', async () => {
    const r = await scrape({ Authorization: `Bearer ${TOKEN}` });
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('text/plain');
    expect(r.text).toContain('http_requests_total');
    expect(r.text).toContain('http_request_duration_seconds');
  });

  it('also accepts the x-metrics-token header form', async () => {
    const r = await scrape({ 'x-metrics-token': TOKEN });
    expect(r.status).toBe(200);
  });
});

// ─── the middleware that feeds the endpoint ───────────────────────────────────

describe('INF-M-02 HTTP instrumentation', () => {
  const app = express();
  app.use(metricsMiddleware);
  app.get('/probe/:id', (req, res) => res.json({ ok: true }));
  app.get('/boom', (req, res) => res.status(500).json({ err: 1 }));
  let hangSeen = null;
  app.get('/hang', () => { hangSeen?.(); /* never responds: client will abort */ });

  const metricsText = async () => {
    const res = await scrape({ Authorization: `Bearer ${TOKEN}` });
    expect(res.status).toBe(200);
    return res.text;
  };

  it('labels by matched pattern, not by raw path (cardinality guard)', async () => {
    const { default: request } = await import('supertest');
    await request(app).get('/probe/42').expect(200);
    const text = await metricsText();
    expect(text).toContain('route="/probe/:id"');
    expect(text).not.toContain('/probe/42');
  });

  it('records the status code of a failing route', async () => {
    const { default: request } = await import('supertest');
    await request(app).get('/boom').expect(500);
    const text = await metricsText();
    expect(text).toMatch(/http_requests_total\{[^}]*route="\/boom"[^}]*status_code="500"\} \d/);
  });

  it('collapses paths no handler matched to `unmatched`, not to their own label', async () => {
    const { default: request } = await import('supertest');
    await request(app).get('/definitely/not/routed').expect(404);
    const text = await metricsText();
    expect(text).toMatch(/route="unmatched"/);
    expect(text).not.toContain('/definitely/not/routed');
  });

  it('in-flight gauge returns to zero after a response settles', async () => {
    const { default: request } = await import('supertest');
    await request(app).get('/probe/1').expect(200);
    const text = await metricsText();
    expect(text).toMatch(/^http_requests_in_flight 0$/m);
  });

  it('counts a client abort as 499 and does not leak the in-flight gauge', async () => {
    const server = app.listen(0);
    try {
      const { port } = server.address();
      const seen = new Promise((resolve) => { hangSeen = resolve; });
      const req = http.request({ port, path: '/hang' });
      req.on('error', () => {});
      req.end();
      // Yank the socket only once the server has actually picked the request
      // up. The old fixed sleep raced the accept queue under full-suite
      // parallelism: the socket died mid-connect, the middleware never ran,
      // and the 499 counter legitimately never appeared.
      await Promise.race([
        seen,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('server never saw GET /hang within 5s')), 5000)),
      ]);
      req.destroy();
      // The 499 is recorded when the abort event lands; poll past event-loop
      // delay instead of sleeping a fixed 80ms and hoping.
      const abortCount = /http_requests_total\{[^}]*route="\/hang"[^}]*status_code="499"\} \d/;
      const deadline = Date.now() + 5000;
      let text = await metricsText();
      while (!abortCount.test(text) && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
        text = await metricsText();
      }
      expect(text).toMatch(abortCount);
      expect(text).toMatch(/^http_requests_in_flight 0$/m);
    } finally {
      hangSeen = null;
      await new Promise((r) => server.close(r));
    }
  });
});

// ─── wiring: the endpoint is real, and the scanner knows it is guarded ───────

describe('INF-M-02 wiring', () => {
  const indexSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');

  it('index.js mounts both the middleware and the scrape route', () => {
    expect(indexSrc).toContain('metricsMiddleware');
    expect(indexSrc).toContain('metricsRoutes');
    expect(indexSrc).toContain('startProcessMetrics()');
  });

  it('the authz classifier records /metrics as role-gated, never public', () => {
    const row = buildInventory(ROUTES_DIR).find((r) => r.file === 'metrics.js');
    expect(row).toBeDefined();
    expect(row.method).toBe('GET');
    expect(row.target).toBe("'/metrics'");
    expect(row.tag).toBe('role');
  });
});
