/**
 * INF-M-02: Prometheus instrumentation for the API process.
 *
 * The finding: pino logs every request but nothing is COUNTABLE — you cannot
 * graph error rate, alert on p95 latency, or answer "is it just slow or just
 * broken?" without reading log lines one at a time. This module owns the
 * registry and the three HTTP instruments; the scrape surface itself lives in
 * `routes/metrics.js` (token-guarded, fail-closed).
 *
 * Two cardinality rules, both load-bearing:
 *
 *   1. The `route` label is the matched PATTERN (`/api/users/:id`), never the
 *      raw URL — raw paths carry user ids and would create a new time series
 *      per patient within minutes, which is how a metrics endpoint takes the
 *      process down instead of describing it.
 *   2. Unknown paths collapse to `unmatched` rather than their own label.
 *
 * Default Node metrics (heap, GC, event loop, process CPU) are collected only
 * when `startProcessMetrics()` is called from index.js — importing this module
 * in a test must not start a collection interval.
 */
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

let defaultsStarted = false;

/** Start `nodejs_*`/`process_*` collection. Idempotent; call at server start. */
export function startProcessMetrics() {
  if (defaultsStarted) return;
  collectDefaultMetrics({ register: registry });
  defaultsStarted = true;
}

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP responses by method, matched route and status code (499 = client aborted before a response).',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration by method, matched route and status code.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'HTTP requests currently being served.',
  labelNames: [],
  registers: [registry],
});

/**
 * The Prometheus `route` label: mounted prefix + matched sub-path.
 *
 * Falls back to `unmatched` when no route handled the request (404s and
 * errors that never reached a handler). The raw path is deliberately NOT
 * used — see the cardinality note at the top of this file.
 */
export function routeLabel(req) {
  if (!req.route) return 'unmatched';
  const base = req.baseUrl || '';
  const path = req.route.path || '/';
  const full = base + (path === '/' ? '' : path);
  return full || '/';
}

/**
 * Record one response exactly once.
 *
 * `finish` means the response was fully written; a `close` without `finish`
 * means the client went away mid-response (counted as 499, nginx convention).
 * Without the close path the in-flight gauge would leak upward forever every
 * time a mobile client walked into a lift.
 */
function recordOnce(req, res, startNs) {
  let settled = false;
  return (statusCode) => {
    if (settled) return;
    settled = true;
    httpRequestsInFlight.dec();
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, Number(process.hrtime.bigint() - startNs) / 1e9);
  };
}

export function metricsMiddleware(req, res, next) {
  const startNs = process.hrtime.bigint();
  const settle = recordOnce(req, res, startNs);
  httpRequestsInFlight.inc();
  res.on('finish', () => settle(res.statusCode));
  res.on('close', () => {
    if (!res.writableFinished) settle(499);
  });
  next();
}
