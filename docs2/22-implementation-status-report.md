# 22. Implementation Status Report: md files (01-19) vs actual repo

**Repo checked:** `mahendra0011/FindMedi` latest commit `535afef` (9 Oct 2026); history me 4 naye commits (IAM, forms/print/queue, platform/finance/MIS/contact).
**Growth since last audit:** models 173 → 266, routes 138 → 170, pages 261 → 300, 279 files changed (+24k lines).

## Seedha jawab: kya 100% complete hua?
**Nahi.** Bahut bada hissa implement hua hai, par spec ka poora nahi.

| Status | Count | % (of 139 tracked items) |
|---|---|---|
| ✅ DONE | 56 | 40% |
| 🟡 PARTIAL | 43 | 31% |
| ❌ NOT DONE | 40 | 29% |

> Ye mere granular checklist items hain (har item equal weight). Isse approximate progress samjho, exact % nahi.

**Sabse bada pattern:** models/routes bane hain, par **modules ke beech wiring nahi hui** (Approval engine hai par koi module use nahi karta; PatientFlag hai par blocking nahi; kai models ke routes/UI nahi). Kai UI pages sirf 50-150 lines ke hain, matlab skeleton level, production-depth nahi.

## Limits of this check
- Static code scan (grep + files padhe). **App run nahi ki, tests run nahi kiye** (DB/env nahi).
- "✅" = code me mila, behaviour verified nahi. "[VERIFY]" = shallow evidence.
- Files 20/21 reference docs hain; unki libraries ka status section P me hai.

## Meri purani md files ki galtiyan (correct kar raha hu)
1. **File 19 §1.1 galat tha:** maine likha tha `LenisScroll` poore app par smooth-scroll lagata hai. Code me smooth scroll sirf `pathname === '/'` par active hai (`LenisScroll.tsx`). Dashboards par koi issue nahi.
2. **File 01 sidebar duplicates:** ab sirf *doctor* menu me 3 duplicate labels bache hain (`nav.consultations`, `nav.inPersonAppointments`, `nav.approvedOfflineAppointments`). hospital_admin me nahi.
3. File 20 ki kai libraries ka alternative aapne **custom** banaya (xstate → custom engine, json-rules-engine → DNF matcher, dexie → raw IndexedDB, signature_pad → custom canvas). Ye theek hai: "installed nahi" ka matlab "feature missing" nahi.
4. Is round me mere pehle kuch grep checks galat the (Supplier `gstNumber`, OT implants, rule operators); unhe direct code padhkar fix kiya. Neeche ki tables final hain.

---

## Legend
✅ DONE (code me mila) · 🟡 PARTIAL (base hai, spec ka hissa baki) · ❌ NOT DONE (nahi mila)

> Har row ke saath evidence file/route likha hai. "Mila" ka matlab code me mila, **chalke test nahi kiya**.

## A. File 01 / 03: flow gaps

