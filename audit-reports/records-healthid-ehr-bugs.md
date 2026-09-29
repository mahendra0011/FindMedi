# Records / Health-ID / EHR — Bugs

Scope: `routes/{records,healthId,patient,patients,drive,upload}.js`, `models/{Record,Patient,PatientAddress,FamilyMember,HealthPackage}.js`,
`middleware/{auth,upload}.js` (upload path), `services/{driveService,cloudinaryService,napiImageService}.js`.

---

## [REC-001] CRITICAL — `GET /api/records/patient/:patientId` returns any patient's full medical record to any authenticated role
- **Description**: The handler builds `filter = { patientId: req.params.patientId }` and then *conditionally* narrows it per role (`patient` → own id; `doctor`/`counsellor`/`psychiatrist` → `doctorProfileId`; `hospital_admin` → `hospitalId`). There is **no `else` branch**, so for every other role the filter stays exactly as supplied by the caller.
- **Current vs Expected**: Current = a token for `rider`, `lawyer`, `assistant`, `delivery_boy`, `pharmacy_owner`, `lab_owner`, `nurse`, `security`, `technician`, `helper`, `accountant`, `staff` or `ambulance` (all valid values in `User.role`, `User.js` L9) can request `/api/records/patient/<any ObjectId>` and receive that patient's complete record set. A `hospital_admin` **without** a `hospitalId` on the token is equally unrestricted. Expected = default-deny, with explicit grants per role.
- **Flow**: A low-privilege account (e.g. a self-registered delivery partner, or any compromised low-trust account) enumerates ObjectIds and exfiltrates diagnoses, prescriptions and notes. Also reachable by any role added later, since the default is "allow".
- **Root Cause / Logic**: Allow-by-default role branching. The code is structured as "remove restrictions for known roles" instead of "grant access only to known-good relationships". `routes/records.js` L68–L99.
- **Affected Files**: `backend/src/routes/records.js` (L68–L99). Related: `middleware/auth.js` L167–L198 (`canAccessRecord`) and L200–L231 (`canAccessPatient`) implement the correct ownership logic but are **never imported anywhere** (verified by grep across all files) — so the intended guard is dead code.
- **UI/Frontend Impact**: None visible; the leak is silent and returns HTTP 200 with a normal-looking payload.
- **Security/Data Risk**: **Critical.** Unauthorised disclosure of PHI at scale, across tenants, to the lowest-privilege roles. This is the single highest-severity item in the audit and is exactly the class of exposure a healthcare compliance review fails on.
- **Steps to Reproduce**: 1) Register/obtain any `delivery_boy` or `rider` account token. 2) `GET /api/records/patient/<victimUserId>` with that token. 3) Full record array returned with 200.
- **Suggested Fix / Implementation Plan**: Invert to deny-by-default: `let filter = null;` then set it only inside known-role branches; if `filter` is still `null`, return 403. Wire the existing `canAccessRecord`/`canAccessPatient` middleware (or a corrected version) onto these handlers, and add a `patientId`-ownership assertion. Add a shared `scopeRecordsFor(req.user)` helper so `GET /` and `GET /patient/:patientId` cannot diverge again.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Deny-by-default in `GET /patient/:patientId` (and `GET /`)
  - [ ] Handle `hospital_admin` with a null `hospitalId` explicitly
  - [ ] Wire or delete the dead `canAccessRecord` / `canAccessPatient` middleware
  - [ ] Add cross-role tests: each non-privileged role must receive 403
  - [ ] Audit every other role-branching filter in the codebase for the same allow-by-default shape

---

