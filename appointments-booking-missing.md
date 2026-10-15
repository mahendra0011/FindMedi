# Appointments & Booking — Missing Features & Capabilities

## [APPT-MISSING-01] Unified Cross-Service Booking State Machine Engine
- **Description**: Currently, appointment booking, ride booking, ambulance dispatch, lawyer consultations, and home care assistants each implement isolated, divergent state machines with inconsistent status vocabularies (`Scheduled`/`Booked`/`Requested`/`Confirmed`/`In-Progress`).
- **Current vs Expected Behavior**:
  - *Current*: Fragmented state models across `Appointment.js`, `RideBooking.js`, `AmbulanceTrip.js`, `LawyerBooking.js`, and `AssistantBooking.js`.
  - *Expected*: A unified polymorphic booking orchestration engine (`lib/flowStates.js` or `services/unifiedBookingState.js`) enforcing common lifecycle stages (`DRAFT` -> `HELD` -> `CONFIRMED` -> `DISPATCHED` -> `IN_PROGRESS` -> `COMPLETED` / `CANCELLED`) with centralized cancellation, refund, and notification side-effects.
- **Flow**: Cross-service health bundles (e.g., Doctor appointment + Ambulance pickup + Lab home sample collection booked in a single package).
- **Root Cause / Logic**: Modular evolution by different developers without an enterprise-wide workflow orchestrator.
- **Affected Files**: `backend/src/models/Appointment.js`, `backend/src/models/Order.js`, `backend/src/lib/flowStates.js`, `backend/src/routes/appointments.js`
- **UI/Frontend Impact**: Frontend has to handle 5 different status display logic helpers instead of a single universal booking timeline component.
- **Security/Data Risk**: **Low**. Inconsistent state transitions cause orphan bookings and refund calculation mismatches.
- **Suggested Fix / Implementation Plan**:
  1. Extend `lib/flowStates.js` with `UNIVERSAL_BOOKING_TRANSITIONS`.
  2. Implement transition validation middleware for all booking mutation routes.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Standardize booking state machine transitions.
  - [ ] Add state machine unit tests.

---

## [APPT-MISSING-02] Slot Reservation Hold TTL & Anti-Hoarding Lock
- **Description**: When a user selects a consultation slot and proceeds to payment, the slot is locked via `POST /api/appointments/lock-slot`, but if the user abandons payment or closes the browser, the lock does not reliably release in high-concurrency peak booking hours (e.g., 9 AM OPD rush).
- **Current vs Expected Behavior**:
  - *Current*: Slot capacity checks rely on Redis keys that can become desynchronized from MongoDB if Redis evicts keys under memory pressure.
  - *Expected*: Distributed atomic lock using Redis Redlock or MongoDB TTL index with explicit 5-minute expiry and real-time Socket.io broadcast to update other waiting patients.
- **Flow**: High-demand doctor slot booking.
- **Root Cause / Logic**: Redis slot locking lacks dual-write synchronization with MongoDB slot reservations.
- **Affected Files**: `backend/src/routes/appointments.js:183-225`, `backend/src/services/slotCapacity.js`
- **UI/Frontend Impact**: Patients see slots greyed out even though no one is actively checking out.
- **Security/Data Risk**: **Medium**. DoS / inventory hoarding attack where an attacker locks all slots for a top specialist across multiple fake accounts.
- **Suggested Fix / Implementation Plan**:
  1. Add Redis sliding TTL with automatic expiry callback.
  2. Rate-limit `lock-slot` to max 3 concurrent holds per user.
- **Priority**: Medium
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement strict 5-minute TTL on slot locks.
  - [ ] Add per-user hold quota limit.
