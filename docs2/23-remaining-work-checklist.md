# 23. Remaining Work Checklist (jo implement nahi hua / adhura hai)

Source: file 22. Order = **kam effort me zyada impact** pehle. Har item me: kahan code badalna hai + done ka matlab.

## P0: "Dead feature" ko live karo (wiring, 1-2 hafte)
| # | Kaam | Kahan | Done kab maano |
|---|---|---|---|
| 1 | **Approval engine ko modules se jodo**: discount (`finance.js /discounts/check`), refund, bill cancel, PO, stock adjust, expense, discharge-with-dues → `requireApproval(subject, ctx, executor)` helper; self-approval block, dual control, SLA escalation | `approvals.js`, `finance.js`, `billing.js`, `stores.js`, `ipd.js` | 15% discount bina approval ke apply nahi hota; test: requester khud approve nahi kar sakta |
| 2 | **PatientFlag enforcement**: deceased/blacklist hard-stop on registration/appointment/billing; allergy/isolation/MLC chips; `PatientBanner` ko IPD, Billing, FrontDesk, Lab, Pharmacy, Nursing me lagao (abhi sirf `EmrWorkspace`) | `masters.js`, `queues.js`, pages | deceased patient ka naya appointment 409 deta hai |
| 3 | **Encounter auto-create** on appointment check-in / token / ER / admission; `Appointment.encounterId` + `prescriptionId`; backfill run | `appointments.js`, `queues.js`, `emergency.js`, `ipd.js`, models | har OPD visit ka `encounterId` bana; order/bill us se link |
| 4 | **ChargeItem for lab, radiology, consumables, procedures** (abhi sirf ot/doctor/ipd/pharmacy) | `lab.js`, `radiology.js` | discharge bill me lab+radiology lines aati hain |
| 5 | **Models ko routes+UI do:** `VisitorPass`, `MlcCase`, `Incident`, `AdrReport`, `BmwLog`, `Credential` | new routes + pages | har model par CRUD + RBAC + test |
| 6 | **Missing models:** `Enquiry`, `PayoutStatement`, `AssetMaintenance`, `ShiftSwap`, `Payslip` | models + routes | create/list/approve flows |
| 7 | **Hospital Dashboard V2 ko default landing** banao; `/dashboard/overview` (compare + sparklines), `/dashboard/queue`; date range + compare toggle; per-user widget layout | `dashboard.js`, `HospitalDashboardV2.tsx`, `App.tsx` | hospital_admin login → V2; numbers Billing se reconcile |
| 8 | **Roles:** 29 hospital roles + clinic roles `User.role` enum + IAM templates + permission matrix snapshot test | `User.js`, `iamTemplates.js`, `config/permissions.js` | har role ka landing page + menu + test |
| 9 | **Payment gateway live:** Razorpay SDK order/refund/payment-link/getPayment, webhook idempotency + reconcile job; Cashfree/PayU adapters | `gateways.js`, `payments.js` | test-mode me real payment capture + refund |
| 10 | **Rule engine migration:** `clinicalAlerts` (code-blue, lab-panic, mtp) → seeded rules; escalation ladder + socket push `dashboard:alert` | `rules.js`, `clinicalAlerts.js` | critical lab alert 15 min unack → escalate |

