# Findmedi Observability Runbook (F6)

This document details logging standards, metric instrumentation, automated alerting rules, and incident triage runbooks for the Findmedi Hospital Management System.

---

## 1. Centralized Logging (Pino)

All backend components use [Pino](https://github.com/pinojs/pino) for high-performance, structured JSON logging (`backend/src/config/logger.js`).

### Log Levels & Retention
- **Debug (`debug`):** Trace details for local development only. Disabled in production.
- **Info (`info`):** High-level operational events (service startup, batch job completion, daily sweeps). Retained for 30 days.
- **Warn (`warn`):** Handled anomalies, transient network retries (e.g. NIC IRP retries, SMS timeouts). Retained for 90 days.
- **Error (`error`):** Unhandled exceptions, failed database writes, gateway delivery failures. Retained for 365 days.

### Redaction Standards
Sensitive keys (`password`, `token`, `secret`, `authorization`, `otp`, `aadhaar`, `pan`) are automatically scrubbed via pino redaction paths before output.

---

## 2. Metrics & Instrumentation (`prom-client`)

The application exposes Prometheus metrics at `/metrics` (accessible only from internal monitoring network or Prometheus scraper with Basic Auth).

### Key Performance Indicators
- `http_request_duration_seconds{method, route, status}`: API response latency distribution (p50, p95, p99).
- `bullmq_queue_waiting_count{queue}`: Unprocessed jobs waiting in BullMQ queues (`pdf`, `whatsapp`, `einvoice`, `outbox`).
- `bullmq_job_failed_total{queue}`: Cumulative count of dead-lettered jobs.
- `payment_webhook_failures_total{gateway}`: Replay-rejected or signature-invalidated webhooks.
- `ai_ocr_latency_seconds{status}`: Gemini OCR response duration.

---

## 3. Automated Alert Rules & Thresholds

| Alert Name | Condition | Severity | Channel | Action |
|---|---|---|---|---|
| **HighApiLatency** | p95 latency > 500ms for 5m | Warning | Slack `#eng-alerts` | Check DB CPU / slow query logs |
| **HighQueueLag** | BullMQ waiting > 100 jobs for 10m | Warning | Slack `#eng-alerts` | Scale background workers |
| **DeadLetterQueueSpike** | DLQ failed > 5 jobs in 5m | Critical | PagerDuty | Inspect worker logs & runbook |
| **PaymentWebhookFailure** | Webhook 4xx/5xx > 3 in 15m | Critical | PagerDuty + Slack | Check gateway secret & runbook |
| **DatabaseConnectionDrop** | Mongo pool active < 1 | Critical | PagerDuty | Immediate failover inspection |

---

## 4. Health Probes

Findmedi exposes two standard HTTP health probes:

1. **Liveness Probe (`GET /health`):**
   - Lightweight status check returning `200 OK` `{ "status": "UP" }`.
   - Used by Kubernetes / container orchestrators to detect process lockup.

2. **Readiness Probe (`GET /api/ops-health`):**
   - Deep connectivity check verifying:
     - MongoDB replica set connection.
     - Redis cluster availability.
     - BullMQ queue responsiveness.
   - Returns `503 Service Unavailable` if core dependencies are down.

---

## 5. Incident Runbooks

Detailed triage runbooks are available in [`docs/go-live/runbooks/`](file:///d:/projects/Findmedi/docs/go-live/runbooks/):
- [`payment-webhook-fail.md`](file:///d:/projects/Findmedi/docs/go-live/runbooks/payment-webhook-fail.md): Signature validation or replay lockouts.
- [`queue-stuck.md`](file:///d:/projects/Findmedi/docs/go-live/runbooks/queue-stuck.md): PDF worker memory leaks or Redis stall.
- [`db-failover.md`](file:///d:/projects/Findmedi/docs/go-live/runbooks/db-failover.md): Primary election and replica set failover.

---

## 6. On-Call Escalation Ladder

1. **L1 Triage (0-15 mins):** Operations Engineer acknowledges alert, verifies `/api/ops-health`, checks recent deployment diffs.
2. **L2 Engineering (15-30 mins):** Backend on-call identifies failing service or dependencies, follows specific runbook.
3. **L3 Incident Commander (>30 mins):** Engineering Lead / CTO initiates incident response protocol, posts status updates to clinical hospital desk.
