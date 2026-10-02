-- MEWS/Sepsis early-warning job (Tech 05 + REMAINING-01 PENDING-3).
-- Source: findmedi.clinical.vitals-telemetry.v1 (flat JSON fields, same
-- convention as surge_live.sql). Physiology arrives via emitVitalsTelemetry
-- and NursingChart writes; this job scores sliding 90-min windows and sinks
-- Rapid Response Team alerts.
-- Submit: docker exec -d findmedi-flink-jobmanager ./bin/sql-client.sh -f /opt/mews_sepsis.sql
SET 'execution.checkpointing.interval' = '15s';
CREATE TABLE vitals_stream (
    patientId STRING,
    hr DOUBLE,
    sbp DOUBLE,
    rr DOUBLE,
    tempC DOUBLE,
    spo2 DOUBLE,
    consciousness STRING,
    pt AS PROCTIME()
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.clinical.vitals-telemetry.v1',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-mews-job',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true'
);
-- Per-reading MEWS component scores (simplified bedside table).
CREATE VIEW mews_scored AS
SELECT
    patientId,
    pt,
    (CASE WHEN hr BETWEEN 51 AND 100 THEN 0 WHEN hr BETWEEN 41 AND 50 OR hr BETWEEN 101 AND 110 THEN 1 WHEN hr BETWEEN 111 AND 129 THEN 2 ELSE 3 END
     + CASE WHEN sbp BETWEEN 101 AND 199 THEN 0 WHEN sbp BETWEEN 81 AND 100 THEN 1 WHEN sbp BETWEEN 71 AND 80 OR sbp >= 200 THEN 2 ELSE 3 END
     + CASE WHEN rr BETWEEN 9 AND 14 THEN 0 WHEN rr BETWEEN 15 AND 20 THEN 1 WHEN rr BETWEEN 21 AND 29 THEN 2 ELSE 3 END
     + CASE WHEN tempC BETWEEN 35.0 AND 38.4 THEN 0 ELSE 2 END
     + CASE WHEN consciousness = 'Alert' THEN 0 ELSE 3 END) AS mews
FROM vitals_stream;
CREATE TABLE print_rrt_sink (
    patientId STRING,
    window_end TIMESTAMP(3),
    max_mews BIGINT,
    delta_mews BIGINT
) WITH (
    'connector' = 'print'
);
-- Alert: max MEWS >= 5 OR spike >= 3 within a sliding 90-min window.
INSERT INTO print_rrt_sink
SELECT
    patientId,
    HOP_END(pt, INTERVAL '5' MINUTE, INTERVAL '90' MINUTE) AS window_end,
    MAX(mews) AS max_mews,
    MAX(mews) - MIN(mews) AS delta_mews
FROM mews_scored
GROUP BY
    patientId,
    HOP(pt, INTERVAL '5' MINUTE, INTERVAL '90' MINUTE)
HAVING MAX(mews) >= 5 OR (MAX(mews) - MIN(mews)) >= 3;
