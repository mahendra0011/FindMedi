# 25. Implementation Status v3 (final re-check, HEAD b3d4bfb)

**Repo:** `mahendra0011/FindMedi` HEAD `b3d4bfb` (11 Oct 2026, 00:58 IST). File 24 ke baad **36 naye commits**: 249 files, +20,341 / -3,103 lines. Models 271 → 299, routes 172 → 186, pages 301 → 316.

## Seedha jawab: sab hua? 
**Lagbhag sab hua, par 100% nahi, aur ek build-breaking bug hai (neeche).** File 23 ke P0 + P1 + P2 teeno phases me kaam hua hai.

| Status | v1 (file 22) | v2 (file 24) | **v3 (ab)** | % |
|---|---|---|---|---|
| ✅ DONE | 56 | 77 | **116** | 83% |
| 🟡 PARTIAL | 43 | 30 | **19** | 14% |
| ❌ NOT DONE | 40 | 32 | **4** | 3% |

File 23 checklist (40 items): **P0 10/10 ✅ · P1 16/17 ✅ (1 partial) · P2 7/13 ✅ (6 partial)** → 33 fully done, 7 partial, 0 untouched.

## ⚠️ Pehle ye fix karo: `vite build` abhi fail hota hai
Maine fresh clone par `npm ci` + `npx vite build` chalaya. **HEAD par build fail hua** (rolldown parse error). Sirf 2 files ki syntax galtiyan hain:

| File | Problem | Fix |
|---|---|---|
| `frontend/src/pages/dashboards/DentistDashboard.tsx:12` | `{ label "Week's earnings", ... }` me colon missing | `label: "Week's earnings"` |
| `frontend/src/pages/doctor/DoctorQueue.tsx` (~line 96-120) | `<div className="grid sm:grid-cols-2 gap-3">` kabhi close nahi hua (tsc: TS17008) | `)}` ke baad, root `</div>` se pehle ek `</div>` add karo |

**Verified:** temp copy me sirf yeh 2 fixes lagake `vite build` chalaya, to **✓ built in 10.8s** (pass). Original files maine wapas restore kar di (repo me kuch badla nahi).

## Test / quality results (mere sandbox me)
| Check | Result |
|---|---|
| `node --check` 156 changed backend files | ✅ sab syntax OK |
| Backend unit tests (`jest test/unit`) | **76/78 suites, 618/619 tests pass** |
| ↳ fail 1: `menuRouteParity` (clinic_doctor) | **Test ka false-negative:** routes ab `allowedRoles={CLINIC_ROLES}` constant use karte hain (`App.tsx:1141`, clinic_doctor included), par spec sirf literal `allowedRoles={[...]}` parse karta hai. Spec me constant resolve karna hoga |
| ↳ fail 2: `formsPrint.spec` suite load nahi hui | `sanitize-html → htmlparser2` ESM-only, Jest (CJS) me import fail. Mere Node v22.22 par; CI `node 20.x` use karta hai (`ci.yml`), wahan bhi fail ho sakta hai: `transformIgnorePatterns` me `htmlparser2` allow karo ya dependency pin karo |
| Frontend `tsc --noEmit` | 2 syntax errors (upar). Fix ke baad ~12,000 type errors (TS2339/TS7006...). Repo me `typecheck:ratchet` + `tsconfig.baseline.json` hai, to ye shayad tolerated debt hai; **ratchet run karke confirm karo** |
| Integration (75 specs) / Playwright e2e (5) | **Run nahi kiye** (MongoDB/browsers nahi) |

## Pichhle checklist (file 23) ka status
### P0 leftovers: sab ✅
Approval SLA escalation ✅ · refund approval (`payments.js`, policy key `refund`) ✅ · hard-stop `tokens.js`/`queues.js` ✅ · `ensureEncounter` in `tokens.js` ✅ · PayU + PhonePe adapters (`gateways.js` 397 lines) ✅ · insurance widget ✅ · FrontDesk 189 lines: check-in, duplicate scan + merge, ABHA link, enquiry, visitor ✅.

