# Security Policy

FindMedi processes protected health information (PHI) under India's **DPDP Act
2023** and, for any US-facing operation, **HIPAA**. This document is the security
posture of the system: what we protect, how, who to tell, and what we still have
not solved.

It is deliberately written against the code rather than against intentions. Where
a control is real it names the file that implements it, so a reviewer can verify
it. Where a control is partial it says so.

---

## 1. Reporting a vulnerability

**Do not open a public issue.** Email **security@findmedi.online** with:

- what you did, step by step
- what you expected and what happened
- the affected endpoint or component
- any proof-of-concept you are willing to share

We acknowledge within **2 business days** and aim to give a remediation plan
within **10 business days**. We will tell you when the fix ships, and we will
credit you in the release notes if you want that.

Please give us a reasonable window to ship before public disclosure. We do not
pursue legal action against good-faith research, and we do not threaten
researchers who follow this policy.

### In scope

Anything running in this repository or in production at `findmedi.online`:
cross-tenant access to another hospital's data, authentication or session
bypass, reading another patient's PHI, money or wallet manipulation, injection,
privilege escalation between roles, and any exposure of credentials.

### Out of scope

- Missing rate limits with no demonstrated impact beyond "the endpoint is slow".
- Self-XSS requiring the user to paste attacker script into their own console.
- Automated scanner output with no manual confirmation.
- Deliberate saturation of production capacity.
- Findings requiring physical access to a device.
- Username enumeration on the login form *on its own* (see §5).

---

## 2. Data we hold, and how sensitive it is

| Class | Examples | Where it lives |
|---|---|---|
| **Special category PHI** | mental-health assessments, crisis flags, therapy notes, diagnosis | `MentalHealth` |
| **Clinical PHI** | appointments, prescriptions, lab orders and results, EHR records, ABDM consents | `Appointment`, `Prescription`, `LabOrder`, `Record`, `ConsentRecord` |
| **Financial** | payments, refunds, ledger entries, provider wallets | `Payment`, `Refund`, ledger service |
| **Identity** | name, email, phone (Aadhaar is NEVER stored — see §5) | `User` |
| **Provider KYC** | driving licence, bank details, identity documents | `RiderProfile`, `LawyerProfile` |

Mental-health data is the highest-sensitivity class in the system and is treated
accordingly: `dataClassification: 'PSYCHIATRIC_SPECIAL_CATEGORY'` is set by the
**server** on creation and cannot be downgraded by a client, and access goes
through `services/mentalHealthAccess.js` rather than a generic role check.

---

## 3. Threat model (STRIDE, per principal data flow)

### Flow A — Patient uses the web/mobile client

| Threat | Mitigation | Where |
|---|---|---|
| **Spoofing** — stolen token impersonates a patient | Access token in memory only; refresh token httpOnly, never readable by JS | `frontend/src/lib/axios.js` |
| **Spoofing** — CSRF on cookie auth | Double-submit `X-CSRF-Token` + `SameSite` | `index.js`, CORS/CSRF config |
| **EoP** — one patient reads another's records | `authorizeObject()` requires positive ownership or an active ABDM consent; **404** (not 403) on mismatch so existence is never confirmed | `middleware/authorize.js` |
| **Tampering** — client sets its own price or eligibility | Server-owned pricing and coupon eligibility | `services/pricingService.js`, `services/couponService.js` |
| **Repudiation** — "I never approved that" | Every PHI read, consent grant, export and moderation action writes an audit row | `middleware/audit.js` |
| **Disclosure** — XSS reads tokens | No token in `localStorage`; a migration deletes any left by older builds | `frontend/src/lib/axios.js` |

### Flow B — Clinician acts inside a hospital tenant

| Threat | Mitigation | Where |
|---|---|---|
| **EoP** — hospital admin sees another hospital's patients | `applyTenantScope()` / `authorizeObject()`, **fail-closed** — a missing tenant on either side DENIES | `utils/tenantScope.js` |
| **Tampering** — doctor self-approves their own profile | `updateDoctorSchema` rejects `DOCTOR_SERVER_OWNED_FIELDS` with a 400; handler writes an allowlist | `utils/validate.js`, `routes/doctors.js` |
| **Tampering** — create a resource inside another tenant | Tenant derived from the session, never the body | `routes/doctors.js`, `routes/staff.js` |
| **Disclosure** — bulk export exfiltrates PHI | 10k row cap, `X-Export-Truncated`, a `bulk_export` audit row per export | `routes/export.js` |
| **Disclosure** — logs leak PHI or credentials | pino redacts cookies, auth headers, tokens, OTPs and Mongo URIs **at the writer** | `config/logger.js` |

### Flow C — Money movement