| # | Item | Status | Evidence / kya baki |
|---|---|---|---|
| A1 | Discharge → final bill | ✅ | `ipd.js` `discharge/finalize` requires `BillingClear`, creates `Billing`, marks ChargeItems billed |
| A2 | IPD charge accrual | 🟡 | `bedChargeAccrual.job.js` + ChargeItem posts from `ot/doctor/ipd/pharmacy`; **lab, radiology, consumables se ChargeItem post nahi mila** |
| A3 | Discharge state machine (clinician) | ✅ | `DischargeWorkflow`: initiate/approve/clear/finalize, `clinicianOnly` |
| A4 | Structured discharge summary + PDF | ✅ | `/discharge/summary-pdf` |
| A5 | Prescription → Lab/Pharmacy/Radiology link | ✅ | `prescriptionId`, `encounterId` fields in `LabOrder`, `PharmacyOrder`, `Radiology` |
| A6 | Appointment ↔ Encounter/prescription refs | ❌ | `Appointment.js` me `encounterId/prescriptionId` nahi; appointment/token par Encounter auto-create nahi mila (sirf `backfill-encounters.mjs`) |
| A7 | `receptionist` role | ✅ | in `User.role` enum + IAM template |
| A8 | Bed transfer | ✅ | `POST /ipd/admissions/:id/transfer`, `BedTransfer` |
| A9 | IPD deposit, running bill, interim bill | ✅ | `ipd.js` |
| A10 | doctor-notes doctor ko allowed | ✅ | `clinicianOnly` |
| A11 | Bed number per-hospital unique | ✅ | `index({hospitalId, bedNumber}, unique)` + `migrate-bed-unique.js` |
| A12 | Tariff / price master | ✅ | `ServicePrice`, `RoomTariff`, `/finance/prices`, `/prices/resolve` |
| A13 | Doctor fee master | ❌ | `masters.js`/`finance.js` me nahi mila |
| A14 | Housekeeping task on discharge | ✅ | finalize sets bed `Under Cleaning` + creates `Housekeeping` |
| A15 | Real payment gateway | 🟡 | `gateways.js`: Mock + Razorpay **webhook signature verify only**; live `createOrder` throws `GATEWAY_NOT_WIRED`; Cashfree/PayU/PhonePe, refund, payment-link/QR, settlement fetch nahi |
| A16 | Visitor pass | 🟡 | `VisitorPass` model hai, **route/UI nahi** |
| A17 | Credit note | ✅ | `finance.js POST /credit-notes`; **debit note nahi** |
| A18 | OPD vitals station | ❌ | vitals sirf DoctorConsultation/Triage/IPD me |
| A19 | ER unknown patient (temp UHID) | ❌ | sirf `patientName: 'Unknown'` default |
| A20 | MLC workflow | 🟡 | `MlcCase` model hai; **koi route nahi** (sirf mortuary.js me death/MLC mention) |
| A21 | OT: PAC, WHO checklist, anaesthesia record, implants, team fees | ✅ | `OperationTheatre.js` fields (`pac`, `whoChecklist`, `implants`), `OtBoard` page |
| A22 | LIS: accession/barcode, ref ranges + H/L flags, QC, outsourced, delta check, recollect | ❌ | `LabOrder` me sirf critical/reject/tat; `LabOps` page 49 lines |
| A23 | HL7 ORU/ADT parse → results | 🟡 | `lib/hl7.js` + hub ingest; **ASTM nahi**, analyzer mapping UI `HubBoard` |
| A24 | RIS/PACS (DICOM, worklist, structured report, dose log) | ❌ | no dicom/orthanc anywhere |
| A25 | Pharmacy indent→issue→receive, GRN, stock | ✅ | `stores.js`, `Indent`, `GRN`, `StockLedger` |
| A26 | Pharmacy: FEFO, schedule-H1/narcotic register, generic substitution | 🟡 | FEFO mention in `pharmacy.js`; register/substitution UI-route [VERIFY] |
| A27 | Cash counter open/close shift | ✅ | `finance.js` counters/open, shifts/:id/close |
| A28 | Follow-up auto scheduling | 🟡 | `recall.js` (rules, dues, send) ✅; appointment auto follow-up booking nahi |

## B. File 02: Hospital Admin Dashboard v2

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| B1 | HospitalDashboardV2 page | 🟡 | 149 lines, route `/dashboard/v2`; **default landing nahi** (old Dashboard abhi bhi default) |
| B2 | `/dashboard/operations` single call | ✅ | `dashboard.js` |
| B3 | `/revenue`, `/alerts` + ack, `/beds/heatmap`, `/staff/on-duty` | ✅ | `dashboard.js` |
| B4 | `/dashboard/overview` (KPI + compare + sparkline) | ❌ | route nahi |
| B5 | `/dashboard/queue` live OPD queue | ❌ | queue metrics `queues.js /:id/metrics` me hai, dashboard me nahi |
| B6 | Insurance pipeline widget API | 🟡 | `tpa.js /pipeline` hai; dashboard se wired [VERIFY] |
| B7 | Date range + compare toggle, widget registry/layout save | ❌ | page me date/compare nahi mila |
| B8 | Alert Center realtime (socket `dashboard:alert`) | 🟡 | DashboardAlert + `/alerts` ✅; rules route me socket push nahi mila |
| B9 | Dashboard load test | ✅ | `k6/dashboard-ops-load.js` |

