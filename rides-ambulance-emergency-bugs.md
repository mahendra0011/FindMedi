# Rides, Ambulance & Emergency — Bugs

## [EMERG-BUG-01] Ephemeral Live Location Telemetry Over-Exposure to Unauthenticated Sockets
- **Description**: Ambulance and ride live location updates emitted through `socketService.js` in certain tracking rooms do not verify whether the listening socket user is an active participant in that specific trip.
- **Current vs Expected Behavior**:
  - *Current*: A user joining room `ride:${rideId}` or `ambulance:${tripId}` can receive real-time GPS coordinates (latitude, longitude, heading, speed) without checking trip status or participant identity.
  - *Expected*: `socket.join('ride:' + id)` must call `assertRoomAccess` or verify that `socket.user._id` matches `trip.patientId`, `trip.driverId`, or dispatch operator before granting room membership.
- **Flow**: Live ambulance and medical taxi tracking.
- **Root Cause / Logic**: Socket location handler lacked mandatory participant verification on room join.
- **Affected Files**: `backend/src/services/socketService.js:450-520`, `backend/src/routes/rides.js`
- **UI/Frontend Impact**: Real-time map shows vehicle movement.
- **Security/Data Risk**: **High**. Physical security and stalking risk. Stalkers or malicious actors guessing trip IDs could track the exact physical street location of patients, ambulances, and drivers in real time.
- **Steps to Reproduce**:
  1. Create a ride booking as User A.
  2. Connect to Socket.io as User B.
  3. Emit `join:ride` with User A's rideId.
  4. User B receives User A's driver's GPS location.
- **Suggested Fix / Implementation Plan**:
  1. Add strict participant validation in `socketService.js` on `join:ride` and `join:ambulance`.
  2. Reject join requests with an explicit auth error if `socket.user._id` is not authorized.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Enforce `assertRoomAccess` in `socketService.js` location rooms.
  - [ ] Add unit test checking foreign user socket rejection.

---

## [EMERG-BUG-02] Unauthenticated Active Rides Endpoint Fallback Risk
- **Description**: In `backend/src/routes/rides.js` line 195, `router.get('/active', optionalProtect, ...)` allows unauthenticated access if token is missing.
- **Current vs Expected Behavior**:
  - *Current*: When invoked without an auth token, it falls back to phone/session heuristics, which can leak trip existence or status.
  - *Expected*: Active ride lookup must require authentication (`protect`), scoping strictly to `req.user._id`.
- **Flow**: Rider app checking for ongoing active trips on launch.
- **Root Cause / Logic**: Use of `optionalProtect` to accommodate guest bookings without verifying session ownership.
- **Affected Files**: `backend/src/routes/rides.js:195-240`
- **UI/Frontend Impact**: None for logged-in users.
- **Security/Data Risk**: **Medium**. Information disclosure of active trip status.
- **Steps to Reproduce**:
  1. Send `GET /api/rides/active` without Authorization header but with query parameter `phone`.
  2. Active trip details returned.
- **Suggested Fix / Implementation Plan**:
  1. Replace `optionalProtect` with `protect` on `rides.js` `/active`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Change `optionalProtect` to `protect` in `backend/src/routes/rides.js`.
