All notable changes to this repository are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versioning rules (what counts as breaking, deprecation windows, the release
checklist) live in [`docs/qa-release.md`](docs/qa-release.md) Â§3â€“Â§4.

The canonical version is `backend/package.json` `version`; `frontend/package.json`
`version` is synced at each release. Entries that close an audit finding cite
the finding ID â€” the full reported â†’ fixed trail is in
[`audit-reports/FIXED-LOG.md`](audit-reports/FIXED-LOG.md).

## [Unreleased]

### Added

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
[`audit-reports/`](audit-reports/).

### Security

- Audit remediation batches (196 findings closed, detail per ID in
  `audit-reports/FIXED-LOG.md`): authentication/2FA hardening (AUTH-B-01..19),
  data-leak closure (DL/DLB), object-level authorization (`authorizeObject`
  helper + `AUTHZ-*` migration with a committed 829-route coverage manifest),
  payment invariants (PAY-B-01..08), infrastructure guards (INF-B-01..09),
  and the chat/ride/notifications/records invariant steps in CI.
- Continuous gates: gitleaks, plaintext-Aadhaar, mass-assignment,
  unescaped-regex, dependency-vuln ratchet, semgrep/Trivy SAST+image scans,
  authz coverage/tenant-guard/permission-matrix, env-doc drift â€” all named
  by finding ID in `.github/workflows/ci.yml`.

### Added

- Missing-feature backlog remediation (see `audit-reports/PENDING-BACKLOG.md`
  DONE entries): appointment reminder jobs (NOTIF-M-03), wallet guard
  (PAY-M-02), payout reconciliation with idempotent root-cause fix
  (PAY-M-03), metrics/observability suite (INF-M-02), generated data
  dictionary `docs/data-dictionary.md` (DOC-M-03, 111 models / 452 PII
  fields, byte-compared freshness gate), incident & breach-notification
  playbook `docs/incident-response.md` (DOC-M-07, DPDP Rule 7 / CERT-In 6h
  clocks), QA & release process `docs/qa-release.md` (DOC-M-04).

[Unreleased]: https://github.com/mahendra0011/mediCore/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mahendra0011/mediCore/releases/tag/v1.0.0
