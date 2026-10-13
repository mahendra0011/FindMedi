All notable changes to this repository are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versioning rules (what counts as breaking, deprecation windows, the release
checklist) live in [`docs/qa-release.md`](docs/qa-release.md) Â§3â€“Â§4.

The canonical version is `backend/package.json` `version`; `frontend/package.json`
`version` is synced at each release. Entries that close an audit finding cite
the finding ID â€” the full reported â†’ fixed trail is in
[`DEFERRED_TODOS.md`](DEFERRED_TODOS.md).

## [Unreleased]

- Regex-injection guard green (REC-006): the two pre-existing unescaped-`RegExp` violations are fixed — PM-JAY package search (`GET /tpa/pmjay`) now builds its filter via `safeSearchRegex()` (`escapeRegex` + `capSearch`), and recon-rule pattern validation routes through a new `safeRulePattern()` helper (`utils/escapeRegex.js`) that caps patterns at 200 chars and rejects nested-quantifier catastrophic shapes; `unescaped-regex-guard` CI job passes again.
- Dependency Vulnerability Ratchet green: `sanitize-html` 2.17.1 → 2.18.0, removing the only non-jest advisory (backend audit total back to the 19 baseline; fix was a non-major bump).
- infra-hardening-guard green: production compose no longer hard-fails `docker compose config` when secrets are unset (`${VAR-}` interpolation preserves the runtime `guard` service's fail-closed secret enforcement while B-02 can validate the manifest), the four Kafka SASL listener keys moved from service level into `environment:` where the compose schema accepts them, and nginx `depends_on: valhalla` is now `required: false` so the edge profile starts without the optional routing profile.
- TypeScript ratchet recovery: removed an invalid Radix `Select` `onChange` prop in `SupplyPipeline.tsx` (`onValueChange` is the supported callback); ratchet back under baseline.
- Patient feedback e2e coverage: two Playwright flows — a completed video visit (asserts `context: 'teleconsult'`, `refModel: 'Appointment'`) and a verified lab order (asserts `context: 'lab'`, `refModel: 'LabOrder'`), each verifying the submitted POST payload.
- Multipart OCR file upload & review-queue ingest (T10): New `POST /api/ai/ocr/file` (authorize `records:write`) accepting JPEG/PNG/PDF ≤10MB through memory-only multer (`uploadMemory` in `backend/src/middleware/upload.js` — medical documents never touch disk), strict MIME allowlist + magic-byte sniff + ClamAV scan, then routed through the existing vision gateway (`inlineData` bytes, temperature 0, JSON responseMimeType, 1-retry, `GEMINI_VISION_ENABLED` opt-in with labelled stub fallback and honest `visionEnabled` response flag); upload panel with docType picker and 60s client timeout in `AiReviewQueue.tsx`; 9 new cases in `test/integration/aiOcr.spec.js` (401, 403, disallowed MIME, spoofed magic bytes, 10MB limit, missing file, PNG happy path, PDF, Gemini `fetch` mock asserting `inlineData`/temperature/JSON config); `authz-manifest.json` and `.authz-coverage-baseline.json` hand-synced to the regenerated inventory (total 1778, `role` 1161, `authorize` 820, new `'/ocr/file'` entry).
- DDI knowledge-base provenance & display (T3): Added `backend/src/config/interactions.meta.json` (version, reviewStatus, reviewCadence, owner) loaded by `ddiEngine.js` with exported `getKnowledgeBase()`; `GET /api/ddi/check` responses now carry `knowledgeBase` + statutory `disclaimer`; `DdiCheckBanner.tsx` footer shows KB version & review status; `scripts/merge-ddi.mjs` documents the full 5-step update workflow (owner clinical-pharmacy, quarterly cadence, `statutoryDdi.spec.js` + `ddiCheck.spec.js` as the merge gate).
- Patient feedback remaining surfaces (T5 supplement): Kiosk shows the NPS `FeedbackPrompt` after successful check-in when an authenticated session exists (cookie probe against `/api/auth/me`, reset on new check-in and on done/skip); detractor submissions (score ≤6) now also open a `P1` `WorkTask` in the `patient_relations` queue with a 24h reach-out SLA before the notification fan-out (`routes/feedback.js`); discharge-summary (`context: 'admission'`) and teleconsult (`mode: 'video'`) feedback mounts confirmed wired (`PatientReports.tsx`, `PatientAppointments.tsx`); 2 new WorkTask/notification cases in `test/integration/feedbackNps.spec.js`.
- Patient NPS feedback prompt & deduplication (T5): Created reusable accessible `FeedbackPrompt.tsx` component with 0-10 NPS button scale, 1-5 star ratings, 2000-char feedback, and auto-deduplication; wired into `PatientAppointments.tsx` and `PatientMedicineOrders.tsx`; updated `Feedback` model and `POST /feedback` with `refModel`, `refId`, 409 conflict deduplication on repeated submissions, automated detractor alerts ($\le 6$) to Patient Relations, and `GET /feedback/mine?refId=` lookup (`test/integration/feedbackNps.spec.js`).
- Schedule H1 & Narcotic stock reconciliation & statutory PDF (T6): Created `NarcoticAdjustment` and `NarcoticCount` dual-witness audit models; implemented monthly reconciliation calculation (`Opening + Purchases - Dispensed - Adjusted = ExpectedClosing` vs Physical and variance) at `GET /pharmacy/narcotic-register/reconcile`; implemented dual-witness adjustment logging and physical count submission (`POST /pharmacy/narcotic-register/adjustments`, `POST /pharmacy/narcotic-register/counts`); statutory Drugs & Cosmetics inspector PDF report generator with running page numbers, facility license details, and Pharmacist-in-Charge signature line at `GET /pharmacy/h1-register/pdf`; updated `H1RegisterPage.tsx` with 4 tabs (Register, Reconciliation with live variance badges, Adjustments with modal, Compliance Gaps) and PDF export (`test/integration/narcoticReconciliation.spec.js`).
- Vendor KYC approval workflow & review dialog (T7): Implemented statutory KYC document attachment endpoint at `POST /api/stores/vendors/:id/kyc-docs` with document types (`GST`, `PAN`, `DrugLicense`, `MSME`, `CancelledCheque`) and expiry dates; wired KYC review dialog in `PurchaseCenter.tsx` with live document listing, document attachment, and Verified / Rejected (with mandatory reason) decision actions; backed by integration suite `test/integration/vendorKycWorkflow.spec.js`.
- Messaging providers & HR verification wave tests (T8): Added dedicated unit test suite for Msg91 SMS and WhatsApp providers with phone normalization, template variable formatting, error handling, unconfigured fallback, and WhatsApp-to-SMS failover (`test/unit/messagingProviders.spec.js`); added integration test suite for HR document verification, exit interview, and onboarding progress metrics (`test/integration/hrVerification.spec.js`); extended `test/unit/statutoryDdi.spec.js` with comprehensive 145-pair data lint verifying zero duplicate pairs, valid severities, and non-empty clinical recommendations.
- Standalone Playwright Chromium PDF worker container (T9): Created `backend/Dockerfile.pdf-worker` based on `mcr.microsoft.com/playwright:v1.49.0-noble` with Noto Sans Devanagari regional font packages (`fonts-deva`, `fonts-deva-extra`), non-root execution (`pwuser`), and sandbox network egress blocking.
- CI Node.js 24.x alignment (T1): Updated GitHub Actions workflow `.github/workflows/ci.yml` across all 9 CI jobs from `node-version: 20.x` to `24.x` matching the production Docker container base image (`node:24-bookworm-slim`).
- Four additional formal UAT sign-off flow specifications (T13): Added `docs/uat/uat-13-feedback-interactive.md`, `docs/uat/uat-14-ddi-prescribing.md`, `docs/uat/uat-15-narcotic-reconciliation.md`, and `docs/uat/uat-16-vendor-kyc.md` covering patient NPS prompt & detractor escalation, real-time DDI prescription blocking & override audit, Schedule H1 narcotic reconciliation & inspector PDF, and supplier KYC verification & purchase order enforcement.

- Go-Live Hardening & Observability (F1-F6): Complete go-live operational documentation including environment provisioning checklist (`docs/go-live/env-checklist.md`), security audit and OWASP ZAP baseline scan runbook (`docs/security/audit-runbook.md`, `ZAP/baseline-report.md`), observability & metrics guide with triage runbooks for payment webhooks, stuck queues, and MongoDB replica set failovers (`docs/ops/observability-runbook.md`, `docs/go-live/runbooks/`), production cutover and rollback protocol (`docs/go-live/cutover.md`), and k6 performance scripts for queue load, kiosk burst, 100k report exports, and discharge finalization (`k6/queue-load.js`, `k6/kiosk-burst.js`, `k6/report-export.js`, `k6/discharge-finalize.js`).
- Complete 12-Flow Departmental UAT Sign-Off Suites (G): Formalized standard user acceptance test suites under `docs/uat/` with preconditions, exact frontend URLs, step-by-step actions, and department head sign-off gates covering OPD journey, IPD & TPA discharge, ER & MLC triage, OT day & surgical safety, Lab critical panic alerts, Pharmacy Schedule H1 compliance, Procurement & vendor KYC, Payroll & biometric rostering, Queue display & self-service kiosk, Offline PWA & sync, Feedback & NPS tracking, and Campus security & guard rounds (`docs/uat/uat-01-opd.md` through `docs/uat/uat-12-security.md`).
- Vendor KYC lifecycle & purchase order gating (T7): Added vendor KYC document expiry sweep job (`backend/src/jobs/vendorKycExpiry.job.js`) with 30-day advance alerts, mandatory reason validation for rejections and expirations, immutable audit logging, purchase order block on unverified/expired vendors (`backend/src/routes/inventory.js`, `backend/src/routes/stores.js`, `backend/src/models/Supplier.js`), and unit coverage (`backend/test/unit/vendorKyc.spec.js`).
- Headless-Chromium print render pipeline & template worker (D6): High-fidelity print-to-PDF rendering using Playwright Chromium with network egress blocking (`page.route` data-only), 20s execution timeout, and 10MB memory safety cap in `lib/pdfRender.js`; added `'template'` job support with automatic fallback to pdfkit and Redis result caching in `workers/pdfWorker.js` and `routes/reports.js` (`test/unit/pdfRender.spec.js`).
- E-Invoicing IRP live client, PACS deployment env, & payment gateway live credentials (E1-E3): Real IRP integration with 20s network timeout, automatic retry on transient failures, and live cancellation API in `einvoiceService.js` (`test/unit/einvoice.spec.js`); statutory legal mandate documentation in `docs/billing/gst-einvoice.md`; complete PACS/DICOM infrastructure deployment and OHIF fallback runbook in `docs/infra/pacs.md`; documented `EINVOICE_*`, `ORTHANC_*`, `OHIF_URL`, Razorpay, Cashfree, PayU, PhonePe, and webhook replay protection variables in `backend/.env.example`.
- H1 / Narcotic register CSV export formula-injection defense & audit trail (T6): RFC4180 streaming export with BOM encoding for Excel Devanagari fidelity, neutralisation of formula injection prefixes (`=`, `+`, `-`, `@`), and audit logging of statutory register downloads (`routes/pharmacy.js`, `test/integration/h1Register.spec.js`).
- Drug-drug interaction check banner & override audit trail (T3): Interactive DDI check component (`DdiCheckBanner.tsx`) wired to doctor prescription and pharmacy dispense workflows with live unknown-drug warnings, severe interaction blocking, override justification logging to `DdiOverride` model, audit log emission, and statutory safety integration (`test/integration/ddiCheck.spec.js`, `test/unit/statutoryDdi.spec.js`).
- AI OCR vision document extraction & human review queue (D7): Real OCR extraction with schema parsing for insurance cards, ID cards, invoices, lab reports, prescriptions, and discharge summaries via Gemini vision API (`lib/aiGateway.js`, `routes/aiFeatures.js`); untrusted input prompt injection protection; 10MB payload limit; human-in-the-loop review queue workspace (`AiReviewQueue.tsx`) for superadmins with confidence badges and live correction actions (`test/integration/aiOcr.spec.js`).
- Certificates QR seal & preview (E5): Implemented tamper-evident cryptographic doc seal (`sealDoc('certificate', ...)`) and `SignatureEvent` recording (`kind: 'certificate'`) in `routes/certificates.js`, embedded dynamic QR code on generated PDF documents, added tamper-evident seal response headers (`X-Doc-Seal-Nonce`, `X-Doc-Seal-Signature`, `X-Doc-Verify-Url`), updated public `VerifyDoc.tsx` with certificate support, and added inline PDF preview modal, verification code copy button, and QR verification modal in `ClinicCertificates.tsx`.
- SOFA acute deterioration alert rule (E6): Added `icu_scores` dataset in `lib/datasets.js` calculating `sofaDelta = latest - previous` across admissions over trailing 24h, added `sofa-delta-2` rule definition in `scripts/seed-clinical-alert-rules.mjs` triggering critical alerts on `sofaDelta >= 2`, and added comprehensive sweep and deduplication tests in `test/integration/icuSofaAlert.spec.js` and `test/integration/clinicalAlertEscalation.spec.js`.
- Multi-level SLA escalation (D4): Policy-driven escalation tiers and SLA window in `approvals.js` (`POST /sweep`) querying `ApprovalPolicy.escalation[]` with fallback default tiers, idempotent re-sweep, and grace expiry past due window.
- Forms Hindi and localized templates (D5): Form template schema extended with `placeholderHi`, `optionsHi`, `titleHi`, `helpHi` in `models/FormTemplate.js`; `?locale=hi` support with `localizeTemplate()` in `routes/forms.js` for templates list, detail, and PDF rendering; Noto Sans Devanagari font embedding in `printEngine.js`; live EN/HI language toggling in `FormRenderer.tsx`, `FormsFill.tsx`, and `FormBuilderStudio.tsx`.
- Birth certificate seal & QR (D3): Applied `sealDoc('birth', ...)` and created `SignatureEvent` audit records on statutory birth certificates in `routes/maternity.js` with cryptographic verification headers and test assertions.
- Auto follow-up booking (D2): Added `followup_confirm` SMS/WhatsApp templates in `notifyTemplates.js`, incorporated `Tentative` status in `appointmentReminder.job.js`, and added slot conflict adjustment and confirmation/rejection endpoints in `routes/recall.js`.
- Health-ID scan receipts: `GET /api/health-id/scans` + a "Scan Activity"
  card on the patient's Health ID page ��� who scanned your card, when, from
  which IP, and what was shared (REC-M-04).
- Toll & parking in fare model (RIDE-M-03): `toll`/`parking` fields added to all
  `VEHICLE_RATES`, `calculateFare()` now includes toll + parking in total, and
  `GET /api/ride/:id/payout-statement` endpoint returns fare breakdown, commission
  (10%), TDS, net driver earnings, and ledger audit trail with `generatedAt`
  timestamp (RIDE-M-03).
- Driver earnings & payout statement gaps (RIDE-M-04): `GET /api/ride/driver/earnings`
  endpoint returning daily/weekly/monthly earnings summary with gross, commission,
  TDS, net totals, ride count, period-based date range filtering, and ledger audit
  trail with `generatedAt` timestamp (RIDE-M-04).
- Emergency post-incident audit trail (RIDE-M-05): `GET /api/ride/:id/emergency-audit-trail`
  endpoint returning emergency audit trail with rider dispatch details, acceptance/
  rejection timestamps, ETA, status history, and compliance-ready format for
  insurance/regulatory purposes (RIDE-M-05).
- Offline/low-connectivity dispatch handling (RIDE-M-06): offer expiry tracking
  with `expiresAt` timestamps, stale-provider flagging, and requeue logic that
  removes expired timeout attempts so they can be reoffered in the next dispatch
  radius step (RIDE-M-06).
- Admin audit trail surfaced: approval/suspension actions on riders, lawyers,
  assistants and delivery partners now write who-approved-whom-when rows;
  the superadmin Audit Logs page filters by target id (deep-linked from
  PendingApprovals/UserManagement History buttons) and exports CSV with
  formula-injection defanging (`GET /api/audit-logs/export`, 10k-row cap)
  (ADM-M-02).
- `AuditLog` rows are append-only at the schema level (`immutable: true` on
  actor/action/details/ip/userAgent/timestamp) â€” an admin-activity trail an
  admin can edit is not a trail (ADM-M-02).
- Superadmin system-health widget: `GET /api/ops-health` reports Mongo/Redis/
  BullMQ reachability, Kafka consumer lag + DLQ depth, pipeline freshness and
  the API's own 5-minute error rate, rendered on the platform overview â€” the
  three existing probes were for load balancers and scrapers, none reached a
  human in the product (ADM-M-05).
- The Kafka consumer and the event forwarder now report pipeline freshness
  (they were two of six pipelines that always read `unknown`): per-message
  success/error, stop-marked on consumer shutdown, and handler-failure marked
  on the forwarder â€” silence is not health (ADM-M-05, DP-B-05).
- Per-tenant API quotas: each hospital now shares ONE sliding-window request
  budget (built-in default 1000/min, per-hospital overrides in system
  settings) enforced on all of its authenticated traffic â€” previously every
  limiter keyed on user/IP, so a tenant's N staff accounts had N independent
  buckets and could starve the platform. Fail-open by design (capacity
  control, not a security gate), SOS paths exempt; superadmins manage it via
  `GET/PUT/DELETE /api/tenant-quotas` (live usage + audit rows) and a panel
  on the system-settings page (ADM-M-06).
- Waitlist for full slots: patients can queue on a booked-out doctor/date/time
  (`POST/GET/DELETE /api/appointments/waitlist`), and when any slot frees
  (cancel, reschedule, stale-payment sweep) the queue head is offered the seat
  with a critical notification and a 15-minute claim window â€” the offer is a
  real Pending appointment hold, so the existing billing sweeps expire it and
  claiming verifies the payment that was made against it. BookingModal gains
  a "Join waitlist" button on full slots; My Appointments renders the queue
  with a live countdown, claim and decline (APPT-M-01).
- Recurring appointment series: pick a repeat pattern (weekly / every 2 weeks /
  monthly, 2-12 visits) when booking and the slot is turned into N real
  appointments under one series - each occurrence keeps its own payment,
  reminders and per-occurrence cancel/reschedule, and My Appointments shows the
  pattern with one Cancel series action. Monthly patterns clamp correctly in
  shorter months (Jan 31 -> Feb 28) (APPT-M-02).
- Chat reaches a closed tab now: env-gated Web Push (VAPID, locally
  generated keys â€” no Firebase needed) fires when the recipient has no live
  socket presence, gated by the notification preferences (quiet hours/mute
  apply to chat) and skipping only when the user is *known*-online (Redis
  down pushes rather than drops). The payload is static PHI-free copy built
  inside the sender; the click deep-links into the recipient's own role chat
  route. Register/delete via `GET/POST/DELETE /api/chat/push-*`, a bell
  button in the chat sidebar, service worker in `public/sw.js`
  (CHAT-M-04).
- The event backbone now validates its own contracts: an in-repo zod schema
  registry (all 12 topics, every consumer `eventType`) is checked on the
  producer side before a payload reaches the wire and on the consumer side
  right after parse â€” the old `validateAndEnvelopEvent` validated nothing and
  the consumer's silent `default:` meant a breaking change shipped without a
  signal. Invalid events now fail into the existing retry â†’ DLQ cascade at the
  producer, or the existing skip-plus-metric path at the consumer. CI runs
  `scripts/check-event-schema-compat.mjs` for completeness (every consumer
  case/topic/producer literal registered) and backward compatibility (committed
  fixtures must still parse; negative fixtures must still be rejected)
  (DP-M-01).
- Insurance claims got a real cashless pre-auth workflow (INS-M-02):
  `POST /:id/pre-auth` requests authorisation (cashless-only, empanelled-hospital
  check against `Hospital.insuranceAccepted`, amount from the body or the
  estimate, one pending attempt at a time), `PUT /:id/pre-auth` records the
  decision â€” approve / partial / reject, a 5+ character reason is mandatory for
  any denial, the amount is capped by the request, approvals get a default
  30-day expiry â€” and `POST /:id/pre-auth/resubmit` re-opens after a denial.
  Every attempt is appended to `preAuthAttempts`, so attempt N+1 can never
  rewrite why attempt N was denied. Cashless claims can be filed only with an
  approved/partial pre-auth (409 `PRE_AUTH_REQUIRED`); reimbursement claims,
  which never need one, file directly. The Insurance page gained the matching
  UI (request / approve / partial / reject / resubmit buttons, the denial
  reason on the claim card, and the full attempt history), and patients are
  notified of decisions and settlements again (fail-soft â€” a failed notify
  cannot fail a decision that already committed).
- Loyalty points reversal on cancelled bookings (LOYAL-M-02): `reversePoints()` claws back earned points when a booking is cancelled, idempotent via unique `(user, action, refId)` index, reverses both `pointsBalance` and `lifetimePoints` (with tier walk-down the 500/1500/3000 ladder), allows negative balance (honest debt), and is wired at ride user-cancel, appointment PUTâ†’Cancelled and DELETE. Unit tested (10/10 green).
- LAW-M-01: escrow settlement on lawyer booking cancel — auto-refund of held retainer deposits the demoWallet.balance on cancel, and settlement statements for lawyers now generate 	otalEarned/platformCommission (10%)/
- etToLawyer records with uditLog trail + walletBalance increment. Also added GET /settlement-statement endpoint and GET/POST verification‑evidence endpoints for bar‑council docs.
- LAW-M-02: bar-council verification evidence store — structured document vault in LawyerProfile with licenseExpiryDate, erificationStatus (pending/verified/expired/under_review), and erificationDocuments array (license_cert|state_cert|degree_cert|id_proof, docUrl, uploadedAt, verifiedAt, verifiedBy). Auto‑verify on approve, pending on reject. New endpoints GET /verification-status + POST /documents.
- PHARM-M-01: inventory expiry / batch (FEFO) management — added expiry check in prescription dispense logic (Medicine.expiryDate rejected if past); expiringSoon stat validated; FEPO build-on future. Medicine model already has batchNumber/expiryDate; gap was in dispense logic.
- PHARM-M-04: delivery tracking for pharmacy orders — enhanced PUT /deliveries/:id with status timeline enforcement, OTP-at-door handoff (deliveryOtp/otpVerified), and proof-of-delivery capture (deliveryProofPhoto required when status=Delivered).
### Security

- Signup & OTP endpoints require Cloudflare Turnstile when `TURNSTILE_*`
  env vars are set (fails open on provider error so an outage cannot lock
  out signup), and burst signups are detected per IP (10/hour â†’ warn +
  `signup_burst_detected` audit row; detection, not a block â€” shared-NAT
  safe) (AUTH-M-05).
- Chat attachments now pass a real policy gate (CHAT-M-02): a 14-type MIME
  allowlist with server-derived extensions, magic-byte content checks for
  **every** allowed type (previously only the four inline image types were
  sniffed â€” pdf/office/video/audio bytes went to disk unverified), the ClamAV
  scanner that existed but was never mounted (now exported and run on every
  chat upload) with quarantine to `backend/quarantine/chat` (outside `public/`,
  never served) + a `chat_upload_quarantined` audit row, and `POST /messages`
  validating the client `attachments` array before persistence (external URLs,
  traversal, lying mimes/extension mismatches, oversize values and dead
  references rejected). The documented 25MB upload limit was also unreachable â€”
  the global 1mb JSON cap cut it off near 750KB â€” so a 40mb body parser is now
  scoped to `POST /api/chat/upload` only; every other route keeps the 1mb cap.
- Admin user deletion now actually erases (DP-M-04): `DELETE /api/users/:id`
  ran a bare `findByIdAndDelete` that skipped the DLM-06 chain - sessions kept
  working, OpenSearch kept the docs, the lake was never told. The chain now
  runs before the row goes away (chain failures surface as `erasureWarnings`
  instead of being hidden), and `executeDeletion` emits a `user.deleted`
  tombstone on `findmedi.identity.user-deleted.v1` through the outbox (lag
  monitored like any other topic) whose consumer purges OpenSearch and the
  lake handoff manifests; the lake copy has no user-id column, so the purge
  joins through Mongo trip ids and rewrites only the lines it can parse
  (DP-M-01 registry entry + fixtures included).

### Fixed

- Phase 1 P0 green board: resolved AppSidebar `MessageSquare` import blocker, `accessibility.spec.ts` ESM `__dirname` blocker, all 13 backend lint errors, duplicate keys in `settings.js`, doctor sidebar duplicates, locked in 37-error TS ratchet improvement (11934), and regenerated `authz-manifest.json` and `data-dictionary.md`.

- Creating an insurance claim **always failed**: `claimId` is required + unique
  on the schema, but zod stripped it from the body and the server-side
  generator was never called (INS-M-02). The id is now server-generated â€”
  clients cannot pick it.
- Claim status was split-brained: routes wrote a schema-less `status` while the
  UI badge and stats read `claimStatus`, so the badge never moved and rows
  written before the split were invisible to status filters (INS-M-02). Reads
  accept both fields, every write lands on `claimStatus` and `$unset`s the
  legacy field (rows migrate the next time they are touched), and the
  file/settle compare-and-set guards hold on both fields so a legacy row
  cannot be re-filed or re-settled.
- The insurance stats omitted part of their own labels: `approved` counted only
  `preAuthStatus: 'Approved'` so every partial approval was invisible, the
  claim buckets could not see rows that only carry the legacy `status`, and no
  `rejected` bucket was returned at all (INS-M-02).
- Settlement's ceiling check and audit row could not run: they referenced
  `logger` and `auditLog` without importing them, so the first settle threw a
  ReferenceError before either fired (INS-M-02; instrumentation from INS-B-04).
- Chat attachment previews always fell back to a generic file icon: the UI
  read the server's `mimeType` as lowercase `mimetype` (always `undefined`),
  so image/video/audio uploads never rendered inline and the message-type
  inference always produced `file` (CHAT-M-02).
- Health-ID QR audit rows were **never written**: `auditLog(..., 'public')`
  against an ObjectId `userId` failed the cast on every scan (REC-M-04).
  Rows now land under the card owner's id with the anonymous scanner in
  `details.actor`.
- The patient portal minted **dead QR cards** (token without expiry/rotation
  stamp â†’ revoked on first scan) and could disable a card without revoking
  the token; both health-id route files now share one mint/revoke
  implementation (`src/lib/healthIdCard.js`) (REC-M-04).
- Public scan responses are `Cache-Control: no-store` â€” no intermediary can
  replay PHI past a revocation (REC-M-04).
- `POST /google-register` returned a 500 on every new-account signup
  (`const` re-assignment on the user object) (AUTH-M-05).

## [1.0.0] - 2026-10-02

Baseline release: the consolidated state of Findmedi (backend Express/Mongoose
API, Vite/React frontend, Rust/Next pieces) as of 2026-10-02, after the
2026-09 security and missing-feature audit remediation recorded in
.

### Security

- Audit remediation batches (196 findings closed, detail per ID in
  `DEFERRED_TODOS.md`): authentication/2FA hardening (AUTH-B-01..19),
  data-leak closure (DL/DLB), object-level authorization (`authorizeObject`
  helper + `AUTHZ-*` migration with a committed 829-route coverage manifest),
  payment invariants (PAY-B-01..08), infrastructure guards (INF-B-01..09),
  and the chat/ride/notifications/records invariant steps in CI.
- Continuous gates: gitleaks, plaintext-Aadhaar, mass-assignment,
  unescaped-regex, dependency-vuln ratchet, semgrep/Trivy SAST+image scans,
  authz coverage/tenant-guard/permission-matrix, env-doc drift â€” all named
  by finding ID in `.github/workflows/ci.yml`.

### Added

- Missing-feature backlog remediation (see `DEFERRED_TODOS.md`
  DONE entries): appointment reminder jobs (NOTIF-M-03), wallet guard
  (PAY-M-02), payout reconciliation with idempotent root-cause fix
  (PAY-M-03), metrics/observability suite (INF-M-02), generated data
  dictionary `docs/data-dictionary.md` (DOC-M-03, 111 models / 452 PII
  fields, byte-compared freshness gate), incident & breach-notification
  playbook `docs/incident-response.md` (DOC-M-07, DPDP Rule 7 / CERT-In 6h
  clocks), QA & release process `docs/qa-release.md` (DOC-M-04).

[Unreleased]: https://github.com/mahendra0011/mediCore/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mahendra0011/mediCore/releases/tag/v1.0.0
