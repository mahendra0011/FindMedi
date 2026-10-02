-- Hudi table DDL (Spark-SQL / Trino-Hive dialect reference).
-- PK trip_id, preCombine end_time, date_partition, MoR (read-optimized
-- snapshots + write-optimized log). Bucket: s3://findmedi-data-lake.
CREATE TABLE IF NOT EXISTS hudi_ride_telemetry_historical (
  trip_id STRING,
  provider_id STRING,
  vertical STRING,
  h3_res8 STRING,
  route_polyline STRING,
  fare DOUBLE,
  start_time BIGINT,
  end_time BIGINT,
  date_partition STRING
) USING hudi
OPTIONS (
  type = 'mor',
  primaryKey = 'trip_id',
  preCombineField = 'end_time'
)
PARTITIONED BY (date_partition)
LOCATION 's3://findmedi-data-lake/hudi_ride_telemetry_historical';

-- (a) Monthly GST / commission / 194C-TDS rollup (multi-M rows, batch only)
-- SELECT date_trunc('month', from_unixtime(end_time/1000)) AS m,
--   SUM(fare) AS gross, SUM(fare)*0.15 AS commission_est, SUM(fare)*0.01 AS tds_194c
-- FROM hudi_ride_telemetry_historical
-- WHERE date_partition BETWEEN '2026-01-01' AND '2026-12-31' GROUP BY 1;

-- (b) Crash/SOS forensic reconstruction: exact GPS path + speed curve
-- SELECT trip_id, h3_res8, route_polyline, start_time, end_time
-- FROM hudi_ride_telemetry_historical WHERE trip_id = '<SOS_TRIP_ID>';

-- (c) GDPR/DPDP surgical delete verification (Hudi delete + re-query = 0 rows)
-- DELETE FROM hudi_ride_telemetry_historical WHERE provider_id = '<USER_ID>';
-- SELECT COUNT(*) FROM hudi_ride_telemetry_historical WHERE provider_id = '<USER_ID>';

-- (d) Insurance-fraud graph join (cataract < 18yo across billing/diagnostics/pharmacy)
-- SELECT b.claim_id FROM billing_claims b JOIN diagnostics d ON b.patient_id = d.patient_id
-- WHERE d.procedure = 'CATARACT' AND b.patient_age < 18;
SELECT 1;