## [REC-002] CRITICAL — `GET /api/records` returns every record on the platform to unmatched roles
- **Description**: Same defect class as REC-001 but wider: when the role matches none of the three branches, `filter` remains `{}`. The only other predicate applied is `filter.doctor = { $ne: 'Self Upload' }` for non-patients. The query is therefore "all records except patient self-uploads", paginated.
- **Current vs Expected**: Current = a `rider`/`lawyer`/`nurse`/`staff` token enumerates the whole platform's medical records page by page. Expected = confined to the caller's own/assigned/tenant records.
- **Flow**: Bulk exfiltration. Pagination makes the entire dataset walkable.
- **Root Cause / Logic**: Identical allow-by-default branching. `routes/records.js` L26–L66.
- **Affected Files**: `backend/src/routes/records.js` (L26–L66)
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **Critical.** Full-database PHI disclosure — worse than REC-001 because it requires no target id, so no knowledge of any victim is needed.
- **Steps to Reproduce**: `GET /api/records?page=1&limit=100` with a `delivery_boy` token → records belonging to unrelated patients and hospitals.
- **Suggested Fix / Implementation Plan**: Same fix as REC-001, sharing one scoping helper. Add a mandatory `hospitalId`/`facilityId` tenant predicate for any staff role, and a superadmin-only explicit "all records" path.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Deny-by-default; fix the missing `else`
  - [ ] Require a tenant predicate for every staff role
  - [ ] Add an integration test asserting a `rider` token sees zero unrelated records
  - [ ] Consider a Mongo query-shape assertion in tests (fail if the filter is empty for non-superadmin)

## [REC-003] CRITICAL — `?search=` overwrites the ownership `$or`, turning `GET /api/records` into a full dump for *every* role
- **Description**: The ownership predicate is assigned to `filter.$or` and then **reassigned** (not `$and`-ed) by the free-text search:
  ```js
  if (req.user.role === 'patient') { filter.$or = [{ patientId: req.user._id }, ...] }
  if (search) filter.$or = [ { patient: new RegExp(search,'i') }, { doctor: ... }, { diagnosis: ... } ];
  ```
  Because the second statement replaces the first key, the resulting query has **no ownership predicate at all**.
- **Current vs Expected**: Current = `GET /api/records?search=a` returns every record in the database whose patient/doctor/diagnosis contains "a" — i.e. effectively all of them — for a patient, a rider, a lawyer, anyone. Expected = search narrows *within* the caller's authorised scope only.
- **Flow**: Trivial one-parameter bulk PHI download, reachable even by a normal patient account. No knowledge of any victim required.
- **Root Cause / Logic**: Reusing the same query key (`$or`) for two logically independent constraints instead of `filter.$and = [{ $or: scope }, { $or: searchTerms }]`. `routes/records.js` L31–L50.
- **Affected Files**: `backend/src/routes/records.js` (L31–L50)
- **UI/Frontend Impact**: None visible — a normal-looking search box silently changes the result set from "mine" to "everyone's".
- **Security/Data Risk**: **Critical.** Same impact as REC-002 via a single query string, and it defeats the (otherwise correct) patient-scoping logic that `GET /` was given. This is the most likely real-world exfiltration path in the whole platform because it needs no special role.
- **Steps to Reproduce**: Log in as any patient. `GET /api/records?search=a&limit=100` → records belonging to strangers and other hospitals.
- **Suggested Fix / Implementation Plan**: Compose scope and search with `$and`. Enforce scope in a single helper used by all record queries. Never let a request parameter reassign a key that carries authorisation meaning. Add a test that asserts the query object always contains an ownership constraint.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Wrap scope + search in `$and`
  - [ ] Add a "scope is always present" assertion in the records service
  - [ ] Regression test: patient + `search` returns zero foreign records
  - [ ] Grep the whole codebase for other `filter.$or =` reassignments of an authorisation key

---

