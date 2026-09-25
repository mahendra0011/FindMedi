-- Variant: earliest-offset replay + 10s checkpoints (debugging aid).
-- Same surge logic as surge_live.sql; replays topic history on submit.
SET execution.checkpointing.interval = 10s;
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
    'properties.group.id' = 'flink-surge-job2',
    'scan.startup.mode' = 'earliest-offset',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true',
    'json.timestamp-format.standard' = 'SQL'
);
CREATE TABLE print_surge_sink2 (
    h3_cell STRING,
    window_end TIMESTAMP(3),
    booking_count BIGINT,
    surge_multiplier DOUBLE
) WITH (
    'connector' = 'print'
);
INSERT INTO print_surge_sink2
SELECT h3_cell, TUMBLE_END(event_time, INTERVAL '1' MINUTE), COUNT(bookingId),
    CASE WHEN COUNT(bookingId) > 50 THEN 1.8 WHEN COUNT(bookingId) > 25 THEN 1.4 ELSE 1.0 END
FROM booking_requests_stream
GROUP BY h3_cell, TUMBLE(event_time, INTERVAL '1' MINUTE);
