# 11. Hospital Doctor Dashboard (role: `doctor`): Audit + Advanced Spec

Files: `frontend/src/pages/doctor/DoctorDashboard.tsx` (1180 lines), sub-pages `frontend/src/pages/doctor/*` (DoctorAppointments, InPerson, Online, Calls, VideoCalls, Patients, Consultations, Prescriptions, TestResults, Schedule, LeaveRequests, Earnings, Analytics, Refunds, Reviews, Emergency, Profile), consult page `pages/DoctorConsultation.tsx`.

## 1. Abhi kya hai [VERIFIED-EXISTS]
- Header, **Operational alerts + quick actions** (emergency, test results, leave, video, calls)
- Stats grid (clickable, appointments tab switch), **5-card Hub**: In Hospital / Home Visit (live GPS) / Video / Voice / Chat
- Earnings Analytics (`EarningsAnalytics` component), 4-tab Appointments hub (Pending/Upcoming/Today/Complete) with quick status change
- Recent reviews, recent lab reports, quick stats row, **chronic care plans of own patients (opt-in visibility)**, refunds
- Realtime: appointment socket hook (`useAppointmentRealtime`), **emergency-doctor instant dispatch full-screen alert** (30s window), active emergency consult with 1-tap ALS ambulance escalation
- Prescription has tamper-seal `integrity {digest, signature, nonceHash}` (achha), pharmacy verification flow

## 2. Verified problems / gaps

