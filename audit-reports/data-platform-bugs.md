# Data Platform — Bugs

Scope: `backend/src/services/{outboxPollerService,kafkaConsumerService,opensearchIndexer,ledgerService,transactionalOutbox}.js`, `pgDualWrite.js` (under `backend/src`), `data-platform/{flink,opensearch,pinot}/`, `infra/flink-lib/`, `docs/architecture-specs/10–16`.

**Credit where due**: the outbox pattern is *not* merely specified — artefacts exist (`transactionalOutbox.js`, `outboxPollerService.js` 159 lines, `kafkaConsumerService.js` 183 lines), the Rust native helper is built and tested in CI, and analytics jobs are checked in (`data-platform/flink/surge_*.sql`, `data-platform/pinot/emergency_dispatch_metrics-*.json`, `data-platform/opensearch/mappings/`). The findings below concern the gaps between those building blocks and the money/PHI paths that bypass them.

---

## [DATA-001] HIGH — The transactional outbox exists but the money path bypasses it
- **Description**: A grep of the entire backend for `mongoose.startSession()` returns exactly **one** file: `services/transactionalOutbox.js`, and `pgDualWrite.js` holds the only Prisma transactions (`prisma.$transaction` at L191 and L222). Yet the wallet/ledger money path in `routes/transactions.js` (L149–L186) and `routes/demoPayment.js` (L28–L52, L440–L455) mutates balances **outside** any session or outbox, with the ledger write as a separate subsequent operation (PAY-001). The mechanism that would make these writes atomic was built, is correct in intent, and is not used by the code that most needs it.
- **Current vs Expected**: Current = three write targets (Mongo documents, `TransactionLedger`, and the Postgres mirror via `pgDualWrite`) are updated by independent sequential calls, so a crash or validation error between them leaves the stores divergent — and because consumers are only eventually consistent, the divergence persists. Expected = every multi-store write funnelled through the outbox (or a session), with the poller as the only publisher and consumers idempotent by event id.
- **Flow**: Payment capture, provider withdrawal and refunds, plus the Postgres mirror used by reporting — i.e. the data an accountant or auditor would read.
- **Root Cause / Logic**: The outbox was adopted for the event/analytics seam but never retrofitted onto the pre-existing money paths, which continue to write directly. Two patterns now coexist, and the older one holds the money.
- **Affected Files**: `services/transactionalOutbox.js`, `services/pgDualWrite.js`, `services/ledgerService.js`, `routes/transactions.js`, `routes/demoPayment.js`, `services/outboxPollerService.js`, `services/kafkaConsumerService.js`
- **UI/Frontend Impact**: Indirect — balances in dashboards and statements can disagree with the ledger, unexplainably.
- **Security/Data Risk**: **High (integrity).** Financial data that cannot be reconciled is a fraud and audit problem, and divergent copies mean there is no single answer to "what does this user owe or earn?" Directly compounds PAY-001 and PAY-005.
- **Steps to Reproduce**: Force an error after `profile.walletBalance -= amount` but before the ledger inserts (or kill the process between them) and observe a debited wallet with no ledger entry and no Postgres mirror row.
- **Suggested Fix / Implementation Plan**: Route all multi-store writes through the outbox: write the Mongo change and the outbox event in one session, let `outboxPollerService` publish, and make the Postgres/analytics consumers idempotent by event id. Remove direct `pgDualWrite` calls from route handlers. Add a reconciliation job (MISS-PAY-003) comparing Mongo, Postgres and the ledger. Document the outbox as the *only* permitted cross-store write path.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Money paths write Mongo + outbox in one session
  - [ ] Consumers idempotent by event id
  - [ ] Remove direct `pgDualWrite` calls from handlers
  - [ ] Reconciliation job across Mongo/Postgres/ledger
  - [ ] Document the outbox as the sole cross-store write path
  - [ ] Confirm the poller's retry/poison-message/ordering semantics

