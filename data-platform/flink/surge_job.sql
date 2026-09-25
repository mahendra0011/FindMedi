-- Spec 14, Job 1: Dynamic Surge & Demand Density by H3 Cell
-- Submit via: docker exec findmedi-flink-jobmanager ./bin/sql-client.sh -f /opt/surge_job.sql
-- (Mount data-platform/flink into the jobmanager to run.)

CREATE TABLE booking_requests_stream (
    bookingId STRING,
    vertical STRING,
    h3_cell STRING,
    event_time TIMESTAMP(3),
    WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.dispatch.booking-events.v1',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-surge-job',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json'
);

CREATE TABLE pinot_surge_sink (
    h3_cell STRING,
    window_end TIMESTAMP(3),
    booking_count BIGINT,
    surge_multiplier DOUBLE
) WITH (
    'connector' = 'jdbc',
    'url' = 'jdbc:pinot://pinot-controller:9000',
    'table-name' = 'surge_by_cell'
);

INSERT INTO pinot_surge_sink
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
