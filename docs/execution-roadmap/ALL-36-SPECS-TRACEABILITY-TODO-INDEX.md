# All 36 Specs Complete Traceability & Unified TODO Master Index

This document maps **every single one of the 36 architectural and technical specification files** into an unambiguous Priority, Phase, and Actionable TODO item. **Zero items are omitted.**

---

## 📑 Complete Document Inventory (36 Technical Specifications)

### A. Core Architecture & Dispatch Specifications (`docs/architecture-specs/`)
- `01-SYSTEM-VISION-AND-MASTER-BLUEPRINT.md`
- `02-H3-GEOSPATIAL-INDEXING-AND-VALHALLA-ROUTING.md`
- `03-REALTIME-MATCHING-ENGINE-SPEC.md`
- `04-FULLSCREEN-INCOMING-DISPATCH-ALERT-SPEC.md`
- `05-RIDER-ON-DEMAND-MOBILITY-SPEC.md`
- `06-LAWYER-INSTANT-LEGAL-DISPATCH-SPEC.md`
- `07-ASSISTANT-INSTANT-CARE-DISPATCH-SPEC.md`
- `08-EMERGENCY-SOS-AMBULANCE-DISPATCH-SPEC.md`
- `09-EMERGENCY-DOCTOR-ON-CALL-SPEC.md`
- `10-KAFKA-EVENT-BACKBONE-AND-SCHEMA-REGISTRY.md`
- `11-UFORWARDER-AND-OUTBOX-PATTERN-SPEC.md`
- `12-REDIS-STATE-MACHINE-AND-DISTRIBUTED-LOCKS.md`
- `13-MONGODB-DATA-MODELS-AND-TRANSACTIONS.md`
- `14-FLINK-STREAMING-AND-PINOT-REALTIME-ANALYTICS.md`
- `15-OPENSEARCH-SEARCH-AND-AUDIT-INDEXING.md`
- `16-DATA-LAKE-OBJECT-STORAGE-HUDI-HIVE.md`
- `17-GRL-RATE-LIMITING-AND-INTELLIGENT-LOAD-MANAGEMENT.md`
- `18-SERVICE-MESH-GRPC-AND-HIGH-PERFORMANCE-RUST.md`
- `19-FRONTEND-UI-UX-ANIMATIONS-AND-MAP-COMPONENTS.md`
- `20-DEVELOPER-RULES-DIRECTORY-STRUCTURE-AND-RUNBOOKS.md`
- `21-DEMO-PAYMENT-SYSTEM-AND-SANDBOX-ESCROW.md`
- `22-PLATFORM-COMMISSION-PAYOUT-LEDGER-SPEC.md`
- `23-AI-TRIAGE-AND-CLINICAL-SAFETY-AUDIT-SPEC.md`
- `24-AUTOMATED-PDF-RECEIPTS-AND-THERMAL-PRINTING-SPEC.md`
- `25-REFERRAL-LOYALTY-POINTS-AND-REWARDS-LEDGER.md`
- `26-ABHA-NATIONAL-HEALTH-ID-AND-EHR-CONSENT-SPEC.md`

### B. Tech Stack Expansion Specifications (`docs/tech-stack-expansion/`)
- `01-H3-ACROSS-FINDMEDI-ECOSYSTEM.md`
- `02-VALHALLA-ROUTING-ACROSS-HEALTHCARE.md`
- `03-KAFKA-EVENT-DRIVEN-HEALTHCARE-PIPELINES.md`
- `04-REDIS-DISTRIBUTED-STATE-ACROSS-MODULES.md`
- `05-FLINK-STREAMING-FOR-CLINICAL-AND-IOT-VITALS.md`
- `06-PINOT-REALTIME-ANALYTICS-ACROSS-HEALTH-OPERATIONS.md`
- `07-OPENSEARCH-FOR-MEDICAL-RECORDS-AND-DRUG-DISCOVERY.md`
- `08-DATA-LAKE-HUDI-HIVE-FOR-MEDICAL-AUDITS-AND-RESEARCH.md`
- `09-FULLSCREEN-ALERT-AND-AUDIO-FOR-CRITICAL-HEALTH-EVENTS.md`
- `10-RUST-HIGH-PERFORMANCE-FOR-TELEMETRY-AND-SECURITY.md`

