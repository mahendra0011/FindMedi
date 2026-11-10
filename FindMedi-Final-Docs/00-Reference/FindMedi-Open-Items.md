# FindMedi - Open Items and TODO Tracker

> Source: read-only audit of `FindMedi-Final-Docs/` (31 files, 289 checklist items). Current state (re-audited 2026-11-10): 237 checked, 52 unchecked. The short work plan below groups the main remaining tasks; the exhaustive live inventory at the end contains every unchecked checklist entry. Some items mix code with external verification (for example, native Play Integrity requires device testing). Close an item only when its completion criteria and evidence are satisfied.
>
> Classification: **Code** (repo-implementable) / **Run and verify** (code exists, execution evidence needed) / **Human or external** (requires a qualified person, real-world input, or external service).


> **Reconciliation note (2026-11-10):** 27 items previously marked `[x]` carried pending-work notes and were reverted; two were re-ticked after their code deliverables were completed. Two duplicate checklist entries were consolidated, and one specialty live-flow item was checked against its passing browser evidence. Live audit: 237 checked, 52 unchecked. The exhaustive inventory below lists every open checkbox by file and line.

> **Verification run (2026-11-10, refreshed):** Frontend unit tests 454/454 passed (55 files); Playwright 39/39 passed (48.5s), including live specialty browser flow English/Hindi 2/2 (read-only); frontend typecheck and production build passed; frontend lint passed with 0 errors and 3,641 warnings; backend lint passed with 0 errors and 1,860 warnings. Backend unit suite passes 112/112 suites, 946/946 tests. Backend integration passed in isolated batches against an ephemeral local Docker MongoDB replica set: 155 suites / 1,434 tests, 0 failures; pharmacy replica-set transactions passed 3/3. The Mongo-only real-DB harness smoke passed 1/1; Redis/ClamAV/OpenSearch harness coverage remains incomplete. A disposable replica-set migration rehearsal passed dry-run, apply (one synthetic legacy doctor remapped), and rollback (original codes restored); staging apply + rollback remain pending. Specialty API-focused tests passed 45/45. Category seed dry-run passed. The attestation endpoint now fails closed pending real provider verification. Demo records are disabled at startup unless `DEMO_SEED_ENABLED=true` is explicitly set (never in production). These results do not close staging parity/restore drill, live-device tests, expert sign-offs, or incomplete coverage items.

> **E2E evidence note (2026-11-10):** Re-ran the full configured Chromium Playwright suite after adding the Android route guard: 39/39 passed in 48.5s, including Join Platform desktop/mobile, login, language picker, English/Hindi discovery and live specialty browse in English/Hindi. Several flows use mocked APIs; this does not satisfy staging UAT or the documented 14 critical journeys in both languages.

> **Latest focused changes (2026-11-10):** `SeoHead` optional language-alternate tags and noindex suppression added; 3 SEO tests pass. Android `FLAG_SECURE` Capacitor plugin and route guard added; 17 route-matcher tests pass. Frontend typecheck/build and all unit tests pass (454/454). Android Gradle compile was attempted but Java/JAVA_HOME is unavailable; screenshot prevention still needs physical-device evidence. HashRouter, real locale URLs, live listing export and crawler validation remain open.

## Remaining work plan

### Repo work and technical verification

- TODO: Add the missing 14 release-critical journeys in English and Hindi, including failure paths; keep third-party integrations mocked only where appropriate.
- TODO: Complete the real-service test harness for Mongo replica set, Redis, ClamAV and OpenSearch; run it with disposable, isolated containers and record results.
- TODO: Implement native Android SMS Retriever; compile the new `FLAG_SECURE` plugin/route guard once Java + Android SDK are available, then verify screenshots on a physical device.
- TODO: Connect the native client to server-side Play Integrity/App Attest verification; configure real provider credentials and verify on supported devices before marking complete.
- TODO: Wire telemedicine identity/consent/mode checks into every actual booking path after confirming the consent flow; require qualified clinical/legal review for prescribing rules.
- TODO: Resolve public SEO architecture for the HashRouter app; use stable locale URLs, verified live listing exports, sitemap and crawler tests before closing indexing work.
- TODO: Remove or redirect confirmed dead pages and verify the admin hostname/IP allowlist in the target deployment.

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

