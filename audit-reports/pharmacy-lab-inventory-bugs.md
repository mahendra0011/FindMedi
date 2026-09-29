# Pharmacy / Lab / Inventory / Diagnostics — Bugs

Scope: `routes/pharmacy.js` (842 lines, 39 routes), `routes/lab.js` (709 lines, 29 routes), `routes/inventory.js` (16 routes), `routes/radiology.js` (9), `routes/diet.js` (9), `routes/physio.js` (9), `routes/nursing.js` (7).
Companion: `AUTHZ-001` (40 files with no authorisation helper) — `pharmacy.js` and `inventory.js` are in that set.

---

## [PHARMA-001] HIGH — Medicine catalogue mutations and order endpoints are protected by role-in-handler logic only
- **Description**: `pharmacy.js` is the largest route file after `chat.js` and `lab.js` (842 lines, 39 routes). Its authorisation strategy is inline: **28** `req.user.role` comparisons and **35** `req.user._id` comparisons, but only **2** uses of any authorisation helper. Routes such as `POST /medicines`, `PUT /medicines/:id`, `DELETE /medicines/:id` and `PUT /medicines/:id/stock` carry `protect` + zod validation and nothing else — so whether a given account can add, alter, delete or restock a medicine in a pharmacy it does not own depends entirely on a check inside each handler.
- **Current vs Expected**: Current = a caller's authority is a per-handler implementation detail across 39 endpoints; the `AUTHZ-001` sweep shows the omissions this pattern produces elsewhere. Expected = `authorize('pharmacist','pharmacy_admin')` plus a store-ownership assertion declared on the route, with handlers owning only business rules.
- **Flow**: Store management and fulfilment. Stock manipulation and medicine deletion are integrity-critical: altering a price, composition or stock count in a live pharmacy is both a fraud and a patient-safety vector, since a substitution can be made without trace.
- **Root Cause / Logic**: Authorisation implemented as inline conditionals in a file grown to 39 endpoints — the same shape that produced `REC-001/002` and `CHAT-003`.
- **Affected Files**: `routes/pharmacy.js` (39 registrations; `POST|PUT|DELETE /medicines*`), `models/Medicine.js`, `models/PharmacyOrder.js`
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **High.** Cross-store catalogue manipulation, price tampering and unauthorised order-state changes — each directly monetisable.
- **Steps to Reproduce**: With a pharmacy-owner token, mutate a medicine belonging to a different store; then repeat with a patient token and record which calls succeed.
- **Suggested Fix / Implementation Plan**: Add declarative `authorize(...)` plus a `requireStoreOwner` guard to every mutating pharmacy route, convert the 28 inline role checks to that vocabulary, and add a (route × role × ownership) test matrix so the policy is verifiable rather than implicit.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Declarative guards on all mutating pharmacy routes
  - [ ] `requireStoreOwner` for store-scoped resources
  - [ ] (route × role × ownership) test matrix
  - [ ] Document the pharmacy/store role matrix

---

## [PHARMA-002] Three pharmacy catalogue endpoints are fully public
- **Description**: `GET /medicines/store/:storeId`, `GET /stores/near` and `GET /search-medicine` are registered with **no `protect`** at all, in a file whose remaining routes are authenticated. This exposes per-store inventory (which medicines a store holds, and stock levels where the model includes them) and the store list with locations to anonymous callers.
- **Current vs Expected**: Current = anonymous enumeration of store inventory and location. Expected = an explicit decision per endpoint: either public with a deliberately minimal projection (name, generic name, availability flag) and throttling, or authenticated.
- **Flow**: Public medicine search (a reasonable product requirement) versus store-level inventory disclosure (probably not intended).
- **Root Cause / Logic**: Public read endpoints added for the search funnel without a projection review or rate limiting.
- **Affected Files**: `routes/pharmacy.js` (three registrations), `models/PharmacyStore.js`, `models/Medicine.js`
- **UI/Frontend Impact**: Yes indirectly — the public search page consumes these, so any change is a frontend contract change.
- **Security/Data Risk**: **Medium.** Competitive intelligence across a store network and an unauthenticated scraping surface; also an unthrottled public endpoint hitting search paths that build unescaped regexes (REC-006).
- **Steps to Reproduce**: Call all three endpoints with no `Authorization` header.
- **Suggested Fix / Implementation Plan**: Decide and document each endpoint's classification; keep search public but return a non-sensitive projection (no stock quantities or internal ids), add rate limiting, and require auth for store-scoped inventory.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Classify each public pharmacy endpoint explicitly
  - [ ] Minimal projection for public search
  - [ ] Rate-limit public search
  - [ ] Auth required for store inventory

