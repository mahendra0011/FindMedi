# MASTER SUMMARY — FindMedi Platform Audit

**Repository**: `D:\projects\Findmedi` · **Audit date**: 2026-09-29 · **Scope**: backend API, frontend, infrastructure, data platform, tests/docs.
**Method**: multi-pass static analysis (reconnaissance → targeted module reads → repo-wide regex sweeps), with every finding anchored to a file and, where possible, a line range, so each can be reproduced, prioritised and closed independently.

---

## 1. What is in this report set

| File | Module | Findings |
|---|---|---|
| `auth-security-bugs.md` | Authentication, sessions, CSRF/CORS, tokens, audit logging | **18** (AUTH-001 … AUTH-018) |
| `auth-security-missing.md` | Session management, MFA and password policy | **4** (MISS-001 … MISS-004) |
| `authorization-rbac-bugs.md` | Authorisation model, route guards, tenant scoping | **3** (AUTHZ-001 … AUTHZ-003) |
| `authorization-rbac-missing.md` | Permissions, CI coverage checks, approval flows | **3** (MISS-AUTHZ-001 … -003) |
| `records-healthid-ehr-bugs.md` | Medical records, prescriptions, health ID, ABHA, consent | **12** (REC-001 … REC-012) |
| `records-healthid-ehr-missing.md` | Versioning, retention, access log, clinical safety, export | **6** (MISS-REC-001 … -006) |
| `payments-billing-ledger-bugs.md` | Payments, wallets, ledger, idempotency, invoices | **5** (PAY-001 … PAY-005) |
| `payments-billing-ledger-missing.md` | Gateway webhooks, refunds, reconciliation, dunning | **3** (MISS-PAY-001 … -003) |
| `rides-ambulance-emergency-bugs.md` | Ride/dispatch, SOS, ambulance, emergency doctor, Valhalla | **4** (RIDE-001 … RIDE-004) |
| `chat-realtime-bugs.md` | Socket.IO, chat/conversation authorisation | **4** (CHAT-001 … CHAT-004) |
| `pharmacy-lab-inventory-bugs.md` | Pharmacy, lab, inventory, diagnostics | **5** (PHARMA-001 … -003, LAB-001 … -002) |
| `lawyer-insurance-loyalty-bugs.md` | Legal bookings, insurance claims, loyalty, referral | **2** (LAW-001 … LAW-002) |
| `notifications-admin-audit-bugs.md` | Notifications, admin surfaces, audit trail | **2** (ADMIN-001 … ADMIN-002) |
| `frontend-ui-ux-bugs.md` | Token storage, HTTP clients, error UX, uploads | **2** (FE-001 … FE-002) |
| `data-platform-bugs.md` | Outbox, Kafka, OpenSearch, Pinot, lakehouse | **3** (DATA-001 … DATA-003) |
| `infra-devops-bugs.md` | nginx, TLS, proxying, compose hardening | **5** (INFRA-001 … INFRA-005) + notes |
| `testing-ci-documentation-quality.md` | CI, tests, type checking, docs drift | **2** (TEST-001 … TEST-002) |

**Total: 83 items across 17 files** — verified by count: **67 defects** in the `-bugs` files and **16 missing-feature items** in the four dedicated `-missing` files (the remaining modules carry their missing-feature items inside the module file).

---

## 2. Verification log — what this audit checked and corrected about itself

Rigour requires recording where an initial reading was wrong. Four assumptions were tested and overturned; the corrected positions are the ones used in the reports:

