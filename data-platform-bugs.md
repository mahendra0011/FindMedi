# Data Platform (Flink, OpenSearch, Pinot) — Bugs

## [DATA-BUG-01] Missing Tenant ID in OpenSearch EHR Index Schema (Cross-Tenant Search Leak)
- **Description**: In `data-platform/opensearch/mappings/ehr_docs_index.json`, the document properties schema defines `recordId`, `patientId`, `patientPseudonym`, `docType`, `text`, `allergies`, and `createdAt`, but completely omits `tenantId` / `hospitalId` / `facilityId`.
- **Current vs Expected Behavior**:
  - *Current*: When OpenSearch full-text queries are executed across the `findmedi_ehr_docs_v1` index, queries cannot filter by hospital or tenant boundary.
  - *Expected*: Every indexed document must carry `hospitalId: { type: "keyword" }` and `facilityId: { type: "keyword" }`, and search services must automatically inject the caller's tenant ID into the Elasticsearch/OpenSearch `bool.must` clause.
- **Flow**: Doctor or Hospital Researcher searching clinical documents and ICD diagnostic codes.
- **Root Cause / Logic**: Incomplete index mapping schema design in `ehr_docs_index.json`.
- **Affected Files**: `data-platform/opensearch/mappings/ehr_docs_index.json`, `backend/src/services/opensearchIndexer.js`
- **UI/Frontend Impact**: Doctors searching for medical history could see search snippets from clinical records belonging to another hospital on the platform!
- **Security/Data Risk**: **Critical**. Severe cross-tenant medical record leak and HIPAA/DPDP violation.
- **Steps to Reproduce**:
  1. Index two EHR documents: Doc 1 (Hospital 1), Doc 2 (Hospital 2).
  2. Execute `POST /findmedi_ehr_docs_v1/_search` with query `text: "asthma"`.
  3. Both Doc 1 and Doc 2 are returned in search hits without tenant restriction.
- **Suggested Fix / Implementation Plan**:
  1. Update `ehr_docs_index.json` to include `"hospitalId": { "type": "keyword" }`.
  2. Update `indexEhrDoc` in `opensearchIndexer.js` to index `hospitalId`.
  3. Enforce tenant filter injection in `ehrSearchAccess.js`.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Add `hospitalId` to `ehr_docs_index.json`.
  - [ ] Inject tenant scoping filter into OpenSearch query builder.

---

## [DATA-BUG-02] Flink Job Timestamp Parsing Panic on ISO 8601 Strings in Real-Time Telemetry
- **Description**: In `data-platform/flink/surge_epoch.sql` and `wearables_fall.sql`, Flink SQL definitions expect millisecond Unix epoch integers (`BIGINT`) for event-time watermarking (`WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND`). However, Node.js Kafka producers in `eventForwarder.js` publish standard ISO 8601 strings (`new Date().toISOString()`).
- **Current vs Expected Behavior**:
  - *Current*: Flink SQL job throws a runtime deserialization exception and continuously restarts in a CrashLoopBackOff when consuming strings into `TIMESTAMP(3)` columns.
  - *Expected*: Standardized timestamp formatting: Flink SQL schema must use `TO_TIMESTAMP(iso_string)` or Kafka producer must serialize `event_time: Date.now()` (numeric milliseconds).
- **Flow**: Real-time surge pricing calculations and elderly wearable fall detection stream processing.
- **Root Cause / Logic**: Type mismatch between Node.js event producer and Flink stream consumer.
- **Affected Files**: `data-platform/flink/surge_epoch.sql`, `data-platform/flink/wearables_fall.sql`, `backend/src/services/eventForwarder.js`
- **UI/Frontend Impact**: Real-time surge pricing and telemetry analytics dashboards fail to update.
- **Security/Data Risk**: **Medium**. Stream processing pipeline failure and Kafka consumer lag buildup.
- **Steps to Reproduce**:
  1. Produce an event with `{ event_time: "2026-10-15T10:00:00.000Z" }` to `telemetry.rides`.
  2. Inspect Flink JobManager logs; job fails with `SqlParseException` / `DateTimeParseException`.
- **Suggested Fix / Implementation Plan**:
  1. In `eventForwarder.js`, send numeric `event_time: Date.now()`.
  2. Update Flink SQL table DDL to handle both epoch and string conversions.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Standardize timestamp payload in `eventForwarder.js`.
  - [ ] Update Flink SQL schema definitions.