## [REC-004] Mass assignment on `PUT /api/records/:id` — medical records are freely rewritable, and the tenant check is skippable
- **Description**: Three defects in one handler. (a) `Record.findByIdAndUpdate(req.params.id, req.body, { new: true })` passes **raw client body** — `patientId`, `doctorId`, `hospitalId`, `diagnosis`, `prescription`, `data`, `vitals`, `icdCodes`, `attachments` are all overwritable, so an attacker can rewrite a prescription or reassign a record to themselves. (b) The tenant guard is `if (req.user.hospitalId && existing.hospitalId && ...)` — if the record has **no** `hospitalId` the guard short-circuits and is skipped entirely. (c) `POST /` writes `hospitalId: req.body.hospitalId || req.user.hospitalId || undefined`, so patient-created records routinely have **no** `hospitalId`, making them globally writable by any authenticated user.
- **Current vs Expected**: Current = any authenticated user can rewrite or retarget any record that lacks a `hospitalId` (and can set `hospitalId` themselves to move records between tenants). Expected = explicit field allowlist, ownership asserted server-side, tenant immutable.
- **Flow**: Doctor/pharmacist/admin record lifecycle. A tampered prescription or a record moved to another hospital is a clinical-safety and fraud vector, not just a data-integrity one.
- **Root Cause / Logic**: No `validate(updateRecordSchema)` on the route (contrast `POST /`, which does validate) and a negated-conjunction guard that fails open when data is missing.
- **Affected Files**: `backend/src/routes/records.js` (L167–L182, L226–L241), `backend/src/models/Record.js` (L12, L56)
- **UI/Frontend Impact**: Yes — edited fields silently change what a doctor sees at the point of care.
- **Security/Data Risk**: **Critical (integrity).** Unauthorised modification of medical records breaks non-repudiation, invalidates the audit trail (only `recordId` is logged, never a diff), and is a clinical-safety issue if a prescription is altered.
- **Steps to Reproduce**: As any non-patient account, `PUT /api/records/<id>` with `{ "diagnosis":"x", "patientId":"<self>" }` against a record with no `hospitalId` → 200.
- **Suggested Fix / Implementation Plan**: Add a strict zod `updateRecordSchema` (`.strict()`) listing only editable fields. Assert ownership via a shared guard: patient → own record; doctor → `doctorId === req.user.doctorProfileId`; staff → same tenant **and reject when `hospitalId` is missing** (`if (!existing.hospitalId || existing.hospitalId != req.user.hospitalId) return 403`). Make `hospitalId` immutable after creation. Log a field-level diff in `auditLog`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `validate(updateRecordSchema)` with `.strict()`
  - [ ] Fix the fail-open tenant guard (both `PUT` and `DELETE`)
  - [ ] Immutable `hospitalId`; backfill `hospitalId` on existing records
  - [ ] Require `hospitalId` at creation (drop the `undefined` fallback)
  - [ ] Audit log must record changed fields
  - [ ] Sweep the codebase for other `findByIdAndUpdate(id, req.body)` mass-assignment sites

## [REC-005] Operator-precedence bug: counsellors and psychiatrists can never create a record
- **Description**: `if (!finalPatientId && req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist')` parses as `(!finalPatientId && role === 'doctor') || role === 'counsellor' || role === 'psychiatrist'`. For `counsellor`/`psychiatrist` the condition is unconditionally true, so the handler always returns `400 Patient not found`.
- **Current vs Expected**: Current = those two roles cannot create any medical record at all, even with a valid `patientId`. Expected = the guard fires only when the patient is genuinely unresolved.
- **Flow**: Mental-health / counselling documentation flow is entirely broken, and the merged `mentalhealth.js` module depends on record creation.
- **Root Cause / Logic**: Missing parentheses around the role disjunction (`routes/records.js` L117–L119).
- **Affected Files**: `backend/src/routes/records.js` (L117–L119)
- **UI/Frontend Impact**: **Yes** — a counsellor's "Save record" always fails with a misleading "patient not found" message, with no way to succeed.
- **Security/Data Risk**: Low security impact; **high** clinical/functional impact (missing documentation, silent data loss for a vulnerable patient cohort).
- **Steps to Reproduce**: Log in as `counsellor`, `POST /api/records` with a valid `patientId` → 400.
- **Suggested Fix / Implementation Plan**: `const clinicianRoles = ['doctor','counsellor','psychiatrist']; if (!finalPatientId && clinicianRoles.includes(req.user.role)) return res.status(400)...`. Enable ESLint `no-mixed-operators` so this class cannot recur.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Fix the precedence bug
  - [ ] Test record creation for all three clinician roles
  - [ ] Enable `no-mixed-operators` and sweep for other `&&`/`||` mixtures
  - [ ] Handle the non-clinician fallthrough: any other role may currently create a record with `patientId: undefined`

---

