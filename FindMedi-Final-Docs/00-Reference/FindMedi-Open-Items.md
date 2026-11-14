# FindMedi - Open Items and TODO Tracker

> Source: read-only audit of `FindMedi-Final-Docs/` (31 files, 289 checklist items). Current state (re-audited 2026-11-14): 243 checked, 46 unchecked. The short work plan below groups the main remaining tasks; the exhaustive live inventory at the end contains every unchecked checklist entry. Some items mix code with external verification (for example, native Play Integrity requires device testing). Close an item only when its completion criteria and evidence are satisfied.
>
> Classification: **Code** (repo-implementable) / **Run and verify** (code exists, execution evidence needed) / **Human or external** (requires a qualified person, real-world input, or external service).


> **Reconciliation note (2026-11-10):** 27 items previously marked `[x]` carried pending-work notes and were reverted; two were re-ticked after their code deliverables were completed. Two duplicate checklist entries were consolidated, and one specialty live-flow item was checked against its passing browser evidence. Live audit: 243 checked, 46 unchecked. The exhaustive inventory below lists every open checkbox by file and line.

> **Verification run (2026-11-10, refreshed):** Frontend unit tests 454/454 passed (55 files); Playwright 39/39 passed (48.5s), including live specialty browser flow English/Hindi 2/2 (read-only); frontend typecheck and production build passed; frontend lint passed with 0 errors and 3,641 warnings; backend lint passed with 0 errors and 1,860 warnings. Backend unit suite passes 112/112 suites, 946/946 tests. Backend integration passed in isolated batches against an ephemeral local Docker MongoDB replica set: 155 suites / 1,434 tests, 0 failures; pharmacy replica-set transactions passed 3/3. The Mongo-only real-DB harness smoke passed 1/1; Redis/ClamAV/OpenSearch harness coverage remains incomplete. A disposable replica-set migration rehearsal passed dry-run, apply (one synthetic legacy doctor remapped), and rollback (original codes restored); staging apply + rollback remain pending. Specialty API-focused tests passed 45/45. Category seed dry-run passed. The attestation endpoint now fails closed pending real provider verification. Demo records are disabled at startup unless `DEMO_SEED_ENABLED=true` is explicitly set (never in production). These results do not close staging parity/restore drill, live-device tests, expert sign-offs, or incomplete coverage items.

> **SEO pipeline shipped (2026-11-13):** crawlable path urls (`BrowserRouter`), locale in the url (`?lang=hi`) with hreflang alternates on every public head, per-route prerendered head baked into the build (`scripts/prerender-routes.mjs`), a sitemap exported from the VERIFIED live listings (`scripts/export-sitemap-data.mjs`) and a crawler check (`scripts/verify-sitemap.mjs`) - 27/27 sitemap urls verified. Two dead urls fixed on the way (the facility canonical matched no route; `/contact` had no page). `npm run seo:export | seo:prerender | seo:sitemap | seo:verify`.

> **E2E evidence note (2026-11-13, refreshed):** Re-ran the full configured Chromium Playwright suite after the HashRouter -> BrowserRouter migration: **107/107 passed** (39 pre-existing + 68 new critical-journey tests). `frontend/e2e/critical-journeys.spec.ts` automates **all 14** critical journeys in **both locales** (English + Hindi): 1 (signup OTP -> book -> pay -> confirmation), 2 (video consult -> prescription saved -> visit completed), 3 (home visit listing), 4 (lab booking -> report -> patient views it), 5 (pharmacy order -> tracking -> return request), 6 (equipment rental -> escrow deposit -> return), 7 (membership -> check-in -> freeze -> cancel), 8 (event/camp registration -> attendee pass), 9 (provider join wizard -> declaration gate), 10 (refund/cancellation matrix, patient and provider side), 11 (SOS + offline fallback numbers), 12 (consent grant/revoke + access log), 13 (family profile switch -> dependant booking + guardian consent), 14 (admin KYC dual approval, provider suspend, dispute resolution, moderation dual-approval). All 14 legacy hash-based specs were migrated to path URLs. Several flows still use mocked APIs; this does not satisfy staging UAT against real services (the API calls stay mocked), which is still open in the staging bucket.