## C. File 04: Clinical modules

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| C1 | EMR workspace (banner, timeline, orders, sign) | ✅ | `EmrWorkspace.tsx` (164 lines) + `doctor.js /workspace/:encounterId` |
| C2 | CPOE Order + review inbox | ✅ | `Order`, `orders.js` (review-inbox, my-rounds, my-ot) |
| C3 | CDSS check, Rx templates, ICD search, AI scribe | ✅ | `clinical.js /cds/check`, `/rx-templates`, `/scribe/draft`; `search.js /icd` |
| C4 | Rx e-sign QR verify | 🟡 | backend `verify.js` + `docSeal.js` ✅; **frontend verify page nahi** |
| C5 | Ward round + shift handover | ✅ | `WardRound`, `ShiftHandover`, `/rounds`, `/handovers` |
| C6 | NEWS2 / Morse / Braden scores | ❌ | 0 hits |
| C7 | ICU flowsheet | ✅ | `IcuFlowsheet`, `IcuChart` page |
| C8 | NICU (phototherapy, bilirubin, feeding) | ❌ | none |
| C9 | Maternity: antenatal, labour/deliver, birth record | ✅ | `maternity.js` |
| C10 | Paediatric growth chart / vaccination due | 🟡 | `emrTemplates.js` template only |
| C11 | Oncology (protocols, cycles, administer) | ✅ | `oncology.js`, `OncologyPage` |
| C12 | Dialysis extension, cath-lab, endoscopy | ❌ | none |
| C13 | Blood bank: donor screening, cross-match, reaction, TTI | ❌ | none new |
| C14 | Incident / HAI / needle-stick / ADR | 🟡 | `Incident`, `AdrReport` **models only, routes/UI nahi** |
| C15 | Antibiotic stewardship | ❌ | none |
| C16 | Case presentation / M&M | ✅ | `casePresentations.js`, `CaseBoard` |
| C17 | Tele-consult compliance (RMP no., prohibited drugs) | ❌ | none |
| C18 | Doctor dashboard: queue/results/referrals/earnings statement | ✅ | `DoctorQueue`, `ResultsInbox`, `ReferralsInbox`, `EarningsStatement`, `doctor.js /dashboard, /tasks, /oncall` |

## D. File 05: Front office, billing, finance

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| D1 | Front Desk page | 🟡 | `FrontDesk.tsx` **69 lines**: register + token only; check-in, enquiry, visitor, payment collection, merge nahi |
| D2 | Duplicate patient detection + merge | ❌ | not found |
| D3 | Enquiry / call log | ❌ | `Enquiry` model nahi |
| D4 | Discount authority matrix | 🟡 | `DiscountPolicy` + `/discounts/check`; **billing routes me enforce nahi** |
| D5 | Refund approval chain | ❌ | not wired |
| D6 | Split payment | ❌ | `Billing` me `payerSplit` hai (insurer/patient), multi-mode split nahi |
| D7 | GST invoice / HSN / invoice series | ❌ | Billing me hsn/gstin nahi |
| D8 | TPA desk: insurers, pre-auth, claim, settle, pipeline | ✅ | `tpa.js`, `TpaDesk` page (77 lines) |
| D9 | Room-rent proportionate deduction, claim bundle, appeal | ❌ | none |
| D10 | Accounts: expenses (+approve), ledger, trial balance, P&L | ✅ | `finance.js` |
| D11 | Chart of accounts, AP vendor bill 3-way match, GSTR export, bank-wise books | ❌ | none |
| D12 | Doctor payout statement + TDS | 🟡 | `EarningsStatement` page; `PayoutStatement` model nahi, TDS nahi |
| D13 | NPS / feedback survey | ❌ | none |
| D14 | Recall engine | ✅ | `recall.js`, `RecallRule`, `RecallLog` |
| D15 | Duplicate-copy watermark on reprint | ✅ | print route/`PrintLog` |

