-- Epoch-based surge: reads the envelope timestamp (BIGINT millis, no string
-- parsing) + payload h3_cell. Matches the app producer's real envelope shape
-- {eventId, timestampEpochMs, topic, key, payload{...}}.
CREATE TABLE booking_requests_stream (
    eventId STRING,
    timestampEpochMs BIGINT,
    topic STRING,
    `key` STRING,
    payload ROW<bookingId STRING, vertical STRING, status STRING, h3_cell STRING>,
    event_time AS TO_TIMESTAMP_LTZ(timestampEpochMs, 3),
    WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.dispatch.booking-events.v1',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-surge-epoch',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true',
    'json.map-null-key.mode' = 'DROP'
);
CREATE TABLE print_surge_epoch (
    h3_cell STRING,
    window_end TIMESTAMP(3),
    booking_count BIGINT,
    surge_multiplier DOUBLE
) WITH (
    'connector' = 'print'
);
INSERT INTO print_surge_epoch
SELECT payload.h3_cell, TUMBLE_END(event_time, INTERVAL '1' MINUTE), COUNT(*),
    CASE WHEN COUNT(*) > 50 THEN 1.8 WHEN COUNT(*) > 25 THEN 1.4 ELSE 1.0 END
FROM booking_requests_stream
WHERE payload.h3_cell IS NOT NULL
GROUP BY payload.h3_cell, TUMBLE(event_time, INTERVAL '1' MINUTE);
