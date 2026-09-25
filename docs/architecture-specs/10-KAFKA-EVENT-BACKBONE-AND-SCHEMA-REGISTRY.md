# 10 - Apache Kafka Event Backbone & Schema Registry Specification

## 1. Role in the Architecture
Apache Kafka acts as the high-throughput, fault-tolerant event backbone of the FindMedi ecosystem. 
Every state transition across all 5 verticals (bookings, location pings, provider shifts, payment captures, cancellations) is recorded as an immutable, partitioned log entry.

---

## 2. Topic Taxonomy & Partitioning Strategy

All topics follow a standardized hierarchical namespace:
`findmedi.<domain>.<entity>.<version>`

| Topic Name | Partitions | Key | Compaction / Retention | Purpose |
|---|---|---|---|---|
| `findmedi.dispatch.booking-events.v1` | 12 | `bookingId` | Delete (7 Days) | Core lifecycle state transitions for all 5 verticals |
| `findmedi.telemetry.driver-locations.v1` | 32 | `h3_res8` | Delete (12 Hours)| High-frequency GPS updates for live streaming & surge |
| `findmedi.provider.presence.v1` | 8 | `providerId` | Compact | Online/Offline status, active duty shifts |
| `findmedi.billing.payment-events.v1` | 6 | `transactionId` | Delete (30 Days)| Escrow holds, capture confirmations, driver payouts |
| `findmedi.emergency.sos-alerts.v1` | 16 | `h3_res6` | Delete (90 Days)| Code-red emergency panic alerts & hospital telemetry |

### Why Partition by H3 Cell Key for Location?
Partitioning by `h3_res8` guarantees that all GPS updates occurring within the same geographic neighborhood arrive on the **same Kafka partition**. This ensures strict chronological ordering and enables downstream stream workers (Flink) to calculate local surge densities without costly cross-partition shuffling.

---

## 3. Confluent Schema Registry Contracts (Protobuf & Avro)

To prevent breaking changes between event producers and downstream microservices, all Kafka messages enforce strict contracts verified by Schema Registry.

### Sample Protobuf Definition: `BookingEvent.proto`
```protobuf
syntax = "proto3";

package findmedi.dispatch;

enum VerticalType {
  VERTICAL_UNKNOWN = 0;
  VERTICAL_RIDER = 1;
  VERTICAL_LAWYER = 2;
  VERTICAL_ASSISTANT = 3;
  VERTICAL_EMERGENCY_SOS = 4;
  VERTICAL_EMERGENCY_DOCTOR = 5;
}

enum BookingStatus {
  STATUS_UNKNOWN = 0;
  REQUESTED = 1;
  SEARCHING = 2;
  ASSIGNED = 3;
  EN_ROUTE = 4;
  ARRIVED = 5;
  IN_PROGRESS = 6;
  COMPLETED = 7;
  CANCELLED = 8;
}

message Coordinates {
  double latitude = 1;
  double longitude = 2;
  string h3_cell = 3;
}

message BookingEvent {
  string event_id = 1;
  string booking_id = 2;
  VerticalType vertical = 3;
  BookingStatus status = 4;
  string user_id = 5;
  string provider_id = 6;
  Coordinates pickup_location = 7;
  Coordinates destination_location = 8;
  double fare_amount = 9;
  int64 timestamp_epoch_ms = 10;
  string cancellation_reason = 11;
}
```

---

## 4. Producer & Consumer Guarantees
- **Acks = all (`-1`)**: Guarantees zero data loss; the broker will not acknowledge until all in-sync replicas (ISR) have written the event to disk.
- **Idempotent Producers (`enable.idempotence=true`)**: Eliminates duplicate event publishing caused by network retries.
- **Consumer Consumer Groups**:
  - `consumer-group-opensearch-indexer`: Consumes booking events and indexes them for admin search.
  - `consumer-group-pinot-realtime`: Ingests events directly into Pinot real-time segments for operational heatmaps.
  - `consumer-group-notification-worker`: Listens for dispatch failures and sends emergency SMS/IVR backup calls.
  - `consumer-group-hudi-datalake`: Streams data into cold object storage tables.
