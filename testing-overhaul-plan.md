# FindMedi — Testing Overhaul Master Plan & Execution

## 1. Executive Summary & Rationale
The legacy test suites in `backend/test` (317 files) and `frontend/src` (52 files) accumulated significant technical debt over multiple rapid development waves:
- Partial test coverage with outdated mocked data that no longer matched active Mongoose 8 schemas and Zod boot validators.
- Flaky tests with hardcoded IDs and timing races that bypassed active tenant isolation and IDOR guards.
- Lack of end-to-end multi-step flow verification (e.g. Booking -> Idempotency -> Payment Webhook -> Settlement -> Commission Ledger -> Receipt PDF).
- Zero automated regression testing for the 22 critical data-leak surfaces documented in `data-leak-findings.md`.

Per project directive, the legacy test suites have been cataloged and retired to build a modern, high-coverage testing foundation from scratch.

---

## 2. Legacy Test Retirement Register

### Backend Test Files Cataloged for Retirement (317 Files)
- **Unit Suite (94 files)**: Including `bookingCompletionTransactionContract.spec.js`, `bookingLifecycleParity.spec.js`, `charges.spec.js`, `couponService.spec.js`, `ledger.spec.js`, `moneyRounding.spec.js`, `paymentReplayService.spec.js`, `payoutReconcile.spec.js`, `pricingService.spec.js`, `twoPersonApproval.spec.js`, `webhookSettlementContract.spec.js`, etc. (Full inventory preserved in `purane-tests-inventory.json`).
- **Integration Suite (25 files)**: Including `routeAuthz.http.spec.js`, `sessionRevocation.http.spec.js`, `tenantIsolationNew.spec.js`, `webhookSettlement.spec.js`, `reportsExportSecurity.spec.js`, etc.
- **Security Suite (85 files)**: Including `idor.spec.js`, `dtoLeak.spec.js`, `fieldEncryption.spec.js`, `jwtHardening.spec.js`, `loginAnomaly.spec.js`, `rateLimit.spec.js`, `realtimeAcl.spec.js`, `riderEarningsPrivacy.spec.js`, etc.
- **Contract & Helper Suites**: DTO leak extenders, test database harnesses, and mocks.

### Frontend Test Files Cataloged for Retirement (52 Files)
- **Component & Spec Tests (52 files)**: `NationalHelplinesModal.test.jsx`, `SOSFlow.test.jsx`, `UnifiedSearch.test.jsx`, `PacsDicomViewer.test.jsx`, `dataGrid.test.jsx`, `systemA11y.test.jsx`, `bookingValidation.test.js`, `csrf.test.js`, `liveDashboards.test.jsx`, `liveQueues.test.js`, etc.

---

## 3. Modern Multi-Layer Testing Architecture

| Layer | Framework / Library | Rationale |
|---|---|---|
| **Backend Unit & Logic** | **Jest 29 + Node:crypto** | Battle-tested for asynchronous Mongoose hooks, Argon2 hashing, and isolated service unit tests. |
| **API & Integration** | **Supertest + mongodb-memory-server** | Enables genuine end-to-end HTTP integration tests running against a real in-memory MongoDB replica set with transactions (`startSession`), testing real indexes and unique constraints. |
| **Security & IDOR** | **Custom IDOR & DTO Leak Harness** | Automated cross-tenant matrix tester: iterates through every API endpoint with Tenant A token, Tenant B token, and anonymous requests, asserting strict 404/401 and verifying response keys have 0 forbidden fields (`password`, `tokenVersion`, `accountNo`). |
| **Realtime WebSockets** | **Socket.io-client** | In-memory socket harness asserting room join ACLs (`assertRoomAccess`) and verifying location events are never broadcast to unauthorized clients. |
| **Frontend Components** | **Vitest 3 + React Testing Library + happy-dom** | Fast native ESM execution matching Vite build pipeline; tests user interactions, form validation, and accessible ARIA states. |
| **End-to-End (E2E)** | **Playwright** | Real Chromium/Firefox/WebKit execution for end-to-end user journeys (Patient Search -> Slot Hold -> Mock Razorpay Checkout -> Appointment Confirmation -> Video Room Join). |
| **Load & Stress** | **k6 (Grafana)** | Scripted high-concurrency simulation of 1,000 virtual users (VUs) testing peak 9 AM OPD slot locks, rate limiter thresholds, and emergency SOS dispatch waves. |