### P1 (11-27)
| # | Item | Status | Evidence |
|---|---|---|---|
| 11 | LIS depth | ✅ | accession, `refLow/refHigh`, flags, delta, reject/recollect, outsource, callback log, `QcRun` + `/qc/chart` (Westgard), `/tat`, `astm.js parseAstmFrame`, `lisDepth.spec` |
| 12 | Front desk | ✅ | `/duplicates`, `/:id/merge`, `/:id/abha`, enquiries, visitor |
| 13 | Vitals station, ER temp UHID, MLC link, tele/blood extras | ✅ | `VitalsStation.tsx`, `vitals.js /station`, `tempUhid` |
| 14 | Billing | ✅ | HSN/GST/series, split collection route, package overage, cancel approval, doctor fee master, **Debit note** (`CreditNote.kind: Credit|Debit`) |
| 15 | TPA depth | ✅ | room-rent proportionate, query thread, appeal, bundle, PM-JAY map |
| 16 | Accounts | ✅ | `Account` (CoA), `VendorBill` 3-way, `/gstr`, `/bank-books` |
| 17 | Payroll | ✅ | payslip PDF + release, PF/ESI/TDS, loans/advances, shift swaps |
| 18 | Stock | ✅ | `/stock-audit`, `/abc-ved`, low/expiry alerts, rate-contract check |
| 19 | Equipment fields | ✅ | warranty/AMC/nextPm/calibration/criticality on `Equipment` (AssetUnit par nahi) |
| 20 | NEWS2/Morse/Braden | ✅ | seed templates + scoring (`forms.js`, `clinicalScores.spec`) |
| 21 | Blood bank | ✅ | `DonorScreening`, crossmatch, reaction, TTI-ish fields |
| 22 | Dialysis / NICU / cath-lab | 🟡 | `ProcedureSuite` (cath/endoscopy + NICU feeding) ✅; **dialysis extension, phototherapy/bilirubin nahi** |
| 23 | Infection control | ✅ | `infectionControl.js`: HAI + rate, antibiotics stewardship, needle-stick, isolation beds |
| 24 | Tele compliance | ✅ | `TeleConsent`, Rx compliance |
| 25 | Kiosk modes | ✅ | `/register`, `/pay`, `/report-collect`, `/token-status` |
| 26 | Webhooks | ✅ | timestamp, backoff, HMAC, replay |
| 27 | Telephony | ✅ | HMAC, DND, calling hours, screen-pop, retention |

### P2 (28-40)
| # | Item | Status | Evidence / baki |
|---|---|---|---|
| 28 | FHIR + ABDM consent | ✅ | all 11 resources, LOINC/SNOMED, `/consents` lifecycle |
| 29 | DICOM / RIS | 🟡 | `dicom.js` (header parse, store), `/dicom/worklist`, `/dose`; **PACS viewer (Orthanc/OHIF) nahi** |
| 30 | NABH / CAPA / PCPNDT / MTP | ✅ | `NabhChapter`, `NabhAssessment`, `Capa`, `PcpndtFormF`, `MtpRegister` |
| 31 | Security hardening | 🟡 | WebAuthn ✅, IP allow-list ✅ (`auth.js`), shift-bound login ✅, breach register + 72h ✅, audit `prevHash/hash` chain ✅, downtime read-only gate ✅; **idle PIN-lock UI component nahi mila** |
| 32 | PWA / offline / bedside | ✅ | `public/sw.js`, `encryptedStorage.js`, `BedsideScan.tsx` |
| 33 | PDF worker / print | 🟡 | `pdfWorker.js` queue worker ✅; **headless-Chromium template render nahi** |
| 34 | e-Sign | 🟡 | OTP/guardian/relative ✅; **public `/verify` page frontend me nahi** (backend `GET /doc/:kind/:id` hai) |
| 35 | Notification templates | ✅ | `notifyTemplates.js` (preview), registry + lint + DLT |
| 36 | Report studio + KPIs | ✅ | masking, streaming CSV/XLSX, queue runs; `KpiDefinition` **35 KPIs** |
| 37 | AI features | 🟡 | `aiFeatures.js`: `/ocr`, `/claim-check`, `/faq`, `/lab-narrative`, `/discharge-draft`, reviews, kill-switch ✅; **OCR default provider "stub" (labeled)** |
| 38 | UI system | 🟡 | DataGrid (TanStack Table+Virtual) migrated on 30+ pages, FilterBar, EntityPicker, BarcodeScanner, PdfViewer, AlertBanner, Storybook (6 stories) ✅; **`--esi/--bed/--sev` CSS tokens nahi (sirf `--status-*`), axe CI test nahi** |
| 39 | Clinic suite | ✅ | all clinic roles, `ClinicInventory`, `ClinicPackage`, `ClinicBranch`, staff invite |
| 40 | Growth/vaccine/partogram/newborn | ✅ | `growthCharts.js` (WHO), `VaccinationAlert`, `LabourRecord`, `NewbornScreening` |

