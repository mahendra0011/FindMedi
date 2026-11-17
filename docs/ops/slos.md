# SLOs — FindMedi service level objectives

> Companion to `infra/observability/alerts.yml` (page-vs-ticket alert routing) and `docs/ops/observability-runbook.md`.
> These are **initial targets** — tune with real data after the first month of live traffic. Error budgets drive release freezes; see freeze rules below.

| # | Service / SLI | SLO target | Measurement | Burn: fast | Burn: slow |
|---|---|---|---|---|---|
| 1 | **API availability** — fraction of non-5xx responses to total | 99.9% | `sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` | page at 2% burn | page at 0.5% burn |
| 2 | **Booking completion** — confirmed ÷ initiated (excluding user-side abandon) | ≥ 98% | confirmed appointments / initiated checkout (live metric, demo path returns 100%) | ticket at 5% error | ticket at 2% error |
| 3 | **Payment success rate** — gateway-attributable captures ÷ attempts | ≥ 97% | gateway webhooks captured ÷ authorized | page at 1.5% failure | page at 0.5% failure |
| 4 | **Search latency** — p95 | < 500 ms | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{route=~"/api/search.*"}[10m]))` | ticket | ticket |
| 5 | **Booking confirmed → reminder sent** — ≤ 60 s p99 | ≥ 99% delivered | `bullmq_job_finished_total{queue="notifications"}` lag | ticket | ticket |
| 6 | **SOS dispatch availability** — SOS dispatch API | 99.95% | `probe_success{job="sos-health"}` or K8s readiness probe | page | page |
| 7 | **API error rate** (all 5xx) | < 1% of requests | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` | page | page |
| 8 | **DB replication lag** (if replica set) | < 5 s | `mongodb_replication_lag` | page | page |

## Error budget policy

| Burn rate (over 30d window) | Action |
|---|---|
| < 33% burn | Feature work continues; normal risk review |
| 33–66% burn | Freeze risky rollouts; require extra review; post-deploy monitoring mandatory |
| 66–100% burn | Freeze all non-critical releases; incident review by CTO; fix reliability before feature work |
| > 100% (budget exhausted) | Full release freeze; rollback drill mandatory; leadership review before next release |

**Exemptions (never freeze):** security patches, data-protection remediations, active-incident fixes.

## Notification routing (mirror of `alerts.yml`)

| Page (wake humans) | Ticket (queue, business hours) |
|---|---|
| API 5xx spike | Moderate latency regression |
| Payment webhook failure | Slow queries > 1s |
| SOS endpoint unavailable | Elevated 4xx from a single tenant |
| DB primary failover / replication lag | Doc-expiry spikes or cost anomalies |
| Queue backlog age > threshold | Vulnerability findings (non-critical) |
| Auth failure spike | Canary metric regressions |

## Where to look

- Grafana dashboard: `infra/observability/grafana/dashboards/findmedi-api.json`
- Funnel/behaviour: `infra/observability/grafana/dashboards/findmedi-booking-funnel.json`
- Alert rules: `infra/observability/alerts.yml`
- Runbook (incident triage, password/keys, queues, payment mismatch): `docs/ops/observability-runbook.md`

## Review cadence

Reviewed monthly at the monthly metrics review (`docs/ops/monthly-metrics-review.md`). First review must re-check SLO-1/3/6 against production data and adjust targets.
