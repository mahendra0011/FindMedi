# External Items — Execution Plan (2026-11-15, rebuilt)

> Source of truth: `FindMedi-Final-Docs/00-Reference/FindMedi-Open-Items.md` — **38 open items** (251/289 checked. Code is complete and verified (tests + live Chrome checks, re-verified 2026-11-15); these 38 need qualified people/a deployed environment.
> Item IDs are `<doc>:<line>` **as in the tracker inventory**. Do not tick a row until the evidence exists and is referenced in the source doc. See also `DEFERRED_TODOS.md` for items blocked on external accounts.

## A. Legal / privacy / compliance / sign-offs (Owner: Legal Counsel + CA)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 04:202 | NMC telemedicine rule engine — legal rule set applied to all teleconsult paths | Approved NMC rule set; compliance mapping; in-code gate already enforces identity+consent+mode (5/5 tests) — legal sign-off outstanding |
| 09:189 | Grievance Officer / DPO contacts published (`/grievance`, footer, app Settings) | Named officers + reachable channels; `/grievance` live; DPO email/phone/address plublished |
| 13:266 | Lawyer review of ALL documents (ToS, Privacy, Provider Agreement, Refund, Community, Disclaimer, Claims, Grievance, consents) | Redlined docs + signed acceptance; DPDP/IT Rules/NMC/Consumer Protection pass |
| 13:267 | Privacy Policy ↔ actual data flows — final alignment sign-off | Signed approval of `docs/legal/privacy-policy-alignment.md`; DPIA covers vendors (Razorpay, Cloudinary, Twilio, Brevo, MapTiler, Sentry, PostHog) + retention + sub-processors |
| 13:268 | Publish G.O + DPO contacts in app (Settings + footer) | Live URLs + screenshots; `/grievance` displays published names |
| 13:271 | Legal localisation (hi + regional) with legal review | Reviewed translations per language; English-case-precedence note |
| 16:200 | CA: GST/TDS/TCS + payout flow; lawyer: fee-splitting/advertising/IRDAI/e-pharmacy | CA + lawyer sign-off memos |
| 21:176 | ASCI + Consumer Protection — claims/endorsement sign-off | Signed review of `docs/marketing/asci-guidelines.md` |
| 22:138 | Business-model legal review (fee structure, disintermediation, advertising) | Signed legal opinion |

## B. Security (Owner: Security Firm + DevOps)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 09:194 | Pentest + restore drill **before** high-risk categories | Pentest report (auth/IDOR/payments/uploads/SSRF) + restore drill log with RTO/RPO; both referenced in doc |
| 14:192 | T1 (PHI) security review; recorded pentest for R4-gated categories | Security review report; pentest report; closeout or explicit risk acceptance |
| 22:137 | Security/compliance status slide accurate (incl. pentest timeline) | Slide with verified facts only |

## C. Staging / UAT / ops readiness (Owner: DevOps + QA)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 18:232 | UAT participants + execution + exit criteria + release-gate/rollback rehearsal | Signed UAT report against staging (scripts `docs/uat/` UAT-01…16) |
| 18:233 | Staging migration apply + rollback with verified backup | Before/after dumps; apply/rollback logs (local RS rehearsal already passed) |
| 19:181 | Staging parity — runbook docs/ops/staging-environments.md + scripts/staging-parity-check.mjs (pass locally); staging env + sandbox creds pending DevOps | Staging VLAN + cred record + parity check log |
| 20:199 | Support team trained (privacy/safety/crisis/refunds/Rx) | Attendance + assessment records |
| 20:200 | Incident roster/on-call + escalation contacts + clinical advisor reachable | Published roster + reachability test record |
| 20:201 | SOPs 1–17 reviewed; dry-run drills (safety incident, payment mismatch, outage) | Drill logs/reports with timings |
| 20:205 | G.O + DPO contacts live; DSR workflow tested in ops context | Published contacts + DSR test run evidence |
| 20:206 | Status page artifact ready: status/index.html + docs/ops/status-page.md; comms templates in docs/ops/communication-templates.md; **live host decision pending** | Pages/Upptime URL + uptime check proof |
| 23:354 | Admin IP allowlist + separate `admin.` hostname deployed & verified | Config + DNS + allow/deny access test — deploy-time task |
| 09:195 | Support/ops staffing + published SLA roster | Roster + SLA doc (SLA machinery exists: `slaDueAt`, escalation job) |

## D. Mobile / Native (Owner: Mobile lead; env+device required)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 15:134 | SMS Retriever / OTP autofill bridge + real-device verification | Kotlin impl, APK, device video of autofill |
| 15:136 | Background-location spike (rider/ambulance) + device evidence | Spike notes; battery/permission/doze behavior on device |
| 15:138 | FLAG_SECURE compiled APK + device screenshot test | Build log + screenshot-blocked evidence (plugin + 17 route tests exist) |
| 15:139 | Play Integrity / App Attest native client + real creds + supported-device tests | Client wiring + creds + verdict evidence (server fail-closed endpoint exists) |
| 15:140 | Store listings, Data Safety/Privacy labels, review demo accounts | Submission receipts + labels + demo creds |

## E. Research / UX / Research (Owner: UX Research + Design)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 12:361 | Usability study (5–8 users/persona + 5 provider interviews; hi/regional; low-end Android + 3G) | Script, anonymized participants, SUS scores ≥70, findings → backlog |
| 14:185 | Design sign-off for v1 (Figma) | Approved Figma + a11y checklist sign-off |

## F. Business / finance / pitch (Owner: founder + finance)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 22:134 | Pilot metrics + cohort charts + per-category economics | Charts from real data (post-launch) |
| 22:135 | Bottom-up market sizing with sources — **done** (source-verified `docs/pitch/market-sizing.md`: InsightRx TAM ≈US$ 400B FY26, IBEF hospital US$ 122.3B 2025 → US$ 202.5B 2030 at 10.61% CAGR, Ken Research e-pharmacy US$ 3.5B 2025 → US$ 8.6B 2031) | Source-verified doc |
| 22:136 | Competitor research in beachhead city — **done** (`docs/pitch/competitor-research.md`: Tata 1mg ~30%, PharmEasy ~16%, Apollo 24|7 ~12%, Netmeds ~9%, Amazon ~7%, Flipkart ~5% — Ken Research 2025) | Source-verified doc |
| 22:139 | Team/advisors slide + hiring plan | Deck + plan |
| 22:140 | Fundraising ask (amount/runway/milestones/use of funds) | Plan doc |
| 22:141 | Data room prepared + references ready | Indexed room + access control |
| 22:142 | Demo script + backup video + Q&A rehearsal | Assets + rehearsal record |

## G. Partnerships / process (Owner: Business + Ops)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 24:368 | Hybrid build-vs-buy decision per CRM module + DPAs for external tools | Signed decision memo + DPA PDFs |
| 24:379 | Spreadsheet/Notion parallel process in place; migrate once stable | Live tracker + migration criteria |

## H. Content / clinical (Owner: Content + Clinical)

| ID | Item | Deliverable / Evidence |
|---|---|---|
| 18:231 | Clinical-safety test set + advisor sign-off | Signed review of `backend/test/unit/clinicalSafety.spec.js` (3/3) |
| 00-Ref:37 | Medically reviewed specialty articles published (≥3: CARDIO/DERM/ORTHO) | Reviewer names/credentials + publish records in `PlatformContent` |

---

## Sequences that cannot be parallelized

1. `13:266 (lawyer review)` gates: `13:267`, `13:268`, `21:176`, `22:138` publication.
2. `09:194 pentest` gates any R4-category beta.
3. `19:181 staging parity` gates: `18:232 UAT`, `18:233 staging migration`.
4. `18:232` gates: `22:134 pilot metrics`.

## Code status
Everything above depends on qualified humans or a deployed environment. No item in this list is blocked on writing more code. Tracker: `FindMedi-Final-Docs/00-Reference/FindMedi-Open-Items.md` (251/289 checked, 38 open).