1. **"There are no tests and no CI."** **False.** `.github/workflows/ci.yml` runs backend lint + Jest/Supertest (18 suites in `backend/test/`), builds and tests the Rust native module on two operating systems, runs the frontend (Vitest) test/build/lint jobs, Playwright E2E with a mocked API, and k6 script validation; `uptime.yml` and Dependabot are also present. The **corrected** findings concern coverage (`TEST-001`, `TEST-002`), not absence.
2. **"`protect` is weak."** **Partly false, and worth stating plainly**: `protect` fetches the user from the database on every request and enforces `status === 'blocked'`, `isVerified` and doctor `approvalStatus`, and returns 503 (not 401) on a database error so clients do not log users out. That is a genuine strength. Its weakness is being the *only* guard on 324 endpoints (`AUTHZ-001`).
3. **"The frontend ignores CSRF."** **False.** Both `api/axios.js` (L61–63) and `api/api.js` (L79–80) read the `csrf-token` cookie and send `X-CSRF-Token`. The client half of double-submit is implemented; the server half is not enforced (`AUTH-017`).
4. **RBAC coverage numbers.** An initial sweep matched only `roleGuard`/`requireRole` and overstated the gap as 45 files / ~349 endpoints. `roleGuard` does not exist, and `roleOnly`, `restrictTo`, `scopeTo*` and `sameFacility` were uncounted. **Corrected and re-measured: 94 route files, 40 with no authorisation helper, 324 of 790 endpoints (41%).** The corrected figures are used throughout, including in `AUTHZ-001`.

Also verified as **correct rather than defective**: `twoFactorService.js` implements RFC 4648 base32 with `crypto.randomBytes`; `middleware/csrf.js` does implement a real `Origin`/`Referer` allowlist (the bug is the `next()` fallthrough, not the absence of a check); `sendPasswordChangedEmail` exists in `services/notificationService.js` and is called on password change; `config/audit.js` exists but is imported nowhere (`REC-011`).

**Limitations, stated explicitly**: this is a static audit — nothing was executed against a running instance, no penetration test was performed, and no production data was inspected. Several findings carry an inline verification TODO where a value needed to be read rather than inferred (e.g. the exact fields flowing to OpenSearch in `DATA-002`, whether notification `/:id` handlers scope by caller in `ADMIN-002`, and the truncated region of `healthId.js`). Those are marked as such in the individual reports instead of being asserted.

## 3. Severity distribution

| Severity | Count | Representative IDs |
|---|---|---|
| **Critical** | 8 | AUTH-017 (CSRF fails open), CHAT-001 (unauthenticated Socket.IO), CHAT-002 (identity spoofing), REC-001/REC-002 (records allow-by-default), REC-003 (`?search=` full dump), REC-004 (records mass-assignment), INFRA-001 (no TLS), AUTHZ-001 (systemic, 324 endpoints) |
| **High** | 38 | AUTH-001/002/005/018, REC-005 … REC-012, PAY-001 … PAY-005, RIDE-001 … RIDE-004, PHARMA-001/003, LAB-001/002, LAW-001/002, ADMIN-001, TEST-001/002, DATA-001/002, FE-001/002, INFRA-002/003, MISS-001 … MISS-003, MISS-PAY-001/002, MISS-AUTHZ-001/002, MISS-REC-001 |
| **Medium** | 28 | REC-010/011, PHARMA-002, ADMIN-002, INFRA-004/005, DATA-003, MISS-004, MISS-AUTHZ-003/004, MISS-REC-002/003/004/006, MISS-PAY-003 … |
| **Low** | 9 | CHAT-004 and the structural/maintainability items |

**46 of 83 items are High or Critical**, and a large share of those are the *same* defect recurring: an authorisation decision that lives inside a handler instead of on the route.

---

## 4. The ten findings to fix first