## [REC-006] Regex injection / ReDoS from user input in 57 files (and no shared escape helper)
- **Description**: `search` and `patient` query params are passed straight into `new RegExp(...)`: `{ patient: new RegExp(search, 'i') }`. A grep for a shared `escapeRegex` helper finds it defined **only** inside `routes/chat.js` (L144) and used 3 times there; everywhere else the raw pattern is constructed. `new RegExp(` appears in **57 files**, most heavily `pharmacy.js` (10), `inventory.js` (6), `hospitals.js` (5), `lawyerService.js` (5), `assistants.js` (5).
- **Current vs Expected**: Current = a pattern such as `(a+)+$` supplied as `?search=` pins a CPU core (ReDoS, trivially weaponised against a small VPS), and metacharacters like `.*` let a caller match data the UI never intended to expose. Expected = all user input escaped before it reaches the regex engine, with a length cap.
- **Flow**: Every list/search endpoint — records, pharmacy, inventory, doctors, labs, insurance, lawyers.
- **Root Cause / Logic**: Regex construction from request input without escaping, and no shared utility, so each of the 57 files re-implements or forgets it.
- **Affected Files**: `backend/src/routes/records.js` (L47–L49), `backend/src/routes/chat.js` (L144 — the only correct implementation), plus the 56 other files reported by the sweep
- **UI/Frontend Impact**: None visible; manifests as the API hanging or timing out.
- **Security/Data Risk**: **High.** Denial of service (Node is single-threaded — one expensive pattern stalls every user) plus an over-broad-match vector that can turn a scoped search into a broad read.
- **Steps to Reproduce**: Issue `GET /api/records?search=((a%2B)%2B)%2B%24` and observe the event-loop stall; compare CPU before/after.
- **Suggested Fix / Implementation Plan**: Promote `chat.js`'s `escapeRegex` into `backend/src/utils/` and use it at every `new RegExp` site. Cap `search` length (e.g. 64 chars). Prefer Mongo `$text` indexes for genuine full-text search. Add a lint/CI guard banning `new RegExp(` outside `utils/`.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Move `escapeRegex` into `utils/` and import it at all 57 sites
  - [ ] Add a max length to every `search`/`q` parameter
  - [ ] Add `$text` indexes for the main searchable collections
  - [ ] Add a grep-based CI check that fails on unescaped `new RegExp(req.`
  - [ ] Load-test one endpoint with adversarial patterns

## [REC-007] Prescription PDF is readable by any logged-in user (IDOR + missing tenant check)
- **Description**: `GET /:id/prescription-pdf` performs exactly one authorisation test — `if (req.user.role === 'patient' && record.patientId !== req.user._id) return 403`. Every non-patient role therefore passes unconditionally and can fetch **any** prescription by ObjectId, regardless of hospital, doctor or patient. There is no `hospitalId` check and no doctor-assignment check.
- **Current vs Expected**: Current = a `rider`, `lawyer`, `delivery_boy`, or a doctor from an unrelated hospital receives a full prescription PDF (patient name, age, gender, phone, diagnosis, medication list, doctor signature) for any id. Expected = only the patient themself, the prescribing doctor, and staff of the owning tenant.
- **Flow**: Document download from the records panel and from notification deep-links. The PDF is the artefact used to dispense medication, so it carries direct fraud value.
- **Root Cause / Logic**: A single-role inverse check (`role === 'patient' && ...`) used as the whole authorisation model — the same allow-by-default shape as REC-001/002 (`routes/records.js` L184–L224).
- **Affected Files**: `backend/src/routes/records.js` (L184–L224), `services/pdfService.js` (`generatePrescriptionPDF`), `models/Doctor.js` (`signatureUrl`)
- **UI/Frontend Impact**: None visible; the response is a legitimate-looking PDF.
- **Security/Data Risk**: **High.** PHI disclosure (including patient phone number) plus a forgery aid — the download embeds the doctor's signature image URL. The read *is* audit-logged (`download_prescription`), so abuse is at least detectable after the fact.
- **Steps to Reproduce**: With any non-patient token, iterate ObjectIds: `GET /api/records/<id>/prescription-pdf` → 200 `application/pdf`.
- **Suggested Fix / Implementation Plan**: Apply the same shared record-scope guard used for REC-001/004 — deny by default, then explicitly allow patient-owner, prescribing doctor and same-tenant staff. Add `Cache-Control: private, no-store`. Consider watermarking each download with the requester id for traceability.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Deny-by-default authorisation on the PDF route
  - [ ] Add tenant + prescribing-doctor checks
  - [ ] `Cache-Control: private, no-store`
  - [ ] Watermark each download with requester id/timestamp
  - [ ] Apply the same review to every other PDF endpoint (bills, lab reports, discharge summaries)

---

