# Sprint TODO Checklist & Actionable Engineering Tasks

This actionable checklist breaks down all 6 implementation phases into direct developer tasks across the frontend and backend codebase.

---

## 🚀 PHASE 1: CORE REALTIME DISPATCH & FULLSCREEN ALERTS (P0 - IMMEDIATE)

### 1.1 Redis In-Memory Geospatial & H3 Engine
- [x] Refactor `backend/src/lib/h3Cache.js` to support multi-resolution binning (Res 6 for SOS, Res 7 for Lawyer/Doctor/Assistant, Res 8 for Rider).
- [x] Implement Redis Key schema: `geo:h3:<resolution>:<cell>:<vertical>` (legacy `hex:providers` compat retained).
- [x] Add TTL auto-expiry (120s) to active provider keys to purge stale GPS devices.
- [ ] Connect `backend/src/services/socketService.js` location pings (`rider_location_update`, `doctor_location_update`) directly to Redis H3 Sets, bypassing MongoDB on every ping.

### 1.2 Valhalla Routing & Road Matrix Integration
- [x] Create `backend/src/config/valhalla.js` HTTP/gRPC client pointing to Valhalla service (`http://valhalla-router:8002`).
- [x] Implement `get1toNMatrix(pickupCoord, candidateCoords[])` returning road durations sorted ascending.
- [x] Implement Haversine straight-line distance fallback in `backend/src/lib/geoUtils.js` if Valhalla times out (> 1500ms).
- [x] Cache decoded route polylines in Redis under `cache:valhalla:route:<originH3>:<destH3>`.

### 1.3 Redlock Distributed Locking & Matching Engine
- [x] Install / configure `ioredis` Redlock helper in `backend/src/lib/redlock.js`.
- [x] Implement atomic provider lock: `SET lock:provider:<providerId> <bookingId> NX PX 15000`.
- [x] Implement cascading dispatch queue in `backend/src/services/instantDispatchService.js`:
  - Ring 0-1 dispatch (Closest candidate, 15-30s timer).
  - On timeout / decline: Auto-cascade to Candidate #2 without resetting customer booking state.

### 1.4 Full-Screen Incoming Alert Modal (`ProviderIncomingCall.tsx`)
- [x] Verify `frontend/src/components/emergency/ProviderIncomingCall.tsx` renders full-screen viewport (`fixed inset-0 z-[99999]`).
- [ ] Connect `frontend/src/utils/alarmAudio.ts` Web Audio API oscillator synthesis:
  - Rider: Ascending chime tone.
  - Lawyer: Telephone double-bell.
  - Nurse/Assistant: Medical monitor tone.
  - Emergency SOS / Doctor: Dual-frequency siren ($750\text{ Hz} \leftrightarrow 960\text{ Hz}$).
- [x] Add Screen Wake Lock API (`navigator.wakeLock.request('screen')`) on modal mount.
- [x] Add Hardware Haptic Vibration (`navigator.vibrate([500, 250, 500, 250])`).
- [x] Add animated circular SVG countdown timer (12s to 60s).

### 1.5 Demo Payment Sandbox System
- [x] Verify `backend/src/models/DemoPayment.js` and `backend/src/routes/demoPayment.js`.
- [x] Implement 1-click Demo Success / Failure endpoints:
  - `POST /api/v1/demo-payments/confirm` (Simulates instant approval & releases escrow).
  - `POST /api/v1/demo-payments/fail` (Tests retry & cancellation states).
- [x] Create frontend `<DemoPaymentCheckoutModal />` with instant virtual wallet balance (₹10,000 sandbox credit).

---

## ⚡ PHASE 2: MULTI-VERTICAL CONVERGENCE (P0 - WEEKS 3 - 4)

### 2.1 Rider On-Demand Mobility Flow
- [x] In `frontend/src/pages/rider/RiderDashboard.tsx`:
  - Ensure `<ProviderIncomingCall />` pops on incoming ride socket event.
  - Implement 60fps Linear Interpolation (LERP) for driver vehicle marker on Leaflet map.
  - Enforce 4-digit pickup OTP verification before driver can transition ride to `IN_PROGRESS`.
