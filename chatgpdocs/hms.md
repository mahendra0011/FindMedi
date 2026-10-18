# HMS — Hospital Management System: Specification & Implementation Status

> Scope: the hospital core of FindMedi — beds and admissions (IPD), OPD and
> encounters, nursing, org structure, billing/finance overview, and the
> role-dashboard specification layer. Diagnostics (lab/pathology, imaging) has
> its own document: `chatgpdocs/pahtologyandimaginingcenter.md`; clinics have
> `chatgpdocs/clinic.md`. All mounts live in `backend/src/index.js`
> (lines ~822–1173); guards in `backend/src/middleware/auth.js`; the
> permission matrix in `backend/src/config/permissions.js`.

## 1. Architecture at a glance

- **Multi-tenant**: every tenant-scoped row carries `hospitalId` (a
  `Facility`); `scopeToHospital` middleware sets `req.hospitalId` from the
  caller, superadmin passes through.
- **Guard vocabulary**: `protect` (JWT cookie/Bearer, tokenVersion, blocked,
  mustResetPassword), `adminOnly` (= `hospital_admin|superadmin`),
  `clinicalStaffOnly` (superadmin, hospital_admin, doctor family, nurse
  family, surgeon, anaesthetist), `clinicianOnly` (local to `routes/ipd.js`),
  `authorize('perm')` (matrix check; superadmin bypasses non-PHI; PHI perms
  `records:read`/`patients:read` need break-glass for platform roles),
  `restrictTo(...roles)`, `requireRole(...)`.
- **Encounters are derived, not hand-created**: `backend/src/lib/encounter.js`
  `ensureEncounter()` opens exactly one `Encounter` per care visit (OPD
  check-in, token start, ER arrival, IPD admission — idempotent on
  `appointment/ticket/admission/emergency.encounterId`). Encounter routes are
  therefore read/close/reopen only.

## 2. Role-dashboard specification layer

The HMS dashboard catalog is the product spec for role workspaces, defined
twice and kept in sync by tests on both sides:

| Artifact | Path |
|---|---|
| Backend source of truth | `backend/src/config/hmsDashboardSpec.js` (~1600 lines) |
| Frontend mirror | `frontend/src/lib/hmsDashboardSpec.ts` |
| API | `GET /api/dashboard/hms-spec` (all), `GET /api/dashboard/hms-spec/:roleKey` (404 if unknown) |
| Tests | `backend/test/integration/hmsDashboardSpec.spec.js`, `frontend/src/pages/dashboards/hmsDashboardSpec.test.jsx` |

**6 layers**: 1 Executive · 2 Clinical · 3 Critical Care & Procedure ·
4 Diagnostic & Treatment Support · 5 Business & Operations ·
6 Facility/Quality/Digital.

**50 canonical role keys**: `superadmin, hospital_owner, hospital_admin,
medical_superintendent, hod, doctor, resident_doctor, nurse, emergency,
icu_doctor, icu_nurse, ot_coordinator, surgeon, anaesthetist,
dialysis_admin, lab_technician, pathologist, radiology_technician,
radiologist, pharmacist, blood_bank_admin, receptionist, opd_coordinator,
admission_coordinator, bed_manager, billing_executive, cashier, tpa_agent,
corporate_admin, accountant, store_keeper, purchase_officer, hr_manager,
housekeeping_supervisor, cssd_technician, diet_kitchen_admin, dietitian,
biomedical_engineer, facility_manager, ambulance, quality_officer,
infection_control_nurse, patient_relations, security, discharge_coordinator,
mortuary_attendant, it_admin, auditor, mis_reporting, patient, doctor_portal`.

Each spec provides `layer, title, subtitle, permissions[], sidebarSections[],
kpis[{label,value,hint}] (4–8), tasks[], alerts[], workQueues[],
quickActions[], domainModules[]`. `getHmsDashboardSpec(roleKey)` resolves an
alias map (`ward_nurse|clinic_nurse|nursing_supervisor|matron→nurse`,
`front_desk|clinic_receptionist→receptionist`, `insurance_desk→tpa_agent`,
`casualty→emergency`, …) and returns `undefined` for unknown keys — callers
must treat that as "no spec", not an error.

