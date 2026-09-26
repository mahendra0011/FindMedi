-- DEBUG ONLY: no windows, no watermarks. If rows print here, parsing
-- works and the issue is window/watermark semantics.
CREATE TABLE booking_requests_stream (
    bookingId STRING,
    vertical STRING,
    h3_cell STRING,
    event_time STRING
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.dispatch.booking-events.v1',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-debug-passthrough',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true'
);
CREATE TABLE print_debug (
    bookingId STRING,
    vertical STRING,
    h3_cell STRING,
    event_time STRING
) WITH (
    'connector' = 'print'
);
INSERT INTO print_debug
SELECT bookingId, vertical, h3_cell, event_time FROM booking_requests_stream;