1. **`AUTHZ-001`** — 324 of 790 endpoints have no authorisation helper. `records.js`, `billing.js`, `transactions.js`, `loyalty.js`, `chat.js`, `lab.js`, `auditLogs.js` and all the dispatch files are in the set. Everything else in this list is a symptom or an amplifier.
2. **`AUTH-017`** — `middleware/csrf.js` ends in `next()`, so the token check only runs for clients that send no `Origin`/`Referer`. With the `startsWith` origin check (`AUTH-001`) and `sameSite: 'none'`, browsers can be CSRF'd on every state-changing route.
3. **`CHAT-001` / `CHAT-002`** — Socket.IO never verifies a token: any anonymous client can join `user:<any id>` and receive that user's notifications and chat, and event payloads let a client set `from`, `senderId`, `riderId` and `userId` — impersonation and forged GPS positions follow.
4. **`REC-001` / `REC-002` / `REC-003`** — `GET /api/records/patient/:patientId` and `GET /api/records` are allow-by-default for any role not explicitly listed, and `?search=` *overwrites* the ownership `$or` instead of intersecting with it, turning a scoped list into a full dump for **every** role including patients.
5. **`REC-004`** — `PUT /api/records/:id` passes raw `req.body` to `findByIdAndUpdate`, and its tenant check is skipped when the record has no `hospitalId` (the normal case for patient-created records): any authenticated user can rewrite a diagnosis or prescription, or reassign a record to themselves.
6. **`INFRA-001`** — no TLS at the edge despite the "TLS termination" comment, and no security headers; credentials and medical data cross the network in plaintext.
7. **`PAY-001` / `PAY-002` / `PAY-003`** — wallet balances are debited by read-then-write with no transaction; refunds and confirmations are open to any authenticated user and credit the *payment owner's* wallet; the idempotency guard uses a global, unscoped, fail-open key and is wired to exactly one route.
8. **`LAB-001`** — lab result entry *and* verification are gated on `adminOnly` (hospital admin/superadmin), so a non-clinical account can author and self-verify a pathology result with no separation of duties.
9. **`ADMIN-001`** — the audit-trail reader has no role guard, so the record of who accessed what may be readable by any authenticated user.
10. **`TEST-001` / `TEST-002`** — the frontend type check cannot fail a build (baseline ~12,784 errors), E2E runs against mocks, and nothing asserts cross-user or cross-tenant denial. Without this, none of the fixes above stay fixed.

**Proposed order**: TLS and the CSRF fallthrough first (one-line/staging-level fixes with the largest blast radius), then `AUTHZ-001` as a mechanical sweep with the CI route check, then the records, socket, payments and lab clusters, with the authorisation test matrix landing before the sweep so the fixes are provable.

## 5. Systemic root causes (fix these, not just the symptoms)

1. **Authorisation is a handler responsibility, not a route declaration.** With ten overlapping role helpers and 324 endpoints carrying none, correctness depends on every developer remembering an inline check on every route — and this audit found seven separate modules where that failed. The fix that matters is structural: one `authorize()` vocabulary plus a CI check that fails a build when a route has no guard.
2. **Fail-open is the codebase's default posture.** `csrfProtection`'s trailing `next()`, `requireValidatedFile` returning `true` for a missing signature, `idempotencyGuard` passing through when Redis is down or the header is absent, tenant checks skipped when `hospitalId` is undefined, ABDM accepting a published OTP. Each is locally reasonable and collectively fatal.
3. **Documentation and implementation have diverged, and the docs are read as truth.** "TLS termination" with no TLS; `openapi.js` documenting "Rotate refresh token" when no rotation exists; `config/audit.js` describing `AUDIT_ENABLED`/`AUDIT_RETENTION_DAYS` that nothing imports; specs 10–16 describing a lakehouse implemented only for surge metrics; a traceability index asserting completion. Every spec should carry a status header verified by CI.
4. **Duplication instead of consolidation.** Two HTTP clients in the frontend, two invoice/bill implementations in payments, two health-ID token rotations, two consent models (`records.js` and `mentalhealth.js`), `utils/validate.js` (used by 57 route files) versus an unused `middleware/validate.js` with identically-named schemas. Duplicates drift, and the drift is where the bugs are.
5. **PHI has no single owner.** Records, prescriptions, lab orders, ride receipts, notification text, insurance claims and chat all carry health data, guarded by six different patterns and no shared scope helper; `Record.data` is an unvalidated blob; PHI is mirrored into a search index and an event stream. Until there is one scope primitive and a data-classification table, each new feature re-invents the exposure.
6. **Money correctness relies on ordering, not invariants.** Read-then-write balance arithmetic, a ledger written after the fact, the only outbox usage in the codebase sitting outside the money path, and reconciliation that does not exist. Make the ledger the system of record and the debit a single conditional update.

---

## 6. Phase roadmap

