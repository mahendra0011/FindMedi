# Master Phased Roadmap & Priority Matrix (Uber-Inspired FindMedi Architecture)

## 1. Executive Priority Matrix (MoSCoW / P0 - P2 Framework)

| Priority Level | Classification | Definition | Target Core Components |
|---|---|---|---|
| **P0 (CRITICAL)** | Must Have Immediately | The foundational pillars without which the instant on-demand platform cannot function. Zero double-booking, sub-second dispatch, full-screen hardware alert modal, and life-safety SOS. | H3 Indexing, Redis State & Redlock, Valhalla Matrix, Full-Screen Modal (`ProviderIncomingCall`), Demo Payment Engine, MongoDB Outbox. |
| **P1 (HIGH)** | Should Have Next | Production stability, high-throughput event processing, asynchronous decoupling, real-time analytics, and legal/commission workflows. | Apache Kafka + Schema Registry, uForwarder EventForwarder, Flink Stream Processing, Apache Pinot Real-Time OLAP, OpenSearch Fuzzy Records. |
| **P2 (MEDIUM)** | Nice to Have / Scaling | Ultra-high scale optimization, petabyte-scale historical storage, native micro-workers, and national health integration. | Apache Hudi Data Lake, Apache Hive SQL, Rust GPS Ingestion Worker, Service Mesh mTLS, ABHA Health ID. |

---

## 2. Phase-by-Phase Master Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: CORE REALTIME DISPATCH & FULL-SCREEN ALERTING (P0 - WEEKS 1 - 2)   │
│ - Redis H3 Cell Binning (Res 6, 7, 8) & k-Ring Candidate Discovery         │
│ - Valhalla 1-to-N Road Matrix Ranking Engine                                │
│ - Full-Screen Modal (`ProviderIncomingCall.tsx`) with Web Audio Siren       │
│ - Redlock Distributed Locking (Zero Double-Booking)                         │
│ - Demo Payment Sandbox (1-Click Approve / Decline & Virtual Wallet)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: MULTI-VERTICAL FLOW CONVERGENCE (P0 - WEEKS 3 - 4)                 │
│ - Vertical 1: Rider (Cab/Auto/Bike, 60fps LERP glide, 4-digit OTP)         │
│ - Vertical 2: Emergency SOS (Ambulance trauma routing, green corridor)      │
│ - Vertical 3: Emergency Doctor (30s video triage & home visit)              │
│ - Vertical 4: Lawyer (Police detention, accident bail, retainer escrow)     │
│ - Vertical 5: Medical Assistant (Home nurse, IV infusion, vitals chart)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: EVENT STREAMING & TRANSACTIONAL INTEGRITY (P1 - WEEKS 5 - 6)       │
│ - MongoDB Transactional Outbox Pattern & Debezium CDC Tailer                │
│ - Apache Kafka 3.6 Event Spine + Schema Registry (Protobuf Contracts)       │
│ - uForwarder-style EventForwarder (Adaptive batching, 5s/30s retry, DLQ)    │
│ - Double-Entry Commission & Payout Ledger (`TransactionLedger.js`)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: REAL-TIME ANALYTICS & FUZZY SEARCH (P1 - WEEKS 7 - 8)              │
│ - Apache Flink Streaming (1-min sliding windows, dynamic H3 surge density)  │
│ - Apache Pinot Real-Time OLAP (Sub-50ms SuperAdmin heatmaps & metrics)      │
│ - OpenSearch Cluster (Typo-tolerant provider autocomplete & audit logs)     │
│ - Global Rate Limiting (GRL-style Redis sliding-window token bucket)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: DATA LAKE, HIGH-PERFORMANCE RUST & SECURITY (P2 - WEEKS 9 - 10)    │
│ - Cold Data Lake: MinIO/S3 + Apache Hudi (MoR/CoW) + Apache Hive batch SQL  │
│ - High-Performance Rust Daemon for binary GPS ingestion (>120k packets/sec) │
│ - ABHA National Health ID integration via Aadhaar/Mobile OTP & Consent mgr  │
│ - Automated PDF invoices & ESC/POS 80mm Bluetooth thermal printing          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: PRODUCTION HA, CANARY TESTING & LOAD BENCHMARKING (WEEKS 11 - 12)  │
│ - Multi-AZ MongoDB Replica Set & Redis Sentinel / Cluster Failover Tests    │
│ - Chaos Engineering: Simulate node kills during active ride dispatch        │
│ - End-to-End Load Testing: 10,000 simulated concurrent riders & drivers     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Phase Deliverables & Architecture Traceability