> **Signup defects fixed (2026-11-13):** (1) `frontend/src/pages/Signup.tsx` validated `bloodGroup` + primary emergency contact as required but rendered **no inputs** for them, so every patient signup failed with "Blood group is required" (journey 1 was unreachable). Inputs added, both values now sent to `POST /api/auth/register` and persisted by `backend/src/routes/auth.js` (`bloodGroup`, `emergencyContact.{name,phone}`); `bloodGroup` was added to `registerSchema` with the AB/O vocabulary. (2) `POST /api/auth/register` returned a 500 "Something went wrong" whenever the phone already had an outpatient patient row - the `patients` unique index `{hospitalId, phone}` (APPT-B-03 de-dup) collided on `hospitalId: null`, so the account was created but the response was an error. The route now reuses the existing outpatient row instead of aborting the registration; records and prescriptions are keyed by the USER id, so no clinical data is shared. Verified live in Chrome against the local backend: registration reaches `/verify-otp`, the Mongo row carries `bloodGroup` + the emergency contact, and two accounts on the same phone both get 201. Regression test: `backend/test/unit/signupContract.spec.js` (4 pass).

> **Harness, load and shadow evidence (2026-11-14):** (1) Real-service harness complete - `infra/docker-compose.harness.yml` (Mongo replica set rs0 on a named volume, Redis, ClamAV, OpenSearch) and `realServicesHarnessSmoke.spec.js` passes 1/1 with `REAL_SERVICES_REQUIRED=true`; re-verified after the chaos run. (2) Load baselines executed - three runs recorded in `docs/ops/load-baselines/` with a README: quick run green (p95 36/237/50 ms, 0 errors); full run green on ramp/sustain/soak (50-VU sustain p95 364 ms) with a documented 100-VU spike breach (p95 1103 ms) as a staging-capacity finding. (3) Chaos fail-closed check - `backend/scripts/chaos/recovery-test.mjs` passes 7/7 against the harness stack after SIGKILLing Mongo+Redis (recovery, PRIMARY writable, multi-doc transaction, Redis round-trip). (4) Shadow enforcement - `platformPhiGate` mounted in audit-only shadow mode on radiology order reads (`phi-radiology`), `shadowMode.spec.js` 6/6 pins shadow/enforce/module-flip behaviour; rollout flips via `SHADOW_ENFORCE_MODULES`. (5) Clinical-safety suite verified 3/3; advisor sign-off remains human. (6) Live UI verification in Chrome (backend + Vite dev servers): browse-specialties grid and SPEC.CARDIO detail (tabs, 8 sub-specialties, provider counts, Articles tab with seeded medically-reviewed article) render real API data; fixed missing react-i18next specialty keys (raw `specialties.*` keys were visible) in `frontend/src/i18n.ts`, fixed literal-HTML article body rendering (now DOMPurify-sanitized), and fixed pre-existing typecheck errors (`x-default` hreflang type, implicit-any test helper) - frontend typecheck 0 errors, production build passes. (7) After these UI fixes, suites re-ran green when not competing for CPU: vitest 447/447 (57 files), critical journeys 68/68 (en+hi), `specialty-browse` + `specialty-full-journey` 2/2, `specialty-live-backend` en+hi 2/2 (now passing against the local backend), `locale-url.spec.ts` 5/5 (fixed `LanguageSwitcher.tsx` to call `applyLocaleToUrl` so switching language rewrites the address bar to `?lang=hi`).

> **Latest focused changes (2026-11-10):** `SeoHead` optional language-alternate tags and noindex suppression added; 3 SEO tests pass. Android `FLAG_SECURE` Capacitor plugin and route guard added; 17 route-matcher tests pass. Frontend typecheck/build and all unit tests pass (454/454). Android Gradle compile was attempted but Java/JAVA_HOME is unavailable; screenshot prevention still needs physical-device evidence. HashRouter, real locale URLs, live listing export and crawler validation remain open.

## Remaining work plan

### Repo work and technical verification

