-- Wearable fall / AFib watchdog (Tech 05 + REMAINING-01 PENDING-3).
-- Source: findmedi.clinical.vitals-telemetry.v1 — geriatric wearables publish
-- PPG + accelerometer frames (motionMag, zeroMotionSec, hrIrregular flag).
-- Decel + prolonged zero-motion (or sustained irregular rhythm) emits an
-- auto Emergency SOS row to the print sink (wire to emergency.sos-alerts.v1
-- Kafka sink in production).
-- Submit: docker exec -d findmedi-flink-jobmanager ./bin/sql-client.sh -f /opt/wearables_fall.sql
SET 'execution.checkpointing.interval' = '15s';
CREATE TABLE wearable_stream (
    patientId STRING,
    lat DOUBLE,
    lng DOUBLE,
    motionMag DOUBLE,
    zeroMotionSec BIGINT,
    hrIrregular BOOLEAN,
    pt AS PROCTIME()
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.clinical.vitals-telemetry.v1',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-wearable-job',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true'
);
CREATE TABLE print_fall_sink (
    patientId STRING,
    window_end TIMESTAMP(3),
    reason STRING,
    lat DOUBLE,
    lng DOUBLE
) WITH (
    'connector' = 'print'
);
-- Fall: impact spike (motionMag >= 3.5g) followed by zero-motion >= 60s in a
-- 5-min tumbling window. AFib: irregular rhythm flag in >= 3 frames/window.
INSERT INTO print_fall_sink
SELECT
    patientId,
    TUMBLE_END(pt, INTERVAL '5' MINUTE) AS window_end,
    CASE WHEN MAX(zeroMotionSec) >= 60 AND MAX(motionMag) >= 3.5 THEN 'FALL_SOS' ELSE 'AFIB_WATCH' END AS reason,
    AVG(lat) AS lat,
    AVG(lng) AS lng
FROM wearable_stream
GROUP BY
    patientId,
    TUMBLE(pt, INTERVAL '5' MINUTE)
HAVING (MAX(zeroMotionSec) >= 60 AND MAX(motionMag) >= 3.5)
    OR SUM(CASE WHEN hrIrregular THEN 1 ELSE 0 END) >= 3;