---

## 🎯 Specification-by-Specification Detailed Mapping

---

### [SPEC 01] System Vision & Master Blueprint
- **File**: `docs/architecture-specs/01-SYSTEM-VISION-AND-MASTER-BLUEPRINT.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: System Topology, Multi-Vertical Matrix, Architectural Boundaries.
- **Actionable Developer Tasks**:
  - [x] Enforce the 5 distinct service domain boundaries across backend routes.
  - [x] Verify environment configurations separate transactional storage (Mongo), live state (Redis), and event streaming (Kafka).
  - [x] Implement global health-check endpoint (`/api/v1/health`) testing all backing services.

---

### [SPEC 02] Uber H3 Geospatial Indexing & Valhalla Routing
- **File**: `docs/architecture-specs/02-H3-GEOSPATIAL-INDEXING-AND-VALHALLA-ROUTING.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: H3 Resolutions 6/7/8/9, k-Ring Expansion, Valhalla 1-to-N Matrix.
- **Actionable Developer Tasks**:
  - [ ] In `backend/src/lib/h3Cache.js`, implement multi-resolution indexer:
    - Res 6: SOS Ambulances & Regional Surge.
    - Res 7: Lawyers, Doctors, and Medical Assistants.
    - Res 8: Urban Cab/Auto/Bike Riders.
  - [ ] Connect Valhalla HTTP client (`POST /sources_to_targets`) to sort candidate providers by road arrival time.
  - [ ] Cache decoded route polylines in Redis under `cache:valhalla:route:<originH3>:<destH3>`.

---

### [SPEC 03] Real-Time Matching Engine
- **File**: `docs/architecture-specs/03-REALTIME-MATCHING-ENGINE-SPEC.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: Redlock Concurrency Guard, 3-Tier Cascading Ring Dispatch.
- **Actionable Developer Tasks**:
  - [ ] Implement atomic Redis lock (`SET lock:provider:<id> <bookingId> NX PX 15000`) before sending alert.
  - [ ] Implement cascading fallback: Candidate 1 (15-30s timer) $\to$ Candidate 2 $\to$ k-Ring expansion.
  - [ ] Add socket delivery confirmation packet (`packet_ack`); re-route if ack not received within 2s.

---

### [SPEC 04] Full-Screen Incoming Dispatch Alert & Audio Siren
- **File**: `docs/architecture-specs/04-FULLSCREEN-INCOMING-DISPATCH-ALERT-SPEC.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: Fullscreen Hardware Viewport, Web Audio Oscillator Siren, WakeLock, Vibration.
- **Actionable Developer Tasks**:
  - [ ] Ensure `<ProviderIncomingCall />` is mounted at `z-[99999]` across all 5 provider dashboards.
  - [ ] Connect `frontend/src/utils/alarmAudio.ts` programmatic synthesizer (zero external mp3 dependency):
    - Ambulance/SOS: Dual-frequency siren ($750\text{ Hz} \leftrightarrow 960\text{ Hz}$).
    - Emergency Doctor: Urgent pulse alarm ($880\text{ Hz}$).
    - Rider: Ascending harmonic chime.
    - Lawyer: Telephone double-bell.
    - Assistant: Medical monitor beep.
  - [ ] Request Screen WakeLock on modal mount; trigger looping vibration pattern `[500, 250, 500, 250]`.
  - [ ] Implement animated SVG circular countdown timer.

---

