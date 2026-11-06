# FindMedi — production verification (§5)

Date: 2026-11-04 · HEAD: `bffabc73` + refund-cancellation completion & catalogue expansion (working tree).

This is the evidence record for the §5 "verify" list. Each row cites the code that answers it and the residual action, if any. "Verified" means the behaviour exists in code; it does **not** mean a particular production deployment has the env values set — that is an operator check at deploy time (see `docs/go-live/env-checklist.md`).

## 1. Field-encryption coverage

| Data | State | Evidence |
|---|---|---|
| Mental-health narrative (personal/family/social history, diagnosis, treatment plan, session notes, consent/family notes) | Encrypted at rest, field-scoped AAD | `backend/src/models/MentalHealth.js` (`enc()` on assessment/history/diagnosis/plan/session/consent notes) |
| Prescription clinical text (`diagnosis`, `clinicalNotes`) | **Not field-encrypted (deliberate)** | `backend/src/models/Prescription.js` plain paths; FHIR/lean readers in `routes/doctor.js`, `routes/fhir.js`, `routes/pharmacy.js` depend on plaintext. Access control + Mongo storage encryption are the controls. Revisit only with a lean/FHIR-safe migration. |
| KYC ID numbers (Assistant / Lawyer / Rider govt IDs) | Encrypted at rest + HMAC blind index for dedupe | `backend/src/routes/auth.js` (`encryptPhi('AssistantProfile'|'LawyerProfile'|'RiderProfile', 'govtIdNumber', …)`), `backend/src/utils/phiFields.js` |
| Bank details (BankAccount, Supplier, DeliveryPartner, profile bankDetails) | Encrypted at rest; supplier/bank use blind-hash dedupe | `backend/src/models/BankAccount.js`, `backend/src/models/Supplier.js`, `backend/src/routes/recon.js`, `backend/src/routes/deliveryPartners.js`, `phiFields.encryptBankDetails/mergeBankDetails` |
| 2FA secrets | Encrypted at rest | `backend/src/models/User.js` (`twoFactorSecret` via `enc()`) |
| Join-wizard draft tax/PAN/bank fields | Encrypted at rest | `backend/src/utils/phiFields.js` (`encryptJoinDraftStep`), `backend/src/routes/join.js` |
| Key rotation | Supported: `v1:<kid>:…` envelope, `FIELD_ENCRYPTION_KEYS` JSON (kid→key) + `FIELD_ENCRYPTION_KEY` primary; AAD `Model:path` prevents cross-field replay | `backend/src/utils/fieldEncryption.js`, `backend/src/utils/phiFields.js` |

Residual: prescriptions remain the one deliberate plaintext gap; do not claim full field-level coverage in external statements.

## 2. Cookie flags (production)

- Single source: `backend/src/lib/cookiePolicy.js`. All auth-cookie readers/writers must take names/flags from it (a hard-coded name next to a prefixed setter silently logs users out).
- Defaults: production `Secure` + `SameSite=None` (cross-site frontend); dev `Lax`. `__Host-` prefix applies **only** when Secure (browsers reject otherwise).
- Same-domain reverse-proxy posture: set `COOKIE_SECURE=true`, `COOKIE_SAMESITE=strict`, `COOKIE_PREFIX=__Host-`. If the frontend is cross-origin (separate domain) keep `SameSite=None; Secure`.
- Verify at deploy: `document.cookie` on the auth domain shows `__Host-` prefix + `Secure` + `SameSite=Strict` for same-domain, or `SameSite=None` for cross-site.

## 3. Session timeouts (production)

- Defaults in `backend/src/utils/sessionPolicy.js`: production turns **idle 30 min** and **absolute 12 h** on (dev/test off). Refresh-family 7-day expiry still binds patients tighter.
- Role-wise **concurrency**: admin roles (`superadmin`, `super_admin`, `owner`, `platform_owner`, `hospital_admin`, `support_l2`, `security_admin`, `privacy_admin`, `dpo`, `compliance_officer`, `doctor`, `pharmacy_owner`) cap 3 live refresh sessions; others 10. Idle/absolute values are global, not per-role — the role-wise pressure comes from the concurrency cap.
- Override knobs: `SESSION_IDLE_TIMEOUT_MS`, `SESSION_ABSOLUTE_TIMEOUT_MS`, `SESSION_MAX_CONCURRENT`, `SESSION_ADMIN_MAX_CONCURRENT`.

## 4. Super-admin object access