**Live KPI wiring** (`frontend/src/pages/dashboards/useLiveKpis.ts`): merges
live values into the static `kpis` by label-slug
(`live[snake] ?? live[lowercaseLabel] ?? live[label]`); unmatched KPIs keep
their static value. Sources per role include `/api/dashboard/operations`,
`/api/beds/stats`, `/api/nursing/stats`, `/api/emergency/stats`,
`/api/billing`, `/api/doctor/dashboard`, tokens. Unmatched fetches fail soft.

## 3. Admissions & beds (IPD engine)

### Routes

**`/api/beds`** (`backend/src/routes/beds.js`) — `GET /` (list),
`GET /stats` (`total, available, occupied, maintenance, reserved, blocked,
isolation`), `GET /heatmap` (platform rollup, clinicalStaffOnly),
`POST /` (zod `createBedSchema`), `PUT /:id`, `DELETE /:id`,
`POST /:id/hold-lock`. All `protect` + `scopeToHospital` except heatmap's
stronger guard.

**`/api/ipd`** (`backend/src/routes/ipd.js`) — the real admission engine
(dynamically imports Bed, Admission, IpdDeposit, BedTransfer,
DischargeWorkflow, WardRound, ShiftHandover, ConsentForm, Housekeeping,
ChargeItem, Billing):

| Group | Endpoints | Guard |
|---|---|---|
| Beds | `GET /beds`, `POST /beds`, `PUT /beds/:id` | read: scope; create: `adminOnly` |
| Admissions | `POST /admissions` (zod `createAdmissionSchema`), `GET /admissions[/:id]`, `PUT /admissions/:id/discharge` | create/discharge: `adminOnly` |
| Charting | `POST /admissions/:id/{vitals,mar,io,nursing-notes,wound-care}` | `clinicalStaffOnly` |
| Doctor notes | `POST /admissions/:id/doctor-notes` | `clinicianOnly` |
| Money | `GET|POST /admissions/:id/deposits`, `GET /admissions/:id/running-bill`, `POST /admissions/:id/bills/interim`, `GET /admissions/:id/discharge/summary-pdf` | read `billing:read`; write `adminOnly`/`billing:write` |
| Transfer | `POST /admissions/:id/transfer` (writes `BedTransfer`) | `adminOnly` |
| Discharge workflow | `POST /admissions/:id/discharge/initiate`, `PUT .../approve`, `PUT .../clear/:stage`, `POST .../finalize` | initiate/approve: `clinicianOnly`; finalize: `adminOnly` |
| Ward ops | `POST /admissions/:id/rounds`, `POST /handovers[/:id/ack]`, `POST /admissions/:id/consents`, `POST /consents/:id/revoke` | clinician/clinical staff |
| Jobs | `POST /jobs/accrue-bed-charges` (→ `backend/src/jobs/bedChargeAccrual.job.js`), `GET /stats` | `adminOnly` |

Admission entry points elsewhere: `POST /api/emergency/:id/transfer-to-ipd`
(creates Admission + assigns bed), `POST /api/emergency/beds/transfer/:id`,
ward-type masters `GET|POST /api/masters/ward-types`.

### Data model

| Model | Key fields |
|---|---|
| `Bed` | `bedNumber`, `ward` (General/Semi-Private/Private/ICU/NICU/PICU/Emergency), `bedType`, `status` (Available/Occupied/Under Cleaning/Maintenance/Reserved/Blocked/Isolation), `srcStatus` state machine (`admit|discharge|transfer|cleaning|maintenance|available|reserve|block|isolation|manual`), `currentPatientId`, `admissionId`, `dailyRate`, `wardTypeId`, `hospitalId` |
| `Admission` | `admissionId` (unique), `encounterId`, `patientId`, `bedId/ward`, `admittingDoctor`, `source` (OPD/Emergency/Direct/Referral), `status` (Admitted/Transferred/Discharged/DOD), discharge checklist/summary/followUp |
| `DischargeWorkflow` | `admissionId` (unique), states `Initiated → DoctorApproved → NursingClear → PharmacyClear → BillingClear → Discharged` (or `Cancelled`), approvals[], finalBillId, summaryPdfUrl |
| `BedTransfer` | `fromBedId/toBedId`, `fromWard/toWard`, `reason`, `orderedBy`, `effectiveAt` |
| `IpdDeposit` | `type` (Receive/Adjust/Refund), `amount`, `mode`, `receiptNo`, `billId`, `counterId` |
| `WardRound` | `admissionId`, `doctorId`, `roundAt`, `soap{}` |
| `ShiftHandover` | `wardId`, `shift` (Morning/Evening/Night), `fromNurse/toNurse`, `ackAt` |
| Related | `WardType`, `PatientMovement`, `RoomTariff`, `VisitorPass`, `Housekeeping` |