### [SPEC 05] Rider On-Demand Mobility (Cab / Auto / Bike)
- **File**: `docs/architecture-specs/05-RIDER-ON-DEMAND-MOBILITY-SPEC.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 2**
- **Core Components**: `RideBooking.js`, 60fps Marker LERP Glide, 4-Digit Pickup OTP.
- **Actionable Developer Tasks**:
  - [ ] Implement `requestAnimationFrame` vehicle linear interpolation (LERP) on React-Leaflet map.
  - [ ] Enforce 4-digit pickup OTP verification in `backend/src/routes/rides.js` before trip start.
  - [ ] Add 150m geofence validation before driver can trigger `[ ARRIVED AT PICKUP ]`.
  - [ ] Add floating in-ride emergency SOS button on rider map screen.

---

### [SPEC 06] Lawyer Instant Legal Dispatch & Emergency Counsel
- **File**: `docs/architecture-specs/06-LAWYER-INSTANT-LEGAL-DISPATCH-SPEC.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 2**
- **Core Components**: `LawyerBooking.js`, Police Station Dispatch, Retainer Escrow.
- **Actionable Developer Tasks**:
  - [ ] Configure `LEGAL_DISPATCH_ALERT` socket handler in `frontend/src/pages/lawyer/LawyerDashboard.tsx`.
  - [ ] Implement triage inputs: Police Station Name, FIR number, detention status.
  - [ ] Hold demo retainer fee in escrow; auto-release upon legal consultation sign-off.
  - [ ] Add Bar Council license validation check before lawyer can switch online.

---

### [SPEC 07] Medical Assistant Instant Care & Home Nurse Dispatch
- **File**: `docs/architecture-specs/07-ASSISTANT-INSTANT-CARE-DISPATCH-SPEC.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 2**
- **Core Components**: `AssistantBooking.js`, Home Visit Nursing, Digital Vitals Charting.
- **Actionable Developer Tasks**:
  - [ ] Configure `ASSISTANT_DISPATCH_ALERT` socket handler in `frontend/src/pages/assistant/AssistantDashboard.tsx`.
  - [ ] Display patient allergy profile and care protocol (Wound Care / IV / Catheter) on modal.
  - [ ] Add digital bedside nursing chart to log pre-care & post-care vitals (BP, Pulse, SpO2, Temp).
  - [ ] Implement 1-tap tele-physician escalation button if patient vitals deteriorate during home care.

---

### [SPEC 08] Emergency SOS & Advanced Ambulance Dispatch
- **File**: `docs/architecture-specs/08-EMERGENCY-SOS-AMBULANCE-DISPATCH-SPEC.md`
- **Priority**: **P0 (Critical)** | **Phase**: **Phase 2**
- **Core Components**: `EmergencyRequest.js`, BLS/ALS Classifications, Green Corridor Routing.
- **Actionable Developer Tasks**:
  - [ ] Intercept ambulance tablet with blood-red emergency siren modal on `EMERGENCY_AMBULANCE_SIREN`.
  - [ ] Parallel ring top 3 closest ambulances across H3 Resolution 6 cells.
  - [ ] Auto-alert receiving hospital trauma bay with live ambulance telemetry and in-transit vitals.
  - [ ] Implement Valhalla emergency costing profile minimizing sharp turns and traffic signals.

---

### [SPEC 09] Emergency Doctor On-Call & Instant Tele-Triage
- **File**: `docs/architecture-specs/09-EMERGENCY-DOCTOR-ON-CALL-SPEC.md`
- **Priority**: **P0 (Critical)** | **Phase**: **Phase 2**
- **Core Components**: `EmergencyDoctorRequest.js`, 30s Video Triage, Home Doctor Visit.
- **Actionable Developer Tasks**:
  - [ ] Intercept physician screen with `<DoctorIncomingEmergencyModal />` on incoming emergency call.
  - [ ] Enforce statutory medical council licensure & on-call duty affirmation modal before shift starts.
  - [ ] Embed WebRTC encrypted video triage room with digital prescription signing.
  - [ ] Add 1-tap `[ ESCALATE TO ALS AMBULANCE ]` button inside doctor call screen.

---

### [SPEC 10] Apache Kafka Event Backbone & Schema Registry
- **File**: `docs/architecture-specs/10-KAFKA-EVENT-BACKBONE-AND-SCHEMA-REGISTRY.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 3**
- **Core Components**: H3 Topic Partitioning, Schema Registry (Protobuf/Avro), Idempotence.
- **Actionable Developer Tasks**:
  - [ ] Setup Kafka 3.6 cluster with topics: `dispatch.booking-events`, `telemetry.driver-locations`, `emergency.sos-alerts`.
  - [ ] Register `BookingEvent.proto` in Schema Registry.
  - [ ] Partition `telemetry.driver-locations` by `h3_res8` to eliminate cross-partition shuffles.
  - [ ] Set producer settings: `acks=all`, `enable.idempotence=true`.

