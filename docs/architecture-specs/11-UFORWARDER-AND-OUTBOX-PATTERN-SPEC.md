# 11 - uForwarder Abstraction & Transactional Outbox Pattern Specification

## 1. Problem Statement: Dual-Write Hazard
When an API updates the primary database (MongoDB) and attempts to immediately emit an event to Apache Kafka, a partial failure is inevitable:
- If MongoDB commits but the Kafka cluster is temporarily unreachable, the event is **lost forever**, leading to phantom state discrepancies in downstream analytics and notifications.
- If Kafka succeeds but MongoDB transaction rolls back due to a constraint error, downstream services process a **ghost event** that does not exist in the database.

---

## 2. The Transactional Outbox Pattern

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT HTTP REQUEST                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               EXPRESS REST API ENDPOINT                │
│                                                        │
│  START MONGODB SESSION TRANSACTION:                    │
│    1. Insert/Update Core Entity (e.g. `RideBooking`)   │
│    2. Insert matching row into `OutboxEvent` collection│
│  COMMIT TRANSACTION (Atomic ACID Guarantee)            │
└───────────────────────────┬────────────────────────────┘
                            │
              MongoDB Storage (`outboxEvents`)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                DEBEZIUM CDC / POLLER                   │
│   Reads MongoDB Change Stream / Tail on `outboxEvents` │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                     APACHE KAFKA                       │
│    Strictly ordered, durable message log broker        │
└────────────────────────────────────────────────────────┘
```

---

## 3. MongoDB Outbox Collection Schema: `OutboxEvent.js`

```typescript
interface IOutboxEvent {
  _id: ObjectId;
  aggregateType: 'RIDE' | 'LAWYER' | 'ASSISTANT' | 'EMERGENCY_SOS' | 'PAYMENT';
  aggregateId: string; // The Booking ID or Transaction ID
  eventType: string;   // e.g. "ride.assigned", "emergency.dispatched"
  payload: Record<string, any>; // JSON representation matching Schema Registry contract
  destinationTopic: string;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  publishedAt?: Date;
}
```

---

## 4. uForwarder Architectural Abstraction

In Uber's global architecture, **uForwarder** decouples consumer logic from Kafka brokers by acting as a high-performance proxy that handles fetch, batching, rate-limiting, and dead-letter retries.

### FindMedi EventForwarder Responsibilities:
1. **Adaptive Pull & Batching**: Pulls messages from Kafka topics in micro-batches (e.g. 50 events or $20\text{ ms}$) to minimize network roundtrips.
2. **Backpressure Propagation**: Monitors downstream service worker CPU and HTTP queue depth; if workers slow down, EventForwarder pauses consumption on that specific partition.
3. **Cascading Retry Queues (Exponential Backoff)**:
   - Primary Failure $\to$ Forward to `findmedi.retry.5s`
   - Secondary Failure $\to$ Forward to `findmedi.retry.30s`
   - Final Failure $\to$ Forward to `findmedi.dlq` (Dead Letter Queue) + Alert Sentry.
4. **Idempotent Delivery Gate**: Verifies `eventId` against a 24-hour Redis Bloom filter or SET to guarantee that redelivered Kafka messages do not trigger duplicate SMS or duplicate wallet deductions.

```
 [ Kafka Topic ] ──► [ EventForwarder Gateway ] ──► [ Downstream Consumers ]
                              │                              │ (Error)
                              ├──► [ 5s Retry Topic ] ───────┤
                              │                              │ (Repeated Error)
                              ├──► [ 30s Retry Topic ] ──────┘
                              │
                              └──► [ Dead Letter Queue (DLQ) ] ──► Sentry / Ops Alert
```