## 4. OPD & encounters

| Route | Surface | Notes |
|---|---|---|
| `/api/encounters` | `GET /`, `GET /:id`, `PUT /:id/close`, `PUT /:id/reopen` | `records:read` or `appointments:read`; close/reopen need `*:write` |
| `/api/appointments` | list/detail/my/history/booked-slots/queue, `POST /` (bookingLimiter + idempotency), `POST /walk-in`, lock/release slot, `PUT /:id/{checkin,transit,intake}` | plus sub-mounts `/waitlist`, `/series` |
| `/api/tokens` | `GET /display`, `POST /generate`, `PUT /:id/{call,start-consultation,complete,no-show,skip,recall}`, `POST /call-next`, `GET /stats` | `tokenDeskOnly` |
| `/api/queues` | queue tickets, call-next, board, metrics, display | shared with front office |
| `/api/triage` | create/list/update, assign, MLC flag, notes, `GET /stats/main` | writes `adminOnly` |
| `/api/emergency` | list/create, assign/status/notes/mlc, stats, `transfer-to-ipd`, bed transfer | ER → IPD handoff |

Models: `Encounter` (`status Open|Closed|Cancelled`, `payerType`,
`isMLC`), `Appointment`, `Triage` (`arrivalMode`, `triageLevel`, `isMLC`),
`Emergency`, `Token`, `QueueTicket`, `Visit`.

## 5. Nursing

**`/api/nursing`** (`backend/src/routes/nursing.js`): `GET /` (recent
charts), `POST /vitals`, `POST /mar`, `POST /io`, `POST /wound-dressing`,
`GET /shift/:admissionId/:date`, `GET /stats`
(`{vitals, mar, io, woundDressing}` counts), `POST /scan` (bedside barcode
lookup for `mar|sample|blood`, read-only).

Models: `NursingChart` (`chartType` Vitals/MAR/InputOutput/WoundDressing/
General, `shift`), plus `IcuFlowsheet`, `IcuScore`, `DoseLog`, `Partogram`,
`WardRound`, `ShiftHandover`.

> **Asymmetry to note in any spec**: charting under
> `/api/nursing/*` writes is gated `adminOnly` (hospital_admin/superadmin),
> while the same clinical actions under `/api/ipd/admissions/:id/*` use
> `clinicalStaffOnly` (nurses included). Nurses chart through IPD.

## 6. Diagnostics, pharmacy & billing (overview; detail in sibling docs)

- **Pharmacy** `/api/pharmacy` — medicines CRUD + stock, prescriptions with
  dispense/verify, `send-to-lab`/`send-to-pharmacy`, H1 & narcotic registers,
  orders/delivery, offers/coupons/returns, stores. Guards:
  `authorize('pharmacy:read|manage|dispense|order:own')` + object scoping.
- **Lab & radiology** — `chatgpdocs/pahtologyandimaginingcenter.md`.
- **Billing** `/api/billing` — invoice CRUD, doctor fees, tax invoice,
  debit notes, `POST /:id/collect|cancel`, `POST /pay` (idempotency guard
  prefix `pay`), verify; guarded `billing:read|write` + `paymentLimiter`.
- **Finance** `/api/finance` — pricing/tariffs, credit notes, counters &
  cash shifts, expenses, ledger/trial-balance/PnL/GST, payouts & vendor
  bills, package exclusions, Tally/Zoho exports. Step-up required for
  refunds/payouts.

## 7. Org structure

- `/api/departments` — CRUD scoped `scopeToHospital` (model: name, head,
  `fees_structure`).
- `/api/facilities` — the tenant master (`type` hospital/clinic/lab/pharmacy;
  `status pending→approved|rejected|suspend`; NABL/AERB numbers).
