# Appointments & Booking — Bugs

## [APPT-BUG-01] Missing Idempotency Protection on Main Appointment & Walk-In Creation Endpoints
- **Description**: `POST /api/appointments` and `POST /api/appointments/walk-in` lack `idempotencyGuard()` middleware.
- **Current vs Expected Behavior**:
  - *Current*: If a patient or receptionist double-clicks "Confirm Booking" or a mobile client retries after a network blip, two separate appointment records are created with different IDs.
  - *Expected*: Clients provide an `Idempotency-Key` header; duplicated requests return the original appointment with `{ duplicate: true }` without re-allocating doctor slot capacity.
- **Flow**: Patient booking an appointment, OPD desk booking a walk-in.
- **Root Cause / Logic**: `idempotencyGuard` was applied to rides and cancellations, but omitted on the primary appointment creation route in `backend/src/routes/appointments.js:536` and `730`.
- **Affected Files**: `backend/src/routes/appointments.js:536, 730`
- **UI/Frontend Impact**: Duplicate appointment tokens and double doctor queue entries.
- **Security/Data Risk**: **Medium**. Slot exhaustion / denial of inventory for other patients.
- **Steps to Reproduce**:
  1. Send two simultaneous `POST /api/appointments/walk-in` requests with identical payload.
  2. Inspect appointments table; two appointments created for same slot.
- **Suggested Fix / Implementation Plan**:
  1. Add `idempotencyGuard({ prefix: 'appt-create', failClosed: true })` to `appointments.js` POST handlers.
  2. Enforce compound unique index on `{ doctorId: 1, date: 1, slotTime: 1, patientId: 1, status: { $nin: ['Cancelled'] } }`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Attach `idempotencyGuard` to `POST /api/appointments/` and `POST /api/appointments/walk-in`.
  - [ ] Write integration test verifying double-submit idempotency.

---

## [APPT-BUG-02] Hardstop Error Log Leaking Internal Diagnostic Information
- **Description**: In `backend/src/routes/appointments.js` lines 616-618 and 725, `console.log('HARDSTOP RESULT', ...)` and `console.log(err.stack)` log internal patient IDs, hospital IDs, and stack traces to standard output.
- **Current vs Expected Behavior**:
  - *Current*: `if (process.env.DEBUG_WALKIN) console.log('HARDSTOP RESULT', { hospitalId, canonicalPatientId, stop });` and raw stack dumping.
  - *Expected*: All logs must go through `logger.info`/`logger.error` with strict PII scrubbing.
- **Flow**: Walk-in appointment creation and patient deduplication.
- **Root Cause / Logic**: Leftover debugging console statements from OPD queue troubleshooting.
- **Affected Files**: `backend/src/routes/appointments.js:616-618, 725`
- **UI/Frontend Impact**: None directly.
- **Security/Data Risk**: **Low to Medium**. Log pollution and potential PII leak into unencrypted log aggregators.
- **Steps to Reproduce**:
  1. Set `DEBUG_WALKIN=true`.
  2. Trigger walk-in appointment creation.
  3. Observe stdout displaying patient IDs and stack traces.
- **Suggested Fix / Implementation Plan**:
  1. Remove `console.log` statements in `appointments.js`.
  2. Replace with `logger.debug` with redacted metadata.
- **Priority**: Medium
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Clean up console statements in `backend/src/routes/appointments.js`.