## P1: Core hospital depth (2-4 hafte)
| # | Kaam | Note |
|---|---|---|
| 11 | **LIS depth:** accession/barcode, reference ranges + H/L flags, critical call-back log, sample reject/recollect, outsourced tests, QC (Levey-Jennings), TAT dashboard, delta check, ASTM adapter | `LabOrder.js`, `lab.js`, `LabOps.tsx` (abhi 49 lines) |
| 12 | **Front Desk complete:** check-in, walk-in appointment, enquiry log, visitor pass, bill collection, duplicate detection + merge tool, ABHA link | `FrontDesk.tsx` (69 lines) |
| 13 | **OPD vitals station** + ER unknown patient (temp UHID) + MLC registration flow | new page/route |
| 14 | **Billing:** split payment, GST invoice (HSN, series), debit note, cancellation approval, doctor fee master, package overage rules | `billing.js`, `Billing.js` |
| 15 | **TPA depth:** room-rent proportionate deduction, claim bundle (pdf-lib merge), query thread, appeal, short-settlement reasons, PM-JAY package map | `tpa.js`, `TpaDesk.tsx` |
| 16 | **Accounts:** chart of accounts, AP vendor bill 3-way match, payout statement + TDS, GSTR export, bank-wise books | `finance.js` |
| 17 | **Payroll:** payslip PDF, PF/ESI/PT/TDS, loans/advances, shift swap + on-call | `staff.js`, `PayrollPage.tsx` (58 lines), `roster.js` |
| 18 | **Inventory:** physical count/stock audit, ABC-VED, low-stock + near-expiry rules, rate-contract check at PO | `stores.js` |
| 19 | **Assets:** Equipment/AssetUnit fields (warranty, AMC contract link, nextPmDue, calibrationDue, criticality) + `AssetMaintenance` | models + `enterprise.js /contracts` link |
| 20 | **Clinical scores:** NEWS2, Morse, Braden (as Forms scoring + rule engine alert) | `formEngine.js` templates |
| 21 | **Blood bank:** donor screening, cross-match, TTI, transfusion reaction | `BloodBank.js` |
| 22 | **Dialysis / NICU / cath-lab / endoscopy** extras | per module |
| 23 | **Infection control:** HAI surveillance, antibiotic stewardship, needle-stick + PEP, isolation sync with bed | routes + dashboards |
| 24 | **Tele-consult compliance** (RMP no. on Rx, prohibited drugs, consent log) | `doctor.js`, telemedicine routes |
| 25 | **Kiosk modes:** new registration (provisional), pay bill, report collect (OTP), token only | `kiosk.js` only has `/checkin` |
| 26 | **Webhooks:** retry/backoff worker, timestamp + replay protection, delivery log UI | `hub.js`, `workers/scheduler.js` |
| 27 | **Telephony hardening:** webhook signature verify, DND scrub, calling-hours, screen-pop lookup, recording retention | `contactCenter.js` |

## P2: Compliance, interop, polish (4-8 hafte)
| # | Kaam |
|---|---|
| 28 | FHIR: Condition, AllergyIntolerance, Procedure, Coverage, Claim, DocumentReference + LOINC/SNOMED; ABDM HIP/HIU consent flow |
| 29 | DICOM/PACS (Orthanc + OHIF/Cornerstone), RIS structured reports, dose log |
| 30 | NABH chapter mapping + auto KPIs, quality audits, CAPA; PCPNDT Form F, MTP register |
| 31 | Security: audit hash-chain/WORM, breach register + 72h workflow, WebAuthn step-up, shift-bound login, idle PIN lock, device/IP allow-list, downtime read-only mode |
| 32 | PWA: Workbox service worker, encrypted offline store, nurse bedside app with barcode scan (MAR/sample/blood) |
| 33 | Print: headless PDF render worker (Playwright) with Devanagari fonts, pdf-lib merge, label printing agent (ZPL) |
| 34 | e-Sign: OTP/guardian flow, public `/verify/doc/:id` page, Hindi consent templates |
| 35 | Notification template variable registry + lint + per-channel preview + DLT mapping |
| 36 | Report Studio: PHI column masking, streaming export, async `ReportRun` job; KPI set 10 → ~35 (inventory turnover, vendor OTD, ARPOB, no-show %, LWBS, discharge-before-noon, etc.); scheduler KPI job |
| 37 | AI: OCR/document extraction, claim-document checker, FAQ RAG, lab-trend narrative (with human-review UI + kill switch) |
| 38 | UI system: `DataGrid` (TanStack Table + Virtual), `FilterBar`, `EntityPicker`, `AlertBanner`, `BarcodeScanner`, `PdfViewer`, clinical CSS tokens, Storybook + axe CI |
| 39 | Clinic: clinic roles + RBAC, staff as real users, clinic billing/price list/packages, in-house pharmacy stock, multi-branch roll-up |
| 40 | Maternity/Paeds: growth charts, vaccination due alerts, partogram UI, newborn screening |

## Test gaps to close (add alongside each item)
Gateway webhook idempotency + signature tamper · approval boundary/self-approval/delegation · tenant isolation for **every new route** · queue concurrency (two counters call-next) · discharge finalize idempotency + dues block · reconciliation matching accuracy · print/PDF golden files · RBAC route×role matrix · offline replay · k6 for queues/kiosk.

## Quick local verification commands (tum apne machine par chalao)
```bash
# backend
cd backend && npm test                      # unit + integration
node scripts/seed-demo-hospital.mjs         # demo data
# frontend
cd frontend && npm run lint && npx tsc --noEmit && npm run build
npx playwright test e2e/discharge-desk.spec.ts e2e/frontdesk.spec.ts e2e/roster.spec.ts e2e/tpa-desk.spec.ts
# load
k6 run k6/dashboard-ops-load.js
```