## [REC-008] Health-ID QR token never expires, is unindexed, and leaks a phone number to anonymous scanners
- **Description**: `GET /api/health-id/:qrToken` is fully public. Four distinct problems: (a) the token is generated once and **never expires** — `lastRotatedAt` is recorded only when the user manually asks to regenerate, so a leaked card URL grants permanent access; (b) `User.healthIdCard.qrToken` has **no index**, yet it is the sole lookup key on an unauthenticated route → every scan is a full collection scan of `users`, and the `publicScanLimiter` is keyed per-IP (not per-token, contrary to its own comment); (c) `emergencyContact.phone` is returned at **both** `shareLevel` values including the "minimal" branch whose comment claims PII minimisation; (d) the token is embedded in a URL (`.../health-id/<token>`) so it lands in referrers, browser history, server logs and any analytics — an unauthenticated identifier-based PII oracle.
- **Current vs Expected**: Current = anyone holding a stale/leaked/public-logged URL can retrieve name, age, gender, blood group, allergies, conditions and emergency contact details of a patient. Expected = short-lived signed tokens, revocation, and no contact PII on the unauthenticated path.
- **Flow**: Emergency responder scans a patient's health card; the QR URL is also shared via WhatsApp/screenshots where it never expires.
- **Root Cause / Logic**: A bearer token treated as a permanent database key with no lifecycle, no index and an over-broad response projection.
- **Affected Files**: `backend/src/routes/healthId.js` (L19–L27, L29–L55, L60–L135), `backend/src/models/User.js` (`healthIdCard` sub-document), `routes/patient.js` (L208–L230 duplicate rotate implementation)
- **UI/Frontend Impact**: Partially — the UI offers a "regenerate" action but never surfaces an expiry, and cannot revoke a shared card.
- **Security/Data Risk**: **High.** Unauthenticated PHI/PII disclosure with no expiry and no revocation path. Also a cheap DoS/CPU vector via unindexed scans.
- **Steps to Reproduce**: Request a card, copy the URL, wait an arbitrary period, fetch it from a logged-out browser → still returns live medical data. Check `db.users.explain()` for the scan stage.
- **Suggested Fix / Implementation Plan**: Add a TTL/`expiresAt` to `qrToken` (e.g. 24h or a signed JWT) plus explicit revoke-all. Add `{ 'healthIdCard.qrToken': 1 }` unique sparse index. Move the phone out of the minimal projection (or require a second factor / masked contact relay). Key the limiter by token *and* IP. Log every scan as an audit entry with the resolved user id.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add `expiresAt` to `qrToken` + revoke-all endpoint
  - [ ] Add the sparse unique index on `healthIdCard.qrToken`
  - [ ] Remove/mask `emergencyContact.phone` from the public response
  - [ ] Rate-limit per token, not just per IP
  - [ ] Audit-log each public scan
  - [ ] De-duplicate the second token-rotation implementation in `patient.js` (L208–L230)

## [REC-009] ABHA linkage is a mock: a publicly-known OTP completes the flow and no gateway is ever called
- **Description**: `POST /api/health-id/abha/generate-otp` does not call any ABDM gateway. It generates a random `txnId`, sets `healthIdCard.abhaStatus = 'PENDING_OTP'`, writes a log line and returns — while the response body itself advertises the bypass: `'OTP has been dispatched ... (Mock ABDM: Use 123456)'`. Nothing is sent to the user's Aadhaar/mobile. The companion `verify-otp` then mints/links an ABHA id and stores it on the account.
- **Current vs Expected**: Current = any authenticated user can link an ABHA identity by submitting the fixed code `123456`, and the "verification" of a national health identifier is therefore ceremonial. Expected = a real ABDM sandbox/production gateway call with a server-side session, and hard failure when no gateway is configured.
- **Flow**: Patient ABHA onboarding (ABDM M1). Because the id is then trusted downstream by consent and record-sharing flows, a spoofed linkage propagates into clinical data exchange.
- **Root Cause / Logic**: A sandbox stub shipped to the main branch with the bypass value echoed to the client instead of being gated behind an `ABDM_MODE=mock` config check that refuses to run in production.
- **Affected Files**: `backend/src/routes/healthId.js` (L79–L101 generate, L103–L135 verify), `backend/src/models/User.js` (`healthIdCard.abhaStatus`, `abhaId`)
- **UI/Frontend Impact**: Yes — users see a convincing "OTP sent to your Aadhaar-linked mobile" success state that never happened, and the ABHA number shown afterwards is fiction.
- **Security/Data Risk**: **High (identity).** Identity spoofing / account-takeover precondition, plus a compliance failure in the area Indian health-data regulation is strictest about. The input check is only `length < 10`, so a 12-digit national ID is accepted with no format or checksum validation.
- **Steps to Reproduce**: `POST /api/health-id/abha/generate-otp` then `POST /api/health-id/abha/verify-otp` with `otp: "123456"` → verified state with no external call.
- **Suggested Fix / Implementation Plan**: Gate the mock behind `if (process.env.ABDM_MODE !== 'mock') return 501`. Implement the real gateway client with an HMAC-signed session, a short OTP TTL, attempt limits and a single-use `txnId` bound to the user. Remove the OTP hint from the response. Validate Aadhaar with the Verhoeff checksum and store only a hash/reference, never raw. Add an audit event for both ABHA state changes.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] `ABDM_MODE` guard that fails closed in production
  - [ ] Implement or formally disable the ABDM gateway integration
  - [ ] Bind `txnId` to the user, single-use, with a TTL
  - [ ] Remove the `Use 123456` hint from the API response
  - [ ] Aadhaar format + checksum validation; store a reference, not the number
  - [ ] Confirm the truncated region of `verify-otp` actually validates before trusting the flow

