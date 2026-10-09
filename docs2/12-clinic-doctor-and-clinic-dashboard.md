# 12. Clinic Doctor + Clinic Dashboard (role: `clinic_doctor`): Audit + Advanced Spec

**Important finding:** "Clinic doctor dashboard" aur "Clinic dashboard" code me **ek hi page** hain.
`App.tsx` line ~531: `if (user?.role === 'clinic_doctor') return <ClinicDashboard />;` aur route `/clinic/dashboard` bhi wahi. Matlab ek login = doctor + clinic owner/manager dono. Real world me ye do alag cheezein hain (practitioner vs clinic business), isliye neeche dono ko alag treat karke spec diya hai.

Files: `frontend/src/pages/clinic/ClinicDashboard.tsx` (1377 lines), `ClinicAppointments`, `ClinicSchedule`, `ClinicFees`, `ClinicPatients`, `ClinicPrescriptions`, `ClinicTests`, `ClinicTestRequests`, `ClinicConsultations`, `ClinicManagement`, `ClinicBilling`, `ClinicEarnings`, `ClinicPaymentHistory`, `ClinicReviews`, `ClinicStaff`, `ClinicNotifications`, `ClinicPlatformSettings`, `ClinicAnalytics`; backend `routes/clinics.js`, `models/ClinicProfile.js`, `Doctor.js` (`doctor_type: hospital|clinic`).

## 1. Abhi kya hai [VERIFIED-EXISTS]
- Welcome banner, **Emergency Doctor "Flying Squad" command bar** (duty toggle, live GPS, response radius, accept/arrived/complete flow), active emergency HUD, incoming-alert modal with siren
- **8 colored stat tiles**, "Clinic operations & analytics", 5-card Hub (In-clinic/Home/Video/Voice/Chat)
- Appointments hub (4 tabs), Recent payments, **Clinic schedule & OPD queue** card, Patients card, Reviews
- Earnings analytics, **Test requests** (lab bookings), Quick actions, Refunds
- **Statutory medical-council licence & emergency duty affirmation modal** (achha compliance touch)
- Sidebar: 33 items (appointments x3 offline tabs, x3 online tabs, schedule, patients, consultations, prescriptions, clinic tests, test requests, fees, earnings, billing, analytics, payment history, management, staff, reviews, notifications, settings, platform settings, audit logs)
- Backend `clinics.js`: profile get/put, staff list/create/update, public listing.

## 2. Verified problems / gaps

| # | Problem | Evidence |
|---|---------|----------|
| C1 | **Doctor + clinic-owner ek hi dashboard/role.** Clinic me receptionist/nurse/accountant ka apna login-based dashboard nahi | `clinic_doctor` only; ClinicStaff roles list `['Receptionist','Nurse','Lab Technician','Pharmacist','Accountant','Helper']` sirf **string labels** hain (`ClinicStaff.tsx:10`), real `User.role` + permissions nahi |
| C2 | **Stats client-side, sirf 100 records se**: `getAppointments({limit:100})`, `getTransactions({limit:100})`; "today/week revenue" bills se filter | `ClinicDashboard.tsx` ~lines 283-345 |
| C3 | **`ClinicAnalytics.tsx` = 5 line re-export of `DoctorAnalytics`** | file content: `return <DoctorAnalytics />` | Clinic-level analytics (multi-doctor, services, retention) nahi |
| C4 | **Clinic OPD queue sirf schedule card**; `Token` model / `getTokens` clinic pages me use nahi hota | grep `getTokens|/tokens` in `pages/clinic` = no files |
| C5 | **Clinic me multi-doctor support unclear**: `ClinicProfile` + `Doctor.doctor_type='clinic'` ek doctor = ek clinic jaisa lagta hai; "clinic with 3 doctors + shared reception" model nahi | `clinics.js` routes = profile/staff only |
| C6 | **Prescriptions same as hospital** (no ICD/allergy/interaction/template/QR) | grep = 0 |
| C7 | **Clinic billing**: `ClinicBilling` (307 lines) transactions based; GST invoice, packages/memberships, procedures price list, discount rules, daily cash closing nahi [VERIFY UI] | |
| C8 | **In-house pharmacy flag** (`in_house_pharmacy`) hai, par clinic dispensing/stock module nahi | `Doctor.js:84` |
| C9 | **Clinic inventory/consumables, vaccines stock, equipment** nahi | no clinic inventory route |
| C10 | **Recall/follow-up engine** nahi (diabetic recall, vaccine due, post-procedure follow-up) | |
| C11 | **Patient intake forms / e-consent / document vault** limited (`preConsultationDetails` hai) | Appointment model |
| C12 | **Multi-branch clinic** support nahi | |
| C13 | Menu duplicates: `nav.approvedOfflineAppointments` do baar, `nav.inPersonAppointments` do baar; 33 flat items | `AppSidebar.tsx` clinic block |
| C14 | Dashboard me **Emergency Flying Squad** bar sabse upar: har clinic doctor ke liye relevant nahi (opt-in feature hona chahiye) | |
| C15 | `clinic_doctor` ko `/doctor/call*` aur `/doctor/video-call*` routes allowed hain par menu me `/clinic/*` aliases: dual-path complexity | `App.tsx` |