## E. File 06: HR, ops, inventory

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| E1 | Duty roster | 🟡 | `roster.js` (list/create/publish) + `RosterPage`; **shift swap/on-call/rules nahi**, `ShiftSwap` model nahi |
| E2 | Payroll payslip, PF/ESI/TDS | ❌ | `PayrollPage` 58 lines; `Payslip` model nahi |
| E3 | Credentials/licence tracking | 🟡 | `Credential` model hai, **route/UI nahi** |
| E4 | Inventory: stores, indents, GRN, stock | ✅ | `stores.js` |
| E5 | Stock audit, ABC-VED, low-stock/expiry alerts, rate-contract check | ❌ | none |
| E6 | CSSD sets/cycles/indicators | ✅ | `cssd.js`, `CssdPage` |
| E7 | Mortuary receive/release | ✅ | `mortuary.js`, `MortuaryPage` |
| E8 | Kitchen production sheet | ✅ | `DietKitchenSheet` |
| E9 | BMW log | 🟡 | `BmwLog` model only |
| E10 | Equipment AMC/warranty/PM/calibration fields | ❌ | `Equipment/AssetUnit` me nahi; `AssetMaintenance` model nahi |
| E11 | Ambulance trip sheet/fuel | ❌ | none |
| E12 | Linen/laundry | ❌ | none |
| E13 | Gate/security rounds | ❌ | none |

## F. File 07: Compliance / interop / security

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| F1 | IAM Access Control Center (policies, evaluator, grants, SoD, sensitivity labels, reviews) | ✅ | `iam.js`, `iamEvaluator.js` (331 lines), `AccessControl.tsx` |
| F2 | PHI field encryption, Argon2id, ZAP/SBOM | ✅ | earlier commits (`9f4e6ef`, `b0ed0ee`) |
| F3 | DPDP docs (DPIA, retention) | ✅ | `docs/privacy/` |
| F4 | ABDM gateway | ✅ | `abdmGateway.js`, `healthId.js` (pre-existing) |
| F5 | FHIR R4 | 🟡 | 5 resources (Patient, Encounter, Observation, DiagnosticReport, MedicationRequest); Condition/Allergy/Procedure/Coverage/Claim, LOINC/SNOMED nahi |
| F6 | DICOM / ASTM | ❌ | none |
| F7 | NABH chapter mapping, KPI auto | ❌ | `QualityChecklist` unchanged |
| F8 | MLC / PCPNDT / MTP registers (UI+routes) | ❌ | `MlcCase` model only |
| F9 | Breach register, audit hash-chain, WebAuthn, downtime mode | ❌ | none found |
| F10 | Death/birth certificates | 🟡 | `DeathRecord` (mortuary), `BirthRecord` (maternity) ✅; certificate PDF [VERIFY] |

## G. File 08: Roles

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| G1 | `receptionist` role | ✅ | enum |
| G2 | 29 aur hospital roles (billing_executive, cashier, insurance_desk, medical_director, nursing_supervisor, store_keeper, hr_manager, biomedical_engineer, quality_officer, mrd officer, call_center_agent ...) | ❌ | `User.role` enum me nahi; IAM templates me sirf 5 (owner, doctor, receptionist, billing, pharmacist) |
| G3 | Clinic roles (clinic_admin, clinic_receptionist, ...) | 🟡 | `clinic_staff invite` route hai, enum/permission matrix [VERIFY] |
| G4 | Permission-matrix snapshot test | 🟡 | `iamEvaluator.spec`, `menuRouteParity.spec` hain; matrix snapshot nahi |

## H. File 09: models
Sab models mile **sivay 5**: `Enquiry`, `PayoutStatement`, `AssetMaintenance`, `ShiftSwap`, `Payslip`.
**Model hai par route/UI nahi:** `VisitorPass`, `MlcCase`, `Incident`, `AdrReport`, `BmwLog`, `Credential`.