## [DATA-002] MEDIUM–HIGH — PHI flows into Kafka, OpenSearch, Pinot and the lake with no demonstrated redaction
- **Description**: `opensearchIndexer.js` (166 lines) mirrors platform documents into an OpenSearch index, `kafkaConsumerService.js` (183 lines) consumes events from the backbone, and the specs describe a Pinot realtime analytics table and a Hudi/Hive data lake (`16-DATA-LAKE-OBJECT-STORAGE-HUDI-HIVE.md`). Healthcare events here routinely carry patient identity and clinical content (record created, prescription issued, lab result ready, appointment booked). Whether the indexed/published copies are redacted, pseudonymised or field-limited is **not evident** from the artefacts reviewed, and no data-classification or retention configuration is checked in alongside them.
- **Current vs Expected**: Current = a search index and an event stream that plausibly contain PII/PHI, with access control independent of — and, per `AUTHZ-001`, weaker in the API surface fronting them than — the primary database's. Expected = an explicit classification per event and field, documented redaction before the seam, pseudonymous identifiers in the analytics tier, standard retention, and an access model for analytics stores matching the source system.
- **Flow**: Every analytics, search and "audit indexing" path. Each additional copy of PHI is a new place it can leak, and these stores typically grant broader operator access than the primary database.
- **Root Cause / Logic**: The data platform was designed as a capability (specs 10–16) with the pipeline as the unit of work; data protection remained an implicit property of the source rather than an enforced pipeline stage.
- **Affected Files**: `services/opensearchIndexer.js`, `services/kafkaConsumerService.js`, `data-platform/opensearch/mappings/`, `data-platform/pinot/*.json`, `data-platform/flink/*.sql`, `docs/architecture-specs/10,14,15,16`
- **UI/Frontend Impact**: Indirect — search and analytics built on these stores may surface data the source system would have scoped.
- **Security/Data Risk**: **High (compliance and blast radius).** Health data replicated into general-purpose analytics/search infrastructure without documented redaction is a reportable risk under any health-data regime, and it multiplies the impact of a credential leak in the data tier. This audit did **not** read the indexer's field list — that verification is the first TODO below, and it is the difference between this being a Medium and a Critical finding.
- **Steps to Reproduce**: Inspect `opensearchIndexer.js` for a field allowlist/denylist, and each mapping under `data-platform/opensearch/mappings/` for patient-identifying fields (`name`, `phone`, `address`, `uhid`, `email`); inspect the Kafka payload builders for the same.
- **Suggested Fix / Implementation Plan**: Publish a data-classification table (field → class → permitted locations). Enforce redaction/pseudonymisation in the **producer**, so nothing unredacted is ever written to the backbone. Apply per-store retention and document access control per store. Add a CI test that fails when a known PHI field name appears in an analytics mapping or producer payload.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Verify and record exactly which fields reach OpenSearch/Kafka/Pinot
  - [ ] Publish the data-classification table
  - [ ] Producer-side redaction/pseudonymisation
  - [ ] Retention per analytics store
  - [ ] Access-control review for the data tier
  - [ ] CI check for PHI field names in mappings/producers

## [DATA-003] The analytics tier implements a narrow slice (surge/dispatch) while the specs describe a platform-wide lakehouse
- **Description**: The checked-in data-platform artefacts are concentrated on one domain: `data-platform/flink/` contains `surge_job.sql`, `surge_live.sql`, `surge_earliest.sql`, `surge_epoch.sql` and `passthrough_debug.sql`; `data-platform/pinot/` contains only `emergency_dispatch_metrics-schema.json` and its table definition. Meanwhile specs 10–16 describe a Kafka backbone with a schema registry, realtime Pinot analytics, OpenSearch search and audit indexing, and a Hudi/Hive data lake. A `passthrough_debug.sql` job and a committed `flink-sql-connector-kafka-3.0.2-1.18.jar` (`infra/flink-lib/`) sit alongside.
- **Current vs Expected**: Current = two parallel descriptions of the same platform — an aspirational spec set and a narrow implemented slice — with a debug job and a vendored connector jar in the artefact path. Expected = each spec annotated with its implementation status (implemented / partial / not started), debug jobs excluded from production artefacts, and connector dependencies resolved by the image or a checksum-pinned build step.
- **Flow**: Anyone reasoning about analytics coverage, on-call staff diagnosing a metrics gap, and the traceability index in `docs/execution-roadmap/ALL-36-SPECS-TRACEABILITY-TODO-INDEX.md` (25.6 KB), which claims coverage the artefacts do not evidence.
- **Root Cause / Logic**: Spec-first development: the architecture documents were written ahead of implementation and no status field was added as the two diverged — the same pattern as the nginx "TLS termination" comment (`INFRA-001`) and the ABDM stub (`REC-009`).
- **Affected Files**: `data-platform/flink/*.sql`, `data-platform/{opensearch,pinot}/`, `infra/flink-lib/flink-sql-connector-kafka-3.0.2-1.18.jar`, `docs/architecture-specs/10–16`, `docs/execution-roadmap/ALL-36-SPECS-TRACEABILITY-TODO-INDEX.md`
- **UI/Frontend Impact**: None directly; surge/dispatch dashboards exist while others may silently show no data.
- **Security/Data Risk**: **Low–Medium.** Primarily a trust and onboarding problem, with one security edge: unmarked debug pipelines are exactly the artefact that reaches production and exports unexpected data.
- **Steps to Reproduce**: List `data-platform/**` and compare with the claims in specs 10–16 and the traceability index.
- **Suggested Fix / Implementation Plan**: Add an "implementation status" header to every spec, reconciled against the repository by the same CI job as `MISS-AUTHZ-002`'s route inventory (one mechanism keeps both lists honest). Move debug SQL out of production directories, resolve the Flink connector from the image or a pinned build step, and make traceability-index entries link to evidence (file paths) rather than assert completion.
- **Priority**: Medium
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Status header on every architecture spec, CI-verified against the repo
  - [ ] Remove `passthrough_debug.sql` from production artefacts
  - [ ] Resolve the Flink connector without a committed jar
  - [ ] Traceability index entries link to evidence
  - [ ] Confirm which dashboards currently depend on the surge jobs

<!-- END -->