---

## [REC-010] `Record.data` / `attachments` are unvalidated blobs, and the `type` filter can never match
- **Description**: Two defects. (a) `data: { type: Object, default: {} }` and `attachments: [{ type: String }]` accept arbitrary nested JSON and arbitrary URL strings with no size cap, schema or allowlist — `createRecordSchema` validates the outer body but not the inside of `data`. (b) `Record.type` has a setter that lowercases and converts spaces to underscores (`'Lab Report'` → `lab_report`), but the list endpoint filters with the **raw** query value (`if (type && type !== 'All') filter.type = type;`), so `?type=Diagnosis` or `?type=Lab Report` — exactly what the UI sends, matching the `'Diagnosis'` default used in `POST /` — matches nothing.
- **Current vs Expected**: Current = the record-type filter in the UI silently returns an empty list for most types, and a client can persist megabytes of arbitrary JSON (plus `javascript:`/`data:` URLs in `attachments`) inside a medical record. Expected = validated, size-bounded `data`, and a filter normalised through the same setter as writes.
- **Flow**: Records list → type tabs (Diagnosis / Prescription / Lab Report); and record creation with attachments from the upload flow.
- **Root Cause / Logic**: An `Object`-typed field used as a design shortcut, plus an asymmetry between the write-side normaliser and the query-side comparison.
- **Affected Files**: `backend/src/models/Record.js` (L12 type setter, L56 `data`, L57 `attachments`), `backend/src/routes/records.js` (L44, L126)
- **UI/Frontend Impact**: **Yes** — "no records found" when filtering, which users read as data loss.
- **Security/Data Risk**: **Medium–High.** Stored-XSS/SSRF preconditions through `data`/`attachments`, storage exhaustion, and an unusable audit trail because `data` is opaque.
- **Steps to Reproduce**: `GET /api/records?type=Diagnosis` → `[]` while records of that type exist. Then `POST /api/records` with a 5 MB nested `data` object → accepted.
- **Suggested Fix / Implementation Plan**: Give `data` an explicit sub-schema with per-field limits and a total-size guard. Validate `attachments` as URLs restricted to the platform's own storage host. Normalise the query through the same logic as the setter (export it and reuse, or store a lowercased shadow field). Enforce the `type` enum in the schema, not only in zod.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Define a `data` sub-schema with size caps
  - [ ] Validate `attachments` against an allowlisted host
  - [ ] Reuse the `type` normaliser on the filter path
  - [ ] Test that every UI-visible type label round-trips create → filter
  - [ ] Consider a real `Date` for `date` (currently a `String`, so range queries are impossible)