## I. File 13: Platform engines

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| I1 | Workflow engine (def, instance, parallel/join, SLA, validate, inbox, sweep) | ✅ | `workflowEngine.js`, `workflows.js`, `WorkflowStudio` (React Flow) |
| I1b | Escalation chain on SLA breach | 🟡 | `sweep` hai; multi-level escalation [VERIFY] |
| I2 | Approval engine (policies, tiers, delegation, decide, sweep) | 🟡 | `approvals.js` ✅ + `ApprovalsInbox`; **koi bhi module (discount/refund/PO/stock-adjust) isko call nahi karta**; self-approval block / dual control / SLA escalation nahi mila |
| I3 | Rule & alert engine | 🟡 | `ruleEngine.js` DNF matcher ✅, rules CRUD/test/backtest/sweep ✅, `RulesStudio`; **3 hardcoded `clinicalAlerts` endpoints rules me migrate nahi**, escalation + socket push nahi |
| I4 | Work tasks (Kanban) | ✅ | `rules.js /tasks`, `TaskBoard` |
| I5 | Global master search ⌘K | ✅ | `GlobalSearch`, `CommandPalette`, `search.js /all` |
| I6 | Location hierarchy + WardType + reason codes | ✅ | `masters.js`, `Location`, `OpsMasters` page |
| I7 | Bed statuses extended (Reserved/Blocked/Isolation) | 🟡 | [VERIFY] Bed enum |
| I8 | Access extras: delegation ✅, field mask ✅ (`fieldMask.js`), shift-bound login ❌, idle PIN lock ❌, device/IP allow-list ❌ | 🟡 | |
| I9 | Patient flags API + UI | 🟡 | `masters.js`, `OpsMasters`; **deceased/blacklist hard-stop enforce nahi**; `PatientBanner` sirf `EmrWorkspace` me use hota hai |

## J. File 14: Forms / print / sign

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| J1 | Form engine + builder + fill + sign + amend + PDF | 🟡 | `formEngine.js` (showIf/requiredIf/formula/score ✅), `forms.js`, `FormBuilder` (dnd-kit ✅), `FormsFill`; **amend route hai par engine me addendum chain [VERIFY]**; Hindi labels, offline autosave partial |
| J2 | Print template engine | 🟡 | Handlebars + sanitize ✅, `PrintStudio`; **headless PDF render (Playwright/Puppeteer) nahi**, `pdf-lib` merge nahi |
| J3 | Labels / wristband / scan verify | 🟡 | `print.js /labels/render`, `/scan/verify` (bwip-js ✅ backend); **frontend BarcodeScanner component nahi**, MAR/sample/blood scan screens nahi |
| J4 | e-Signature L1/L2 + seal | 🟡 | `signatures.js`, `SignaturePad` (custom canvas), `SignDocument` page; OTP/guardian/relative flow, public verify page nahi |
| J5 | Notification template variable registry/lint | ❌ | not found |

## K. File 15: Queue / kiosk / mobile

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| K1 | Unified queue engine (tickets, atomic call-next, recall/skip/transfer, board, metrics) | ✅ | `queues.js` (377 lines) |
| K2 | Priority aging + Redis sorted set + ETA tuning | 🟡 | priority + ETA ✅; aging/Redis ZSET nahi |
| K3 | TV display + voice + display tokens | ✅ | `QueueDisplay` (speechSynthesis, repeat), `/display-tokens` |
| K4 | Kiosk | 🟡 | `kiosk.js` **sirf `/checkin`**; `Kiosk.tsx` idle reset ✅; new-registration, pay, report-collect, OTP modes backend me nahi |
| K5 | Patient movement / transport | ✅ | `/movements`, `PatientMovement` |
| K6 | Nurse/Doctor PWA offline | 🟡 | `offlineQueue.ts` (IndexedDB queue) + manifest + offline.html; **service worker (Workbox), encrypted offline store, WebAuthn, bedside nurse app nahi** |

## L. File 16: Finance / contracts / vendors

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| L1 | RCM pipeline/gaps/metrics + dashboard | ✅ | `rcm.js`, `RcmDashboard` (detector rules limited: unclaimed etc.) |
| L2 | Bank reconciliation (accounts, imports, automatch, manual match, rules, close, export) | ✅ | `recon.js`, `ReconWorkbench`; many-to-one subset-sum + fuzzy narration match [VERIFY depth] |
| L3 | Corporate (master, employees, eligibility, statement) | ✅ | `enterprise.js`, `EnterpriseHub`; credit-limit block/overdue/guarantee-letter nahi |
| L4 | Contracts + expiry sweep | 🟡 | `Contract`, `/contracts/sweep`; asset linkage ke liye Equipment fields nahi |
| L5 | Vendor scorecard | 🟡 | `VendorScorecard` + compute ✅; Supplier me gstNumber/pan/bank/documents ✅; GSTIN checksum validation, onboarding approval nahi |
| L6 | Gateway abstraction | 🟡 | see A15 |