## 3. Re-model: Clinic as a business (ClinicOrg)

```
ClinicOrg (tenant)  1 ── n  ClinicBranch
 ├─ Doctors (n)    : role clinic_doctor (practitioner)
 ├─ Staff (n)      : receptionist, nurse/assistant, accountant, pharmacist, lab_tech  (REAL users with RBAC)
 ├─ Services/price list, packages, memberships
 ├─ Inventory (consumables, vaccines, in-house pharmacy)
 └─ Settings: timings, holidays, fee rules, GST, branding, templates
```
- Owner role: `clinic_admin` (naya), practitioner: `clinic_doctor`, staff: `clinic_receptionist`, `clinic_nurse`, `clinic_accountant`, `clinic_pharmacist`.
- Migration: existing `clinic_doctor` accounts ko default `clinic_admin + clinic_doctor` dual-capability do (roles array ya capability flags) taaki purana flow na toote.
- `ClinicStaff` labels ko real `User` accounts me convert karo (invite email/phone OTP, role, permissions).

## 4. Clinic Admin / Owner Dashboard v2

```
[Top]   Branch switcher | Date range | Search patient | Quick: Register patient, Book appt, New bill
[R1 KPI] Patients today | Waiting now (avg wait) | Revenue today/MTD | Collection vs Dues | No-show % | Utilization % | New vs repeat | NPS
[R2]    Live OPD board: per doctor queue (Waiting / In consult / Done), room status, Call next
[R3]    Today's schedule (calendar view, drag-reschedule) | Doctor availability & leaves
[R4]    Billing: today's bills, pending payments, refunds, daily cash close
[R5]    Recalls & follow-ups due (diabetics/HTN/vaccines) with one-click WhatsApp
[R6]    Inventory alerts (consumables/vaccines/drugs low or expiring) | Pending lab test requests/results
[R7]    Doctor-wise performance (patients, revenue, avg consult time, rating) | Service-wise revenue
[R8]    Staff attendance/shift | Tasks | Compliance (licence, council reg, bio-waste log, fire/NOC)
[R9]    Reviews & complaints (reply workflow) | Marketing (profile views, bookings by source)
```
KPI definitions: Utilization = booked slots / available slots; No-show % = NoShow / Booked; Dues = Σ balance; Repeat = patients with ≥2 visits in 90d.

## 5. Clinic Doctor Dashboard v2 (practitioner view)
Isko hospital doctor ke jaisa **My Day** layout do (file 11) lekin clinic-sized:
- Waiting queue + Call next, next-patient card (allergies, last visit, pending dues, notes)
- Consult workspace (same EMR workspace as file 11, lighter templates for GP/Derm/Paeds/Ortho/Gyne/ENT/Dental)
- Today's appointments (clinic/video/home), tele-consult room
- Results inbox (own lab requests), follow-up due list, prescriptions to sign
- Earnings (clinic share vs own), payout statement
- Duty toggle for Emergency Flying Squad = **optional card** (settings opt-in), statutory modal sirf jab opt-in ho