---

### [SPEC 11] uForwarder Abstraction & Transactional Outbox Pattern
- **File**: `docs/architecture-specs/11-UFORWARDER-AND-OUTBOX-PATTERN-SPEC.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 3**
- **Core Components**: `OutboxEvent.js`, Debezium CDC / Change Streams, Retry & DLQ Hub.
- **Actionable Developer Tasks**:
  - [ ] Wrap all booking updates inside MongoDB multi-document ACID transactions with `OutboxEvent` writes.
  - [ ] Deploy Debezium / Change Stream poller to stream outbox records to Kafka brokers.
  - [ ] Implement EventForwarder daemon with exponential retry queues (5s, 30s) and Dead Letter Queue (DLQ).
  - [ ] Integrate Redis Bloom filter to guarantee 100% idempotent message delivery.

---

### [SPEC 12] Redis State Machine, Ephemeral Caching & Distributed Locks
- **File**: `docs/architecture-specs/12-REDIS-STATE-MACHINE-AND-DISTRIBUTED-LOCKS.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: Ephemeral Key Hierarchy, Redis Streams GPS Buffering, Lua Scripts.
- **Actionable Developer Tasks**:
  - [ ] Implement safe lock release Lua script in `backend/src/lib/redlock.js`.
  - [ ] Configure Redis Stream buffer `stream:telemetry:gps` to absorb 10,000 pings/sec.
  - [ ] Setup Redis cluster replication with automatic failover Sentinel.

---

### [SPEC 13] MongoDB Data Models, Indexing & ACID Transactions
- **File**: `docs/architecture-specs/13-MONGODB-DATA-MODELS-AND-TRANSACTIONS.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: Mongoose Models across 5 Verticals, Compound Indexes, Session Helpers.
- **Actionable Developer Tasks**:
  - [ ] Create `assignProviderAtomically` transaction utility in backend database lib.
  - [ ] Verify compound indexes on `RideBooking`, `EmergencyRequest`, and `OutboxEvent`.
  - [ ] Configure MongoDB Replica Set connection string with `readPreference=secondaryPreferred`.

---

### [SPEC 14] Apache Flink Streaming & Apache Pinot Real-Time OLAP
- **File**: `docs/architecture-specs/14-FLINK-STREAMING-AND-PINOT-REALTIME-ANALYTICS.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 4**
- **Core Components**: Flink SQL Sliding Windows, Dynamic H3 Surge Multipliers, Pinot Tables.
- **Actionable Developer Tasks**:
  - [ ] Deploy Flink streaming job calculating 1-minute tumbling window supply/demand ratio by H3 cell.
  - [ ] Configure Pinot real-time table `emergency_dispatch_metrics` ingesting from Kafka.
  - [ ] Connect SuperAdmin dashboard to Pinot broker for sub-50ms heatmap rendering.

---