## M. File 17: MIS / KPI / AI

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| M1 | Report Studio (catalogue, run, export, saved views, schedules) | 🟡 | `reportStudio.js` + page; **PHI column masking, streaming export, async BullMQ run (`ReportRun`) [VERIFY]** |
| M2 | KPI engine | 🟡 | **10 KPIs computed** (spec me ~35); inventory turnover, vendor OTD, ARPOB etc. [VERIFY which] |
| M3 | DailyMetric pipeline | 🟡 | model + compute endpoint; scheduler `kpi` job nahi |
| M4 | AI: discharge draft, no-show score, forecast, invocation log | ✅ | `insights.js /ai/*`, `aiGateway.js`, `AiInvocation` |
| M5 | AI: OCR/document extraction, claim-document checker, FAQ RAG, lab abnormality narrative | ❌ | none |

## N. File 18: Call centre / hub

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| N1 | Contact centre (interactions, queue, wallboard, agent session, outbound campaigns) | ✅ | `contactCenter.js`, `CallConsole` |
| N2 | Telephony webhook signature, DND scrub, calling-hours, screen-pop lookup | ❌ | not found |
| N3 | Integration hub (integrations, messages, retry, mappings) | ✅ | `hub.js`, `HubBoard` |
| N4 | Outbound webhooks (subscribe, HMAC sign) | 🟡 | `WebhookSubscription/Delivery` ✅; **retry/backoff worker + timestamp/replay protection nahi**, delivery job nahi |

## O. File 19: UI system / motion

| # | Item | Status | Evidence / baki |
|---|---|---|---|
| O1 | `PatientBanner`, `StatusPill`, `BedTile`, `SlaRing`, `DiffView`, `ConfirmDangerDialog`, `CountUp`, `EmptyState/ErrorState/OfflineBar` | ✅ | `components/clinical/*` |
| O2 | `DataGrid`, `FilterBar`, `EntityPicker`, `AlertBanner`, `TicketCard/NowServing`, `BarcodeScanner`, `PdfViewer`, `GaugeRing` | ❌ | not found; **`@tanstack/react-table`/`react-virtual` installed nahi** |
| O3 | Motion tokens + `useCountUp` | ✅ | `lib/motion.ts` |
| O4 | Clinical semantic CSS tokens (`--esi-*`, `--bed-*`, `--sev-*`, critPulse) | ❌ | `index.css` me nahi (colours component classes me) |
| O5 | Density modes | ✅ | `data-density` compact/comfortable/spacious (pre-existing) |
| O6 | Storybook / a11y CI (`axe`) | ❌ | not installed |

## P. File 20: library additions (frontend / backend)
- **Installed:** `@dnd-kit/*`, `@xyflow/react`, backend `handlebars`, `pdf-lib`, `bwip-js`, `json-logic-js`, `@bull-board/api`, `prom-client`.
- **Not installed (spec me recommended thi):** `@tanstack/react-table`, `@tanstack/react-virtual`, `xstate` (engine custom bana, theek hai), `tiptap`, `signature_pad` (custom canvas), `pdfjs/react-pdf`, `@zxing/browser`, `vite-plugin-pwa`, `dexie` (raw IndexedDB use hua, theek hai), `@simplewebauthn/*`, `playwright/puppeteer` (backend PDF), `json-rules-engine` (custom matcher bana), `papaparse`, `mqtt`, `hl7-standard`, `dcmjs`, `razorpay` SDK, `@opentelemetry/api`.

## Q. Test / ops evidence
`backend/test/unit`: `platformEngines`, `formsPrint`, `hmsFlows`, `financeAi`, `iamEvaluator`, `iamPhaseB`, `menuRouteParity` specs; e2e: `discharge-desk`, `frontdesk`, `roster`, `tpa-desk`; seed: `seed-demo-hospital.mjs`; k6: `dashboard-ops-load.js`.
**Missing tests:** gateway webhook idempotency, approval self-approval/threshold boundary, tenant-isolation for new routes, queue concurrency (two counters), print/PDF, reconciliation matching, RBAC for each new route.