- DONE: all 14 release-critical journeys are now automated in English and Hindi (`frontend/e2e/critical-journeys.spec.ts`, 68 tests; full Chromium suite 107/107). Staging UAT against real services stays open under the staging bucket below.
- DONE: real-service test harness (Mongo replica set + Redis + ClamAV + OpenSearch) via `infra/docker-compose.harness.yml`; smoke 1/1 with `REAL_SERVICES_REQUIRED=true`, re-verified after chaos recovery (2026-11-14).
- TODO: Implement native Android SMS Retriever; compile the new `FLAG_SECURE` plugin/route guard once Java + Android SDK are available, then verify screenshots on a physical device.
- TODO: Connect the native client to server-side Play Integrity/App Attest verification; configure real provider credentials and verify on supported devices before marking complete.
- TODO: Wire telemedicine identity/consent/mode checks into every actual booking path after confirming the consent flow; require qualified clinical/legal review for prescribing rules.
- DONE: public SEO architecture after the `HashRouter` -> `BrowserRouter` swap - clean path URLs, locale URLs (`?lang=hi`) wired end-to-end (URL wins at load in `main.tsx`, header switcher rewrites the address bar in `LanguageSwitcher.tsx`, 5/5 `locale-url.spec.ts`), hreflang alternates, prerendered per-route heads, populated sitemap from verified live listings (27/27 `verify-sitemap`), crawler/prerender tests (`seoPipeline.test.ts` 4/4). Deployed-host crawler validation stays in the staging bucket.
- DONE (dead pages): confirmed dead pages removed and radiology order reads now shadow-gated per module. OPEN (external): verify the admin hostname/IP allowlist in the target deployment (file 23:354).

### Runbook and environment work

- TODO: Run isolated load and chaos baselines; keep evidence with command, target environment and thresholds.
- TODO: Provision staging parity, synthetic data and vendor sandboxes; execute migration apply/rollback and restore drills using a verified backup.
- TODO: Run UAT with the documented participant plan and record release-gate sign-off.
- TODO: Execute the usability study and log findings, participants and follow-up decisions.

### People, approvals and real-world evidence

- TODO: Obtain legal, privacy, CA, clinical-safety, security and brand reviews from qualified reviewers; store signed evidence.
- TODO: Author and medically review specialty articles; publish only after clinician approval.
- TODO: Collect pilot metrics and market/competitor research from real data; finalize economics, pitch materials and data room from verified inputs.
- TODO: Name support/on-call owners, train the support team, publish grievance/DPO contacts and run incident drills.
- TODO: Complete store submissions, trademark checks, staffing and partnership commitments with the responsible owners.

The exact open checklist lines, with source document and line numbers, follow below. Assign a named owner and dependency before starting each task; do not tick an item solely because a draft, mock or scaffold exists.

## Completion rule

An item moves from `[ ]` to `[x]` only when the listed proof exists and is referenced in the doc. Counts must be re-audited after each closure. "100% complete" is only valid when unchecked count = 0 with evidence for every item.
## Exhaustive live checklist inventory (source of truth)

This section is generated by `node scripts/audit-final-docs.mjs --write`. It includes every open checkbox with its current source line. The preceding numbered register is a prioritised summary; use this inventory as the exact count. Do not close a checkbox without its required proof and approval.