### [SPEC 15] OpenSearch Distributed Search & Audit Indexing
- **File**: `docs/architecture-specs/15-OPENSEARCH-SEARCH-AND-AUDIT-INDEXING.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 4**
- **Core Components**: Inverted Indexes, Edge n-Gram Autocomplete, Searchable Audit Logs.
- **Actionable Developer Tasks**:
  - [ ] Create OpenSearch index `findmedi_providers_v1` with typo-tolerant fuzzy analyzer.
  - [ ] Create immutable forensic index `findmedi_audit_logs_v1`.
  - [ ] Build Kafka consumer to index new doctors, lawyers, and audit records asynchronously.

---

### [SPEC 16] Data Lake, Object Storage, Apache Hudi & Apache Hive
- **File**: `docs/architecture-specs/16-DATA-LAKE-OBJECT-STORAGE-HUDI-HIVE.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 5**
- **Core Components**: MinIO / S3 Object Storage, Hudi Merge-on-Read (MoR), Hive Batch SQL.
- **Actionable Developer Tasks**:
  - [ ] Setup bucket `s3://findmedi-data-lake` with Parquet partition layout (`date_partition=YYYY-MM-DD`).
  - [ ] Deploy Apache Hudi DeltaStreamer ingesting cold Kafka telemetry.
  - [ ] Configure Apache Hive / Trino for multi-million row historical tax and audit queries.

---

### [SPEC 17] Global Rate Limiting (GRL) & Intelligent Load Management
- **File**: `docs/architecture-specs/17-GRL-RATE-LIMITING-AND-INTELLIGENT-LOAD-MANAGEMENT.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 4**
- **Core Components**: Redis Token Bucket (Lua), Health-Aware Load Balancer, SOS Bypass.
- **Actionable Developer Tasks**:
  - [ ] Implement Redis sliding-window token bucket Lua script in `backend/src/middleware/rateLimit.js`.
  - [ ] **Strictly bypass all rate-limiting on Emergency SOS Panic endpoints**.
  - [ ] Expose `/health/metrics` reporting event-loop lag and CPU to NGINX load balancer.

---

### [SPEC 18] Service Mesh, gRPC Internal RPC & High-Performance Rust
- **File**: `docs/architecture-specs/18-SERVICE-MESH-GRPC-AND-HIGH-PERFORMANCE-RUST.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 5**
- **Core Components**: `MatchingEngineService.proto`, Rust Tokio GPS Daemon, mTLS.
- **Actionable Developer Tasks**:
  - [ ] Compile Protobuf definitions for internal gRPC service communications.
  - [ ] Build Rust Tokio UDP daemon (`telemetry-ingest-worker`) binding to port 9100.
  - [ ] Benchmarked Rust daemon at $> 120,000$ GPS packets/sec.

---

### [SPEC 19] Frontend UI/UX, Animations, Audio & Map Components
- **File**: `docs/architecture-specs/19-FRONTEND-UI-UX-ANIMATIONS-AND-MAP-COMPONENTS.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: Framer Motion Modals, GSAP Radar Pulses, Lenis Scroll, Leaflet Map.
- **Actionable Developer Tasks**:
  - [ ] Implement Framer Motion spring physics for modal entrance/exit.
  - [ ] Build GSAP looping radar wave sweep for customer waiting screen.
  - [ ] Configure React-Leaflet with MapTiler vector tiles in Canvas mode (`preferCanvas: true`).

---

### [SPEC 20] Developer Rules, Directory Structure & Deployment Runbooks
- **File**: `docs/architecture-specs/20-DEVELOPER-RULES-DIRECTORY-STRUCTURE-AND-RUNBOOKS.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: Golden Engineering Rules, Standard Folder Tree, Docker Compose.
- **Actionable Developer Tasks**:
  - [ ] Align repository structure with standard directory layout.
  - [ ] Setup `infra/docker/docker-compose.yml` for Mongo, Redis, Kafka, and Valhalla.
  - [ ] Verify PM2 cluster configuration for multi-core Node.js execution.

---

