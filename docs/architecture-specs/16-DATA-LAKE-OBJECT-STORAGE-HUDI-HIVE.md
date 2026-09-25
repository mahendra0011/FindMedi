# 16 - Data Lake, Object Storage, Apache Hudi & Apache Hive Specification

## 1. Architectural Mandate: Cold Data Offloading
MongoDB is intentionally kept lean to maintain high memory hit-ratios for active operational transactions.
Historical telemetry (billions of GPS coordinates), completed ride traces, legal consultations, and audit trails are continuously offloaded into a **Data Lake**:
- **Object Storage (S3 / MinIO / Ceph)**: Highly durable, cost-effective raw file storage.
- **Apache Hudi**: Provides transactional table management, upserts, incremental processing, and compaction over parquet files in object storage.
- **Apache Hive / Presto / Trino**: Provides batch SQL analytical querying for financial reconciliation, business intelligence, and regulatory audits.

---

## 2. Ingestion & Compaction Pipeline

```
                                KAFKA RAW LOGS
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    HUDI DELTASTREAMER INGEST  │
                      │  Continuous Micro-Batch Sink  │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │     OBJECT STORAGE BUCKET     │
                      │   (s3://findmedi-data-lake)   │
                      │  Parquet Files + Avro Log Log │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    APACHE HUDI TABLE TYPES    │
                      │  CoW (Copy-on-Write) for Read │
                      │  MoR (Merge-on-Read) for Write│
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │       APACHE HIVE / TRINO     │
                      │   Batch SQL Analytics Engine  │
                      └───────────────────────────────┘
```

---

## 3. Apache Hudi Table Architecture

### Table: `hudi_ride_telemetry_historical`
```sql
CREATE TABLE hudi_ride_telemetry_historical (
    trip_id STRING,
    provider_id STRING,
    vertical STRING,
    h3_res8 STRING,
    route_polyline STRING,
    fare_collected DOUBLE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    date_partition STRING
) USING hudi
PARTITIONED BY (date_partition)
OPTIONS (
    type = 'mor',
    primaryKey = 'trip_id',
    preCombineField = 'end_time'
);
```
- **Upsert Capability**: If an audit retroactively adjusts a driver payout or refunds a ride, Hudi upserts the parquet record without rewriting the entire multi-gigabyte dataset.
- **Incremental Queries**: Allows machine learning and batch pipelines to query only records modified since the last check.

---

## 4. Analytical Use Cases & Regulatory Compliance
1. **Financial Tax & TDS Audits**: Hive runs monthly multi-million row SQL batch queries to compute driver GST, platform commissions, and 194C TDS filings.
2. **Crash & Incident Forensic Reconstruction**: When an emergency SOS or vehicular dispute is flagged, forensic teams reconstruct the exact GPS path, speed curves, and paramedic telemetry from parquet records.
3. **GDPR / DPDP Right to be Forgotten**: Hudi allows surgical deletion of individual user health records from the data lake upon verified deletion requests.