## [REC-011] `config/audit.js` is dead config — `AUDIT_ENABLED` and `AUDIT_RETENTION_DAYS` do nothing
- **Description**: `backend/src/config/audit.js` exports `{ enabled, retentionDays, excludePaths }`, but a repository-wide grep finds **no import of this file anywhere** — the only occurrence of `retentionDays` is its own definition. Consequences: setting `AUDIT_ENABLED=false` does **not** disable auditing (the middleware never consults it), `AUDIT_RETENTION_DAYS` is ignored (the `AuditLog` TTL is hardcoded to `365 * 24 * 60 * 60` in `models/AuditLog.js` L36), and `excludePaths` — which lists `/api/auth/login` — is never honoured.
- **Current vs Expected**: Current = an operator can flip a documented environment variable and observe no behavioural change, in either direction. Expected = config is either wired up or does not exist.
- **Flow**: Compliance/ops configuration. The dangerous direction is `AUDIT_ENABLED=false` being *believed* to disable logging while everything is still recorded (a false privacy claim), and conversely a retention change silently not applying.
- **Root Cause / Logic**: An extracted config module written during a refactor and never connected to its consumer; the concrete values were duplicated as literals at the point of use.
- **Affected Files**: `backend/src/config/audit.js` (L1–L6), `backend/src/middleware/audit.js`, `backend/src/models/AuditLog.js` (L36)
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **Medium (compliance/trust).** Misconfigured retention means PHI-adjacent audit data is kept longer (or shorter) than the operator believes, and `excludePaths` being ignored means raw auth requests — including credentials in bodies for `POST /api/auth/login` if a body logger is ever added — are not excluded as intended.
- **Steps to Reproduce**: Set `AUDIT_ENABLED=false`, restart, perform a mutation, and observe an `AuditLog` document is still written.
- **Suggested Fix / Implementation Plan**: Either import and honour the config in `middleware/audit.js` (checking `enabled` and the `excludePaths` list), and drive the TTL from `retentionDays` (requires a migration to change the index), or delete the file and document the real behaviour. Add a startup assertion that logs the effective audit configuration.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Wire `enabled` + `excludePaths` into the audit middleware (or delete the file)
  - [ ] Make the TTL reflect `AUDIT_RETENTION_DAYS`, and migrate the index
  - [ ] Log the effective audit config at boot
  - [ ] Ensure request bodies are never persisted for auth routes

---

## [REC-012] ABDM consent is recorded and audited but never enforced — revocation changes nothing
- **Description**: `records.js` implements `POST /consent-request` and `POST /consent-response` (L244–L300), which set consent state and `auditLog('consent_granted' | 'consent_revoked')`. However, **no read path consults consent state**. The only middleware written to enforce record access, `canAccessRecord` (`middleware/auth.js` L167–L198), is never imported anywhere in the repository, and `GET /patient/:patientId`, `GET /` and the prescription-PDF route authorise purely on role/tenant/assignment. Revoking consent therefore has no observable effect on a doctor's ability to read records.
- **Current vs Expected**: Current = a patient can "deny/revoke" an EHR consent and the doctor retains full access — a false privacy control in a regulated flow. Expected = consent is the gate for cross-provider record access, checked on every read, and revocation takes effect immediately.
- **Flow**: ABDM M2/M3 consent request → patient grants/denies → doctor reads records. The grant path also sends a notification, so the user is told the consent was applied.
- **Root Cause / Logic**: Consent modelled as an event/audit artefact rather than as an authorisation input; the enforcement hook was written (dead middleware) but never attached.
- **Affected Files**: `backend/src/routes/records.js` (L244–L300 read-side gap), `backend/src/middleware/auth.js` (L167–L231 dead), `models/Consent`/consent embed (see `MentalHealth.js` L31–L41 for the parallel model)
- **UI/Frontend Impact**: **Yes** — the consent UI reports a state the backend does not honour.
- **Security/Data Risk**: **High (regulatory).** Consent is the core control in India's ABDM/EHR framework; presenting an unenforced consent toggle is a material misrepresentation to patients.
- **Steps to Reproduce**: Request consent for a patient, have them deny it, then read the records with the requesting doctor's token → records are returned.
- **Suggested Fix / Implementation Plan**: Add a `requireConsent(resource, purpose)` middleware that resolves active, unexpired, unrevoked consent for `(requester, patientId, purpose)` and attach it to every cross-provider read. Deny by default. Make revocation take effect immediately by checking consent at query time (no caching), or version the consent and invalidate caches. Apply the same enforcement to the parallel `mentalhealth.js` consent model so the two cannot diverge.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement `requireConsent` and attach it to all cross-provider reads
  - [ ] Deny reads when no active consent exists
  - [ ] Ensure revocation is immediate (no cache staleness)
  - [ ] Unify the two consent models (`records.js` and `mentalhealth.js`)
  - [ ] Add a test: revoke → next read returns 403
  - [ ] Surface consent status honestly in the UI

<!-- END -->
