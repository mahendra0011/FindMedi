# Notifications / Admin / Audit — Bugs

Scope: `routes/notifications.js` (104 lines, 7 routes), `routes/auditLogs.js` (2 routes), `routes/adminSecurity.js` (6 routes), `routes/export.js` (7), `routes/reports.js` (14), `routes/broadcast.js`, `routes/systemSettings.js`, `routes/staff.js` (15), `routes/commission.js` (9), `middleware/audit.js`, `models/AuditLog.js`, `services/notificationService.js`.

---

## [ADMIN-001] HIGH — The audit-trail reader has no role guard
- **Description**: `routes/auditLogs.js` registers 2 routes and, per the `AUTHZ-001` sweep, uses **no** authorisation helper — `protect` is the only gate. This is the endpoint exposing the platform's audit trail: actor ids, resource ids, IP addresses, user agents and action names for every audited event.
- **Current vs Expected**: Current = any authenticated account — including a self-registered patient or a delivery partner — may be able to read the system-wide audit log. Expected = `superadminOnly` (or a dedicated compliance role), with tenant scoping for `hospital_admin` so an administrator sees only their own organisation's events.
- **Flow**: Compliance review and incident investigation. Read access to the audit trail is itself a sensitive privilege, because it reveals who accessed which patient record and when — exactly the information an insider uses to learn what is being observed.
- **Root Cause / Logic**: The audit *reader* was added without the care applied to the audit *writers*; the model was treated as ordinary data rather than a privileged dataset.
- **Affected Files**: `routes/auditLogs.js`, `models/AuditLog.js`, `middleware/audit.js`
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **High.** Confidentiality of the audit trail defeats its purpose (an actor who can read it learns the scope of any investigation), and it discloses user/patient identifiers, IP addresses and behavioural patterns platform-wide. With denial logging absent (`MISS-AUTHZ-004`), a probing actor also leaves no trace while reading it.
- **Steps to Reproduce**: Call both `auditLogs.js` endpoints with the token of a newly registered patient and inspect the returned documents.
- **Suggested Fix / Implementation Plan**: Apply `superadminOnly` plus tenant scoping for administrators; audit every read of the audit log itself; project out IP/user-agent for non-compliance roles; and include this file in the first tranche of the `AUTHZ-001` remediation.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `superadminOnly` (or compliance role) on audit-log reads
  - [ ] Tenant scoping for `hospital_admin`
  - [ ] Audit the reads themselves
  - [ ] Field projection appropriate to the viewer's role
  - [ ] Regression test with a low-privilege token

---

## [ADMIN-002] Notification endpoints rely on handler-level scoping, with no retention or preference model
- **Description**: `routes/notifications.js` (104 lines) registers `GET /`, `GET /unread-count`, `PUT /mark-all-read`, `POST /` (correctly `adminOnly` + zod), `PUT /:id/read`, `DELETE /clear-all` and `DELETE /:id` — five of the seven with `protect` only, addressing per-user resources by id. Because `protect` populates both `req.user.id` and `req.user._id`, a raw grep cannot establish whether each handler scopes by the caller; the finding is that scoping is **implicit and unverified** on five routes rather than declared on all of them.
- **Current vs Expected**: Current = whether a user can mark or delete *another* user's notification depends on a filter inside each handler. Expected = a single user-scoping guard (or model-level query helper) on every per-user route, plus an ownership assertion on `/:id`. There is also no retention policy and no per-channel preference model.
- **Flow**: Appointment reminders, record-created alerts, ride updates and prescription reminders — a channel whose text carries PHI ("Dr. X generated your prescription"), so reading or deleting another user's notifications exposes clinical events.
- **Root Cause / Logic**: The notification model is keyed by a string `userId` and queried ad hoc; a shared scoping helper was never introduced as the router grew.
- **Affected Files**: `routes/notifications.js` (7 registrations), `models/Notification.js`, `services/notificationService.js`
- **UI/Frontend Impact**: Yes — preference/retention changes are user-visible, and notifications are currently unbounded per user with no archiving, which affects list performance.
- **Security/Data Risk**: **Medium–High if any `/:id` route lacks its filter** — cross-user notification read/delete disclosing clinical events. Verify before dismissing: the low line count and five unguarded per-user routes make an omission plausible.
- **Steps to Reproduce**: Create a notification for user A; as user B call `PUT /api/notifications/<A's id>/read` and `DELETE /api/notifications/<id>`; then check user A's state.
- **Suggested Fix / Implementation Plan**: Add an ownership guard (query `{ _id, userId: req.user.id }`, 404 on miss) to `/:id/read` and `DELETE /:id`; scope list/clear-all the same way; add cross-user tests; then a retention policy (TTL or archive) and per-channel preferences.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Ownership assertions on `/:id` notification routes
  - [ ] Shared user-scoping helper for list/clear-all
  - [ ] Cross-user test coverage
  - [ ] Retention policy for notifications
  - [ ] Per-channel preferences; minimum PHI in notification text

<!-- END -->
