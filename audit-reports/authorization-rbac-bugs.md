# Authorization / RBAC — Bugs

Scope: `backend/src/middleware/auth.js`, every `routes/*.js` file, `User.role` model definition.
Method: scripted per-file count of `router.<verb>(` registrations vs. occurrences of `roleGuard(`, `requireRole(`, `adminOnly`, `superadminOnly`.
Companion file: `authorization-rbac-missing.md`.

---

## [AUTHZ-001] CRITICAL (systemic) — 45 of 94 route files contain no role-authorisation guard at all, covering ~349 endpoints
- **Description**: The scripted sweep over `backend/src/routes/` (matching `adminOnly`, `superadminOnly`, `hospitalAdminOnly`, `clinicalStaffOnly`, `requireRole`, `roleOnly`, `restrictTo`, `scopeToHospital`, `scopeToFacility`, `sameFacility`, `authorize(`) reports **94 route files, of which 40 contain zero role-authorisation helpers** — **324 of 790 endpoints (41%)**. The affected surface is not peripheral — it includes `chat.js` (39 routes, 0 guards), `lawyerBookings.js` (23, 0), `assistantBookings.js` (20, 0), `patient.js` (18, 0), `emergencySOS.js` (17, 0), `loyalty.js` (14, 0), `rides.js` (14, 0), `emergencyDoctor.js` (10, 0), `medicineReminders.js` (10, 0), `vitals.js` (10, 0), `lawyers.js` (9, 0), `billing.js` (9, 0), `assistants.js` (9, 0), `carePlans.js` (8, 0), `calls.js` (8, 0), `records.js` (8, 0), `referral.js` (8, 0), `riders.js` (8, 0), `delivery.js` (7, 0), `demoPayment.js` (7, 0), `transactions.js` (6, 0), `patients.js` (6, 0), plus `twoFactor.js`, `drive.js`, `healthId.js`, `reviews.js`, `clinicalAlerts.js`, `upload.js`, and `auditLogs.js`. (`auth.js` also shows 0, which is correct and expected for the auth surface.)
- **Current vs Expected**: Current = the *only* server-side gate on 324 endpoints is `protect` (authenticated-but-any-role). Each handler is expected to remember its own inline `req.user.role === ...` check, and the records module demonstrates that this expectation is not met (`REC-001`, `REC-002`, `REC-007`). Expected = every route declares its required roles declaratively, with a deny-by-default default.
- **Flow**: Any authenticated account — including low-trust ones such as a delivery partner, a rider, or a self-registered patient — holds a token that satisfies the only guard present. The vulnerability is therefore not one endpoint but an unbounded set of "did this handler remember to check?" decisions.
- **Root Cause / Logic**: Ten role/scope helpers exist in `middleware/auth.js` (`adminOnly`, `requireRole`, `roleOnly`, `restrictTo`, `superadminOnly`, `hospitalAdminOnly`, `clinicalStaffOnly`, `scopeToHospital`, `scopeToFacility`, `sameFacility`) — the vocabulary is rich, but adoption is partial and inconsistent: `lab.js` 12 uses, `reports.js` 11, `commission.js` 10, `staff.js` 9, versus 0 in the 40 files above. Note that `routes/auditLogs.js` — the audit-trail reader — has no role guard, so an admin-only log may be readable by any authenticated user. **Correction to an earlier internal estimate**: an initial sweep using only `roleGuard`/`requireRole` overstated this as "45 files / ~349 endpoints"; `roleGuard` does not exist and `roleOnly`/`restrictTo`/`scopeTo*` were not counted. The figures above are the corrected, re-measured values.
- **UI/Frontend Impact**: None visible — the API simply answers questions the UI never asks.
- **Security/Data Risk**: **Critical.** This is the architectural root cause of the highest-severity findings in the audit. Every individual authorisation defect found elsewhere is a symptom of this one; fixing individual handlers without fixing this guarantees the next endpoint added will have the same hole.
- **Steps to Reproduce**: `routes/auditLogs.js` — call its endpoints with the token of a newly registered patient. Then repeat for the files listed above with a low-trust role and observe how many return data.
- **Suggested Fix / Implementation Plan**: Introduce `middleware/authorize(...roles)` (or a permission-string model) and apply it **declaratively to every route**. Do it as a mechanical, reviewable sweep so the diff is auditable. Add an automated CI check that fails the build when a `router.<verb>(...)` registration has no `protect` **and** no `authorize` in its middleware chain — that guard is what prevents regression, and it is far more valuable than fixing all 349 by hand. Publish a role→permission matrix and reconcile it against `User.role`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add `authorize(...roles)` / permission model to `middleware/auth.js`
  - [ ] CI check: every route must declare `protect` + `authorize` (allowlist intentional public routes explicitly)
  - [ ] Sweep the 45 zero-guard files, highest-risk first (records, payments, admin, chat, audit)
  - [ ] Add `authorize('admin','superadmin')` to `auditLogs.js` immediately
  - [ ] Reconcile the 25+ role enum in `User.js` with real usage; retire unused roles
  - [ ] Document the role→permission matrix