| # | Problem | Evidence | Impact |
|---|---------|----------|--------|
| D1 | **Dashboard teleconsultation-first hai, hospital-doctor-first nahi.** IPD/OT/ER/rounds ka koi widget nahi | Sections list: hub = hospital/home/video/voice/chat | Hospital doctor ka asli kaam (ward rounds, OT list, discharge approvals) dashboard se invisible |
| D2 | **Sidebar me clinical modules ghayab**: `/ipd`, `/ot`, `/triage`, `/nursing`, `/radiology`, `/pharmacy`, `/insurance`, `/doctor-consultation`, `/records` doctor menu me nahi hain, jabki App.tsx routes doctor ko allow karte hain | Python scan of `doctor:` menu block = all False | Doctor ko in pages tak jaane ka rasta nahi |
| D3 | **Stats client-side, sirf last 200 records se**: `getAppointments({limit:200})`, `getBilling({limit:200})`, `getRecords({limit:200})` | `DoctorDashboard.tsx` load() | Busy doctor ke numbers galat (earnings/completed count 200 ke baad truncate) |
| D4 | **6 parallel list calls + 30s refresh**: heavy payload har baar | load() | Slow, bandwidth waste; server-side aggregate endpoint chahiye |
| D5 | **Lab reports list = records me `type==='lab_report'` last 10, sab doctors ke records me se** (client filter) | load() `myLabReports` | Doctor ko apne orders ke pending/critical results nahi, aur privacy risk (other doctors' records client tak aate hain) |
| D6 | **Prescription: ICD/allergy/interaction/templates/QR nahi** | grep icd/allerg/interaction/template/qr = 0 in DoctorConsultation, Doctor/ClinicPrescriptions, Prescription.js | Patient safety + real EMR ka basic |
| D7 | **Consultation page diagnosis = free text**, vitals form (bp, pulse, temp, spO2, sugar, weight) hai | `DoctorConsultation.tsx` consultForm | Structured SOAP, problem list, ICD nahi |
| D8 | **`DoctorConsultation.tsx` token/nurse-style page** (getTokens/getPatients/getRecords): doctor ke liye EMR workspace nahi | file top | Ek patient-centric workspace chahiye |
| D9 | Doctor ka **order → result review inbox** nahi ("unreviewed results") | `DoctorTestResults.tsx` 174 lines only list | Critical value miss ho sakta hai |
| D10 | No **my-OPD-queue / next-patient** flow (token call) in doctor dashboard | no Token use in dashboard | OPD me doctor "call next" nahi kar sakta |
| D11 | No **referral/consult-request inbox**, no **handover/on-call** roster | no widgets | Inter-department consult flow |
| D12 | No **tasks/To-do** (sign pending discharge summaries, pending Rx verification, unsigned notes) | no widget | Documentation backlog dikhta nahi |
| D13 | Quick actions mostly navigation; **no keyboard/command palette**, no global patient search by UHID | | Speed |
| D14 | Earnings: **no share/commission statement, TDS**, no per-service breakup | `DoctorEarnings.tsx` 131 lines | Visiting consultants ke liye zaroori |
| D15 | Many types `any` (`activeIncomingCall: any`), `.tsx` with loose typing; CRLF line endings | file | Maintainability |

## 3. Doctor Dashboard v2: Layout (hospital doctor)

```
[Top]  Greeting | Duty toggle (On duty / On call / Off) | Search patient (UHID/name/phone/ABHA) | Quick: New Rx, Order set, Dictate
[R1]   My Day (KPIs): OPD waiting | Seen today | IPD patients | Pending results | Pending discharges | OT today | Unsigned notes | Consult requests
[R2]   LEFT: OPD Queue (live tokens, Call Next, skip, no-show)       RIGHT: Next patient card (allergies, last visit, vitals, pending orders)
[R3]   Ward Round list (my IPD patients: bed, day-of-stay, NEWS2, pending orders/results, due meds) with "Start round"
[R4]   Results Inbox (critical first) | Orders in progress | Consult/Referral requests
[R5]   OT / Procedure schedule (today + this week) | Pending discharge approvals | Pending e-sign docs
[R6]   Appointments hub (OPD, Tele, Home) — existing tabs, but server-paginated
[R7]   Emergency on-call panel (existing dispatch alert) + ER patients assigned
[R8]   Earnings & workload analytics (server-side), Patient feedback, CME tracker
```
Teleconsult channels (video/voice/chat/home) tab ke andar jaayein, hero-level cards na rahein.

## 4. Doctor workspace (EMR) — jo sabse bada gap hai
Route `/doctor/workspace/:encounterId`: ek hi screen par
1. **Patient banner**: name, age/sex, UHID, ABHA, **allergies (red)**, blood group, isolation/MLC flag, payer.
2. **Left rail**: timeline of previous visits/admissions/reports, problem list, active meds, vaccinations, uploaded docs.
3. **Center (tabs)**: Complaint & HPI | Vitals (+trend chart) | Examination | Diagnosis (ICD-10 search) | Orders (lab/rad/proc/diet/consult) | Prescription | Advice & Follow-up | Notes/Attachments.
4. **Right rail**: decision support (interaction, dose, allergy), previous Rx copy, order sets/templates.
5. **Footer**: Save draft | Sign & finalize (e-sign, pin/OTP) | Send to pharmacy/lab | Print/WhatsApp Rx | Next patient.
Voice dictation + AI scribe (Gemini already integrated for chatbot) → SOAP draft jo doctor review karke sign kare.

## 5. Features to add (priority)

### P0
- Dashboard ke liye **server aggregate**: `GET /api/doctor/dashboard?date=` → counts, queue, ward list, results inbox, tasks (single call, hospital+doctor scoped).
- Doctor sidebar: **IPD/Ward rounds, OT, ER, Radiology, Results, Referrals** add.
- **Results inbox** (`ResultReview` state: new/ack'd/reviewed; critical push + must-ack).
- **OPD queue + call-next** (Token model: Waiting/Called/InConsult/Done/NoShow).
- **Ward round view** + round note (SOAP) + orders; IPD `doctor-notes` route doctor ko allow (file 01 F10).
- **Discharge approve** action (doctor stage of workflow, file 09 §9.2).
- Prescription upgrade: ICD-10 diagnosis, allergy check, drug-interaction/duplicate/dose warnings, templates + favourites, generic/brand toggle, e-sign with registration no. + QR verify, follow-up date.
- Fix D5: **server-side filtered** "my lab orders results" endpoint.
### P1
- **Consult/Referral requests** inbox (inter-specialty), second-opinion queue (`SecondOpinionRequest` exists).
- **Order sets** (chest pain, sepsis, DKA, post-op) + procedure scheduling to OT.
- **Tasks & unsigned docs** widget; discharge summary builder (structured) with pre-fill from chart.
- **On-call / duty roster** view + swap request; leave (exists) with auto reassign of appointments.
- Earnings: commission statement (CommissionConfig/Payout), TDS, per-service breakup, export.
- **CME tracker** (`CMECredit`, `doctorCme.js` exist): surface on dashboard; license/registration expiry alert (NMC/state council from `settings.councilRegNo`).
- Patient messaging inbox (non-urgent) with templates and SLA.
### P2
- AI scribe, AI coding (ICD), patient summary ("last 5 visits in 5 lines"), risk flags (NEWS2, readmission), trend charts.
- Tumour-board / M&M case presentation, teaching notes.
- Mobile-first rounds app (offline cache).

## 6. API additions
```
GET  /api/doctor/dashboard
GET  /api/doctor/queue            POST /api/doctor/queue/:tokenId/call|skip|done
GET  /api/doctor/rounds           POST /api/ipd/admissions/:id/rounds
GET  /api/doctor/results-inbox    PUT  /api/results/:id/review
GET  /api/doctor/tasks
POST /api/doctor/workspace/:encounterId/sign
GET  /api/cdss/check              body: { patientId, drugs[], diagnosis[] } -> interactions, allergy, dose
GET  /api/icd10/search?q=
GET/POST /api/rx-templates
```

## 7. Acceptance criteria
- Doctor dashboard first data < 1.5s with 1 call; numbers match server totals even with 10k+ appointments.
- Critical result needs explicit acknowledgement; audit log entry.
- Prescription cannot be signed if hard-stop interaction/allergy unless override reason is recorded.
- Doctor sees only own/treating patients (IDOR test), no cross-doctor record leakage.
- Sidebar shows every module the role is allowed to open (route/menu parity test).