**Phase 1 — Stop the bleeding (days, not weeks)**
Enable TLS + security headers (`INFRA-001`); fix the CSRF fallthrough and exact-origin matching (`AUTH-017`, `AUTH-001`); add `io.use()` token verification and remove client-supplied identities (`CHAT-001/002`); add a record-scope guard and fix the `?search=` overwrite and mass-assignment (`REC-001/002/003/004`); `superadminOnly` on `auditLogs.js` (`ADMIN-001`); add `authorize()` and the CI route-coverage check, then sweep the 40 zero-guard files (`AUTHZ-001`, `MISS-AUTHZ-002`); set `X-Forwarded-For`/`X-Forwarded-Proto` and `trust proxy` (`INFRA-003`); ship the authorisation test matrix (`TEST-002`).

**Phase 2 — Integrity, money and clinical safety**
Atomic conditional balance updates + transaction/outbox (`PAY-001`, `DATA-001`); authorise and make idempotent the payment transitions (`PAY-002`, `PAY-003`); gateway webhook with signature verification (`MISS-PAY-001`); partial refunds with a reason and an approver (`MISS-PAY-002`); record versioning and soft delete (`MISS-REC-001/002`); lab role separation (`LAB-001/002`); reconcile role/tenant identity into one model (`ADMIN-003`); permissions instead of role names (`MISS-AUTHZ-001`); refresh-token rotation and session revocation (`MISS-002`, `MISS-001`); escape regex everywhere (`REC-006`, `PHARMA-003`); tighten the type-check ratchet (`TEST-001`); verify and enforce analytics redaction (`DATA-002`); enable malware scanning (`requireValidatedFile`).

**Phase 3 — Governance and operability**
Reconciliation and statements (`MISS-PAY-003`); failed-payment lifecycle (`MISS-PAY-004`); patient access log, retention and legal hold (`MISS-REC-002/003`); notification ownership + retention (`ADMIN-002`); denial logging and alerts (`MISS-AUTHZ-004`); maker–checker approvals (`MISS-AUTHZ-003`); a role-change endpoint with guardrails (`MISS-AUTHZ-005`); compose hardening — resource limits, secrets, log rotation (`INFRA-005`); spec status headers (`DATA-003`).

**Phase 4 — Clinical and privacy depth**
Consent enforcement on the read path (`REC-012`); real ABDM integration or a hard fail-closed mode (`REC-009`); clinical safety — allergy/interaction checks, ICD validation (`MISS-REC-004`); export and FHIR (`MISS-REC-005`); dependents and break-glass (`MISS-REC-006`, `MISS-AUTHZ-006`); purpose binding and minimum-necessary projections (`MISS-AUTHZ-006`); DPDP consent/erasure/retention flows; password policy and breach checks (`MISS-004`).

## 7. Health score

| Dimension | Score | Basis |
|---|---|---|
| **Authentication** | 6/10 | `protect` does real per-request work and 2FA is correctly implemented, but CSRF is unenforced, tokens live in `localStorage`, and there is no rotation, revocation, session list or account lockout. |
| **Authorisation** | 3/10 | 41% of endpoints have no guard; ten divergent helpers; one of them authorises on caller-supplied input. |
| **PHI confidentiality** | 3/10 | Records, prescriptions, lab orders, receipts, claims and chat are reachable by roles that should not see them; consent is not enforced; PHI is mirrored into analytics without demonstrated redaction. |
| **Financial integrity** | 4/10 | A double-entry ledger and an outbox exist, but the money path uses neither; refunds and transitions are unauthorised and replayable. |
| **Clinical safety** | 4/10 | Vitals, ICD fields and allergies are captured; none of it is used to protect a patient, and result verification has no separation of duties. |
| **Reliability / infra** | 4/10 | Compose orchestration and a broad CI pipeline are real strengths; no TLS, no resource limits, one healthcheck, no reconciliation. |
| **Testing & CI** | 6/10 | Genuinely good CI breadth (backend, Rust, frontend, E2E, k6) undermined by a non-blocking type check and the absence of any negative-path authorisation test. |
| **Documentation** | 6/10 | 30+ documents and a traceability index are real assets, but they describe an *intended* system rather than tracking the implemented one — and are read as authoritative. |
| **Overall** | **4.5/10** | A broad, ambitious platform with far more implemented scaffolding than most audits encounter, whose security posture rests on fail-open defaults and handler-level checks. The Phase 1 list is small and concrete; the score is recoverable to roughly 7/10 without architectural rewrites, provided the authorisation test matrix lands first. |