- [00-Reference/FindMedi-Browse-By-Specialties-TODO.md:37] Article feed stays empty until medically reviewed specialty articles are authored and published (`PlatformContent` authoring - content-team dependency). Seeder scaffold added: `backend/scripts/seed/seed-specialty-articles.mjs` (creates reviewed+published articles for SPEC.CARDIO/DERM/ORTHO); production article authoring still pending. 2026-11-14: seed run against dev DB live-verified in Chrome (SPEC.CARDIO Articles tab shows "Understanding Heart Health" with Medically reviewed badge); fixed body rendering (was showing literal `<p>` tags; now DOMPurify-sanitized HTML) and frontend typecheck/build re-verified clean.
- [04-Provider-Profiles.md:202] NMC telemedicine rules (consent, ID, prescribing limits) enforced in booking flow - `middleware/telemedicineGate.js` (identity + ConsentRecord + mode support) + `frontend/src/components/TelemedicineConsentGate.tsx`; full NMC rule engine still needs legal rule set (note). **Update 2026-11-11:** gate now mounted on `POST /api/billing/pay` and `/api/appointments/series`; patient telemedicine consent endpoint `POST /api/patient/telemedicine-consent`; `BookingModal` renders consent gate for online modes; `appointmentMode` persisted on Appointment. Tests: `backend/test/unit/telemedicineGate.spec.js` (5 pass).
- [09-Missing-Pieces-and-Cross-Cutting.md:189] Legal pages + provider agreements + grievance officer - `frontend/src/pages/GrievanceRedressal.tsx` (route `/grievance`, 143 lines, IT Rules 2021 & DPDP Act 2023 redressal + DPO office) + Terms/Privacy/Refund/Cookie + `provider_agreement` acceptance; grievance-officer contact details are content/legal (note).
- [09-Missing-Pieces-and-Cross-Cutting.md:194] Pentest + restore drill before high-risk categories — operational security activity; no evidence of an executed pentest/restore drill in repo (open).
- [09-Missing-Pieces-and-Cross-Cutting.md:195] Support & ops staffing + SLAs — SLA machinery (`slaDueAt`, escalation job) exists; staffing/roster is a human ops deliverable (open).
- [12-Wireframes-and-Screen-Flows.md:361] Usability test plan (5–8 users/persona, 5 provider interviews, Hindi/regional, low-end Android + 3G) — human research activity; not yet run.
- [13-Legal-Drafts.md:266] Lawyer review of **all** documents (healthcare + data protection + consumer + IT) — legal review is a human deliverable (open).
- [13-Legal-Drafts.md:267] Align Privacy Policy with actual data flows (vendor list, retention, DPIA update) - `docs/legal/privacy-policy-alignment.md` (data flows, vendor list, retention, DPIA) drafted; legal review pending (note).
- [13-Legal-Drafts.md:268] Add Grievance Officer + DPO contact visibly (footer, app settings) - `docs/legal/grievance-dpo-contact.md` template + `frontend/src/pages/GrievanceRedressal.tsx` (route `/grievance`); actual contact details pending legal/ops (note).
- [13-Legal-Drafts.md:271] Localise (Hindi + key regional languages) — legal review of translations
- [14-Implementation-Roadmap.md:185] Spec reviewed (docs 01–10) · design approved (Figma) · a11y checklist — specs + a11y gate exist; Figma design sign-off is a human deliverable (open).
- [14-Implementation-Roadmap.md:192] Security review for T1 features; pentest for R4 — human security activity; ZAP baseline CI exists but no recorded review/pentest (open).
- [15-Mobile-App-Strategy.md:134] Native SMS Retriever / OTP autofill bridge and real-device verification (implementation not present).
- [15-Mobile-App-Strategy.md:136] Background-location spike for rider/ambulance apps — no native location service or device-test evidence yet.
- [15-Mobile-App-Strategy.md:138] Android `FLAG_SECURE` route guard/native plugin added (`SensitiveScreenPlugin`, `SensitiveScreenGuard`, 17 route-matcher tests in the full suite); Android Gradle compile could not run because Java/JAVA_HOME is unavailable in this environment, and screenshot-prevention still needs physical-device evidence.
- [15-Mobile-App-Strategy.md:139] Play Integrity / App Attest for field/rider - `backend/src/routes/attestation.js` `POST /api/attestation/verify` (fail-closed 503 when unconfigured, stable verdict contract); native client bridge + real-device tests remain open (note).
- [15-Mobile-App-Strategy.md:140] Store listings, Data Safety/Privacy labels, review demo accounts — store submission is a human deliverable (open).
- [16-Business-and-Unit-Economics.md:198] Build per-category unit-economics sheet; fill with pilot data — finance deliverable (open).
- [16-Business-and-Unit-Economics.md:199] Decide take-rate/plan pricing hypotheses → experiment plan
- [16-Business-and-Unit-Economics.md:200] CA: GST/TDS/TCS + payout flow; lawyer: fee-splitting/advertising/IRDAI/e-pharmacy — legal/CA review (open).
- [16-Business-and-Unit-Economics.md:203] Budget: infra + SMS/WhatsApp + support per 1k bookings — finance (open).
- [16-Business-and-Unit-Economics.md:204] Monthly metrics review + quarterly pricing review — ops cadence (open).
- [18-QA-and-Test-Plan.md:231] Clinical-safety test set + advisor sign-off - `backend/test/unit/clinicalSafety.spec.js` verified 3/3 passing (2026-11-14; T3 PHI isolation, sensitive category flags, Rx schedule enum); clinical advisor sign-off remains a human deliverable.
- [18-QA-and-Test-Plan.md:232] UAT scripts, participants, exit criteria; release gates & rollback rehearsals — UAT scripts 01–16 under `docs/uat/`; participants/sign-off are human records (note).
- [18-QA-and-Test-Plan.md:233] Staging migration apply and rollback - local disposable replica-set dry-run/apply/rollback passed; staging backup, apply, and rollback evidence is still required.
- [19-DevOps-Scaling-and-Cost.md:181] Staging parity + synthetic data + sandbox vendors ? not evidenced in repo (environment/human, open).
- [19-DevOps-Scaling-and-Cost.md:183] SLOs, alerts ? Prometheus/Grafana configs + observability/alerts.yml; status page + on-call rotation are ops deliverables (note).
- [20-Support-and-Ops-Playbooks.md:198] Helpdesk + SLA timers + macros + routing configured; KB v1 (hi/en) — `supportTickets.js`, `slaDueAt` escalation job, `dltTemplates`; KB content is an ops deliverable (note).
- [20-Support-and-Ops-Playbooks.md:199] Support team trained (privacy, safety, crisis, refunds, Rx basics) — training is a human ops deliverable (open).
- [20-Support-and-Ops-Playbooks.md:200] Incident roster/on-call + escalation contacts + clinical advisor reachable — ops staffing (open).
- [20-Support-and-Ops-Playbooks.md:201] SOPs 1-17 reviewed; dry-run drills (safety incident, payment mismatch, outage) — 17 SOPs documented in the doc; drills are ops activities (note).
- [20-Support-and-Ops-Playbooks.md:205] Grievance Officer + DPO contact live; DSR workflow tested — `routes/dsr.js`/`adminDsr.js`, break-glass DPO review; contact publishing is ops (note).
- [20-Support-and-Ops-Playbooks.md:206] Status page + comms templates ready — status page is an ops deliverable (note); comms templates in `supportOperations.js`.
- [21-Marketing-Brand-SEO-Plan.md:176] ASCI & Consumer Protection guidelines for claims/endorsements (disclosures for influencers) - `docs/marketing/asci-guidelines.md` (rules + FindMedi controls + review workflow); legal sign-off pending (note).
- [22-Pitch-Deck-Outline.md:134] Collect pilot metrics + cohort charts; per-category unit economics — data collection (open).
- [22-Pitch-Deck-Outline.md:135] Bottom-up market sizing with sources — research (open).
- [22-Pitch-Deck-Outline.md:136] Competitor research in beachhead city — research (open).
- [22-Pitch-Deck-Outline.md:137] Security/compliance status slide accurate (incl. pentest timeline) — human deliverable (open).
- [22-Pitch-Deck-Outline.md:138] Legal review of business model — legal (open).
- [22-Pitch-Deck-Outline.md:139] Team/advisors slide; hiring plan — people (open).
- [22-Pitch-Deck-Outline.md:140] Fundraising ask: amount, runway, milestones, use of funds — finance (open).
- [22-Pitch-Deck-Outline.md:141] Data room prepared; references ready — ops (open).
- [22-Pitch-Deck-Outline.md:142] Demo script + backup video; Q&A rehearsal — ops (open).
- [23-SuperAdmin-Design-and-Privacy.md:354] Deploy and verify the admin IP allowlist and separate hostname in the target environment.
- [24-Ops-CRM-and-Team-Management.md:367] Decide hybrid scope (build vs buy per module); sign DPAs for any external tool — business/vendor decision (open).
- [24-Ops-CRM-and-Team-Management.md:378] Start with spreadsheet/Notion process in parallel; migrate once stable — process decision (open).