---

## 4. Module-by-Module Test Coverage Plan

### Module 1: Auth & Security
- **Target Coverage**: 100% of routes in `auth.js`, `apiKeyAuth.js`, `adminSecurity.js`.
- **Key Test Cases**:
  - Argon2id password verification and pepper integrity (`SEC-BUG-03`).
  - Brute force lockout after 5 failed login attempts.
  - Refresh token reuse detection (revokes entire token family upon reuse).
  - Session revocation on password reset (`tokenVersion` increment).
  - DTO leak assertion: verify responses contain NO `password`, `tokenVersion`, `twoFactorSecret`.
  - Correlation ID injection and 0 stack traces in 500 error responses (`SEC-BUG-01`).

### Module 2: Payments, Billing & Ledger
- **Target Coverage**: 100% of financial routes in `payments.js`, `billing.js`, `commission.js`, `recon.js`.
- **Key Test Cases**:
  - Atomic webhook settlement idempotency (`webhook.js`). Replayed webhooks return `{ alreadySettled: true }` without double-crediting.
  - Safe two-phase refund sequence (`PAY-BUG-01`): assert refund DB record is created before external gateway dispatch.
  - Concurrent payout generation lock (`PAY-BUG-02`): parallel payout requests for same doctor do not double-claim ledger rows.
  - Bank account masking (`PAY-BUG-03`): verify `accountNo` returns masked `******1234`.
  - Strict Zod validation on bank account creation (`PAY-BUG-04`).

### Module 3: Appointments & Booking
- **Target Coverage**: 100% of routes in `appointments.js`, `appointmentSeries.js`.
- **Key Test Cases**:
  - Idempotency guard on appointment and walk-in creation (`APPT-BUG-01`).
  - Slot hold 5-minute TTL and anti-hoarding lock (`APPT-MISSING-02`).
  - Duplicate booking rejection for same doctor + patient + slot time.
  - Cancellation refund calculation according to cancellation policy tiers.

### Module 4: Pharmacy & Lab
- **Target Coverage**: 100% of routes in `pharmacy.js`, `lab.js`.
- **Key Test Cases**:
  - ASTM and HL7 ingestion tenant boundary isolation (`PHARM-LAB-BUG-01`): verify machine results for Hospital A cannot overwrite Hospital B orders.
  - Schedule H1 antibiotic prescription lock upon dispensing (`PHARM-LAB-MISSING-01`).
  - Medicine inventory atomic decrement on checkout with out-of-stock guard.
  - Strict schema validation on pharmacy staff creation (`PHARM-LAB-BUG-02`).

### Module 5: Rides, Ambulance & Emergency SOS
- **Target Coverage**: 100% of routes in `rides.js`, `emergencySOS.js`, `ambulanceTrips.js`.
- **Key Test Cases**:
  - Socket live location room access control (`EMERG-BUG-01`): foreign user joining `ride:${id}` receives 403 / disconnected.
  - Emergency SOS 90-second timeout fallback trigger (`EMERG-MISSING-01`).
  - Ephemeral GPS breadcrumbs 48-hour TTL purge (`EMERG-MISSING-02`).
  - Ride fare calculation with dynamic night/surge multipliers.

### Module 6: Lawyer Bookings & Assistant Home Care
- **Target Coverage**: 100% of routes in `lawyerBookings.js`, `assistantBookings.js`.
- **Key Test Cases**:
  - Privileged case note IDOR protection (`LAW-BUG-01`): only retained lawyer and patient can read case documents.
  - Retainer hold idempotency guard (`LAW-BUG-02`).
  - Bedside vitals logging ownership check in `assistantBookings.js`.

### Module 7: Mental Health (MindSupport)
- **Target Coverage**: 100% of routes in `mentalHealth.js`, `mentalHealthScreening.js`.
- **Key Test Cases**:
  - Audit log redaction for PHQ-9 and GAD-7 screening answers (`MH-BUG-01`).
  - Immediate red-flag crisis intervention on PHQ-9 Question 9 positive answer (`MH-BUG-02`).
  - Confidentiality enforcement preventing non-psychiatric staff from reading therapy notes.

