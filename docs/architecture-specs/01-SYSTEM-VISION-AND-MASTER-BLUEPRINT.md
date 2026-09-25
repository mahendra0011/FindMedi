# 01 - System Vision & Master Blueprint (Uber-Inspired Multi-Vertical Architecture)

## 1. Executive Summary & Vision
FindMedi is expanding from a static healthcare portal into a hyper-responsive, high-throughput on-demand matching ecosystem serving **10,000+ concurrent active users** across 5 instant dispatch verticals:
1. **Rider (Cab / Bike / Auto Rides)**: Dynamic on-demand micro-mobility.
2. **Lawyer (Instant Legal Counsel)**: Urgent legal representation, bail, detention, and notary services.
3. **Medical Assistant (Home Healthcare / Bedside Care)**: Instant nurse, paramedic, and physiotherapist home dispatch.
4. **Emergency SOS (Ambulance / Trauma)**: Code-red patient rescue and hospital triage routing.
5. **Emergency Doctor (Instant On-Demand Doctor)**: Urgent telemedicine or physical home-visit physician consultation.

Unlike conventional apps with passive notifications, all 5 verticals share a single architectural discipline: **Uber-inspired hexagonal spatial indexing (H3), sub-second Redis candidate scoring, Valhalla turn-by-turn road matrices, and full-screen incoming modal alerts with audio sirens.**

---

## 2. Core Architectural Principles
- **No Delayed Requests**: Every request triggers a synchronized multi-stage ring dispatch to eligible providers within radial H3 hexagons.
- **Full-Screen Provider Interception**: Providers do not receive background push toasts; they receive a locking full-screen takeover modal with sound alarm and countdown timer (similar to Uber Driver / 911 dispatch).
- **Zero Google Maps Dependency**: 100% powered by OpenStreetMap, MapTiler vector tiles, Valhalla routing engine, and Uber H3 spatial math.
- **Strict Data Segregation**:
  - **MongoDB**: Authoritative transactional system of record (ACID session transactions).
  - **Redis Cluster**: Volatile live spatial state, active ride locks, rate limiting, and driver tracking.
  - **Apache Kafka + Schema Registry**: Immutable event backbone for cross-service publishing.
  - **Apache Flink + Apache Pinot**: Sub-second analytical aggregations and operational heatmaps.
  - **OpenSearch**: Distributed full-text fuzzy search for drivers, lawyers, records, and audit events.
  - **Hudi + Hive + Object Storage**: Analytical data lake for cold historical records.

---

## 3. High-Level Master Architecture Diagram

```
                              ┌────────────────────────────────────────┐
                              │             CLIENT LAYER               │
                              │  (Patient / Rider / Provider / Admin)  │
                              └───────────────────┬────────────────────┘
                                                  │ HTTPS / WSS
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │               EDGE LAYER               │
                              │        NGINX Reverse Proxy + TLS       │
                              │  Global Rate Limiting (GRL-style)     │
                              │  Intelligent Load Balancer             │
                              └───────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
   ┌───────────────────────────┐                                     ┌───────────────────────────┐
   │      REST / gRPC API      │                                     │     SOCKET.IO CLUSTER     │
   │  Node.js Express Monolith │                                     │  Sticky Sessions / Redis  │
   └─────────────┬─────────────┘                                     └─────────────┬─────────────┘
                 │                                                                 │
                 ├───────────────────────────────┬─────────────────────────────────┤
                 ▼                               ▼                                 ▼
   ┌───────────────────────────┐   ┌───────────────────────────┐     ┌───────────────────────────┐
   │     MONGODB (PRIMARY)     │   │      REDIS IN-MEMORY      │     │      APACHE KAFKA         │
   │  Authoritative State      │   │  H3 Geospatial Index      │     │  Event Streaming Spine    │
   │  Outbox Pattern Events    │   │  Distributed Locks        │     │  Schema Registry Enforced │
   └─────────────┬─────────────┘   └───────────────────────────┘     └─────────────┬─────────────┘
                 │                                                                 │
                 └─────────────── Outbox Poller / Debezium ────────────────────────┘
                                                                                   │
                 ┌─────────────────────────────────────────────────────────────────┼──────────────────────────────┐
                 ▼                                                                 ▼                              ▼
   ┌───────────────────────────┐                                     ┌───────────────────────────┐  ┌───────────────────────────┐
   │    uForwarder Gateway     │                                     │    APACHE FLINK STREAM    │  │       OPENSEARCH          │
   │  Retry & Dead-Letter Hub  │                                     │  Real-Time Window Joins   │  │  Fuzzy Records & Logs     │
   └─────────────┬─────────────┘                                     └─────────────┬─────────────┘  └───────────────────────────┘
                 ▼                                                                 ▼
   ┌───────────────────────────┐                                     ┌───────────────────────────┐
   │ Downstream Service Mesh   │                                     │       APACHE PINOT        │
   │ Push/SMS/Webhook Workers  │                                     │  Sub-Second Analytics OLAP│
   └───────────────────────────┘                                     └───────────────────────────┘
```

