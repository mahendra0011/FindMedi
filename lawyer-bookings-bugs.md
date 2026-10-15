# Lawyer Bookings — Bugs

## [LAW-BUG-01] IDOR in Lawyer Consultation Case Notes Retrieval
- **Description**: In `backend/src/routes/lawyerBookings.js`, case notes and documents uploaded during a legal-medical consultation can be accessed via `GET /api/lawyer-bookings/:id` by any authenticated lawyer on the platform who supplies the booking ID.
- **Current vs Expected Behavior**:
  - *Current*: `router.get('/:id', protect, authorize('legal:read'), ...)` checks only the generic permission `legal:read`, but fails to assert that `req.user._id` matches `booking.lawyerId` or `booking.patientId`.
  - *Expected*: Strict ownership check: only the specific retained lawyer, the client patient, or superadmin can read privileged medico-legal consultation notes.
- **Flow**: Patient consulting a medico-legal attorney regarding medical negligence or insurance claim dispute.
- **Root Cause / Logic**: Missing object-level authorization (`authorizeObject`) on `GET /:id` in `backend/src/routes/lawyerBookings.js:1109`.
- **Affected Files**: `backend/src/routes/lawyerBookings.js:1109-1140`
- **UI/Frontend Impact**: Any lawyer logged into the portal could theoretically inspect other lawyers' confidential case files by guessing or iterating booking IDs.
- **Security/Data Risk**: **Critical**. Severe breach of Attorney-Client Privilege and Indian Evidence Act Section 126. Sensitive medical litigation strategies and patient allegations against hospitals exposed.
- **Steps to Reproduce**:
  1. Book a consultation with Lawyer A as Patient 1.
  2. Note booking ID `BK-LAW-001`.
  3. Authenticate as Lawyer B (unrelated).
  4. Call `GET /api/lawyer-bookings/BK-LAW-001`.
  5. The consultation case notes are returned.
- **Suggested Fix / Implementation Plan**:
  1. Add ownership check in `backend/src/routes/lawyerBookings.js`:
     ```js
     if (String(booking.patientId) !== String(req.user._id) && String(booking.lawyerId) !== String(req.user._id) && req.user.role !== 'superadmin') {
       return res.status(404).json({ message: 'Booking not found' });
     }
     ```
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Add ownership check to `GET /api/lawyer-bookings/:id`.
  - [x] Add integration test verifying foreign lawyer receives 404.

---

## [LAW-BUG-02] Retainer Hold Double-Charging Risk on Retries
- **Description**: In `backend/src/routes/lawyerBookings.js:255`, `POST /:id/hold-retainer` locks the patient's payment method for the initial legal consultation fee, but lacks an `Idempotency-Key` requirement or unique payment constraint.
- **Current vs Expected Behavior**:
  - *Current*: If the network stutters during payment gateway authorization and the patient client retries, two separate pre-authorization holds are placed on the patient's card/account.
  - *Expected*: Handler requires `idempotencyGuard()` and stores the pre-auth hold ID on the booking record before contacting the gateway.
- **Flow**: Initial consultation booking retainer authorization.
- **Root Cause / Logic**: Missing idempotency middleware on `POST /:id/hold-retainer`.
- **Affected Files**: `backend/src/routes/lawyerBookings.js:255-300`
- **UI/Frontend Impact**: Patient sees two bank SMS alerts with duplicate amounts debited/blocked.
- **Security/Data Risk**: **Medium**. Financial double-authorization and charge dispute liability.
- **Steps to Reproduce**:
  1. Send two concurrent `POST /api/lawyer-bookings/:id/hold-retainer` requests.
  2. Gateway receives two separate pre-auth hold requests.
- **Suggested Fix / Implementation Plan**:
  1. Wrap endpoint with `idempotencyGuard({ prefix: 'lawyer-retainer', failClosed: true })`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [x] Attach `idempotencyGuard` to retainer hold endpoint.