- [00-Reference/FindMedi-Browse-By-Specialties-TODO.md:37] Article feed stays empty until medically reviewed specialty articles are authored and published (`PlatformContent` authoring - content-team dependency). Seeder scaffold added: `backend/scripts/seed/seed-specialty-articles.mjs` (creates reviewed+published articles for SPEC.CARDIO/DERM/ORTHO); production article authoring still pending.
- [04-Provider-Profiles.md:202] NMC telemedicine rules (consent, ID, prescribing limits) enforced in booking flow - `middleware/telemedicineGate.js` (identity + ConsentRecord + mode support) + `frontend/src/components/TelemedicineConsentGate.tsx`; full NMC rule engine still needs legal rule set (note).
- [09-Missing-Pieces-and-Cross-Cutting.md:189] Legal pages + provider agreements + grievance officer - `frontend/src/pages/GrievanceRedressal.tsx` (route `/grievance`, 143 lines, IT Rules 2021 & DPDP Act 2023 redressal + DPO office) + Terms/Privacy/Refund/Cookie + `provider_agreement` acceptance; grievance-officer contact details are content/legal (note).
- [09-Missing-Pieces-and-Cross-Cutting.md:194] Pentest + restore drill before high-risk categories — operational security activity; no evidence of an executed pentest/restore drill in repo (open).
- [09-Missing-Pieces-and-Cross-Cutting.md:195] Support & ops staffing + SLAs — SLA machinery (`slaDueAt`, escalation job) exists; staffing/roster is a human ops deliverable (open).
- [12-Wireframes-and-Screen-Flows.md:361] Usability test plan (5–8 users/persona, 5 provider interviews, Hindi/regional, low-end Android + 3G) — human research activity; not yet run.
- [13-Legal-Drafts.md:266] Lawyer review of **all** documents (healthcare + data protection + consumer + IT) — legal review is a human deliverable (open).
- [13-Legal-Drafts.md:267] Align Privacy Policy with actual data flows (vendor list, retention, DPIA update) - `docs/legal/privacy-policy-alignment.md` (data flows, vendor list, retention, DPIA) drafted; legal review pending (note).
- [13-Legal-Drafts.md:268] Add Grievance Officer + DPO contact visibly (footer, app settings) - `docs/legal/grievance-dpo-contact.md` template + `frontend/src/pages/GrievanceRedressal.tsx` (route `/grievance`); actual contact details pending legal/ops (note).
- [13-Legal-Drafts.md:271] Localise (Hindi + key regional languages) — legal review of translations
- [14-Implementation-Roadmap.md:185] Spec reviewed (docs 01–10) · design approved (Figma) · a11y checklist — specs + a11y gate exist; Figma design sign-off is a human deliverable (open).
- [14-Implementation-Roadmap.md:189] Unit + integration + E2E — current configured Chromium suite has 39 Playwright tests; the 14 specified end-to-end journeys and their failure-path coverage are not exhaustive.
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
- [18-QA-and-Test-Plan.md:223] Real-DB integration test harness (replica set + Redis + ClamAV + OpenSearch) - Mongo replica-set harness smoke passed against an ephemeral local Docker MongoDB (1/1); Redis/ClamAV/OpenSearch harness remains partial (note).
- [18-QA-and-Test-Plan.md:225] 14 critical E2E journeys automated (hi + en) - `frontend/e2e/specialty-live-backend.spec.ts` now passes the specialty browse/detail/data journey in both locales against the configured local backend (read-only); full 14-journey hi/en matrix still open (note).
- [18-QA-and-Test-Plan.md:229] Load/spike/soak tests with baselines; chaos fail-closed checks - `scripts/load/k6-smoke.js` + `backend/scripts/chaos/recovery-test.mjs` + `docs/ops/autoscaling-policy.md`; executed baselines/evidence still open (note).
- [18-QA-and-Test-Plan.md:231] Clinical-safety test set + advisor sign-off - `backend/test/unit/clinicalSafety.spec.js` (T3 PHI isolation, sensitive category flags, Rx schedule enum); advisor sign-off is human (note).
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
- [21-Marketing-Brand-SEO-Plan.md:210] Crawlable public URLs, sitemap populated from verified live listings, localized alternates wired to real locale URLs, and SSR/prerender/crawler verification — current app uses `HashRouter`, and the static sitemap generator does not export live listing data (open architecture/deployment work).
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
- [23-SuperAdmin-Design-and-Privacy.md:356] Shadow mode -> staged enforcement (mental health first) -> remove dead pages - `middleware/shadowMode.js` `shadowGate(module, check)` logs `shadow_violation` in shadow mode (default) and enforces (403) when `SHADOW_ENFORCE=true` or module listed in `SHADOW_ENFORCE_MODULES`; mental-health-first rollout via module key. Dead-page removal remains a cleanup task (note).
- [24-Ops-CRM-and-Team-Management.md:367] Decide hybrid scope (build vs buy per module); sign DPAs for any external tool — business/vendor decision (open).
- [24-Ops-CRM-and-Team-Management.md:378] Start with spreadsheet/Notion process in parallel; migrate once stable — process decision (open).
