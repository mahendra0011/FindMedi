# FindMedi — Architecture & System Overview

> Comprehensive architecture specification reflecting the actual codebase implementation.

---

## 1. System Topology

FindMedi is structured into two primary application directories plus documentation:
- `frontend/` — Single Page Application (SPA) built with React and Vite.
- `backend/` — REST & Realtime API built with Node.js, Express, MongoDB, and Socket.IO.
- `docs/` — System documentation, guides, and architectural notes.

---

## 2. Frontend Architecture (`/frontend`)

### Technology Stack
| Layer | Tech |
|---|---|
| Runtime / Bundler | Vite 6 |
| Framework | React 18 |
| Language | TypeScript 5 |
| Routing | `react-router-dom` v6 (`HashRouter` with `React.lazy()` code-splitting) |
| Styling | Tailwind CSS + Radix UI primitives + shadcn-style component library |
| Animation | GSAP (`@gsap/react`) + Framer Motion |
| State Management | Redux Toolkit (`@reduxjs/toolkit`) + React Context API |
| HTTP Client | Axios (`src/lib/api.ts`) with automatic bearer token injection |
| Real-time | Socket.IO Client 4.8 (`src/lib/socket.ts`) |
| Form Handling | `react-hook-form` + `@hookform/resolvers` + Zod |

### Directory Structure
```
frontend/src/
├── components/           # Reusable UI components & layouts
│   ├── ui/               # shadcn/ui primitives (Button, Dialog, Badge, etc.)
│   ├── vehicle/          # RideMap, VehicleTypeSelector, RideStatusPanel
│   ├── assistant/        # Medical Assistant cards and booking modals
│   ├── lawyer/           # Medico-Legal lawyer components
│   ├── calls/            # Audio & Video call overlays
│   ├── DashboardLayout.tsx
│   └── PublicLayout.tsx
├── context/              # Context providers (AuthContext, CityContext, CartContext, etc.)
├── pages/                # Lazy-loaded page components organized by role/domain
│   ├── rider/            # RiderDashboard, RiderProfile
│   ├── patient/          # PatientRides, PatientAppointments, PatientPrescriptions
│   ├── doctor/           # DoctorDashboard, DoctorAppointments
│   ├── hospital/         # HospitalDashboard, IPD, Beds, OperationTheatre
│   ├── admin/            # Superadmin & Admin management screens
│   ├── pharmacy/         # PharmacyDashboard, MedicineStore
│   ├── FindVehicle.tsx   # Consumer ride & ambulance booking
│   ├── BookAssistant.tsx # Medical assistant directory & booking
│   └── FindLawyer.tsx    # Medico-legal advocate directory & booking
├── store/                # Redux store and slices (authSlice, settingsSlice, etc.)
├── lib/                  # Utilities, API client (api.ts), socket connector (socket.ts)
└── App.tsx               # Application routing table with lazy-loaded routes and ProtectedRoute
```

