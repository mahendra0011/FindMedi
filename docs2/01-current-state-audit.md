# 01. Current State Audit (code se verified)

## 1. Repo structure

```
backend/   Express + MongoDB (Mongoose), Prisma folder bhi hai (pgDualWrite), Rust helper, gRPC proto
frontend/  React + Vite + TypeScript + Tailwind + shadcn/ui, react-query, recharts, socket.io, i18n
infra/ k6/ analytics/ data-platform/ docs/ rolesmd/ scripts/
```
- Models: 150+ (`backend/src/models`), Routes: 100+ (`backend/src/routes`)
- Tests: `backend/test` (unit, integration, security, contract), `frontend/e2e` (Playwright)
- `DEFERRED_TODOS.md`: payment adapter, multi-store checkout etc. pending

## 2. Already available (VERIFIED-EXISTS)

**Clinical**: Appointment (+Series, Waitlist), Triage, Emergency (+SOS, doctor request), Admission/IPD (vitals, MAR, I/O, nursing notes, doctor notes, wound care), Bed, OT, Nursing charts, Radiology, LabOrder/LabBooking, Prescription (+verification queue), DietOrder, Physiotherapy, MentalHealth, Dialysis, Dental, Eye, Fertility, Vaccination, BloodBank (unit-wise expiry), Referral, SecondOpinion.

**Business**: Billing (line items, tax, discount, paid/balance, insurance fields), Insurance (claimId, TPA fields, pre-auth lifecycle, claimStatus), Payment, Refund, TransactionLedger, Commission, Payout, Membership, HealthPackage, Coupons.

**Staff/Ops**: Staff (attendance, shifts, overtime, payroll routes in `routes/staff.js`), LeaveRequest, Housekeeping, Equipment/AssetUnit, Inventory, Supplier, PurchaseOrder, Ambulance, QualityChecklist, SterilisationLog.

**Patient app**: UHID, Health ID/QR, Emergency card, Medicine reminders, Vitals tracking, Care plan, Rewards, Referral, Family members, Timeline, Privacy centre, i18n.

**Security/compliance**: AuditLog, BreakGlassGrant, ConsentRecord, 2FA, IAM (roles/groups/policies), DataSubjectRequest, DeletionRequest, AccessReview.

**Roles**: 60+ roles in `User.role` enum (doctor, nurse, pharmacist, lab_*, radiologist, accountant, tpa_agent, medical_reviewer, finance_admin, dpo, auditor...).

## 3. Hospital Admin Dashboard audit

Files: `frontend/src/pages/Dashboard.tsx` (767 lines), backend `routes/dashboard.js` (88 lines, 1 endpoint `GET /dashboard/stats`).

### 3.1 Abhi kya dikhta hai
| Section | Source | Note |
|---|---|---|
| 4 StatCards: Total Patients, Active Doctors, Appointments Today, Revenue MTD | `/dashboard/stats` | |
| Operations Strip (8 tiles): Beds free/total, ER active, OT today, Active IPD, Pending lab, Pending Rx verification, Ambulances on mission, Staff on leave | 7 alag API calls | har call `.catch(() => null)`, fail pe `—` dikhta hai |
| "Hospital Consultation & Clinical Services Hub": 5 cards (appointments, home visit, video, calls, chat) | static links | doctor-type shortcuts hain, admin ke liye kam useful |
| Weekly Appointments chart (7 days), Revenue Trend (6 months) | `/dashboard/stats` | |
| Appointments Hub (tabs: pending/upcoming/today/completed) | `/appointments?limit=200` | |
| Departments pie (top 5 by appointment count) | `/dashboard/stats` | |
| Refunds card, Hospital settings card | `/payments/refunds` | |
| Realtime: socket events `appointment:created`, `appointment:statusChange`, `emergency:alert` (toast) | socket.io | achha hai |

### 3.2 Verified problems (code level)

