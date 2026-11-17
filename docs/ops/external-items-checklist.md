# FindMedi External Items — Master Completion Checklist

Generated: 2026-11-14  
Source of truth: `FindMedi-Final-Docs/00-Reference/FindMedi-Open-Items.md` — **126/186 checked, 60 open** (docs 01-15 merged into 26-28 on 2026-11-15; source of truth re-audited) (`node scripts/audit-final-docs.mjs --write`).  
Supporting: `docs/ops/external-items-execution-pack.md` (grouped execution pack).  
Chrome live smoke: `/browse-specialties` + `/browse-specialties/SPEC.CARDIO` render correctly; only non-fatal 401/400/socket noise.

> **Completion rule:** `[ ]` → `[x]` only when required evidence exists and is referenced in the source doc. Do NOT tick drafts/mocks/scaffolds. Counts must be re-audited after closures.

## Owner register
| Owner | Role | Email/Slack | Due date |
|---|---|---|---|
| TBD | Founder |  |  |
| TBD | Legal counsel |  |  |
| TBD | CA / Finance |  |  |
| TBD | Clinical advisor |  |  |
| TBD | Security lead |  |  |
| TBD | QA / PM |  |  |
| TBD | DevOps / SRE |  |  |
| TBD | Support ops |  |  |
| TBD | Mobile eng |  |  |
| TBD | Content lead |  |  |
| TBD | Design / UX |  |  |
| TBD | DPO |  |  |

## Status legend
`pending` | `in_progress` | `blocked` | `evidence_ready` | `signed_off` | `done`

## 1. Clinical, content & telemedicine
- [ ] **00-Ref:37** Medically reviewed specialty articles authored & published  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **04-Provider:202** NMC telemedicine legal sign-off — draft rule matrix at `docs/legal/telemedicine-rules-matrix.md` (identity, consent, prescribing, emergency) — **sign-off pending legal**
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **18-QA:231** Clinical advisor sign-off on clinical-safety test set  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## 2. Legal, privacy, compliance & agreements
- [ ] **09-Cross:189** Final grievance officer/provider agreement contact details published  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **13-Legal:266** Lawyer review of all documents (healthcare/data/consumer/IT)  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **13-Legal:267** Legal sign-off of Privacy Policy alignment (vendors/retention/DPIA)  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **13-Legal:268** GO + DPO visibility LIVE: footer link + Settings→Privacy DPO card + `/grievance` page verified in Chrome (patient demo login, 2026-11-17). **Actual officer names/address pending legal/ops.**
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **13-Legal:271** Localise legal docs — Hindi summary drafts at `docs/legal/short-form-summaries-hi.md`; **legal sign-off pending (English controlling)**
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **16-Biz:200** CA GST/TDS/TCS + payout flow; lawyer fee-splitting/advertising/IRDAI/e-pharmacy  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **21-Marketing:176** Legal sign-off on ASCI & Consumer Protection guidelines  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **22-Pitch:138** Legal review of business model  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## 3. Security, pentest & restore
- [ ] **09-Cross:194** Pentest + restore drill before high-risk categories  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **14-Roadmap:192** Security review for T1 features + recorded pentest for R4  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **22-Pitch:137** Security/compliance status slide accurate (incl. pentest timeline)  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## 4. Mobile / Android (env + device required)
- [ ] **15-Mobile:134** Native SMS Retriever/OTP autofill bridge + real-device verification  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **15-Mobile:136** Background-location spike for rider/ambulance + device-test evidence  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **15-Mobile:138** Compile FLAG_SECURE plugin and verify screenshot prevention on physical device  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **15-Mobile:139** Play Integrity/App Attest native client + real creds + supported-device tests  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **15-Mobile:140** Store listings, Data Safety/Privacy labels, review demo accounts  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## 5. Staging, UAT, migration & ops readiness
- [ ] **09-Cross:195** Support & ops staffing + published SLA roster (owners, shifts, training, on-call, advisor reachability)
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **18-QA:232** UAT participants, execution, exit criteria & release-gate/rollback rehearsal records  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **18-QA:233** Staging migration apply and rollback with verified backup/evidence  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **19-DevOps:181** Staging parity: runbook `docs/ops/staging-environments.md`; parity gate `scripts/staging-parity-check.mjs` passes; **requires real staging VM**  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **20-Support:199** Support team trained (privacy/safety/crisis/refunds/Rx basics); curriculum at `docs/ops/support-training.md` — run Module 1–6 and log completions  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **20-Support:200** Named incident roster — template at `docs/ops/incident-roster.md` (named IC, Eng Lead, DPO, Clinical, Legal, Finance, Support; rota + reachability test per quarter)  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **20-Support:201** SOP drill records — template `docs/ops/drill-records.md`; runbook `docs/ops/drill-runbook.md`; at least one drill per quarter, outcome logged, signed off  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **20-Support:205** GO + DPO visibility LIVE: footer + Settings→Privacy DPO card + `/grievance` verified in Chrome (patient demo login, 2026-11-17); DSR workflow tested. **Named officer contacts (name/email/phone/address) pending ops/legal; cannot invent.**
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **20-Support:206** Status page: `status/index.html` + `docs/ops/status-page.md`; comms templates `docs/ops/communication-templates.md`; **publish decision + host pending ops**  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **23-SuperAdmin:354** Deploy and verify admin IP allowlist and separate hostname in target env  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## 6. Research, UX, design & release process
- [ ] **12-Wireframes:361** Run usability test plan (5-8 users/persona, 5 providers, hi/regional, low-end+3G)  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **14-Roadmap:185** Figma design approval + a11y checklist sign-off  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## 7. Business, finance & pitch
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **22-Pitch:134** Pilot metrics + cohort charts; per-category unit economics  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **22-Pitch:139** Team/advisors slide; hiring plan  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **22-Pitch:140** Fundraising ask: amount, runway, milestones, use of funds  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **22-Pitch:141** Data room prepared; references ready  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **22-Pitch:142** Demo script written + backup video recorded (`docs/pitch/demo-script.md`, `docs/pitch/demo-backup.webm`, Playwright-verified 6.3s/484KB). **Q&A rehearsal + investor dry-run pending (founder/ops).**  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## 8. Partnerships / process
- [ ] **24-OpsCRM:368** Decide hybrid scope (build vs buy) per module; sign DPAs for external tools  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`
- [ ] **24-OpsCRM:379** Start spreadsheet/Notion process in parallel; migrate once stable  
  - Owner: `________` Due: `________` Status: `________` Evidence: `________`

## Closure SOP (per item)
1. Assign named owner + due date in this checklist and in the source doc note.
2. Execute / collect evidence (durable path/URL; signed where required).
3. Add evidence note to the source checklist line and change `[ ]` → `[x]`.
4. Run `node scripts/audit-final-docs.mjs --write`; update counts in `FindMedi-Open-Items.md`.
5. Re-open if evidence is missing or sign-off is conditional.

