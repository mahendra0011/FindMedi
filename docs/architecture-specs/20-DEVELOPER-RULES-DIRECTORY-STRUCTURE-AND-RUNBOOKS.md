# 20 - Developer Rules, Directory Structure & Deployment Runbooks

## 1. Absolute Developer Rules & Engineering Standards

1. **Zero Dual-Write Rule**: Never call `Kafka.emit()` or external webhooks inside an API controller without persisting an `OutboxEvent` inside the MongoDB database transaction.
2. **Never Query MongoDB for GPS Traces**: Live driver locations MUST be read from and written to Redis H3 sets; never run `$near` or `geoNear` queries against MongoDB in real-time dispatch loops.
3. **Mandatory Fullscreen Alert**: Every incoming booking alert presented to a provider (Rider, Lawyer, Nurse, Ambulance, Doctor) MUST be rendered through `<ProviderIncomingCall />` with Web Audio synthesizer playback and WakeLock. Normal toast banners are strictly forbidden for dispatch offers.
4. **Idempotency Everywhere**: All mutating dispatch endpoints (`/accept`, `/reject`, `/cancel`, `/pay`) must enforce an `Idempotency-Key` HTTP header verified in Redis.
5. **Clean Interface Separation**: Do not mix analytical queries with operational database pools. All dashboard heatmaps must query Apache Pinot / OpenSearch; operational routes query MongoDB.

---

## 2. Standardized Repository Directory Structure

```
Findmedi/
├── docs/
│   ├── dashboard-audit/             # Existing audits
│   └── architecture-specs/          # Master 20 specifications (01 - 20)
│
├── frontend/
│   ├── src/
│   │   ├── app/                     # App shell, router, providers, store
│   │   ├── components/
│   │   │   ├── ui/                  # Radix + Tailwind components
│   │   │   ├── emergency/           # ProviderIncomingCall, DoctorIncomingEmergencyModal
│   │   │   └── maps/                # LeafletMap, LiveMarker, PolylineRoute
│   │   ├── features/
│   │   │   ├── rider/               # Rider state, booking form, driver radar
│   │   │   ├── lawyer/              # Legal dispatch, incident forms
│   │   │   ├── assistant/           # Home care nursing, vitals chart
│   │   │   ├── emergency/           # Panic SOS button, triage selector
│   │   │   └── doctor/              # On-call doctor queue, tele-triage
│   │   ├── hooks/                   # useGeolocation, useSocket, useValhallaRoute
│   │   ├── utils/                   # alarmAudio.ts, h3Helper.ts, turfDistance.ts
│   │   └── pages/                   # Role-based dashboards (Rider, Lawyer, Clinic, etc.)
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/                  # env, db, redis, kafka, valhalla
│   │   ├── models/                  # 99+ Mongoose models (RideBooking, EmergencyRequest, etc.)
│   │   ├── modules/
│   │   │   ├── matching/            # H3 k-ring discovery, Valhalla matrix ranking
│   │   │   ├── dispatch/            # Cascading ring state machine
│   │   │   ├── location/            # Redis H3 binning, telemetry buffer
│   │   │   ├── outbox/              # Outbox poller and publisher
│   │   │   └── billing/             # Razorpay escrow and settlement
│   │   ├── sockets/                 # Socket.IO connection handlers & rooms
│   │   ├── middleware/              # Auth, GRL rate limiting, validation
│   │   └── server.js
│   └── package.json
│
├── data-platform/
│   ├── flink/                       # Streaming jobs (surge calculation, telemetry)
│   ├── pinot/                       # Table schemas and configs
│   ├── opensearch/                  # Index mappings and analyzers
│   └── hudi/                        # Ingestion configs
│
└── infra/
    ├── docker/                      # Docker Compose (Mongo, Redis, Kafka, Valhalla, Pinot)
    ├── nginx/                       # NGINX reverse proxy & load balancer config
    └── scripts/                     # Seeders and health-check scripts
```

---

## 3. Environment Variables Template (`.env.example`)

```env
# Application Core
PORT=5000
NODE_ENV=production
JWT_SECRET=super_secure_jwt_token_secret_key_32_bytes

# Databases
MONGO_URI=mongodb://mongo1:27017,mongo2:27018,mongo3:27019/findmedi?replicaSet=rs0
REDIS_URL=redis://redis-cluster:6379

# Kafka & Schema Registry
KAFKA_BOOTSTRAP_SERVERS=kafka-1:9092,kafka-2:9092
SCHEMA_REGISTRY_URL=http://schema-registry:8081

# Geospatial & Routing
VALHALLA_API_URL=http://valhalla-router:8002
MAPTILER_API_KEY=your_maptiler_api_key_here

# Payment & Cloud Storage (Demo Mode Active)
PAYMENT_PROVIDER=demo
DEMO_WALLET_INITIAL_BALANCE=10000
CLOUDINARY_URL=cloudinary://key:secret@cloud_name

# Real-Time Analytics & Search
OPENSEARCH_NODE=http://opensearch:9200
PINOT_BROKER_URL=http://pinot-broker:8099
```

---

## 4. Operational Deployment Runbook

### Step 1: Start In-Memory & Event Infrastructure
```bash
docker compose -f infra/docker/docker-compose.yml up -d mongo redis kafka schema-registry valhalla
```

### Step 2: Initialize MongoDB Replica Set & Outbox Tailer
```bash
docker exec -it mongo1 mongosh --eval "rs.initiate()"
npm run init:outbox-streams
```

### Step 3: Run Database Migrations & H3 Indexes
```bash
npm run migrate:h3-indices
```

### Step 4: Launch Flink & Pinot Analytics Pipelines
```bash
docker compose -f infra/docker/docker-compose.yml up -d flink-jobmanager pinot-controller opensearch
```

### Step 5: Start Application Cluster & Socket Nodes Behind NGINX
```bash
pm2 start backend/src/server.js -i max --name "findmedi-core"
nginx -s reload
```