- [x] In `backend/src/routes/rides.js`:
  - Add geofence arrival check (Driver must be within 150m of pickup coordinates to press `[ ARRIVED ]`).

### 2.2 Emergency SOS Ambulance Flow
- [x] In `frontend/src/pages/delivery/DeliveryDashboard.tsx` & ambulance fleet apps:
  - Intercept driver tablet with blood-red emergency siren modal on `EMERGENCY_AMBULANCE_SIREN`.
  - Display patient age, chief complaint (Cardiac/Trauma/Stroke), and triage code.
  - Render Valhalla green-corridor emergency route avoiding traffic bottlenecks.
- [x] In `backend/src/services/emergencyDispatchService.js`:
  - Parallel dispatch to 3 closest ambulances within H3 Resolution 6 cells.
  - Trauma-desk pre-alert + green corridor fire on assignment (timeout-triggered escalation pending).
  - [ ] Auto-escalate to nearest hospital trauma ER desk if unaccepted within 12 seconds.

### 2.3 Emergency Doctor On-Call Flow
- [x] In `frontend/src/pages/clinic/ClinicDashboard.tsx`:
  - Ensure `<DoctorIncomingEmergencyModal />` intercepts physician dashboard on incoming SOS.
  - Add mandatory statutory licensure affirmation toggle before doctor goes on-call.
  - Video-room session issuance done (`POST /:id/room`); real-time media path pending.
  - [ ] Embed WebRTC high-definition encrypted video link for instant 30s tele-triage.
  - Add 1-tap `[ ESCALATE TO ALS AMBULANCE ]` button inside consultation window.

### 2.4 Lawyer Instant Legal Dispatch Flow
- [x] In `frontend/src/pages/lawyer/LawyerDashboard.tsx`:
  - Intercept advocate screen on `LEGAL_DISPATCH_ALERT` with executive telephone ring.
  - Display incident brief: Police Station name, FIR number, detention status.
  - Hold demo retainer fee in escrow (`/:id/hold-retainer`); release via `/confirm` (auto-release on sign-off pending).

### 2.5 Medical Assistant Home Healthcare Flow
- [x] In `frontend/src/pages/assistant/AssistantDashboard.tsx`:
  - Intercept nurse screen on `ASSISTANT_DISPATCH_ALERT`.
  - Display care type (Wound Care / IV Infusion / Catheter) and patient allergy profile.
  - Vitals logging API done (`POST/GET /:id/vitals`); in-app vitals chart UI pending.
  - [ ] Embed digital nursing chart for logging pre-care & post-care vitals (BP, Pulse, SpO2).

---

## 📡 PHASE 3: EVENT STREAMING & TRANSACTIONAL OUTBOX (P1 - WEEKS 5 - 6)

### 3.1 MongoDB Transactional Outbox Pattern
- [ ] Refactor booking state updates in Express routes to use `mongoose.startSession()` ACID transactions.
- [ ] Ensure every booking status change writes an atomic record to `OutboxEvent` collection.
- [ ] Configure MongoDB Change Streams / Debezium CDC worker to tail `outboxEvents` and stream to Kafka.

### 3.2 Apache Kafka & Schema Registry Contracts
- [ ] Setup Kafka 3.6 cluster with topics:
  - `findmedi.dispatch.booking-events.v1` (12 partitions, key = `bookingId`).
  - `findmedi.telemetry.driver-locations.v1` (32 partitions, key = `h3_res8`).
  - `findmedi.emergency.sos-alerts.v1` (16 partitions, key = `h3_res6`).
- [ ] Register Protobuf / Avro schemas with Confluent Schema Registry contracts.
- [ ] Enforce producer idempotence (`enable.idempotence=true`) and strict acknowledgment (`acks=all`).

### 3.3 uForwarder EventForwarder Gateway
- [x] Implement `EventForwarder` Node.js daemon consuming Kafka events in adaptive micro-batches (`outboxPollerService.js`).
- [ ] Implement exponential backoff retry queues (`findmedi.retry.5s` $\to$ `findmedi.retry.30s` $\to$ `findmedi.dlq`).
- [x] Connect Redis deduplication to drop duplicate redelivered event IDs.