### Routing & Code Splitting
- Routes are registered in [App.tsx](file:///d:/projects/Findmedi/frontend/src/App.tsx) using `react-router-dom`.
- Every page is asynchronously imported via `React.lazy(() => import('./pages/...'))` and wrapped in `<Suspense>`, ensuring optimal initial bundle load time.
- Access control is governed by `<ProtectedRoute>` which validates user authentication, verification status, and role-based onboarding approvals.

---

## 3. Backend Architecture (`/backend`)

### Technology Stack
| Layer | Tech |
|---|---|
| Runtime | Node.js (>=20.0.0, ECMAScript Modules) |
| Web Framework | Express 4.21 |
| Database | MongoDB with Mongoose 8.8 (ODM) |
| Real-time | Socket.IO 4.8 with Redis adapter support |
| In-Memory Cache | Redis 6 (`redis` client) |
| Authentication | JWT (`jsonwebtoken`) + `bcryptjs` + HTTP-only cookies |
| Validation | Zod schemas (`src/utils/validate.js`) |
| Media Storage | Cloudinary + Multer + Sharp |
| PDF & Reports | PDFKit, ExcelJS, json2csv |
| Security | Helmet, Express Rate Limit, Mongo Sanitize, XSS filters |
| Logging | Winston logger + Morgan HTTP logging |
| Native Accelerator | `rust-helper/` (napi-rs Rust crate for CPU-intensive ops) |

### Directory Structure
```
backend/src/
├── config/               # Database, Redis, Logger, and Environment configurations
├── middleware/           # Auth (JWT verification), Rate Limiting, Error handling, CSRF
├── models/               # 70+ Mongoose models (RideBooking, RiderProfile, User, etc.)
├── routes/               # Modular Express API routers mounted under /api/*
│   ├── rides.js          # Ride & ambulance booking, acceptance, status updates
│   ├── riders.js         # Driver profile, online/offline status, GPS location updates
│   ├── emergency.js      # Hospital emergency intake and inpatient ER management
│   ├── demoPayment.js    # Demo wallet & payment simulation
│   └── ...
├── services/             # Core business logic
│   ├── rideService.js    # Nearest-first dispatch, real speed ETA, socket broadcasting
│   ├── socketService.js  # Socket.IO connection rooms & namespaces (/ride, /chat)
│   ├── demoSeedService.js# Demo database seeding for all roles
│   └── ...
├── utils/                # ID generators, date helpers, validation schemas
└── index.js              # Application entry point and server bootstrap
```

### Rust Native Accelerator (`backend/rust-helper/`)
- Crate built with `napi-rs` for performance-critical operations: image resizing, CSV generation, OTP hash computation, and invoice PDF rendering.
- **Resilient Fallback Pattern**: Every native method is guarded by a `NATIVE_*_AVAILABLE` check. If the native `.node` binary is not compiled for the host OS/architecture, the server transparently falls back to pure JavaScript implementations without crashing.

---

## 4. Ride & Ambulance Dispatch System

FindMedi features a production-ready **Nearest-Vehicle-First Geospatial Dispatch** engine in [rideService.js](file:///d:/projects/Findmedi/backend/src/services/rideService.js):

```
User creates ride/ambulance request
              ↓
  estimateETA() calculates realistic arrival time from road distance & vehicle speed
              ↓
  dispatchSequentially() triggers tiered nearest-vehicle dispatch
              ↓
  $geoNear aggregation queries RiderProfile collection using 2dsphere index
  (Filters online & active drivers within radiusKm, sorted nearest first)
              ↓
  Socket.IO emits 'new_ride_request' with riderDistanceKm & priorityRank
              ↓
  Driver accepts ride → Atomic findOneAndUpdate locks the ride
  (Others receive 'ride_taken' event; if no accept, search radius escalates)
```

### Key Technical Characteristics
1. **Geospatial Indexing**: `RiderProfile.currentLocation.coordinates` has an active `2dsphere` index. Queries use `$geoNear` to return drivers sorted nearest-first.
2. **Speed-Based Physical ETA**:
   - Bike: 35 km/h
   - Ambulance: 45 km/h (priority emergency speed)
   - Car / Auto / Van: 30 km/h
   - Formula: `Math.max(2, Math.round((distanceKm / speedKmh) * 60) + 1)`
3. **Sequential Escalation**:
   - Standard rides search in radii of `[5, 10, 20, 40]` km with 15s driver response windows.
   - Urgent ambulance requests search in radii of `[15, 30, 50]` km in parallel batches of 3 drivers with 10s windows.
   - If no drivers accept within the maximum radius, the status transitions gracefully to `no_riders_found`.
4. **Race-Condition Safety**: Driver acceptance uses MongoDB's atomic `findOneAndUpdate({ _id: rideId, status: 'searching' }, { status: 'accepted', ... })`. Exactly one driver can win the race condition.

---

## 5. Domain Distinction: Emergency Intake vs Ambulance Booking

> [!IMPORTANT]
> To avoid naming confusion across models and services:
> - **Hospital ER Intake (`models/Emergency.js` & `routes/emergency.js`)**: Tracks clinical emergency room admissions once a patient is admitted to a healthcare facility (severity classification, doctor assignment, triage, and bed allocation).
> - **Ambulance Booking (`models/RideBooking.js` & `services/rideService.js`)**: Handles consumer emergency transport dispatch (`vehicleType: 'ambulance'`, `isEmergency: true`) using rapid geospatial matching and priority alerts.

---

## 6. Payment Architecture: Current Demo vs Production Gateway

- **Current Prototype Implementation**: [demoPayment.js](file:///d:/projects/Findmedi/backend/src/routes/demoPayment.js) provides a simulated demo payment experience. It logs `DemoPayment` transactions, manages platform commission splits, and credits simulated wallet balances.
- **Production Gateway Integration Path**:
  - Integration with **Razorpay** / **Stripe**.
  - Server-side webhook listeners with cryptographic signature validation (`POST /api/payment/webhook`).
  - Idempotency key tracking in `TransactionLedger` to avoid duplicate charges.
  - Automated refund pipelines for cancelled rides and appointments.

---

## 7. Testing & Verification

- Backend unit & integration tests run via Jest:
  ```powershell
  npm test --prefix d:\projects\Findmedi\backend
  ```
  Test suites cover authentication, health, appointments, billing, prescriptions, delivery, and geospatial dispatch (`ride-dispatch.test.js`).
- Frontend type safety & bundle verification:
  ```powershell
  npm run build --prefix d:\projects\Findmedi\frontend
  ```