## [PHARMA-003] Unescaped regex in the two heaviest users of `new RegExp` (pharmacy: 10 sites, inventory: 6)
- **Description**: The repository-wide sweep for `new RegExp(` reports **`pharmacy.js` with 10 sites and `inventory.js` with 6** — the two highest counts in the codebase — and neither file contains an escaping helper (`escapeRegex` exists only in `chat.js`; see REC-006). Medicine name, batch and manufacturer searches therefore pass user input into the regex engine unescaped.
- **Current vs Expected**: Current = a crafted `search` parameter runs a catastrophic-backtracking pattern (stalling the single-threaded event loop for every user) and metacharacters give callers a match-anything filter. Expected = escaped, length-capped input — or indexed prefix/`$text` search.
- **Flow**: Every pharmacy and inventory search box, **including the two public endpoints in PHARMA-002**, which makes the attack unauthenticated.
- **Root Cause / Logic**: The escaping helper was never extracted from `chat.js`, so the files with the most regex usage have none (`CHAT-004`).
- **Affected Files**: `routes/pharmacy.js` (10 sites), `routes/inventory.js` (6 sites), `routes/{hospitals,doctors,clinics,facilities,triage,lab,patients,insurance}.js` (4–5 sites each)
- **UI/Frontend Impact**: None visible; manifests as the API hanging or timing out.
- **Security/Data Risk**: **High.** Unauthenticated denial of service against a single-threaded Node process (public search + catastrophic backtracking), plus filter bypass.
- **Steps to Reproduce**: `GET /api/pharmacy/search-medicine?q=((a%2B)%2B)%2B%24` and observe the event-loop stall.
- **Suggested Fix / Implementation Plan**: Promote `escapeRegex` to `utils/`, apply it at all 57 sites (REC-006), cap `q`/`search` length, rate-limit public search, and add a CI grep failing on `new RegExp(req.` outside `utils/`.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Shared `escapeRegex` applied everywhere
  - [ ] Length caps on every search parameter
  - [ ] Rate-limit the public search endpoints
  - [ ] CI check for unescaped regex construction

---

## [LAB-001] HIGH — Diagnostic result entry and verification are gated on `adminOnly`, not on a laboratory role
- **Description**: `lab.js` registers `PUT /orders/:id/enter-result` and `PUT /orders/:id/verify` as `protect, adminOnly, validate(...)`. `adminOnly` accepts exactly `hospital_admin` and `superadmin` — administrative roles — so the two most clinically consequential actions in the module (authoring and authorising a diagnostic result) are reserved for non-clinical administrators and withheld from any dedicated lab role.
- **Current vs Expected**: Current = a hospital administrator can create and verify a pathology result, and there is no separation between the person who enters a result and the person who verifies it. Expected = entry by a technician (`lab_technician`) and verification by a different authorised person (`lab_admin`/pathologist), with the verifier never being the enterer.
- **Flow**: Sample registration → collection → result entry → verification → report delivery. Verification is the control that makes a lab report trustworthy, so weakening it removes the module's integrity guarantee.
- **Root Cause / Logic**: `adminOnly` was the nearest available guard when the routes were written; no lab-specific role guard was created, and no separation-of-duties rule exists between entry and verification.
- **Affected Files**: `routes/lab.js` (the two registrations), `models/LabOrder.js`, `models/User.js` (role enum), `middleware/auth.js` (`adminOnly`)
- **UI/Frontend Impact**: Yes — the lab dashboard's affordances presumably assume a technician role the API does not accept for these actions, producing 403s or forcing staff to use an admin account for routine work.
- **Security/Data Risk**: **High (clinical integrity).** A non-clinical account can author and self-verify a diagnostic result; there is no enforced separation of duties, and the identity recorded as verifier carries no clinical meaning.
- **Steps to Reproduce**: With a `hospital_admin` token, `PUT /api/lab/orders/<id>/enter-result` then immediately `PUT /api/lab/orders/<id>/verify` → both succeed with no second party.
- **Suggested Fix / Implementation Plan**: Introduce `authorize('lab_technician')` for entry and `authorize('lab_admin','pathologist')` for verification; enforce `verifiedBy !== enteredBy`; audit both actions with actor and timestamp; if those roles do not exist in `User.role`, add them rather than overloading `adminOnly`.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Lab-specific roles + guards for entry and verification
  - [ ] Enforce `verifiedBy !== enteredBy`
  - [ ] Audit both actions with actor
  - [ ] Align the frontend's lab affordances with the real policy
  - [ ] Review other `adminOnly` usages that mean "not sure which role" (see `AUTHZ-002`)

## [LAB-002] Lab orders and results are addressable by any authenticated user, and report delivery is unguarded
- **Description**: `GET /orders`, `GET /orders/:id`, `PUT /orders/:id/register-sample`, `PUT /orders/:id/collect-sample` and `PUT /orders/:id/deliver-report` carry `protect` (plus zod on some) with no role or ownership guard declared. `lab.js` has only 12 helper usages across 29 routes, concentrated on the two `adminOnly` routes, so these five depend on inline checks.
- **Current vs Expected**: Current = any authenticated account can fetch a lab order by id (patient identity, test panel, results) and can mark a report delivered, changing clinical workflow state. Expected = patient-owned read access, lab-staff write access scoped to their facility, and delivery restricted to the fulfilling lab.
- **Flow**: Order intake through report delivery — the path a patient's diagnosis travels before a doctor sees it.
- **Root Cause / Logic**: The same inline-authorisation pattern as `PHARMA-001`; the two `adminOnly` routes show guards were added only where someone remembered.
- **Affected Files**: `routes/lab.js` (the five registrations), `models/LabOrder.js`
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **High.** Diagnostic results are among the most sensitive artefacts on the platform; enumerable ids expose them, and the ability to flip delivery state lets a caller hide or fabricate fulfilment.
- **Steps to Reproduce**: With an unrelated account, `GET /api/lab/orders/<id>` for an iterated id; then `PUT /api/lab/orders/<id>/deliver-report`.
- **Suggested Fix / Implementation Plan**: Apply declarative guards — patient ownership for reads, `authorize('lab_technician','lab_admin')` for sample handling, facility scoping via a shared guard — and add (route × role) tests. Audit delivery.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Declarative guards on all lab order routes
  - [ ] Patient-ownership read scope
  - [ ] Facility scoping for lab staff
  - [ ] (route × role) test matrix
  - [ ] Audit report delivery

<!-- END -->
