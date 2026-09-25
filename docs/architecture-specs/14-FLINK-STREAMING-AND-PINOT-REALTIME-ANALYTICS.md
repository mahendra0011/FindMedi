# 14 - Apache Flink Stream Processing & Apache Pinot Real-Time OLAP

## 1. Architectural Role
Operational dashboards (Live Admin Map, Emergency Dispatch Oversight, Surge Pricing Engine) require sub-second analytics over millions of events without degrading MongoDB operational read/write performance.
- **Apache Flink**: Computes stateful rolling aggregations, sliding time windows, and event enrichment over Kafka streams.
- **Apache Pinot**: Real-time distributed columnar OLAP datastore capable of executing SQL aggregation queries in under $50\text{ ms}$.

---

## 2. Stream Processing Pipeline

```
                             KAFKA EVENT LOGS
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │    APACHE FLINK ENGINE    │
                      │  Stateful Stream Compute  │
                      └─────────────┬─────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
     [ 1-Minute Sliding Window ]            [ Event Stream Enrichment ]
   - H3 Cell Supply vs Demand ratio       - Join Booking with Driver Profile
   - Unfulfilled SOS requests per min     - Calculate live trip speed/deviation
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │       APACHE PINOT        │
                      │ Real-Time Columnar Engine │
                      └─────────────┬─────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │  SUPERADMIN LIVE COCKPIT  │
                      │  Heatmaps, Surge, Audits  │
                      └───────────────────────────┘
```

---

## 3. Apache Flink Real-Time Job Definitions

### Job 1: Dynamic Surge & Demand Density by H3 Cell
```sql
-- Flink SQL: Rolling 5-minute demand vs supply calculation per H3 cell
CREATE TABLE booking_requests_stream (
    bookingId STRING,
    vertical STRING,
    h3_cell STRING,
    event_time TIMESTAMP(3),
    WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'findmedi.dispatch.booking-events.v1',
    'properties.bootstrap.servers' = 'kafka:9092',
    'format' = 'json'
);

CREATE TABLE pinot_surge_sink (
    h3_cell STRING,
    window_end TIMESTAMP(3),
    booking_count BIGINT,
    surge_multiplier DOUBLE
) WITH (
    'connector' = 'pinot',
    ...
);

INSERT INTO pinot_surge_sink
SELECT 
    h3_cell,
    TUMBLE_END(event_time, INTERVAL '1' MINUTE) as window_end,
    COUNT(bookingId) as booking_count,
    CASE 
        WHEN COUNT(bookingId) > 50 THEN 1.8
        WHEN COUNT(bookingId) > 25 THEN 1.4
        ELSE 1.0
    END as surge_multiplier
FROM booking_requests_stream
GROUP BY 
    h3_cell, 
    TUMBLE(event_time, INTERVAL '1' MINUTE);
```

---

## 4. Apache Pinot Table Architecture

### Real-Time Table: `emergency_dispatch_metrics`
Configured to ingest directly from Kafka with hybrid segments (in-memory consuming segments + immutable on-disk columnar segments).

```json
{
  "tableName": "emergency_dispatch_metrics",
  "tableType": "REALTIME",
  "segmentsConfig": {
    "timeColumnName": "timestamp_epoch_ms",
    "replication": "3"
  },
  "tableIndexConfig": {
    "invertedIndexColumns": ["vertical", "severityLevel", "status", "h3_res6"],
    "bloomFilterColumns": ["bookingId", "providerId"]
  },
  "dataSource": {
    "streamConfigs": {
      "streamType": "kafka",
      "stream.kafka.topic.name": "findmedi.dispatch.booking-events.v1",
      "stream.kafka.broker.list": "kafka:9092"
    }
  }
}
```

### SuperAdmin Dashboard Query Example (Executes in < 25ms):
```sql
SELECT 
    h3_res6, 
    COUNT(*) as total_alerts, 
    AVG(response_time_seconds) as avg_response_time,
    COUNT(CASE WHEN status = 'MISSED' THEN 1 END) as missed_calls
FROM emergency_dispatch_metrics
WHERE timestamp_epoch_ms > (NOW() - 3600000) -- Past 1 hour
GROUP BY h3_res6
ORDER BY total_alerts DESC
LIMIT 50;
```