### Phase 1: Core Realtime Dispatch & Full-Screen Alerts (P0)
- **Goal**: Transform passive database queries into sub-millisecond in-memory dispatch with phone-ringing visual/audio alerts.
- **Reference Specs**:
  - [02-H3-GEOSPATIAL-INDEXING-AND-VALHALLA-ROUTING.md](file:///d:/projects/Findmedi/docs/architecture-specs/02-H3-GEOSPATIAL-INDEXING-AND-VALHALLA-ROUTING.md)
  - [03-REALTIME-MATCHING-ENGINE-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/03-REALTIME-MATCHING-ENGINE-SPEC.md)
  - [04-FULLSCREEN-INCOMING-DISPATCH-ALERT-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/04-FULLSCREEN-INCOMING-DISPATCH-ALERT-SPEC.md)
  - [12-REDIS-STATE-MACHINE-AND-DISTRIBUTED-LOCKS.md](file:///d:/projects/Findmedi/docs/architecture-specs/12-REDIS-STATE-MACHINE-AND-DISTRIBUTED-LOCKS.md)
  - [21-DEMO-PAYMENT-SYSTEM-AND-SANDBOX-ESCROW.md](file:///d:/projects/Findmedi/docs/architecture-specs/21-DEMO-PAYMENT-SYSTEM-AND-SANDBOX-ESCROW.md)
- **Key Deliverable**: A rider clicks "Book Ride" $\to$ within 800ms, the closest online driver's screen locks into a full-screen ringing alert modal with a 15s timer.

### Phase 2: Multi-Vertical Convergence (P0)
- **Goal**: Standardize the dispatch engine across all 5 specialized on-demand services.
- **Reference Specs**:
  - [05-RIDER-ON-DEMAND-MOBILITY-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/05-RIDER-ON-DEMAND-MOBILITY-SPEC.md)
  - [06-LAWYER-INSTANT-LEGAL-DISPATCH-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/06-LAWYER-INSTANT-LEGAL-DISPATCH-SPEC.md)
  - [07-ASSISTANT-INSTANT-CARE-DISPATCH-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/07-ASSISTANT-INSTANT-CARE-DISPATCH-SPEC.md)
  - [08-EMERGENCY-SOS-AMBULANCE-DISPATCH-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/08-EMERGENCY-SOS-AMBULANCE-DISPATCH-SPEC.md)
  - [09-EMERGENCY-DOCTOR-ON-CALL-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/09-EMERGENCY-DOCTOR-ON-CALL-SPEC.md)
- **Key Deliverable**: All 5 provider dashboards (Rider, Lawyer, Assistant, Delivery/Ambulance, Clinic) listen to unified socket dispatch alerts and display service-specific metadata.

### Phase 3: Event Streaming & Financial Ledger (P1)
- **Goal**: Eliminate dual-write data hazards and establish immutable audit logging and commission splitting.
- **Reference Specs**:
  - [10-KAFKA-EVENT-BACKBONE-AND-SCHEMA-REGISTRY.md](file:///d:/projects/Findmedi/docs/architecture-specs/10-KAFKA-EVENT-BACKBONE-AND-SCHEMA-REGISTRY.md)
  - [11-UFORWARDER-AND-OUTBOX-PATTERN-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/11-UFORWARDER-AND-OUTBOX-PATTERN-SPEC.md)
  - [22-PLATFORM-COMMISSION-PAYOUT-LEDGER-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/22-PLATFORM-COMMISSION-PAYOUT-LEDGER-SPEC.md)
- **Key Deliverable**: Every completed ride or consult atomically writes to MongoDB Outbox and streams to Kafka with Schema Registry validation.

### Phase 4: Real-Time Stream Analytics & Fuzzy Search (P1)
- **Goal**: Provide sub-50ms operational visibility and typo-tolerant search across all entities.
- **Reference Specs**:
  - [14-FLINK-STREAMING-AND-PINOT-REALTIME-ANALYTICS.md](file:///d:/projects/Findmedi/docs/architecture-specs/14-FLINK-STREAMING-AND-PINOT-REALTIME-ANALYTICS.md)
  - [15-OPENSEARCH-SEARCH-AND-AUDIT-INDEXING.md](file:///d:/projects/Findmedi/docs/architecture-specs/15-OPENSEARCH-SEARCH-AND-AUDIT-INDEXING.md)
  - [17-GRL-RATE-LIMITING-AND-INTELLIGENT-LOAD-MANAGEMENT.md](file:///d:/projects/Findmedi/docs/architecture-specs/17-GRL-RATE-LIMITING-AND-INTELLIGENT-LOAD-MANAGEMENT.md)
- **Key Deliverable**: SuperAdmin dashboard renders real-time H3 hexagonal surge heatmaps and handles 10,000 requests/sec with GRL rate limiting.

### Phase 5: Cold Data Lake & Advanced Services (P2)
- **Goal**: Offload cold historical telemetry and establish national regulatory compliance.
- **Reference Specs**:
  - [16-DATA-LAKE-OBJECT-STORAGE-HUDI-HIVE.md](file:///d:/projects/Findmedi/docs/architecture-specs/16-DATA-LAKE-OBJECT-STORAGE-HUDI-HIVE.md)
  - [18-SERVICE-MESH-GRPC-AND-HIGH-PERFORMANCE-RUST.md](file:///d:/projects/Findmedi/docs/architecture-specs/18-SERVICE-MESH-GRPC-AND-HIGH-PERFORMANCE-RUST.md)
  - [24-AUTOMATED-PDF-RECEIPTS-AND-THERMAL-PRINTING-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/24-AUTOMATED-PDF-RECEIPTS-AND-THERMAL-PRINTING-SPEC.md)
  - [25-REFERRAL-LOYALTY-POINTS-AND-REWARDS-LEDGER.md](file:///d:/projects/Findmedi/docs/architecture-specs/25-REFERRAL-LOYALTY-POINTS-AND-REWARDS-LEDGER.md)
  - [26-ABHA-NATIONAL-HEALTH-ID-AND-EHR-CONSENT-SPEC.md](file:///d:/projects/Findmedi/docs/architecture-specs/26-ABHA-NATIONAL-HEALTH-ID-AND-EHR-CONSENT-SPEC.md)
- **Key Deliverable**: Historical parquet queries in Hive, sub-millisecond Rust GPS ingestion, and 1-click ABHA card creation.

---

## 4. Phase Exit Criteria & Quality Gates
1. **Zero Double Booking**: 100 concurrent booking attempts for the same single driver must result in exactly 1 success and 99 clean re-routes.
2. **Audio/Modal Reliability**: 100% of dispatch alerts must trigger visual full-screen modal and Web Audio oscillator sound without asset 404 errors.
3. **P95 Matching Latency**: Initial candidate ring dispatch must execute in under $1.2\text{ seconds}$ from customer click.
4. **Data Consistency**: Zero discrepancy between MongoDB operational balance and double-entry transaction ledger balances.
