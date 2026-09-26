-- Live proof job: same surge logic as surge_job.sql, print sink
-- (Pinot JDBC sink needs a driver jar; swap back when wired).
-- Submit: docker exec -d findmedi-flink-jobmanager ./bin/sql-client.sh -f /opt/surge_live.sql

CREATE TABLE booking_requests_stream (
    bookingId STRING,
    vertical STRING,
    h3_cell STRING,
    event_time_str STRING,
    event_time AS TO_TIMESTAMP(event_time_str, 'yyyy-MM-dd HH:mm:ss.SSS'),
    WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
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
    TUMBLE_END(event_time, INTERVAL '1' MINUTE) AS window_end,
    COUNT(bookingId) AS booking_count,
    CASE
        WHEN COUNT(bookingId) > 50 THEN 1.8
        WHEN COUNT(bookingId) > 25 THEN 1.4
        ELSE 1.0
    END AS surge_multiplier
FROM booking_requests_stream
GROUP BY
    h3_cell,
    TUMBLE(event_time, INTERVAL '1' MINUTE);