### [SPEC 21] Demo Payment System & Sandbox Escrow
- **File**: `docs/architecture-specs/21-DEMO-PAYMENT-SYSTEM-AND-SANDBOX-ESCROW.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 1**
- **Core Components**: `DemoPayment.js`, 1-Click Approve/Decline, Sandbox Escrow, ₹10k Demo Wallet.
- **Actionable Developer Tasks**:
  - [ ] Implement demo payment endpoints (`/confirm`, `/fail`, `/refund`, `/wallet`).
  - [ ] Build `<DemoPaymentCheckoutModal />` with 1-click test buttons.
  - [ ] Emit synthetic `payment.completed` Kafka events on demo transactions to drive analytics.

---

### [SPEC 22] Platform Commission & Payout Ledger
- **File**: `docs/architecture-specs/22-PLATFORM-COMMISSION-PAYOUT-LEDGER-SPEC.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 3**
- **Core Components**: `CommissionConfig.js`, `TransactionLedger.js`, Driver Instant Withdrawal.
- **Actionable Developer Tasks**:
  - [ ] Implement dynamic commission deduction by vertical and category tier.
  - [ ] Record balanced double-entry accounting records for every completed service.
  - [ ] Expose instant demo payout withdrawal endpoint for provider wallets.

---

### [SPEC 23] AI Clinical Triage & Clinical Safety Audit
- **File**: `docs/architecture-specs/23-AI-TRIAGE-AND-CLINICAL-SAFETY-AUDIT-SPEC.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 3**
- **Core Components**: `Triage.js`, `AiSafetyEvent.js`, Red-Flag Keyword Interceptor.
- **Actionable Developer Tasks**:
  - [x] Implement regex/NLP scanner for life-threatening symptoms in AI chat conversations.
  - [x] Auto-lock AI conversation and surface `[ CALL EMERGENCY SOS NOW ]` on red-flag detection (`/api/ai-chat`).
  - [x] Log every safety event into `AiSafetyEvent` collection for clinical audits.

---

### [SPEC 24] Automated PDF Receipts & Thermal Bluetooth Printing
- **File**: `docs/architecture-specs/24-AUTOMATED-PDF-RECEIPTS-AND-THERMAL-PRINTING-SPEC.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 5**
- **Core Components**: `napiPdfService.js`, GST SAC Codes, ESC/POS 80mm Thermal Stream.
- **Actionable Developer Tasks**:
  - [x] Add GST tax breakdown (CGST+SGST / IGST) to ride and consult PDF invoices.
  - [x] Embed cryptographic verification QR code on PDF receipts.
  - [x] Implement ESC/POS raw byte stream generator for driver Bluetooth thermal printers (`/api/ride/:id/thermal-receipt`).

---

### [SPEC 25] Referral Engine & Gamified Loyalty Ledger
- **File**: `docs/architecture-specs/25-REFERRAL-LOYALTY-POINTS-AND-REWARDS-LEDGER.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 5**
- **Core Components**: `LoyaltyLedger.js`, `LoyaltyEarnRule.js`, Anti-Fraud Self-Referral Ring.
- **Actionable Developer Tasks**:
  - [x] Award points for completed rides (10 pts / ₹100) and blood donations (500 pts).
  - [x] Implement IP and device fingerprint check to prevent synthetic referral fraud.
  - [x] Build reward redemption catalog in patient/rider dashboard.

---

### [SPEC 26] ABHA National Health ID & EHR Consent
- **File**: `docs/architecture-specs/26-ABHA-NATIONAL-HEALTH-ID-AND-EHR-CONSENT-SPEC.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 5**
- **Core Components**: `healthId.js`, Aadhaar/Mobile OTP, ABDM Cryptographic Consent Manager.
- **Actionable Developer Tasks**:
  - [x] Connect with ABDM sandbox gateway for 14-digit ABHA creation (`/abha/generate-otp`, `/abha/verify-otp`).
  - [x] Generate digital ABHA health card with QR code token.
  - [x] Build patient consent prompt interface for granting time-bounded EHR record access (`/consent-request`, `/consent-response`).

---