- `/api/hospitals` — hospital registry, approve/reject/suspend
  (kyc_reviewer/superadmin), `emergency24x7` toggle, ambulance fleet admin.
- `/api/masters` — locations, ward types, reason codes, patient flags
  (`staff:view`/`staff:manage`); `/api/frontoffice` — enquiries.

## 8. Dashboard API

`/api/dashboard` (`backend/src/routes/dashboard.js`):

| Endpoint | Guard | Payload |
|---|---|---|
| `GET /operations` | hospital_admin/superadmin | Single-round-trip ops strip. Tiles: `beds{free,total,icuFree,icuTotal,occupancyPct}`, `erActive`, `otToday`, `activeIpd`, `pendingLab`, `criticalLabs`, `pendingRx`, `ambulancesOnDuty`, `staffOnLeave`, `opdQueue{waiting}`, `dischargesPending`, `money{outstanding,billed,collectedToday}`, `alerts`; response `{data, errors, at}` — per-tile fail-soft |
| `GET /revenue` | hospital_admin/superadmin | Revenue by source/payment mode + A/R ageing |
| `GET /alerts`, `PUT /alerts/:id/ack` | hospital_admin/superadmin | Alert centre, audit-logged |
| `GET /beds/heatmap` | hospital_admin/superadmin | Ward-wise occupancy + ALOS |
| `GET /staff/on-duty` | hospital_admin/superadmin | On-duty snapshot |
| `GET /stats` | hospital_admin/superadmin | Patients/doctors/today's appointments, revenue, weekly/monthly series, department distribution |
| `GET /overview?from&to&compare` | hospital_admin/superadmin | `kpis{collected,billed,appointments,admissions}` each `{value,prev,deltaPct}` + `spark[]` |
| `GET /queue` | + doctor/nurse/receptionist | `{total, longestMin, departments[], sample[]}` |
| `GET /hms-spec[/:roleKey]` | `protect` (self) | Spec catalog; sibling spec endpoints: `/cms-spec`, `/cms-workflow`, `/lis-spec`, `/ris-spec`, `/diagnostic-workflow` |

## 9. Frontend surfaces

- **Core pages** (`frontend/src/pages/`): `IPD.tsx`, `OPDRegistration.tsx`,
  `OPDToken.tsx`, `PatientRegistration.tsx`, `FrontDesk.tsx`,
  `DischargeDesk.tsx`, `TpaDesk.tsx`, `NursingCharts.tsx`, `TriagePage.tsx`,
  `IcuChart.tsx`, `DoctorConsultation.tsx`, `Appointments.tsx`, `Patients.tsx`,
  `MedicalRecords.tsx`, `Billing.tsx`, `Lab.tsx`/`LabOps.tsx`,
  `Pharmacy.tsx`, `Radiology.tsx`, `OperationTheatre.tsx`/`OtBoard.tsx`,
  `BloodBank.tsx`, `Insurance.tsx`, `Staff.tsx`, `Inventory.tsx`,
  `Housekeeping.tsx`, `DietKitchen.tsx`, `MortuaryPage.tsx`,
  `QueueDisplay.tsx`, `Kiosk.tsx`, `Reports.tsx`, `HospitalDashboardV2.tsx`,
  `Dashboard.tsx` + specialty pages (`DialysisPage`, `OncologyPage`,
  `MentalHealth`, `Physiotherapy`, …).
- **Admin workspaces** (`frontend/src/pages/hospital/`, 46 files):
  `BedBoard`, `BedsideScan`, `VitalsStation`, `ApprovalsInbox`,
  `WorkflowStudio`, `RulesStudio`, `TaskBoard`, `OpsMasters`, `RcmDashboard`,
  `ReconWorkbench`, `PackageBillingEngine`, `TrialBalancePage`,
  `AccountingExportPage`, `ReportStudioPage`, `KpiDashboard`,
  `DashboardOverviewPage`, `DashboardQueuePage`, `QualityBoard`,
  `SafetyDesk`, `InsuranceTpaDeskDashboard`, `PurchaseCenter`,
  `BiomedicalWastePage`, `RecruitmentPage`, `WebhookStudio`, `NotifyStudio`,
  `FormBuilderStudio`, …
