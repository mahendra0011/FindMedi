# 27 — Remaining from Docs 01–15: Legal, Security & Compliance

> **What this file is:** the seven incomplete items that remain in the legal / security / compliance scope across `04-Provider-Profiles.md`, `09-Missing-Pieces-and-Cross-Cutting.md`, `13-Legal-Drafts.md`, `14-Implementation-Roadmap.md` — after a codebase + test + Chrome re-verification (2026-11-15). Everything else in these docs is implemented and verified.
> **Source of truth for status:** the original docs (all restored in full) — their `[ ]` checkboxes are unchanged. See `00-Reference/FindMedi-Open-Items.md` for the complete open-items inventory across all docs.
> **Rule:** close an item only when its completion evidence is referenced in the source doc.

---

## S1 — NMC telemedicine rule engine (legal rule set) beyond the gate
- **Source:** `04-Provider-Profiles.md:202` (`[ ]` line).
- **Current state (verified 2026-11-15):** code is DONE for the gate layer — `middleware/telemedicineGate.js` enforces identity (`User.isVerified`) + `ConsentRecord` + practitioner mode support on `POST /api/billing/pay` and `/api/appointments/series`; patient consent endpoint `POST /api/patient/telemedicine-consent`; `TelemedicineConsentGate.tsx` renders in `BookingModal` for online modes; `appointmentMode` persisted on Appointment; **5/5** `telemedicineGate.spec.js` pass. What does NOT exist: the complete NMC Telemedicine Practice Guidelines rule engine (prescribing limits by mode, specialty exclusions, ID-strictness mapping) — that is a **legal/clinical rule set**, not a code gap.
- **Close when:** NMC rule set drafted by healthcare counsel + clinical advisor, codified as config (not code forks), covers prescribing limits/ID verification/mode constraints, clinical/legal sign-off recorded in the doc.

## S2 — Grievance Officer + DPO contacts published
- **Source:** `13-Legal-Drafts.md:268` (`[ ]` line).
- **Current state (verified 2026-11-15):** page exists and is live — `/grievance` renders "Grievance Redressal & DPO Office" (IT Rules 2021 + DPDP Act 2023 content, officer cards, SLA timelines); footer link live on all pages; `docs/legal/grievance-dpo-contact.md` template filed. What does NOT exist: actual named officers + contact details (name/email/phone/address), in-app Settings visibility, and publication sign-off.
- **Close when:** named Grievance Officer + DPO identified; verified contacts published in footer + app Settings; acknowledgment-SLA communicated; DPO office reachable; sign-off in the doc.

## S3 — Lawyer review of ALL legal drafts (mandatory pre-publish)
- **Source:** `13-Legal-Drafts.md:266` (`[ ]` line).
- **Current state (verified 2026-11-15):** all drafts exist in repo — ToS (Users), Privacy Policy, Provider Agreement + DPA, Refund/Cancellation, Community & Review Guidelines, Medical Disclaimer, Advertising & Claims, Grievance Redressal, consent texts/microcopy, and type-specific addenda (clinical, pharmacy, wellness, home services, mental health, events, rental). Placeholders unfilled: `[COMPANY_NAME]`, `[CIN]`, `[REGISTERED_ADDRESS]`, `[SUPPORT_EMAIL]`, `[GRIEVANCE_OFFICER_NAME]`, `[DPO_CONTACT]`, `[JURISDICTION_CITY]`, `[EFFECTIVE_DATE]`.
- **Close when:** India-registered healthcare+DP+consumer+IT lawyer reviews every draft; DPDP Act 2023 + IT Rules 2021 + Consumer Protection Act 2019 applicability confirmed per doc; placeholders filled; redline diff + sign-off stored; en/hi publication flip enabled.

## S4 — Privacy Policy ↔ actual data flows — final alignment sign-off
- **Source:** `13-Legal-Drafts.md:267` (`[ ]` line).
- **Current state (verified 2026-11-15):** `docs/legal/privacy-policy-alignment.md` drafted (data flows, vendor list — Razorpay, Cloudinary, Twilio, Brevo, MapTiler, Sentry, PostHog, Unleash, LiveKit — retention schedule) and `docs/privacy/DPIA.md` present; neither carries lawyer/DPO sign-off, and the DPIA does not yet carry PostHog/Unleash/Sentry flows fully.
- **Close when:** DPO + counsel sign off that the published policy matches real flows (vendors, retention, sub-processors, rights/DSAR mechanics, grievance path); DPIA updated accordingly; published; sign-off referenced in the doc.

## S5 — Legal localisation (Hindi + regional)
- **Source:** `13-Legal-Drafts.md:271` (`[ ]` line).
- **Current state (verified 2026-11-15):** hi and en drafts exist; regional languages (mr, bn, ta, te, …) are untranslated; no translation-review protocol in place.
- **Close when:** per-language translations reviewed by counsel/native legal reviewer (not machine-only); precedence note (English prevails on conflict) included; hi/regional legal pages live; sign-off per language recorded.

## S6 — Design sign-off — Figma v1 (specs + launch design)
- **Source:** `14-Implementation-Roadmap.md:185` (`[ ]` line).
- **Current state (verified 2026-11-15):** all v1 specs are implemented in code (01–15, cards/details/wizard/dashboards); a11y gates exist (`accessibility.spec.ts`, `systemA11y.test.jsx`). What does NOT exist: designer + founder approval on Figma v1 for the full flow (mobile-first 360px, dark mode, elder mode), and any post-sign-off design drift control.
- **Close when:** Figma v1 approved (designer + founder) with date; a11y checklist sign-off recorded; change-control for post-sign-off drift documented; sign-off linked in the doc.

## S7 — Security review for T1 features; pentest for R4
- **Source:** `14-Implementation-Roadmap.md:192` (`[ ]` line).
- **Current state (verified 2026-11-15):** ZAP baseline runs in CI (`security-scan.yml`); authz-matrix/DTO-leak suites; field encryption for govt IDs + bank details; harness chaos/restore evidence; IAM engine reviewed internally. No **independent** security review of T1 (PHI) features has been recorded, and no pentest has been run against R4-gated categories (mental health, IVF, de-addiction, palliative). Pentest is also tracked in `09-Missing-Pieces-and-Cross-Cutting.md:194`.
- **Close when:** T1 features receive an independent security review (or signed internal review w/ DPO); an external pentest report is delivered and its remediations are closed out; restore-drill evidence is re-archived; the doc records the review/pentest reference.

## S8 — Pentest + restore drill before high-risk categories
- **Source:** `09-Missing-Pieces-and-Cross-Cutting.md:194` (`[ ]` line).
- **Current state (verified 2026-11-15):** ZAP baseline CI exists; no executed pentest and no executed restore drill with archived evidence exists in the repo; `restore-drill.sh` + `recovery-test.mjs` (7/7, SIGKILL Mongo+Redis) pass as **code**, but the **activity** (human sign-off, fresh-backup restore, RTO/RPO report) has not happened.
- **Close when:** pentest engagement contracted and delivered (scope covers auth, IDOR, payments, uploads, SSRF, telehealth); restore drill executed against a fresh verified backup with written RTO/RPO; both archived and referenced in the doc.

---

**Verification context (2026-11-15):** legal pages live and Chrome-verified (`/terms`, `/privacy`, `/grievance`, `/provider-agreement`, `/telemedicine-consent`, `/patient-rights`, `/community-guidelines`, `/disclaimer`, `/refund-policy`, `/cookies`); policy-acceptance ledger (`recordPolicyAcceptance`) live at join submit. Remaining risk is signature-shaped, not code-shaped.
