# ==============================================================================
# FindMedi — Observability stack (INF-M-02)
# ==============================================================================

## What exists now

| Piece | Where |
|---|---|
| Metrics endpoint (token-gated, fail-closed) | `backend/src/routes/metrics.js` → `GET /metrics` |
| Registry + HTTP instruments + middleware | `backend/src/lib/metrics.js` |
| Scrape auth (`METRICS_TOKEN`, timing-safe) | `backend/src/middleware/metricsAuth.js` |
| Prometheus config | `observability/prometheus.yml` |
| Alert rules (one group per SLO below) | `observability/alerts.yml` |
| Grafana dashboard + auto-provisioning | `observability/grafana/` |
| Compose file to run the stack | `infra/docker-compose.observability.yml` |

### Metrics exposed

- `http_requests_total{method,route,status_code}` — status `499` = client
  aborted before a response (recorded on `close`, not `finish`).
- `http_request_duration_seconds{method,route,status_code}` histogram.
- `http_requests_in_flight`
- `nodejs_*` / `process_*` defaults (heap, GC, event loop, CPU), started only
  on a real boot (`startProcessMetrics()` in `index.js`).

**Cardinality rule**: the `route` label is the *matched pattern*
(`/api/users/:id`), never the raw URL; unmatched paths collapse to
`unmatched`. Do not add labels with user/facility ids.

## SLOs (the reason the alerts exist)

| SLO | Target | SLI (metric) | Alert |
|---|---|---|---|
| Availability | 99.9% of requests/month non-5xx | `http_requests_total` 5xx ÷ total | `ApiErrorRateElevated` >1% for 30m (warning), `ApiErrorRateHigh` >5% for 10m (critical) |
| Latency | p95 < 1s per route (5m window) | `http_request_duration_seconds_bucket` | `ApiLatencyP95High` p95 >1s for 10m, per-route |
| Responsiveness | event-loop lag < 500ms | `nodejs_eventloop_lag_seconds` | `ApiEventLoopLagging` >0.5s for 10m |
| Liveness | scrape reachable | `up{job="findmedi-api"}` | `ApiInstanceDown` for 2m (critical) |
| Saturation | RSS ≲ 3× used heap + 500MB | `process_resident_memory_bytes` | `ApiProcessEventRSSHigh` for 15m |

Error budget: 99.9%/month = 43.2 min of 5xx-equivalent downtime. The 1%
warning alert exists so budget burn is visible *before* it becomes an incident.

Exclusions: `499` client aborts are not server faults and are excluded from
the error-rate numerator (see `alerts.yml`). `/metrics` itself is excluded
from latency panels so scrape noise cannot mask API latency.

## Running it

```bash
export METRICS_TOKEN='some-long-random-token'   # same value the backend reads
docker compose -f infra/docker-compose.observability.yml up -d
```

- Prometheus: http://localhost:9090 (Status → Alerts shows the rules firing)
- Grafana: http://localhost:3001 (admin / `GRAFANA_PASSWORD`, dashboard
  auto-provisioned under folder **FindMedi**)

Backend side: `METRICS_TOKEN` must be set in the backend environment too —
without it `/metrics` answers 403 on purpose (an unauthenticated metrics
endpoint maps your traffic shape for free).

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:5001/metrics
```

## Known follow-ups (not part of INF-M-02's deliverable)

- Alertmanager receiver (email/Slack/PagerDuty) — rules evaluate and display
  today, but nothing pages anyone until a receiver is configured.
- Long-term retention (Thanos/Mimir) if metrics must outlive the local TSDB.
- Business metrics (bookings, payments, notification delivery) — the
  instruments in `lib/metrics.js` are the extension point; wire counters at the
  call sites that matter.