- `backend/src/middleware/authorize.js`:
  - Superadmin keeps non-PHI platform powers. For PHI permissions (`records:*`, `patients:*`) it must present an approved `BreakGlassGrant` — list routes (no subject id) are denied; every pass is audited as `phi_access`.
  - `authorizeObject` (`backend/src/middleware/authorize.js` ~L220): a superadmin pass over a patient-bound document read is a PHI inspection: break-glass discipline + `superadmin_object_access` audit, never a silent read.
- Break-glass requests create critical in-app alerts for active `superadmin`, `super_admin`, `security_admin` and `dpo` accounts; patient notices retry on a bounded schedule and DPO post-access review is recorded with an audit event. These in-app records do not prove email/SMS delivery or human acknowledgement. Confirm active recipients, approval SLA and DPO coverage per environment at deploy.

## 7. Dedicated admin hostname and edge controls

- `infra/nginx/nginx.conf` has a dedicated `admin.findmedi.in` TLS server block with a restrictive CSP, no-store caching, security headers and an allowlist include. The HTML response uses the hostname-selected CSP in `infra/nginx/snippets/findmedi-proxy-locations.conf`.
- `infra/nginx/snippets/admin-allowlist.conf` intentionally contains `deny all;`. Before enabling access, replace it with approved VPN/office `allow <CIDR>;` entries followed by `deny all;`. Validate the Nginx config and the admin certificate SAN for `admin.findmedi.in`; point DNS to this edge.
- Ensure the edge strips client-provided `X-Forwarded-Host` and sets it to the validated request host. If the backend serves the admin host directly, configure `ADMIN_HOSTS` only with the trusted admin hostname(s). Do not trust a client-controlled forwarded-host header at the application boundary.
- Verify admin responses have the restrictive CSP and `Cache-Control: no-store`, and verify an unapproved source IP is blocked before login. The SPA is hash-routed, so a separate hostname is required to scope CSP by app surface.
- Confirm production superadmin roles have enrolled MFA; `SESSION_IDLE_TIMEOUT_MS`/`SESSION_ABSOLUTE_TIMEOUT_MS` default to 30 minutes/12 hours in production, and the admin concurrency cap defaults to 3. Validate these values against the deployed configuration.

## 5. Provider search index

- Public directory search (`GET /api/search`, `/api/search/providers`, `/api/search/unified`) runs through `backend/src/services/opensearchIndexer.js` (`searchProviders`); when OpenSearch is unconfigured it transparently falls back to Mongo regex and reports `engine: mongo`. `providerCatalog` Mongo listing is the catalogue read model, not the typo-tolerant search path.
- `indexProviderDoc` is the indexer entry; check indexer replay/cron in the runbooks before assuming the index matches Mongo in a fresh environment.

## 6. Named flows: listing + registration/booking + moderation

| Flow | Present as | Evidence |
|---|---|---|
| Support groups | Provider `support_group_host` + facility `support_group` detail | `backend/src/lib/providerTypeCatalog.js` `support_group_host`; `frontend/src/pages/facility/FacilityDetailPage.tsx` |
| Community forum | Peer-support programs, moderation queue, crisis guardrails | `support_group_host` approval is high-risk (two-person); `frontend/src/components/facility/sectionRegistry.ts` `support_group` sections; moderation models/routes |
| Seasonal / outbreak alerts | IST-month seasonal alert library + lab outbreak clusters | `backend/src/lib/seasonalAlerts.js`, `backend/src/routes/patientRecommendations.js`, `backend/src/routes/lab.js` `/outbreak` |
| Dementia-care program | Geriatric/dementia specialty codes, elder-care catalogue & facility care levels | `backend/src/lib/taxonomy.js` `SPEC.GERI.MEMORY`, `SPEC.NEURO.DEMENTIA`; `frontend/src/data/healthcareCatalogue.ts` |
| Sports academy | Provider type + facility subtype | `providerTypeCatalog` `sports_academy`; `backend/src/models/Facility.js` `sports_academy_turf` |
| Lactation / doula | Practitioner roles | `PractitionerProfile.roleType` `lactation_consultant`, `doula`; catalogue rows in `frontend/src/data/healthcareCatalogue.ts` |
| Student / workplace stress | Counselling + Mind module content | `providerTypeCatalog` `counsellor`; `frontend/src/mind/...` (exam stress, burnout, workplace programs) |
| State-scheme info | Facility schemes desk | `backend/src/models/Facility.js` `FACILITY_SCHEMES` (`state_scheme`, pmjay, cghs…); `frontend/src/pages/dashboards/GovtFacilityDashboard.tsx` |

These are catalogue + provider-engine wiring. Deep booking/moderation behaviour for each vertical is covered by the shared booking/moderation tests; there is no per-vertical bespoke engine.