### Module 8: Chat & Real-time Telemedicine
- **Target Coverage**: 100% of routes in `chat.js`, `socketService.js`.
- **Key Test Cases**:
  - Request body size limit rejection on payloads > 1 MB (`CHAT-BUG-01`).
  - LiveKit video token TTL expiration and non-guessable room names (`CHAT-BUG-02`).
  - Message attachment ClamAV virus scanning verification.

### Module 9: Insurance & TPA Claims
- **Target Coverage**: 100% of routes in `insurance.js`, `patientInsurancePolicies.js`.
- **Key Test Cases**:
  - Strict policy creation schema blocking self-verification (`INS-BUG-01`).
  - Cross-tenant claim status mutation prevention (`INS-BUG-02`).

### Module 10: Loyalty & Platform Governance
- **Target Coverage**: 100% of routes in `loyalty.js`, `export.js`, `adminApplications.js`.
- **Key Test Cases**:
  - Atomic loyalty point redemption preventing double-spending (`LOYALTY-BUG-01`).
  - Four-eyes approval requirement on bulk export (`ADMIN-BUG-01`).
  - Immediate token version increment and socket disconnection on user suspension (`ADMIN-BUG-02`).

---

## 5. Cross-Reference Matrix (Bugs & Missing Features)

| Discovered Issue | Module | New Test Suite Spec File |
|---|---|---|
| `SEC-BUG-01` (Error Message Leaks) | Auth & Security | `backend/test/new/security/errorScrubbing.spec.js` |
| `SEC-BUG-02` (LocalStorage Token Storage) | Auth & Security | `frontend/src/tests/auth/tokenStorage.test.tsx` |
| `SEC-BUG-03` (CSPRNG Violation) | Auth & Security | `backend/test/new/security/csprng.spec.js` |
| `PAY-BUG-01` (Premature Refund Dispatch) | Payments & Billing | `backend/test/new/payments/refundSequence.spec.js` |
| `PAY-BUG-02` (Payout Concurrency Race) | Payments & Billing | `backend/test/new/payments/payoutConcurrency.spec.js` |
| `PAY-BUG-03` (Bank Account Plaintext) | Payments & Billing | `backend/test/new/payments/bankAccountMasking.spec.js` |
| `APPT-BUG-01` (Booking Idempotency) | Appointments | `backend/test/new/appointments/bookingIdempotency.spec.js` |
| `PHARM-LAB-BUG-01` (ASTM Cross-Tenant IDOR) | Pharmacy & Lab | `backend/test/new/lab/analyzerTenantIsolation.spec.js` |
| `EMERG-BUG-01` (Socket GPS Telemetry Leak) | Rides & Emergency | `backend/test/new/emergency/socketTelemetryAcl.spec.js` |
| `LAW-BUG-01` (Lawyer Case Note IDOR) | Lawyer Bookings | `backend/test/new/lawyer/caseNoteIdor.spec.js` |
| `MH-BUG-01` (Mental Health Audit Leak) | Mental Health | `backend/test/new/mentalHealth/screeningPrivacy.spec.js` |
| `MH-BUG-02` (PHQ-9 Q9 Crisis Intervention) | Mental Health | `backend/test/new/mentalHealth/crisisIntervention.spec.js` |
| `CHAT-BUG-01` (40 MB Body DoS) | Chat & Realtime | `backend/test/new/chat/bodyLimit.spec.js` |
| `INS-BUG-01` (Policy Mass Assignment) | Insurance | `backend/test/new/insurance/policyValidation.spec.js` |
| `LOYALTY-BUG-01` (Points Double-Spend) | Loyalty & Rewards | `backend/test/new/loyalty/pointsConcurrency.spec.js` |
| `ADMIN-BUG-01` (Bulk Export Four-Eyes) | Admin & Platform | `backend/test/new/admin/twoPersonApproval.spec.js` |
| `DATA-BUG-01` (OpenSearch Tenant Missing) | Data Platform | `backend/test/new/dataPlatform/opensearchTenantFilter.spec.js` |
| `INFRA-BUG-01` (bfcache Back-Button Leak) | Infra & DevOps | `backend/test/new/infra/cacheHeaders.spec.js` |
| `RUST-BUG-01` (Decompression Bomb) | Rust Helper | `backend/test/new/rust/imageLimits.spec.js` |