| Threat | Mitigation | Where |
|---|---|---|
| **Tampering** — client sends its own amount | Server-owned pricing; server-derived retainer amount | `services/pricingService.js`, `routes/lawyerBookings.js` |
| **Tampering** — double spend via a race | Atomic compare-and-set (`$gte` in the filter) on wallet debits | `routes/lawyers.js` |
| **Tampering** — replayed payment webhook | HMAC verification + timestamp window + Redis replay cache | `services/webhookSecurity.js` |
| **Tampering** — fractional rounding drift | All money is integer paise | `services/ledgerService.js` |
| **Repudiation** — "I never refunded that" | Refunds are a state machine with idempotency keys; every transition audited | `routes/payments.js` |

### Flow D — Realtime / messaging

| Threat | Mitigation | Where |
|---|---|---|
| **EoP** — join another patient's chat room | `assertRoomAccess()` mirrors the HTTP membership rules on **every** join | `services/socketService.js` |
| **Disclosure** — dispatch roles over-read | Room ACL requires an explicit role/participant relationship | `middleware/authorize.js` |

---

## 4. Controls we actually have

### Authentication
- Access token: short-lived JWT, held in memory, never persisted.
- Refresh token: httpOnly, `SameSite`, `Secure` in production, rotated on use.
- Passwords: bcrypt (`bcryptjs`), never logged, never returned by any endpoint.
- OTP: salted SHA-256 via the native Rust module when available, with a bcrypt
  fallback — the fallback is logged at **error** level in production so a deploy
  that lost its native artifact is visible rather than silent.
- 2FA (TOTP + backup codes) is enforced on login when enrolled.

### Authorization
- One permission matrix, one role-alias migration, and a CI check that every
  protected route carries an authorization tag.
- `platformAdminOnly` for genuinely platform-wide operations (provider KYC
  approval, ride/lawyer/assistant administration) — these carry identity
  documents and bank details and have **no tenant to scope by**, so they are not
  exposed to hospital admins at all.
- Object-level access is fail-closed everywhere: both sides must have a tenant and
  they must match.

### Data protection
- Aadhaar-shaped strings are rejected at write time (CI-enforced) and never
  stored in plaintext.
- Clinical text indexed into search passes through `redactClinicalText()` before
  it leaves the database.
- Bulk exports are bounded and audited.

### Infrastructure
- TLS is mandatory in production, not optional in the edge config.
- Production compose publishes no datastore ports.
- MongoDB runs as a replica set; Redis, OpenSearch and Kafka are authenticated
  and TLS-protected; Kafka uses SASL_SSL.
- Container images are pinned to digests; pods do not run as root.
- `/healthz` (liveness) and `/readyz` (readiness) are distinct, and readiness
  really pings each dependency.
- `/healthz/pipelines` reports data-pipeline freshness separately, because a
  process being alive says nothing about whether a Kafka consumer is keeping up.

### Observability and audit
- `AuditLog` records PHI reads, consent decisions, exports, payment transitions,
  role changes and moderation actions.
- Logs are structured JSON, redacted at the writer, and rotated.
- `sendServerError` returns a correlation id to the user and keeps the raw error
  server-side, so a 5xx never leaks schema or connection details.

---

## 5. Known gaps — stated honestly

These are real, and none of them are theoretical:

1. **The type check is a ratchet, not clean.** The frontend carries ~11,775
   pre-existing TypeScript errors. CI enforces that this number never increases,
   but it is not zero. See `frontend/tsconfig.baseline.json`.
2. **Coverage is low** (~15% statements) with a gate that prevents regression,
   not one that certifies adequacy. Most security-relevant logic is unit-tested;
   route wiring largely is not.
3. **E2E is mock-only.** No automated test exercises the real frontend against
   the real backend, so a contract break between them would not be caught by CI.
4. **No independent penetration test, and no SOC 2 / ISO 27001 certification**
   has been performed. This document describes our own controls, not audited
   assurance.
 5. **Classification is machine-checked; guard CORRECTNESS is not.**
    `npm run authz:coverage` classifies all 854 routes (0 unclassified) and
    `npm run authz:triage` currently reports **0 unguarded** routes, but both
    are static parsers: they can prove a guard is *absent*, never that a
    present guard is *correct*. A guard scoped to the wrong field passes them.
    The triage script's REVIEWED_SAFE clearance list is empty as of 2026-10-05
    - its 16 historic entries were retired once each of those routes matched
    the shape-based guard detector on its own (clearance write-ups remain in
    git history). Any future clearance is reviewer judgement recorded in
    `backend/scripts/triage-authz-gaps.mjs`, not a machine-checked guarantee.
6. **Physical and organisational controls are out of scope of this repository.**
   Staff vetting, device management and office security are assumed, not
   evidenced here.
7. **Key rotation is a documented procedure, not automated.** Rotating
   `JWT_SECRET` invalidates all sessions by design.
8. **Donor-directory consent is per-purpose, but location consent is not.**
   `User.isBloodDonor` (default `false`) is what
   `GET /api/bloodbank/donors/nearby-h3` filters on, so appearing in the donor
   directory requires an explicit, revocable opt-in via
   `PUT /api/bloodbank/donor-opt-in`. However `currentLocation` is a single
   generic field shared with ride dispatch and nearby search, so a user cannot
   yet say "share my location for dispatch but not for the donor directory".
   Splitting location consent per purpose is outstanding.
