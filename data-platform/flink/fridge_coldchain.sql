-- Pharmacy cold-chain fridge watchdog (Tech 05 + REMAINING-01 PENDING-3).
-- Source: findmedi.clinical.vitals-telemetry.v1 — fridge probes publish
-- 1-min temp readings (sensorId, fridgeId, tempC). Drift > 8C for > 15 min
-- emits a maintenance + pharmacist alert row.
-- Submit: docker exec -d findmedi-flink-jobmanager ./bin/sql-client.sh -f /opt/fridge_coldchain.sql
SET 'execution.checkpointing.interval' = '15s';
CREATE TABLE fridge_stream (
    fridgeId STRING,
    pharmacyId STRING,
    tempC DOUBLE,
    pt AS PROCTIME()
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.clinical.vitals-telemetry.v1',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-fridge-job',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true'
);
CREATE TABLE print_fridge_sink (
    fridgeId STRING,
    pharmacyId STRING,
    window_end TIMESTAMP(3),
    max_temp DOUBLE,
    breach_min BIGINT
) WITH (
    'connector' = 'print'
);
INSERT INTO print_fridge_sink
SELECT
    fridgeId,
    pharmacyId,
    HOP_END(pt, INTERVAL '1' MINUTE, INTERVAL '20' MINUTE) AS window_end,
    MAX(tempC) AS max_temp,
    SUM(CASE WHEN tempC > 8.0 THEN 1 ELSE 0 END) AS breach_min
FROM fridge_stream
GROUP BY
    fridgeId,
    pharmacyId,
    HOP(pt, INTERVAL '1' MINUTE, INTERVAL '20' MINUTE)
HAVING SUM(CASE WHEN tempC > 8.0 THEN 1 ELSE 0 END) >= 15;
