# Data Platform (Flink, OpenSearch, Pinot) — Missing Features & Capabilities

## [DATA-MISSING-01] Pinot Role-Based Data Masking & Cohort Re-Identification Thresholds
- **Description**: Apache Pinot tables in `data-platform/pinot/` (`prescription_rollup-table.json`, `emergency_dispatch_metrics-table.json`) expose granular analytics columns without row-level security or small-cohort suppression (k-anonymity).
- **Current vs Expected Behavior**:
  - *Current*: Analysts running aggregate Pinot queries on small towns or rare diagnoses (e.g. HIV positive status in a village of 500 people) can re-identify individual patients if query results return cohort counts < 5.
  - *Expected*: 
    1. Mandatory k-anonymity rule (minimum cohort count ≥ 10): any aggregate query returning < 10 rows masks the count as `<10` to prevent re-identification.
    2. Column-level data masking for non-admin analysts (masking doctor names, patient ages into 10-year brackets).
- **Flow**: Executive reporting, epidemiology research, platform BI dashboards.
- **Root Cause / Logic**: Pinot queries were designed for raw performance rather than statistical disclosure limitation.
- **Affected Files**: `data-platform/pinot/prescription_rollup-schema.json`, `backend/src/routes/analytics.js`
- **UI/Frontend Impact**: Analytics charts display "Data suppressed (<10 patients) to protect privacy".
- **Security/Data Risk**: **High**. De-anonymization of patients with rare health conditions.
- **Suggested Fix / Implementation Plan**:
  1. Add post-query aggregation filter in `backend/src/routes/analytics.js` suppressing cell values < 10.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement k-anonymity suppression in analytics query service.

---

## [DATA-MISSING-02] Automated MongoDB to OpenSearch CDC (Change Data Capture) Debezium Pipeline
- **Description**: Currently, OpenSearch index synchronization is performed via dual-write code calls (`indexEhrDocument`, `indexDrugDoc`) inside application controllers. If an update query runs via direct Mongoose update or background script, OpenSearch drifts out of sync with MongoDB.
- **Current vs Expected Behavior**:
  - *Current*: Dual-write application calls; network hiccups cause OpenSearch and MongoDB to desynchronize.
  - *Expected*: Streaming Change Data Capture (CDC) via Debezium Kafka Connector reading MongoDB oplog and streaming real-time mutations directly into OpenSearch and Pinot via Kafka.
- **Flow**: Real-time provider updates, medicine stock updates, clinical document amendments.
- **Root Cause / Logic**: Debezium CDC pipeline was planned for Phase 6.
- **Affected Files**: `infra/kafka/`, `data-platform/opensearch/`, `backend/src/services/opensearchIndexer.js`
- **UI/Frontend Impact**: None directly; ensures search results always match database reality.
- **Security/Data Risk**: **Low**. Data consistency enhancement.
- **Suggested Fix / Implementation Plan**:
  1. Configure Debezium MongoDB source connector in `infra/kafka/debezium-mongodb.json`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add Debezium CDC configuration for MongoDB oplog streaming.