---

## 4. Multi-Vertical Matrix Comparison

| Feature Dimension | 1. Rider (Mobility) | 2. Lawyer (Legal) | 3. Assistant (Nurse/Care) | 4. Emergency SOS | 5. Emergency Doctor |
|---|---|---|---|---|---|
| **Trigger Method** | Ride Booking Form | SOS / Instant Call | Home Care Booking | One-tap Panic Button | Instant Doctor SOS |
| **Max Response Window**| 15 - 30 seconds | 60 - 90 seconds | 60 - 120 seconds | 10 - 20 seconds (CRITICAL)| 30 - 45 seconds |
| **Provider Notification**| Fullscreen Modal + Beep| Fullscreen Legal Call| Fullscreen Medical Alert| Fullscreen Siren (Force Audio)| Fullscreen Siren + Triage |
| **Spatial Radius** | 3 km - 10 km (H3 Res 8)| 5 km - 25 km (H3 Res 7)| 5 km - 15 km (H3 Res 7)| 15 km - 30 km (H3 Res 6)| 10 km - 20 km (H3 Res 7)|
| **Route Requirement** | Valhalla Driving | Optional (Consult/Drive)| Valhalla Driving | Valhalla Emergency Siren Route| Valhalla or WebRTC Link |
| **Payment Locking** | Demo Wallet / Mock UPI| Demo Retainer Escrow   | Demo Visit Escrow       | Post-care or Free SOS       | Instant Demo Pre-auth   |

---

## 5. Technology Blueprint Matrix
- **Frontend Core**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, Radix UI.
- **State Management**: Redux Toolkit (app cache & live socket slice), TanStack React Query v5.
- **Geographic UI**: Leaflet, React-Leaflet, MapTiler vector tiles, Turf.js calculations.
- **Realtime**: Socket.IO Client v4 with binary ack packets & audio synthesis alerts.
- **Animations**: Framer Motion (modal entrance & drawer swipes), GSAP (dispatch radar radar circles), Lenis (smooth inertia scrolling).
- **Backend Application**: Node.js v20+, Express.js, TypeScript/ESM modules, Mongoose 8.
- **High-Performance Extensions**: Rust micro-worker for high-frequency GPS ingestion and H3 cell binning.
- **Data Stores**:
  - MongoDB 7.0 Replica Set (Read preferences: secondaryPreferred for queries, primary for outbox).
  - Redis 7.2 (Redlock for concurrent matching, Redis Streams for location buffer).
  - Kafka 3.6 (Confluent Schema Registry with Protobuf / Avro payloads).
- **Routing Engine**: Valhalla self-hosted routing engine with custom dynamic speed profiles.

---

## 6. End-to-End Execution Flow (Universal Life-Cycle)
1. **Creation**: User dispatches request with coordinates `(lat, lng)`, vertical enum, and metadata.
2. **Ingestion & Outbox**: Express validates token, calculates preliminary fare/fee, writes `Booking` record + `OutboxEvent` inside a MongoDB session transaction.
3. **Hexagonal Candidate Discovery**:
   - Coordinate converted to H3 index at resolution 7 or 8.
   - Redis `k-ring` cell query grabs active, online, eligible providers in milliseconds.
4. **Valhalla Matrix Filtering**: Shortlisted candidates ranked by estimated road arrival duration (not straight-line Haversine).
5. **Full-Screen Cascading Dispatch**:
   - Best candidate socket receives `DISPATCH_RING` payload.
   - Provider device opens high-priority full-screen incoming modal, triggers looped Web Audio ringtone / siren, and initiates countdown timer.
6. **Acceptance or Re-Route**:
   - If accepted within timeout: Redis Redlock acquired, booking state updated to `ASSIGNED`, socket room established, live GPS polyline generated.
   - If rejected / timed out: Redis moves to next best ranked candidate from the H3 ring without creating new database records.