### 3.4 Double-Entry Commission & Payout Ledger
- [x] Implement dynamic commission calculator in `backend/src/services/ledgerService.js` based on `CommissionConfig.js`.
- [x] Record balanced double-entry debits and credits in `TransactionLedger.js` for every ride/consultation.
- [x] Provide instant demo payout withdrawal endpoint for driver/nurse virtual wallets (`backend/src/routes/transactions.js`).

---

## 📊 PHASE 4: REALTIME ANALYTICS & FUZZY SEARCH (P1 - WEEKS 7 - 8)

### 4.1 Apache Flink Streaming Analytics
- [ ] Create Flink SQL streaming job definitions reading `findmedi.dispatch.booking-events.v1`.
- [ ] Compute 1-minute sliding window aggregations for supply vs. demand per H3 cell.
- [ ] Emit dynamic surge multiplier output to Apache Pinot sink.

### 4.2 Apache Pinot Real-Time OLAP Tables
- [ ] Configure Pinot real-time table `emergency_dispatch_metrics` streaming directly from Kafka.
- [ ] Connect SuperAdmin Dashboard cockpit to query Pinot SQL endpoints for sub-50ms operational heatmaps.

### 4.3 OpenSearch Distributed Search Cluster
- [ ] Setup OpenSearch indices: `findmedi_providers_v1` and `findmedi_audit_logs_v1`.
- [x] Implement edge n-gram autocomplete analyzer for doctor specialties and generic medicine names.
- [x] Integrate typo-tolerant fuzzy search mappings in `data-platform/opensearch/mappings/`.

### 4.4 Global Rate Limiting (GRL-style)
- [x] Implement Redis sliding-window token bucket in `backend/src/middleware/rateLimit.js`.
- [x] Enforce strict rate limits on OTP login (5 req/min) and booking creation (10 req/min).
- [x] **Bypass all rate-limiting on Emergency SOS Panic endpoints**.

---

## 💾 PHASE 5: DATA LAKE, RUST WORKERS & COMPLIANCE (P2 - WEEKS 9 - 10)

### 5.1 Cold Data Lake (Hudi + Hive + Object Storage)
- [ ] Define object storage schema for `findmedi-data-lake`.
- [ ] Deploy Apache Hudi DeltaStreamer specifications ingesting raw Kafka telemetry into parquet Merge-on-Read (MoR) tables.
- [ ] Configure Apache Hive / Trino schemas for multi-million row historical tax audit queries.

### 5.2 High-Performance Rust Micro-Workers
- [x] Build lean Rust Tokio UDP/gRPC daemon (`infra/rust-telemetry`) for binary GPS parsing.
- [x] Bind native `h3o` Rust crate configuration for sub-microsecond H3 cell binning.
- [ ] Forward binned GPS batches to Redis and Kafka at $>120,000$ packets/sec.

### 5.3 Automated Invoices & Thermal Bluetooth Printing
- [x] Enhance `backend/src/services/billPdfService.js` and `rideReceiptService.js` with India GST tax breakdowns and verification QR codes.
- [x] Expose ESC/POS 80mm thermal raw byte stream endpoint for mobile Bluetooth receipt printers.

### 5.4 ABHA National Health ID & EHR Consent
- [x] Connect `backend/src/routes/healthId.js` with ABDM sandbox gateway flow (`/abha/generate-otp` & `/abha/verify-otp`).
- [x] Implement Aadhaar/Mobile OTP verification flow and mint digital ABHA card with QR token.
- [x] Implement cryptographic consent manager for patient electronic health record sharing (`/consent-request` & `/consent-response`).

---

## 🛡️ PHASE 6: PRODUCTION RESILIENCE & BENCHMARKING (WEEKS 11 - 12)

- [ ] Test MongoDB 3-node Replica Set automatic primary failover during active dispatch.
- [ ] Benchmark Redis cluster under 50,000 simulated GPS pings/sec.
- [ ] Run end-to-end chaos engineering tests (simulate sudden network drop on driver tablet during full-screen alert).
- [ ] Run Vitest suite (`frontend/scripts/run-vitest.cjs`) and Supertest backend integration tests.