## [AUTHZ-002] Ten overlapping authorisation helpers with no canonical one
- **Description**: `middleware/auth.js` exports **ten** separate authorisation/scope middlewares: `adminOnly`, `requireRole`, `roleOnly` (alias of `requireRole`), `restrictTo` (wrapper that flattens args into `requireRole`), `superadminOnly`, `hospitalAdminOnly`, `clinicalStaffOnly`, `scopeToHospital`, `scopeToFacility`, `sameFacility`. They overlap heavily, differ in error payloads, and in superadmin handling.
- **Current vs Expected**: Current = a reviewer cannot tell from a route registration whether authorisation is enforced, which helper is authoritative, or how superadmin behaves; two signatures exist for the same idea (`adminOnly` is a bare middleware, `requireRole(roles)` is a factory). Expected = one documented helper with explicit options.
- **Root Cause / Logic**: Organic growth — helpers added over time without consolidation, while `roleOnly`/`restrictTo` are pure aliases that only dilute the vocabulary.
- **Affected Files**: `backend/src/middleware/auth.js` (L94–L160)
- **UI/Frontend Impact**: Indirect — 401/403 bodies differ between helpers, so the frontend cannot handle authorisation failures uniformly.
- **Security/Data Risk**: **High.** Divergent helpers create review blind spots (a route that looks guarded because it calls a differently-semantic helper), and implicit superadmin bypasses are a classic privilege-escalation path.
- **Steps to Reproduce**: Compare the superadmin behaviour of a route guarded by `hospitalAdminOnly` with one guarded by `clinicalStaffOnly` using a superadmin token — `hospitalAdminOnly` and `clinicalStaffOnly` do **not** accept `superadmin`-by-role for `hospitalAdminOnly`'s `hospitalId` requirement, whereas `scopeToHospital`/`scopeToFacility`/`sameFacility` all early-return for superadmin.
- **Suggested Fix / Implementation Plan**: Consolidate to `authorize({ roles, allowSuperadmin })`, make superadmin bypass explicit and opt-in, standardise the 403 body, and delete `roleOnly`/`restrictTo` after migration.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Merge into one documented helper with explicit options
  - [ ] Delete the alias wrappers
  - [ ] Canonical 403 payload consumed by the frontend
  - [ ] Document the superadmin semantics for every guard

---

## [AUTHZ-003] `sameFacility` authorises against a value supplied by the caller
- **Description**: `sameFacility` reads the target facility from the **request**: `const targetId = req.body?.facilityId || req.query?.facilityId || req.params?.facilityId;` and compares it with the caller's own `facilityId`/`hospitalId`. When the caller simply omits the parameter (or passes their own facility id), the comparison is satisfied — so the guard cannot distinguish "accessing my own facility" from "accessing someone else's", because both are expressed by a value the caller controls.
- **Current vs Expected**: Current = attaching `sameFacility` to a route provides the *appearance* of tenant isolation while an attacker sets `?facilityId=<their own>` (or omits it) and reaches the target resource identified by the path/body. Expected = the resource is loaded and its `facilityId` compared server-side; the client never supplies the value being checked.
- **Flow**: Cross-tenant access on any route using this guard — the classic "validate the attacker's own input" bug.
- **Root Cause / Logic**: The middleware never loads the target document, so it has nothing trustworthy to compare against. It also silently no-ops when `targetId` is undefined.
- **Affected Files**: `backend/src/middleware/auth.js` (L154–L165)
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **High.** Any route relying on this guard for tenant isolation is bypassable by the caller. It is worse than no guard, because reviewers and tests treat the route as protected.
- **Steps to Reproduce**: Call a `sameFacility`-guarded route for another tenant's resource with no `facilityId` parameter → passes the guard; the handler then acts on the path-identified resource.
- **Suggested Fix / Implementation Plan**: Change the contract so the middleware loads the resource (by `req.params.id`) and compares its `facilityId` to the caller's; require the resource lookup to fail closed (404/403 when the resource is missing). Where the target is only known in the handler, move the check into a shared handler-level assertion instead of middleware. Add tests with an explicit cross-tenant id.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Rewrite `sameFacility` to load and compare the target resource
  - [ ] Fail closed when the target is missing or has no `facilityId`
  - [ ] Remove reliance on `req.body.facilityId` as an authorisation input
  - [ ] Cross-tenant tests for every route currently using it
  - [ ] Document the corrected contract

<!-- END -->
