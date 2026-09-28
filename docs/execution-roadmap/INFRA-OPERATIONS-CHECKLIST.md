# FindMedi — Infra Operations Checklist

> Completes the *operational* items from the infra & data-platform strategy that code
> alone cannot answer: service ownership, memory sizing, encryption-at-rest and
> "is anyone actually consuming Pinot/Flink" verifications. "Code evidence" rows
> were confirmed against the repository; "verify" rows are the commands/console
> checks an operator runs once per environment.

---

## 1. Kafka — producers & consumers (audit question answered)

| Direction | Where |
|---|---|
| Producer | `backend/src/lib/kafkaProducer.js` |
| Outbox poller (writes topic) | `backend/src/services/outboxPollerService.js` (started in `src/index.js`) |
| Consumer daemon | `backend/src/services/kafkaConsumerService.js` (started in `src/index.js`) |
| Retry topics | retry-topic routing + topic bootstrap script (see git history: "kafka retry topics") |
| Flink reads the same topics | `data-platform/flink/surge_job.sql` (surge pipeline) |

**Verify (per environment):**
```bash
docker compose -f infra/docker-compose.yml exec kafka \
  kafka-topics --bootstrap-server localhost:29092 --list
docker compose -f infra/docker-compose.yml exec kafka \
  kafka-consumer-groups --bootstrap-server localhost:29092 --describe --group <group-id>
```
- [ ] Every topic in the retry chain has an owner (see §7).
- [ ] `KAFKA_BOOTSTRAP_SERVERS` unset where Kafka is expected → events silently stop; watch boot logs for the outbox "disabled" warning.

## 2. OpenSearch — search + audit indexing (DONE)

- Audit indexing is **live**: `backend/src/middleware/audit.js` writes Mongo and mirrors to `backend/src/services/opensearchIndexer.js`; `ensureIndices()` runs at boot (`src/index.js`).
- Indices/mappings: `data-platform/opensearch/mappings/audit_logs_index.json`, `providers_index.json`.
- Record access is audited (`view_patient_records`, `download_prescription` in `src/routes/records.js`) alongside write actions.

**Verify:**
```bash
curl -s "http://localhost:9200/_cat/indices?v"
curl -s "http://localhost:9200/findmedi_audit_logs_v1/_search?size=1" | head
```
- [ ] Retention/ILM policy defined for the audit index before go-live (compliance window).
- [ ] `OPENSEARCH_NODE` set in every environment (unset = documented no-op).

## 3. Apache Pinot — real consumers?

- Provisioned: `infra/docker-compose.yml` (`pinot-controller`, QuickStart batch mode).
- Table/schema config: `data-platform/pinot/emergency_dispatch_metrics-{schema,table}.json`.
- **Audit outcome:** config exists; no dashboard/consumer in this repo. Leave provisioned; do not expand until a real-time dashboard requirement lands.

**Verify:**
```bash
curl -s http://localhost:9000/tables | jq
curl -s "http://localhost:9000/query/sql" -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT count(*) FROM emergency_dispatch_metrics"}' | jq
```
- [ ] Confirm the table receives rows (count > 0 after a dispatch).
- [ ] If count stays 0 and no dashboard is scheduled → mark the service intentionally idle in §7.

## 4. Apache Flink — real jobs?

- Provisioned: `flink-jobmanager` + `flink-taskmanager` in compose.
- Jobs: `data-platform/flink/surge_job.sql` (+ `surge_epoch/earliest/live.sql`, `passthrough_debug.sql`); Kafka SQL connector vendored in `infra/flink-lib/`.
- Git history shows the surge pipeline run and verified (proctime windows, row output).

**Verify:** open http://localhost:8081 → Running Jobs must show the surge job; check checkpointing.
- [ ] Re-submit the job after any broker restart (jobs are not auto-resubmitted).
- [ ] Owner assigned (§7) — Flink is the heaviest service to operate.

## 5. Valhalla — memory sizing (audit item)

- Routing server runs from `infra/valhalla/valhalla_tiles` (config: `infra/valhalla/valhalla.json`).
- No memory limit is set in dev compose **on purpose**; production sizing guide:
  - City-level extract: ~1–2 GB RSS.
  - State/region-level extract: 4–8 GB+ RSS.
  - Full planet: 64 GB+ (not applicable here).
- Size the container against the **actual extract** loaded, e.g. in the compose service:
  ```yaml
  deploy:
    resources:
      limits: { memory: 4g }
  ```
- [ ] Confirm the extract's coverage matches `VALHALLA_API_URL` consumers (ambulance/rider/navigation).
- [ ] After any tile rebuild, re-run `k6 run k6/booking-payment-smoke.js` — it asserts `/routing/navigation` answers 200.

## 6. Secrets & encryption at rest

- Secret injection: `SECRETS_FILE` (`src/index.js`, `src/utils/secretsFile.js`, unit-tested) — works with Doppler / Vault Agent / AWS Secrets Manager, no SDK lock-in. Platform-injected env always wins over the file.
- [ ] Production: render `SECRETS_FILE` from Doppler/Vault in the deploy pipeline; `.env` files must not ship.
- [ ] MongoDB Atlas: encryption-at-rest enabled (Atlas default on paid tiers; confirm cluster tier).
- [ ] PostgreSQL (money/medical-legal): managed instance encryption-at-rest enabled (or LUKS on self-hosted volumes).
- [ ] Backups: both stores backed up and one restore tested; audit-index retention documented (§2).

## 7. Ownership (fill in — undocumented ownership is the real risk)

| Service | Owner | Notes |
|---|---|---|
| Kafka + Zookeeper | _TBD_ | KRaft migration scheduled separately (§8) |
| OpenSearch | _TBD_ | audit retention + search analyzers |
| Pinot | _TBD_ | intentionally idle until a dashboard lands |
| Flink | _TBD_ | surge pipeline; heaviest ops burden |
| Valhalla | _TBD_ | tile rebuilds + memory sizing (§5) |
| Redis | _TBD_ | cache + Socket.IO adapter + BullMQ queues |
| MongoDB / PostgreSQL | _TBD_ | system of record / money ledger |

## 8. Deliberately deferred (documented decisions)

| Item | Decision | Reason |
|---|---|---|
| Kafka KRaft (drop Zookeeper) | Deferred | Correct target, not urgent; schedule in a maintenance window. Compose still runs ZK. |
| Puppeteer PDF | Deferred | pdfkit + Rust/native PDF pipeline already ships invoices/prescriptions; revisit when CSS-heavy reports land. |
| Pinot dashboards / Flink expansion | Deferred | No consumer yet; do not expand speculatively. |
| Full frontend typecheck burn-down | Deferred | Baseline ~12.7k strict-mode errors; CI step intentionally non-blocking until a tracked baseline ratchets down. |
| Remaining Redux slices → React Query/Zustand | Partial | Pure-UI `settings` slice migrated to Zustand (`frontend/src/store/useSettingsStore.js`); `auth`/`cart`/`notifications`/`map`/`instantDispatch` remain (server-derived or socket-driven — migrate per-slice with tests). |

## 9. MindSupport validator note (why `express-validator` is still a dependency)

`backend/mindsupport/src/routes/*.routes.js` (12 files) validate exclusively with
`express-validator`; they contain **no zod equivalents**, so the "remove
express-validator" Phase-0 item only applies to the main backend (which is
zod-only). The package was briefly removed entirely, which silently broke the
whole MindSupport sub-app (lazy-imported at `/api/mindsupport/*`). It is now a
declared dependency again, and `backend/test/mindsupport-app.test.js` fails CI
if the mind module graph ever stops resolving.