9. **The IDOR suite covers the helpers, and the HTTP harness stops at the model
   boundary.** `test/security/idor.spec.js` asks "may this caller reach a record
   that is not theirs?" for every object-authorization helper, with 27 actor
   combinations. `test/integration/` then makes real HTTP requests through real
   routers (`supertest`, which had been an unused devDependency) so the checks
   cover middleware wiring rather than handler bodies. Both work by stubbing the
   database: they prove the request path and the guard, not persistence, query
   construction against a real collection, or transaction behaviour. A route that
   guards correctly and then queries wrong is not covered. Closing that needs a
   disposable database (mongodb-memory-server or a container) and seeded fixtures
   per role, which is the remaining half of TEST-M-01.

If you find something that contradicts this document, that is a finding in its
own right — please report it.

---

## 6. Third-party processors

| Processor | Data Processed | Purpose | Region | DPA / BAA | Breach Contact | Notes |
|---|---|---|---|---|---|---|
| MongoDB Atlas | All application data incl. PHI | Primary managed datastore | AWS ap-south-1 (Mumbai) | DPA + BAA | security@mongodb.com | TLS 1.3, encrypted at rest |
| Cloudinary | Uploaded images, medical prescriptions, docs | Media storage & CDN | US / Global | DPA signed | security@cloudinary.com | Signed URLs, strict access control |
| Brevo (Sendinblue) | Email address, notification text | Transactional email | EU (Frankfurt) | GDPR DPA | privacy@brevo.com | OTP codes are never emailed |
| Razorpay | Order IDs, transaction amount, customer email/phone | Payment gateway | India | RBI/DPDP DPA | security@razorpay.com | PCI-DSS Level 1; no card data touches our servers |
| Google | OAuth profile (sub, email, name, avatar) | Federated single sign-on | Global | DPA signed | security@google.com | Verified via Google Auth Library |
| MapTiler | Latitude / longitude coordinates | Map tiles and dispatch routing | EU | DPA signed | privacy@maptiler.com | Ephemeral coordinates; no patient identities |
| Twilio | Phone number, SMS notification body | SMS & OTP delivery | US / Global | DPA signed | privacy@twilio.com | Sensitive codes expire in 5 min |
| Sentry | Stack traces, sanitized breadcrumbs, HTTP status | Error and exception monitoring | US / EU | DPA + BAA | security@sentry.io | PII scrubbing active (beforeSend masks PHI/emails) |
| PostHog | Pageviews, anonymized feature usage events | Product analytics | EU (Germany) | DPA signed | privacy@posthog.com | Distinct IDs pseudonymized, form inputs masked |
| Unleash | Anonymous context (user role, tenant ID) | Feature flag evaluation | EU / Self-hosted | DPA signed | security@getunleash.io | No clinical or demographic data transmitted |
| LiveKit | WebRTC media streams (audio / video) | Telemedicine consultations | Global / Self-hosted | DPA signed | privacy@livekit.io | End-to-end WebSockets + SRTP encrypted; no media recording stored unless consented |
| Render | Container execution environment, build artifacts | Application & background worker hosting | US / EU (Frankfurt) | DPA signed | security@render.com | Hardened Linux containers, TLS termination |

Any new processor must be added here **and** to the DPIA before it receives
production data.

---

## 7. Breach response

The operational playbook — severity classes, roles, scenario containment,
the notifiability decision, the notification clock table (DPDP Rule 7,
CERT-In 6 h, HIPAA), ready-to-send templates, evidence checklist and the
post-mortem template — is
[`docs/incident-response.md`](docs/incident-response.md). In summary:

1. **Contain** — revoke `JWT_SECRET` (invalidates all sessions), disable the
   affected integration, apply the relevant fail-closed switch.
2. **Preserve** — snapshot `AuditLog` and application logs before rotation; they
   are the evidence.
3. **Assess** — determine which data classes were exposed, for how many data
   subjects, and for how long.
4. **Notify** — under DPDP §8 (Rules 2025, Rule 7): the Data Protection Board
   *without delay* plus the detailed report *within 72 hours*, and each affected
   Data Principal *without delay*; CERT-In within *6 hours* for Annexure I
   incident types (incl. data breach/leak). HIPAA breach-notification timelines
   apply to covered entities.
5. **Post-mortem** — written, published internally, and the control that failed
   gets a regression test.

---

## 8. Related documents

- `docs/incident-response.md` — incident & breach-notification playbook
  (severity, clocks, templates, post-mortem)
- `docs/privacy/DPIA.md` — data protection impact assessment
- `docs/privacy/RETENTION.md` — retention schedule
- `docs/data-dictionary.md` — generated per-collection fields / PII / indexes /
  retention (blast-radius enumeration during an incident)
- `docs/architecture-specs/` — system design
- `audit-reports/MASTER_SUMMARY.md` — audit state

*Last reviewed alongside the bug-remediation pass recorded in
`audit-reports/FIXED-LOG.md`.*