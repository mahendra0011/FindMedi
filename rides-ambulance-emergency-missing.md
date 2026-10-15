# Rides, Ambulance & Emergency — Missing Features & Capabilities

## [EMERG-MISSING-01] National Emergency Toll-Free 112 / 108 CAD Auto-Bridge & SMS Relay
- **Description**: While FindMedi has a standalone `EmergencySOS.js` and emergency dispatch engine, there is no Computer Aided Dispatch (CAD) webhook integration or automated bridge to India's national emergency services (112 Emergency Response Support System - ERSS, or 108 State Ambulance Services) when no private ambulance accepts within 90 seconds.
- **Current vs Expected Behavior**:
  - *Current*: If private network ambulances are unavailable or decline within the search radius, the system reports "No ambulances available nearby", leaving the patient stranded.
  - *Expected*: If private network ambulances fail to accept within 90 seconds (Wave 3 timeout):
    1. System automatically initiates an emergency IVR dial-out to 108/112 with synthesized speech reporting GPS coordinates, patient name, and condition.
    2. Sends an automated SMS to national emergency dispatch and patient's registered ICE (In Case of Emergency) contacts.
- **Flow**: Red-flag emergency SOS trigger (cardiac arrest, severe road accident, maternal emergency).
- **Root Cause / Logic**: Emergency fallback stopped at local search expansion without government CAD integration.
- **Affected Files**: `backend/src/services/emergencyDispatchService.js`, `backend/src/routes/emergencySOS.js`, `backend/src/models/EmergencySOS.js`
- **UI/Frontend Impact**: SOS countdown screen shifts to "Connecting you directly to National Ambulance 108" with direct one-tap call button.
- **Security/Data Risk**: **Critical**. Patient mortality risk during critical golden hour delays.
- **Suggested Fix / Implementation Plan**:
  1. Add escalation timer in `emergencyDispatchService.js`.
  2. Implement automated IVR call initiation via Twilio/Exotel on 90s timeout.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement 90s fallback escalation trigger in `emergencyDispatchService.js`.
  - [ ] Add direct 108/112 dialer action on SOS client.

---

## [EMERG-MISSING-02] Post-Trip Ephemeral Location Data Purging (DPDP Section 8 Retention Compliance)
- **Description**: High-frequency GPS telemetry breadcrumbs (collected every 1-5 seconds during an ambulance or ride trip) are persisted in MongoDB `RideTracking` and Redis geohashes indefinitely without an automated TTL purge after trip completion.
- **Current vs Expected Behavior**:
  - *Current*: Location points remain stored in database history, creating an accumulated historical record of everywhere patients and drivers traveled.
  - *Expected*: Under India's DPDP Act 2023 Section 8 (Data Minimization & Storage Limitation), high-resolution location breadcrumbs must be hard-purged within 48 hours of trip completion, retaining only origin, destination, distance, and fare for audit/tax purposes.
- **Flow**: Trip completion and post-trip archival.
- **Root Cause / Logic**: Location data was stored without a MongoDB TTL index or archival lifecycle job.
- **Affected Files**: `backend/src/models/RideTracking.js`, `backend/src/services/rideDispatchService.js`, `backend/src/scripts/check-retention-gaps.mjs`
- **UI/Frontend Impact**: None directly; trip receipts still display start and end points.
- **Security/Data Risk**: **High**. Retaining fine-grained GPS traces creates severe location surveillance liability if the database is ever breached.
- **Suggested Fix / Implementation Plan**:
  1. Add MongoDB TTL index on `RideTracking.createdAt` (`expireAfterSeconds: 172800` = 48 hours).
  2. Add post-trip cleanup cron job in `deletionService.js`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add TTL index to `RideTracking.js`.
  - [ ] Verify retention compliance test passes.