1. **Revenue sirf `Billing.paid` ka sum hai** (`dashboard.js`): koi outstanding/dues, collection-vs-billed, payment-mode, ya department/service split nahi. `Billing.source` field (appointment/lab/pharmacy/ipd/ot/radiology...) maujood hai par dashboard use nahi karta.
2. **"Active Doctors" = saare `User role=doctor`** (status/on-duty filter nahi). Actual me "aaj duty pe kitne" hona chahiye.
3. **"Total Patients" = users with role patient and hospitalId**: unique visited patients ya OPD/IPD split nahi.
4. **Department chart appointment count se bana hai**, revenue ya IPD occupancy se nahi.
5. **8 alag network calls on mount** aur sab silent-fail. Ek aggregated `/dashboard/operations` endpoint chahiye (single round-trip, partial-failure flags ke saath).
6. **No date-range filter** (Today / 7d / 30d / custom), no compare-with-previous-period.
7. **No clinical alerts**: critical lab values, overdue vitals, pending discharges, expiring drugs, low stock, expiring licenses, pending TPA claims.
8. **No live OPD queue** (token wise waiting count, avg wait time, doctor-wise load).
9. **Bed occupancy % / ALOS / turnover / ICU availability** nahi (sirf free/total).
10. **No staff-on-duty / attendance-today widget** (sirf "on leave" count).
11. `pendingVerif` initially `null` then alag call, jisse flicker.
12. Superadmin ke liye `hospitalFilter = {}`: multi-hospital aggregate ho jaata hai (theek hai), par UI me hospital switcher nahi.

### 3.3 Sidebar (`AppSidebar.tsx`) issues
- hospital_admin ke liye ~60 items **flat list** (grouping/collapsible nahi): bohot cluttered.
- **Duplicate labels**: `nav.opdToken` do jagah (`/opd-token`, `/opd-registration`), `nav.reports` do jagah (`/reports`, `/analytics-reports`).
- `nav.nursing` ka icon **Ambulance** hai (galat icon).
- Doctor-wale items (`/doctor/home-visit`, `/doctor/video-calls`, `/doctor/calls`, `/doctor/chat`, `/doctor/appointments/*`) hospital_admin menu me mix hain.
- Same nursing/opdToken lines 477-729 repeated: copy-paste menu blocks. Ek config-driven menu (role → groups) better hai.

## 4. Flow gaps (VERIFIED-GAP)

| # | Gap | Evidence |
|---|-----|----------|
| F1 | **Discharge se bill nahi banta/settle nahi hota** | `routes/ipd.js` me `Billing` import/call nahi; discharge route sirf status/summary set karta hai (lines ~171-215) |
| F2 | **IPD charges (bed/day, nursing, OT, lab, pharmacy) admission bill me accrue nahi hote** | Billing me `admissionId` field hai par IPD route use nahi karta; `source:'pharmacy'` ke alawa auto-create nahi mila |
| F3 | **Discharge `adminOnly`** | `ipd.js:171`; doctor approval + billing clearance + nurse checklist ka workflow nahi |
| F4 | **Discharge summary plain string**; model me structured fields hain (`dischargeMedicines`, `dischargeCondition`, checklist) par route sirf `dischargeSummary` + `isInfectionCase` leta hai | `ipd.js:19` zod schema |
| F5 | **Prescription ↔ LabOrder/PharmacyOrder ka ref nahi** | `LabOrder.js` refs: patient, doctor, hospital, facility. `prescriptionId`/`appointmentId` nahi |
| F6 | **Appointment me prescription/labOrder/bill refs nahi** (sirf `prescriptionFile` string) | `Appointment.js` |
| F7 | **General `receptionist` role enum me nahi** (sirf `lab_receptionist`); IAM template aur tenantScope me hai | `User.js` enum vs `iamTemplates.js:33` |
| F8 | **Bed transfer endpoint nahi** (status enum me `Transferred` hai) | `ipd.js` routes list: beds, admissions, discharge, vitals, mar, io, nursing-notes, doctor-notes, wound-care, stats |
| F9 | **Real payment gateway stub** (prod me 503) | `DEFERRED_TODOS.md` #1 |
| F10 | **IPD `doctor-notes` route `adminOnly`** | `ipd.js:273`. [VERIFY] `adminOnly` kisko allow karta hai; doctor ko likhna chahiye |
| F11 | No visitor management, token display screen, duty roster for doctors, credit/debit notes | grep = 0 files |
| F12 | Hospital tariff/rate card master nahi (service-wise price list, room-type wise) | grep: sirf ride/ambulance tariff |

## 5. [VERIFY] list (app chalake dekho)
- Payroll UI: `Staff.tsx` me attendance dikhta hai par payroll calculate/history ka UI hai ya nahi.
- ABDM/ABHA: `User.js`/`Record.js` me mentions hain, integration real hai ya sirf field.
- FHIR/HL7: sirf `ApiKey.js`, `integrations.js` me mention.
- MLC / death certificate: `reports.js` me ek mention.
- Cash counter / shift closing: `TransactionLedger` hai, counter-wise closing nahi dikha.
