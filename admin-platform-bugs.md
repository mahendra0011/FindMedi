# Admin & Platform Governance — Bugs

## [ADMIN-BUG-01] Missing Dual-Approval Check on Bulk Export & Financial Configuration Changes
- **Description**: In `backend/src/routes/export.js` and `backend/src/routes/commission.js`, a single superadmin or hospital administrator can trigger full database exports or change hospital platform commission splits (e.g. changing doctor commission from 15% to 50%) without requiring a second administrator's confirmation (Four-Eyes / Maker-Checker principle).
- **Current vs Expected Behavior**:
  - *Current*: A compromised admin credential can immediately export 10,000 patient records via `GET /api/export` or divert platform revenues.
  - *Expected*: High-risk actions must invoke `TwoPersonApproval` (implemented in Phase 0). The initiator (Maker) creates a pending request; the action is blocked until a second independent administrator (Checker) approves it with biometric or 2FA verification.
- **Flow**: Bulk patient data export, fee structure adjustment, admin role elevation.
- **Root Cause / Logic**: Four-eyes approval service existed in `models/TwoPersonApproval.js` but was not wired into `export.js` and `commission.js` routes.
- **Affected Files**: `backend/src/routes/export.js`, `backend/src/routes/commission.js`, `backend/src/models/TwoPersonApproval.js`
- **UI/Frontend Impact**: Admin action opens a "Pending Second-Admin Approval" modal.
- **Security/Data Risk**: **Critical**. Insider threat and single-credential takeover vulnerability. A rogue employee or compromised admin account can exfiltrate entire hospital rosters in one click.
- **Steps to Reproduce**:
  1. Log in as Hospital Admin.
  2. Call `GET /api/export?kind=patients`.
  3. 10,000 patient records returned immediately without second-admin challenge.
- **Suggested Fix / Implementation Plan**:
  1. Attach `requireTwoPersonApproval({ action: 'bulk_export', riskLevel: 'HIGH' })` to `export.js`.
  2. Queue export job until second approval is recorded.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Wire `TwoPersonApproval` into `export.js`.
  - [x] Wire `TwoPersonApproval` into platform commission rate changes.

---

## [ADMIN-BUG-02] Incomplete Cascade Invalidation on User Deletion / Suspension
- **Description**: When a provider or patient account is deleted or suspended via `backend/src/routes/adminApplications.js` or `users.js`, active JWT sessions (tokens) and Redis presence keys are not synchronously invalidated across all cluster instances.
- **Current vs Expected Behavior**:
  - *Current*: User record `status` is set to `suspended` or `deletedAt` is populated, but previously issued JWT tokens remain valid until expiration (up to 24 hours).
  - *Expected*: Suspending or deleting an account must immediately:
    1. Increment `user.tokenVersion` in MongoDB.
    2. Broadcast `session:revoke` on Redis PubSub to immediately drop all active Socket.io connections.
    3. Remove doctor from online presence indices in Redis (`removeUserPresence`).
- **Flow**: Admin revoking access of a compromised account or fired hospital employee.
- **Root Cause / Logic**: Incomplete session revocation pipeline on administrative delete/suspend actions.
- **Affected Files**: `backend/src/routes/users.js`, `backend/src/routes/adminApplications.js`, `backend/src/services/deletionService.js`
- **UI/Frontend Impact**: Suspended user can continue browsing until token expires.
- **Security/Data Risk**: **High**. Terminated employee or banned scammer can continue accessing patient charts for up to 24 hours after being terminated.
- **Steps to Reproduce**:
  1. Log in as Doctor on Mobile/Browser; save bearer token.
  2. Superadmin suspends Doctor in Admin Portal.
  3. Use saved bearer token to request `GET /api/appointments`. Request still succeeds with 200 OK!
- **Suggested Fix / Implementation Plan**:
  1. Invoke `incrementTokenVersion(userId)` and `removeUserPresence(userId)` on suspension.
  2. Check `tokenVersion` against Redis blacklist or cached user version in `protect` middleware.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Add `tokenVersion` increment in `users.js` suspension handler.
  - [x] Add socket termination trigger in `deletionService.js`.