### [TECH EXP 01] Uber H3 Across Blood Banks, Beds & Pharmacies
- **File**: `docs/tech-stack-expansion/01-H3-ACROSS-FINDMEDI-ECOSYSTEM.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 3**
- **Core Components**: Rare Blood Donor Search (Res 7), Hospital ICU Rollups (Res 6), Epidemic Hotspots.
- **Actionable Developer Tasks**:
  - [x] Index certified rare blood donors into Redis H3 Resolution 7 sets (`/api/bloodbank/donors/nearby-h3`).
  - [x] Aggregate hospital ICU bed counts into Resolution 6 parent hexagons.
  - [x] Build 15-minute hyper-local pharmacy inventory search on Resolution 8 cells.

---

### [TECH EXP 02] Valhalla Routing Across Healthcare Logistics
- **File**: `docs/tech-stack-expansion/02-VALHALLA-ROUTING-ACROSS-HEALTHCARE.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 3**
- **Core Components**: Cold-Chain Vaccine Transit Budgets, Multi-Stop Pharmacy TSP, Hospital Isochrones.
- **Actionable Developer Tasks**:
  - [x] Call Valhalla `/optimized_route` for multi-stop pharmacy medicine deliveries (`/api/delivery/optimize-route`).
  - [x] Call Valhalla `/isochrone` to visualize 10/15/20 min hospital reachability zones (`getIsochrone` in `valhallaRouting.js`).
  - [x] Enforce max 45-minute temperature-safe transit limits on cold-chain biologics.

---

### [TECH EXP 03] Kafka Event Pipelines for Lab Orders & Chronic Care
- **File**: `docs/tech-stack-expansion/03-KAFKA-EVENT-DRIVEN-HEALTHCARE-PIPELINES.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 3**
- **Core Components**: Lab Order Lifecycle, Chronic Care Vitals Telemetry, Pharmacy Stockouts.
- **Actionable Developer Tasks**:
  - [x] Implement Kafka topic `findmedi.diagnostics.lab-order-events.v1` & emitters in `backend/src/lib/kafkaProducer.js`.
  - [x] Stream patient vitals from smart BP monitors into `findmedi.clinical.vitals-telemetry.v1`.
  - [x] Auto-trigger purchase orders when pharmacy stock dips below reorder points.

---

### [TECH EXP 04] Redis Distributed State for Beds & Blood Units
- **File**: `docs/tech-stack-expansion/04-REDIS-DISTRIBUTED-STATE-ACROSS-MODULES.md`
- **Priority**: **P0 (Immediate)** | **Phase**: **Phase 2**
- **Core Components**: Bed Reservation Redlocks, Rare Blood Unit Atomic Reservations, Video Queues.
- **Actionable Developer Tasks**:
  - [x] Implement 5-minute atomic bed holding lock: `lock:hospital:bed:<bedId>` (`/api/beds/:id/hold-lock`).
  - [x] Atomic decrement of rare blood units using Redis `DECRBY`.
  - [x] Synchronize telemedicine patient waiting lobby via Redis Sorted Sets (`ZADD`).

---

### [TECH EXP 05] Flink Streaming for Clinical Monitoring & IoT Vitals
- **File**: `docs/tech-stack-expansion/05-FLINK-STREAMING-FOR-CLINICAL-AND-IOT-VITALS.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 4**
- **Core Components**: Early Sepsis MEWS Score Windows, Smartwatch Fall Detection, Cold-Chain Alerts.
- **Actionable Developer Tasks**:
  - [x] Stream patient vitals through Flink tumbling/sliding windows calculating MEWS scores (`findmedi.clinical.vitals-telemetry.v1`).
  - [x] Alert Rapid Response Team if MEWS score spikes $\ge 3$ points within 90 minutes.
  - [x] Detect pharmacy refrigerator thermal drift exceeding $8^\circ\text{C}$ for $> 15\text{ minutes}$.

---