## 6. Clinic modules to add

### P0
1. **Front desk for clinic**: registration, walk-in token, queue display, check-in, collect fee, receipt (reuse Token + Billing). Role `clinic_receptionist`.
2. **Server-side dashboard aggregate** `GET /api/clinic/dashboard` (fix C2), `ClinicAnalytics` real (C3).
3. **Staff as real users + RBAC** (C1).
4. **Prescription/EMR upgrade** (ICD-lite, allergy, interactions, templates, e-sign, QR; shared with file 11).
5. **Clinic billing**: service/procedure price list, GST invoice, discounts with authority, packages, memberships/loyalty (Membership model exists), part payment, daily cash close.
### P1
6. **Recall & follow-up engine** (rules: "HbA1c every 90d", "DTP booster at 6 weeks", "post-op day-3 check") + WhatsApp/SMS templates.
7. **Vaccination module** (VaccinationSchedule exists): due list, stock/batch/expiry, certificate print, ABDM push.
8. **Clinic inventory & in-house pharmacy**: items, batch, expiry, dispensing against Rx, auto bill, reorder.
9. **Lab/radiology partner integration**: order to partner lab (LabBooking exists), result auto-attach to chart, home collection.
10. **Intake forms + e-consent** (pre-visit questionnaire, consent templates, procedure consent, tele-consent).
11. **Multi-doctor scheduling**: room allocation, doctor rotas, shared resources (ultrasound room), overbooking rules, slot templates, holiday calendar.
12. **Patient engagement**: appointment reminders, review request, birthday/health tips, membership renewal.
### P2
13. Multi-branch roll-up dashboard; central patient record across branches.
14. Specialty add-ons: dental chart (`DentalChart` exists), eye exam (`EyeExam` exists), physio plans, antenatal card, paediatric growth chart, dermatology photo log.
15. Insurance/cashless for clinics (OPD policies, pre-auth lite) and corporate tie-ups.
16. Marketing: Google profile/booking widget, SEO page, offers, referral tracking.
17. Compliance pack: BMW log, registration display (Clinical Establishments Act), rate list display, grievance, DPDP consent.

## 7. API additions
```
GET  /api/clinic/dashboard?branchId=&from=&to=
GET  /api/clinic/analytics/{revenue|services|doctors|retention|noshow}
GET  /api/clinic/queue                 POST /api/clinic/queue/:id/call
POST /api/clinic/staff/invite          PUT /api/clinic/staff/:id/permissions
GET/POST /api/clinic/price-list        GET/POST /api/clinic/packages
GET/POST /api/clinic/recalls           POST /api/clinic/recalls/:id/send
GET/POST /api/clinic/inventory         POST /api/clinic/dispense
POST /api/clinic/cash-close
```

## 8. Quick fixes (clinic + doctor, 1-2 din)
- [ ] Clinic sidebar: group into Patients / Appointments / Clinical / Billing / Business / Settings; remove duplicate labels (C13).
- [ ] Doctor sidebar: add Ward rounds/IPD/OT/ER/Radiology/Results (file 11 D2).
- [ ] Replace `limit:100/200` client aggregation with server aggregates (D3, C2).
- [ ] Make Flying Squad bar opt-in (C14).
- [ ] Replace `any` with typed DTOs in dashboards; normalise CRLF endings (add `.gitattributes`).

## 9. Acceptance criteria
- Receptionist login clinic me sirf registration/queue/billing dekhe, clinical notes nahi (RBAC test).
- Clinic owner ek screen par aaj ka revenue, dues, queue, recalls dekhe aur numbers billing se reconcile hon.
- 3 doctors wale clinic me alag-alag queues + shared reception, bina data mixing.
- Recall engine 100 patients ko dedupe karke messages bheje, opt-out respect kare.