- **Role dashboards** (`frontend/src/pages/dashboards/`, 78 files):
  `RoleDashboardShell.tsx`, `UniversalHmsDashboard.tsx` (route
  `/dashboards/:roleKey`, reads the local TS spec copy — not the API), plus
  ~50 per-role dashboards (`DoctorRoleDashboard`, `IcuNurseDashboard`,
  `BedManagerDashboard`, `AdmissionCoordinatorDashboard`,
  `DischargeCoordinatorDashboard`, `CashierDashboard`, …) and `useLiveKpis.ts`.

Key routes in `App.tsx`: `/ipd`, `/ipd/discharges`, `/opd-registration`,
`/opd-token`, `/frontdesk`, `/nursing`, `/triage`, `/ot`, `/ot/board`,
`/billing`, `/appointments`, `/staff`, `/dashboard/v2`,
`/dashboard/overview`, `/dashboard/queue`, `/dashboards/:roleKey`, 40+
`/hospital/*` admin routes — all wrapped in `<RoleRoute allowedRoles={…}>`.

## 10. Roles & permission families

`ROLE_EQUIVALENTS` (permissions.js:33–81) — any family member satisfies a
family check:

| Family | Members |
|---|---|
| doctor | `doctor, clinic_doctor, surgeon, anaesthetist, resident_doctor, icu_doctor, doctor_portal` |
| nurse | `nurse, ward_nurse, icu_nurse, ot_nurse, infection_control_nurse, nursing_supervisor, matron` |
| executive | `medical_director, cmo, hospital_owner, medical_superintendent` |
| front desk | `receptionist, front_desk, radiology_receptionist` |
| store | `store_keeper, purchase_officer, lab_inventory_mgr` |

Key grants (abridged, source `ROLE_PERMISSIONS`):

| Role | Grants |
|---|---|
| `hospital_admin` | hospital/staff/beds/departments manage, records r/w, billing r/w, pharmacy & lab manage, radiology r/w/cancel/amend, emergency, nursing/housekeeping/security/insurance, appointments, inventory, reports |
| `doctor` | records r/w, appointments r/w, prescriptions:write, patients:read, lab:order/read, radiology:read/order |
| `nurse` | records:read, vitals:write, patients:read, beds:read, nursing:read |
| `receptionist`/`front_desk` | appointments r/w, patients:read, billing r/w, staff:view |
| `admission_coordinator` | admissions:manage, beds:read/manage, insurance:read, billing:create/read, patients:read |
| `bed_manager` | beds:manage/read, housekeeping:read, reports:read, operations:read |
| `discharge_coordinator` | discharges:manage, operations:read, billing:read, records:read, patients:read |
| `emergency` | emergency:manage, clinical:write, records r/w, admissions:write, vitals r/w, patients:read/create |

## 11. Known gaps / issues (as implemented today)

1. **Two bed CRUDs** — `/api/beds` (scopeToHospital) and `/api/ipd/beds`
   (adminOnly create) both write `Bed`; `Bed.status` is canonical,
   `Bed.srcStatus` records which transition armed it.
2. **Nursing guard asymmetry** — `/api/nursing` writes are `adminOnly`
   while identical charting under `/api/ipd/...` is `clinicalStaffOnly`
   (see §5).
3. **Duplicate mounts/definitions** — `GET /api/finance/trial-balance` is
   defined twice (`finance.js:306` and `:602`); `/api/linen` and
   `/api/biometric` are mounted twice in `index.js`.
4. **Spec duplication** — `hmsDashboardSpec.js` and `hmsDashboardSpec.ts`
   are parallel copies; `UniversalHmsDashboard` reads the local TS copy, so
   the `/api/dashboard/hms-spec` endpoint is informational. Sync is enforced
   by tests on both sides.
5. **Unauthenticated analyzer feeds** (diagnostics, listed here because they
   mount alongside HMS) — `POST /api/lab/ingest/astm` and `/ingest/hl7` have
   no `protect`.
6. **Events defined but not emitted** — fixtures exist under
   `backend/src/events/fixtures/` for admissions/lab/pharmacy/billing/vitals
   streams; Kafka emit for diagnostics has no callers in `src`
   (see diagnostics doc §Gaps).