### [TECH EXP 06] Pinot Real-Time OLAP Across Healthcare Operations
- **File**: `docs/tech-stack-expansion/06-PINOT-REALTIME-ANALYTICS-ACROSS-HEALTH-OPERATIONS.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 4**
- **Core Components**: Hospital Bed/OT Cockpit, Prescription Shortage Heatmaps, Doctor SLA Analytics.
- **Actionable Developer Tasks**:
  - [x] Connect Chief Medical Officer dashboard to Pinot for live ICU occupancy & ER wait times (`infra/docker-compose.yml`).
  - [x] Ingest pharmacy dispensing logs into Pinot to detect emergent localized flu outbreaks.
  - [x] Track p95/p99 doctor emergency response times.

---

### [TECH EXP 07] OpenSearch for Medical Records & Drug Discovery
- **File**: `docs/tech-stack-expansion/07-OPENSEARCH-FOR-MEDICAL-RECORDS-AND-DRUG-DISCOVERY.md`
- **Priority**: **P1 (High)** | **Phase**: **Phase 4**
- **Core Components**: Generic Drug Substitutes, Typo-Tolerant Specialty Search, OCR EHR Search.
- **Actionable Developer Tasks**:
  - [x] Map pharmaceutical trade names to active drug molecules (APIs) and therapeutic classes.
  - [x] Enable instant generic bio-equivalent substitutes ranking in $< 15\text{ ms}$.
  - [x] Index schema created for instant doctor/provider search and audit lookups (`data-platform/opensearch/mappings/`).

---

### [TECH EXP 08] Data Lake Hudi/Hive for Medical Audits & Research
- **File**: `docs/tech-stack-expansion/08-DATA-LAKE-HUDI-HIVE-FOR-MEDICAL-AUDITS-AND-RESEARCH.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 5**
- **Core Components**: Insurance Claim Fraud Detection, Longitudinal Clinical Cohorts, WORM Audits.
- **Actionable Developer Tasks**:
  - [x] Configure Parquet partition schema joining hospital billing with lab timestamps (`08-DATA-LAKE-HUDI-HIVE-FOR-MEDICAL-AUDITS-AND-RESEARCH.md`).
  - [x] Support anonymized multi-year clinical research cohorts.
  - [x] Implement WORM (Write Once, Read Many) compliance for forensic malpractice logs.

---

### [TECH EXP 09] Full-Screen Alerts for Critical Clinical Events
- **File**: `docs/tech-stack-expansion/09-FULLSCREEN-ALERT-AND-AUDIO-FOR-CRITICAL-HEALTH-EVENTS.md`
- **Priority**: **P0 (Critical)** | **Phase**: **Phase 2**
- **Core Components**: Hospital Code Blue Cardiac Arrest, STAT Lab Panic Alerts, MTP Blood Requisitions.
- **Actionable Developer Tasks**:
  - [x] Intercept ICU and resuscitation team tablets with full-screen flashing blue Code Blue modal & audio (`code_blue` burst in `emergencyRing.ts`).
  - [x] Intercept ordering physician's dashboard on lethal critical lab values (`lab_panic` 880Hz alert tone).
  - [x] Intercept blood bank technician terminal on Massive Transfusion Protocol (MTP) orders.

---

### [TECH EXP 10] Rust High-Performance Workers for Telemetry & PHI
- **File**: `docs/tech-stack-expansion/10-RUST-HIGH-PERFORMANCE-FOR-TELEMETRY-AND-SECURITY.md`
- **Priority**: **P2 (Medium)** | **Phase**: **Phase 5**
- **Core Components**: Field-Level Envelope Encryption (AES-256-GCM), IoT UDP Daemon, Fast DICOM Stripping.
- **Actionable Developer Tasks**:
  - [x] Build Rust native worker for hardware-accelerated field-level encryption of sensitive health data (`infra/rust-telemetry`).
  - [x] Deploy lightweight Tokio UDP daemon for ICU IoT monitor vitals streaming ($< 5\text{ MB}$ RAM).
  - [x] Parse and strip Protected Health Information (PHI) metadata tags from binary telemetry.

---

## 🏁 Summary: 100% Coverage Verification
Every single concept, technology, and architectural responsibility from the master blueprint and tech expansion suite is now accounted for with a clear Priority (P0, P1, P2), execution Phase (1 through 6), and concrete engineering tasks.
