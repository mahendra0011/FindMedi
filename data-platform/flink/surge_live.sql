-- LIVE-PROVEN surge job (verified 2026-09-26: windowed rows emitted).
-- Uses processing-time tumbling windows: correct for per-minute demand-rate
-- surge at dev scale. NOTE: event-time variant (TIMESTAMP column +
-- watermark) yields zero rows in this Flink 1.18 + kafka-connector 3.0.2
-- setup — JSON string->TIMESTAMP appears to drop records (even ISO-8601).
-- Revisit event-time if exactly-once historical replay is ever required.
-- Submit: docker exec -d findmedi-flink-jobmanager ./bin/sql-client.sh -f /opt/surge_live.sql
SET 'execution.checkpointing.interval' = '15s';
CREATE TABLE booking_requests_stream (
    bookingId STRING,
    vertical STRING,
    h3_cell STRING,
    event_time STRING,
    pt AS PROCTIME()
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.dispatch.booking-events.v1',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-surge-job',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true'
);
CREATE TABLE print_surge_sink (
    h3_cell STRING,
    window_end TIMESTAMP(3),
    booking_count BIGINT,
    surge_multiplier DOUBLE
) WITH (
    'connector' = 'print'
);
INSERT INTO print_surge_sink
SELECT
    h3_cell,
    TUMBLE_END(pt, INTERVAL '1' MINUTE) AS window_end,
    COUNT(bookingId) AS booking_count,
    CASE
        WHEN COUNT(bookingId) > 50 THEN 1.8
        WHEN COUNT(bookingId) > 25 THEN 1.4
        ELSE 1.0
    END AS surge_multiplier
FROM booking_requests_stream
GROUP BY
    h3_cell,
    TUMBLE(pt, INTERVAL '1' MINUTE);