---

## 8. Coverage gaps — where the next pass should start

This set is module-complete for the backend's high-risk surface, but the following areas were identified and **not** yet written as dedicated files. They are listed so the next pass begins where this one stopped, rather than from scratch:

- **Missing-features companions** for rides/emergency, chat/realtime, pharmacy/lab, lawyer/insurance/loyalty, notifications/admin, frontend, data-platform and infra. The four largest modules have dedicated `-missing.md` files; the remainder carry a "missing features" or TODO section inside the module file (a deliberate consolidation, since their defect lists are shorter).
- **Thin-coverage modules**: `referral.js` (8 routes, 0 guards), `supportTickets.js`, `reviews.js` / `reviewModeration.js`, `disputes.js`, `tokens.js`, HR files (`staff.js`, `leaveRequests.js`, `scheduleChangeRequests.js`), `physio.js`, `diet.js`, `nursing.js`, `radiology.js`, `housekeeping.js`, `bloodbank.js`, `surge.js`, `platform.js` / `platformCoupons.js` / `featuredListings.js`, `systemSettings.js`, `export.js`, `integrations.js` (whose connection "test" performs no real call), `assistants.js`, `carePlans.js`, `clinicalAlerts.js`, `vitals.js`, `medicineReminders.js`, `demoSeedService.js`.
- **`backend/rust-helper`** — CI builds and tests it; its API surface, memory-safety characteristics and the data crossing the FFI boundary were not audited.
- **OpenSearch/Pinot access control** and the **OpenAPI document** (`backend/src/lib/openapi.js`, 352 lines) as a source of client-contract drift.
- **`.kilo/worktrees/**`** — a stale second worktree of the repository is committed, which will mislead any future automated scan or file count. This audit's sweeps were scoped to `backend/src` and were unaffected, but it should be removed from version control.
- **Dynamic verification** — the findings here are static. Confirm them by executing the Phase 1 reproduction steps against a staging deployment, and convert each confirmation into the `TEST-002` authorisation matrix so the fix is locked in.

---

## 9. What the platform does well (worth preserving)

An audit that only lists defects misleads. These are genuine strengths and are referenced as such in the individual reports:

- **CI breadth**: four jobs (backend, Rust native module on two OSes, frontend test/build/lint, mocked Playwright E2E) plus k6 validation, Dependabot and an uptime workflow.
- **`protect`** does per-request database checks for blocked status, email verification and doctor approval, and returns 503 rather than 401 on a database failure so clients do not spuriously log users out.
- **Two-factor authentication** is implemented correctly at the crypto level (RFC 4648 base32, `crypto.randomBytes`) — its problems are duplicated state and inconsistent enforcement, not the primitives.
- **Dispatch flows are the best-tested code in the repository** (`instant-dispatch.test.js` 189 lines, `emergency-sos.test.js` 167, `emergency-doctor.test.js` 121) and the only ones using `idempotencyGuard()` on transitions — a pattern worth propagating.
- **The transactional outbox, dead-letter/consumer service, ledger service and Prisma mirror all exist**; the work needed is to route the money path through them, not to invent them.
- **A double-entry ledger** already models DEBIT/CREDIT pairs with a booking reference — the correct foundation for reconciliation.
- **Audit logging is broad** (records, prescriptions, payments, appointments, consents) with a TTL-managed collection; the gaps are enforcement and retention configuration, not coverage of events.
- **Documentation and specification depth** (30+ files including 26 architecture specs, an infra operations checklist and a phased roadmap) is unusual and valuable — it needs a status field, not replacement.

---

*End of master summary. Per-module detail, reproduction steps and fix plans are in the 17 companion files listed in section 1; the ten items in section 4 are the recommended starting point.*