## Status rows jo is round me badle (file 22 IDs)
| ID | Item | Change |
|---|---|---|
| A2 | IPD charge accrual | 🟡 → ✅ |
| A6 | Appointment ↔ Encounter/prescription refs | ❌ → ✅ |
| A13 | Doctor fee master | ❌ → ✅ |
| A15 | Real payment gateway | 🟡 → ✅ |
| A16 | Visitor pass | 🟡 → ✅ |
| A18 | OPD vitals station | ❌ → ✅ |
| A19 | ER unknown patient (temp UHID) | ❌ → ✅ |
| A20 | MLC workflow | 🟡 → ✅ |
| A22 | LIS: accession/barcode, ref ranges + H/L flags, QC, outsourced, delta check, recollect | ❌ → ✅ |
| A23 | HL7 ORU/ADT parse → results | 🟡 → ✅ |
| A24 | RIS/PACS (DICOM, worklist, structured report, dose log) | ❌ → 🟡 |
| B1 | HospitalDashboardV2 page | 🟡 → ✅ |
| B4 | `/dashboard/overview` (KPI + compare + sparkline) | ❌ → ✅ |
| B5 | `/dashboard/queue` live OPD queue | ❌ → ✅ |
| B6 | Insurance pipeline widget API | 🟡 → ✅ |
| B7 | Date range + compare toggle, widget registry/layout save | ❌ → ✅ |
| B8 | Alert Center realtime (socket `dashboard:alert`) | 🟡 → ✅ |
| C6 | NEWS2 / Morse / Braden scores | ❌ → ✅ |
| C8 | NICU (phototherapy, bilirubin, feeding) | ❌ → 🟡 |
| C10 | Paediatric growth chart / vaccination due | 🟡 → ✅ |
| C12 | Dialysis extension, cath-lab, endoscopy | ❌ → 🟡 |
| C13 | Blood bank: donor screening, cross-match, reaction, TTI | ❌ → ✅ |
| C14 | Incident / HAI / needle-stick / ADR | 🟡 → ✅ |
| C15 | Antibiotic stewardship | ❌ → ✅ |
| C17 | Tele-consult compliance (RMP no., prohibited drugs) | ❌ → ✅ |
| D1 | Front Desk page | 🟡 → ✅ |
| D2 | Duplicate patient detection + merge | ❌ → ✅ |
| D3 | Enquiry / call log | ❌ → ✅ |
| D4 | Discount authority matrix | 🟡 → ✅ |
| D5 | Refund approval chain | ❌ → ✅ |
| D6 | Split payment | ❌ → ✅ |
| D7 | GST invoice / HSN / invoice series | ❌ → ✅ |
| D9 | Room-rent proportionate deduction, claim bundle, appeal | ❌ → ✅ |
| D11 | Chart of accounts, AP vendor bill 3-way match, GSTR export, bank-wise books | ❌ → ✅ |
| D12 | Doctor payout statement + TDS | 🟡 → ✅ |
| E1 | Duty roster | 🟡 → ✅ |
| E2 | Payroll payslip, PF/ESI/TDS | ❌ → ✅ |
| E3 | Credentials/licence tracking | 🟡 → ✅ |
| E5 | Stock audit, ABC-VED, low-stock/expiry alerts, rate-contract check | ❌ → ✅ |
| E9 | BMW log | 🟡 → ✅ |
| E10 | Equipment AMC/warranty/PM/calibration fields | ❌ → ✅ |
| F5 | FHIR R4 | 🟡 → ✅ |
| F6 | DICOM / ASTM | ❌ → 🟡 |
| F7 | NABH chapter mapping, KPI auto | ❌ → ✅ |
| F8 | MLC / PCPNDT / MTP registers (UI+routes) | ❌ → ✅ |
| F9 | Breach register, audit hash-chain, WebAuthn, downtime mode | ❌ → ✅ |
| G2 | 29 aur hospital roles (billing_executive, cashier, insurance_desk, medical_director, nursi | ❌ → ✅ |
| G3 | Clinic roles (clinic_admin, clinic_receptionist, ...) | 🟡 → ✅ |
| G4 | Permission-matrix snapshot test | 🟡 → ✅ |
| I2 | Approval engine (policies, tiers, delegation, decide, sweep) | 🟡 → ✅ |
| I3 | Rule & alert engine | 🟡 → ✅ |
| I9 | Patient flags API + UI | 🟡 → ✅ |
| J3 | Labels / wristband / scan verify | 🟡 → ✅ |
| J5 | Notification template variable registry/lint | ❌ → ✅ |
| K4 | Kiosk | 🟡 → ✅ |
| K6 | Nurse/Doctor PWA offline | 🟡 → ✅ |
| L4 | Contracts + expiry sweep | 🟡 → ✅ |
| L6 | Gateway abstraction | 🟡 → ✅ |
| M1 | Report Studio (catalogue, run, export, saved views, schedules) | 🟡 → ✅ |
| M2 | KPI engine | 🟡 → ✅ |
| M3 | DailyMetric pipeline | 🟡 → ✅ |
| M5 | AI: OCR/document extraction, claim-document checker, FAQ RAG, lab abnormality narrative | ❌ → 🟡 |
| N2 | Telephony webhook signature, DND scrub, calling-hours, screen-pop lookup | ❌ → ✅ |
| N4 | Outbound webhooks (subscribe, HMAC sign) | 🟡 → ✅ |
| O2 | `DataGrid`, `FilterBar`, `EntityPicker`, `AlertBanner`, `TicketCard/NowServing`, `BarcodeS` | ❌ → ✅ |
| O4 | Clinical semantic CSS tokens (`--esi-*`, `--bed-*`, `--sev-*`, critPulse) | ❌ → 🟡 |
| O6 | Storybook / a11y CI (`axe`) | ❌ → 🟡 |

## Abhi bhi baki (23 rows ≠ ✅)
**❌ Not done (4):** NPS/feedback survey · Ambulance trip sheet/fuel log · Linen/laundry · Gate/security rounds.
**🟡 Partial (19):** PACS viewer (A24/F6) · pharmacy H1/narcotic register + substitution (A26) · appointment auto follow-up booking (A28) · Rx QR verify frontend page (C4/J4) · NICU phototherapy + dialysis extension (C8/C12) · death/birth certificate PDF (F10) · SLA multi-level escalation detail (I1b) · bed statuses Reserved/Blocked/Isolation [VERIFY] (I7) · idle PIN-lock UI (I8) · forms addendum chain + Hindi/offline (J1) · print headless render (J2) · queue aging + Redis ZSET (K2) · vendor GSTIN checksum/onboarding approval (L5) · AI OCR real provider (M5) · clinical CSS tokens (O4) · axe CI (O6).

## Limits
Static scan + build + unit tests. UI behaviour, integration tests (need MongoDB), e2e (need browsers), performance, aur data migrations run nahi kiye.
