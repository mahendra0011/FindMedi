# 21. Coverage Matrix: tumhare 102-section blueprint vs Repo vs Files 00-20

Purpose: **jo already hai use dobara nahi likha.** Neeche har blueprint section ka status:
- **REPO** = code me already hai (verified)
- **F01-F12** = meri purani md files me already covered
- **NEW F13-F20** = is round me add kiya
- Partial = base hai, extension kisi file me hai

| Blueprint § | Topic | Status | Where |
|---|---|---|---|
| 1 | Module map | REPO + F10 roadmap | |
| 2 | Login/User mgmt | REPO (IAM, 2FA, LoginEvent, AccessReview) + F08 roles | extras (screen/field perms, delegation, shift-bound, idle lock) = **NEW F13.7** |
| 3 | Master setup | Partial REPO | hierarchy (Building/Floor/Wing/Location tree), clinical+financial masters = **NEW F13.6** |
| 4 | Patient registration | REPO + F05 §5.1 (dup detect/merge) | flags (VIP/high-risk/blacklist/deceased) = **NEW F13.8** |
| 5 | Appointments | REPO (+waitlist, series) | |
| 6 | OPD | REPO + F03/F04/F11 (EMR workspace) | |
| 7 | Queue/Token | Partial REPO (`Token`) + F05 §5.1, F02 queue widget | unified multi-dept engine, priority, ETA, TTS, TV mode = **NEW F15.1-15.2** |
| 8 | Emergency/MLC | REPO (Triage/ER/SOS) + F03 flow C + F07 MLC | |
| 9 | IPD/Admission/transfer | REPO + F03/F09 (deposit, transfer, discharge workflow) | movement/ADT tracking = **NEW F15.4** |
| 10 | Bed management | REPO (Bed) + F01 F8 | statuses/hierarchy fix = **NEW F13.6** |
| 11 | Nursing | REPO + F04.4 | bedside mobile/scan = **NEW F14.4, F15.5** |
| 12 | EMR/EHR | REPO (Timeline, Records) + F04.1/F11 | |
| 13 | ICU | REPO (partial) + F04.5 | |
| 14 | OT | REPO + F04.6 | scheduling UI libs = F20 |
| 15 | LIS | REPO + F03 flow E | device integration = **NEW F18.2** |
| 16 | Radiology/PACS | REPO + F03 flow F, F07 | device/PACS architecture = **NEW F18.2** |
| 17 | Pharmacy | REPO + F03 flow G, F06 | |
| 18 | Blood bank | REPO + F04.10 | |
| 19 | Dialysis | REPO + F04.9 | |
| 20 | Ambulance | REPO + F06.8 | |
| 21 | Billing | REPO + F05.3, F09 | RCM tracker = **NEW F16.1** |
| 22 | Payment gateway layer | Partial (stub) + F05.3 mention | adapter design = **NEW F16.2** |
| 23 | Insurance/TPA | REPO + F05.4 | |
| 24 | Corporate/empanelment | Partial | credit billing/GL/statements = **NEW F16.4** |
| 25 | Accounting/finance | Partial REPO + F05.5 | bank recon deep dive = **NEW F16.3** |
| 26 | Inventory/stores | REPO + F06.2 | |
| 27 | Procurement | REPO (PO) + F06.2 | |
| 28 | Vendor management | Partial REPO (Supplier) | KYC, scorecard, payables = **NEW F16.6** |
| 29 | HR | REPO (Staff) + F06.1 | |
| 30 | Attendance/roster | REPO attendance + F06.1 (roster) | |
| 31 | Payroll | REPO routes + F06.1 | UI [VERIFY] |
| 32-33 | Doctor mgmt/payout | REPO (CommissionConfig, Payout) + F05.5/F11 | |
| 34 | Discharge | REPO partial + F03/F09 | workflow engine = **NEW F13.1** |
| 35 | Mortuary | F06.7 | |
| 36-37 | Housekeeping/laundry | REPO (Housekeeping) + F06.5 | |
| 38 | Diet/kitchen | REPO + F06.6 | |
| 39 | CSSD | REPO (SterilisationLog) + F06.4 | |
| 40 | Biomedical | REPO (Equipment) + F06.3 | **AMC/warranty fields missing** = **NEW F16.5** |
| 41 | Facility/engineering | F06.9 partial | |
| 42 | Helpdesk | REPO (SupportTicket, Task) + F06.11 | ops task engine = **NEW F13.4** |
| 43 | Feedback/CRM | REPO + F05.7 | |
| 44 | CRM/marketing | REPO (Lead, Campaign) + F05.8 | |
| 45 | Health camps | REPO (Event module) + F05.8 | screening->lead conversion minor, skip |
| 46 | Telemedicine | REPO + F04.14 | |
| 47-48 | Patient app/family | REPO | |
| 49-50 | Doctor/Nurse mobile | F10 bullet only | **NEW F15.5** |
| 51 | Notification engine | REPO | |
| 52 | Document mgmt | REPO (upload, ClamAV, RecordVersion) | OCR = **NEW F17.5**; vault UX minor |
| 53 | Consent mgmt | REPO (ConsentRecord) + F09 ConsentForm | builder/e-sign = **NEW F14.1, 14.5** |
| 54 | e-signature | Partial (Rx integrity) + F11 | **NEW F14.5** |
| 55-56 | MIS/analytics | REPO (reports, analytics) + F02 | catalogue/studio/KPIs/pipeline = **NEW F17** |
| 57 | A/R | F02/F05 partial | RCM + corporate = **NEW F16** |
| 58 | Cash mgmt | F05.3 (counter shifts) | |
| 59 | Bank reconciliation | F05.5 one-liner | **NEW F16.3** |
| 60 | RCM | none | **NEW F16.1** |
| 61-62 | Packages/tariff | REPO (HealthPackage) + F05.2 | |
| 63 | Referral mgmt | REPO (Referral) + F05.8 | |
| 64 | Barcode/QR inventory | F06.2 mention | scan UX = **NEW F14.4** |
| 65 | Purchase approval | F06.2 mention | **NEW F13.2** |
| 66 | Multi-branch | none (F12 clinic only) | **NEW F13.6** |
| 67 | Call center | role only | **NEW F18.1** |
| 68-69 | Security/Audit | REPO + F07 | |
| 70 | Alert & rule engine | REPO 3 hardcoded + F02 widget | **NEW F13.3** |
| 71 | Task management | REPO (CRM Task only) | **NEW F13.4** |
| 72 | Workflow engine | none | **NEW F13.1** |
| 73 | Master search | Partial (OpenSearch EHR) | **NEW F13.5** |
| 74-75 | Printing/wristband | Partial (pdfkit, QR) | **NEW F14.2, 14.4** |
| 76 | AI | REPO chatbot + F11 | **NEW F17.5** |
| 77 | Integrations | F07 | hub = **NEW F18.2** |
| 78 | API mgmt/webhooks | REPO (ApiKey, openapi) | outbound subscriptions = **NEW F18.3** |
| 79 | Notification templates | REPO | variable engine = **NEW F14.3** |
| 80 | Backup/DR | F07.6/7.8 | |
| 81-82 | Mobile/web/kiosk | partial | **NEW F15.3, 15.5** |
| 83 | Patient flow | F03 | |
| 84-85 | Backend entities / single patient record | F09 + REPO (Timeline) | |
| 86 | Admin dashboard | F02 | |
| 87 | Reports | F17.1 | |
| 88-91 | Compliance, quality, infection, BMW | F07, F04.12, F06.5 | |
| 92-94 | Visitor/parking/attendant | F05.1, F06.9 | |
| 95 | Asset mgmt | F06.3 | + AMC fields **NEW F16.5** |
| 96 | Contract mgmt | none | **NEW F16.5** |
| 97 | Document template builder | none | **NEW F14.2** |
| 98 | Custom form builder | none | **NEW F14.1** |
| 99 | Master approval engine | F05.3 discount matrix only | **NEW F13.2** |
| 100-102 | Layers / app packaging / phases | F10 | architecture patterns **F20 §5** |

## Net-new count
13 (platform) 8 items · 14 (forms/print/sign) 5 · 15 (queue/kiosk/movement/mobile) 5 · 16 (finance/contracts/vendors) 6 · 17 (MIS/KPI/AI) 5 · 18 (call center/hub/webhooks) 3 · 19 (UI system) · 20 (stack).

## Newly verified repo bugs/gaps found in this round
1. `Bed.bedNumber` globally unique (breaks multi-hospital).
2. `Equipment/AssetUnit` no AMC/warranty/calibration fields.
3. `LenisScroll` wraps entire app (hurts dense clinical screens).
4. Dashboard tiles silently fail to `—` (should show error state).
5. Google Fonts runtime `@import` in `index.css` (privacy/offline kiosk issue).
6. Redux Toolkit + Zustand both present (state convention).
7. `Department.head` is a string, no parent hierarchy; `Facility.type` limited to 4 values.
8. `Task` model is CRM-only.
