# Clinic Module — Specification & Implementation Status

> Scope: the clinic vertical in FindMedi — clinic-as-business console, clinic
> doctors, public clinic discovery, packages, branches and clinic staff.
> Backend mounts are declared in `backend/src/index.js`; guards come from
> `backend/src/middleware/auth.js` and the permission matrix in
> `backend/src/config/permissions.js`. This document reflects what is
> implemented in code today, including known gaps (see §9).

## 1. Two identities for "a clinic"

The codebase models a clinic in two distinct ways; conflating them is the
most common source of confusion:

| Identity | Model | Keyed by | Used for |
|---|---|---|---|
| Operational tenant | `Facility` with `type: 'clinic'` (`backend/src/models/Facility.js`) | `user.facilityId` / `user.hospitalId` | Staff, packages, branches, walk-ins, billing — anything tenant-scoped |
| Public directory clinic | `Doctor` with `doctor_type: 'clinic'` + `ClinicProfile` (`backend/src/models/ClinicProfile.js`) | `clinicId`, unique `doctorId` | Public listing/detail, modules (dental/eye/ayush/physio), roster |

`Facility.subType` enumerates clinic kinds (`single_doctor_clinic`,
`polyclinic`, `specialty_clinic`, `dental_clinic`, `eye_clinic`,
`ayush_clinic`, `physiotherapy_clinic`, `fertility_clinic`, …). Packages and
branches reference the Facility through `hospitalId` despite their
"clinic-*" names.

## 2. Roles

Declared in `backend/src/config/permissions.js` (and the `User.role` enum):

| Role | Permission highlights |
|---|---|
| `clinic_admin` | appointments r/w, patients:read, records:read, billing r/w, staff:manage/view, inventory:manage, chat |
| `clinic_doctor` | records r/w, appointments r/w, prescriptions:write, patients:read (permission-equivalent to `doctor` via `ROLE_EQUIVALENTS`) |
| `clinic_receptionist` | appointments r/w, patients:read, billing r/w |
| `clinic_nurse` | appointments:read, patients:read, records:read, vitals:write |
| `clinic_accountant` | billing r/w, commission:read, reports:read |
| `clinic_cashier` | billing r/w, patients:read |
| `clinic_pharmacist` | pharmacy:read/dispense, inventory:manage |
| `clinic_branch_manager` | appointments r/w, staff:manage/view, billing:read, inventory:manage, reports:read |
| `clinic_telemed_coordinator` | appointments r/w, patients:read, records:read, chat (alias `clinic_telemed_coord`) |
| `clinic_owner_analytics` | reports/billing/analytics:read, **`clinic:manage`** (only non-superadmin holder) |
| `clinic_patient_portal` | `:*own` self-service set |

Supporting staff roles: `clinic_lab_tech`, `clinic_radiology_tech`,
`clinic_inventory_mgr`, `clinic_purchase_officer`, `clinic_hr_admin`,
`clinic_home_collection`, `clinic_crm_staff`, `clinic_quality_mgr`.

## 3. API surface

### 3.1 `/api/clinics` — `backend/src/routes/clinics.js`

| Endpoint | Purpose | Guard |
|---|---|---|
| `GET /profile` | Caller's clinic Facility + linked Doctor row | `protect` |
| `GET /overview?from&to` | Business KPIs: visits, no-show %, billed/collected/outstanding, repeat % | `protect` + `billing:read` |
| `GET /dashboard?from&to` | Dashboard aggregate (visits, money, doctors, waiting tokens) | inline role list, **no `protect` (see §9.1)** |
| `GET /doctors` | Doctors of this clinic (shared reception) | inline role list, **no `protect`** |
| `GET /roster/today` | Today's roster + per-doctor waiting-token counts | `protect` + `appointments:read` |
| `PUT /profile` | Whitelisted facility fields (zod `updateClinicProfileSchema`) | `protect` |
| `PUT /modules` | Toggle `{dental, eye, ayush, physio}` on own ClinicProfile | `protect` (no role check — §9.2) |
| `GET /camps` | Health-camp campaigns for the facility | `protect` + `billing:read` |
| `GET /staff`, `POST /staff`, `PUT /staff/:id`, `DELETE /staff/:id` | Facility staff CRUD, temp-password issuance, role-escalation guard | `protect` (+ `adminOnly` on writes; 403 without facilityId) |
| `POST /staff/invite` | Invite flow: real `User` + `Staff` HR row, one-time password | inline role list, **no `protect`** |
| `GET /public?search&specialty&city` | Public clinic-doctor discovery (approved doctors + ClinicProfile) | none |
| `GET /public/:id` | Public single clinic-doctor detail | none |

Walk-in registration also admits clinic roles:
`POST /api/appointments/walk-in` (`backend/src/routes/appointments.js`).

### 3.2 `/api/clinic-packages` — `backend/src/routes/clinicPackages.js`

Router-level `protect`, tenant-scoped by `req.user.hospitalId`.
`GET /`, `POST /`, `PUT /:id`, `DELETE /:id` — writes restricted to
`hospital_admin | superadmin | clinic_admin`; `hospitalId`/`createdBy`
pinned server-side (never trusted from the body).

### 3.3 `/api/clinic-branches` — `backend/src/routes/clinicBranches.js`

Router-level `protect`, tenant-scoped. `GET /`, `GET /:id`, `POST /`
(authorize `staff:manage`, `hospital:manage`), `PUT /:id`
(`staff:manage`), `PATCH /:id/active` (audited toggle), `DELETE /:id`.
Writes emit audit events `clinic.branch.create/update/toggle/delete`.

### 3.4 Discovery via facilities

`backend/src/routes/facilities.js` — `GET /api/facilities/nearby?type=clinic`
(H3 res-7 geo search), `GET /api/facilities/:id`, plus the
register → approve/reject/suspend lifecycle shared by all facility types.

## 4. Data model

| Model (file) | Key fields |
|---|---|
| `Facility` (`models/Facility.js`) | `facilityId`, `type:'clinic'`, `subType` enum, name/slug, `licenseNumber`, `status` (`pending→approved`), specialties, timing, `appointmentModes`, `appointmentFees{chat,video,audio,offline,home_visit}`, rating |
| `ClinicProfile` (`models/ClinicProfile.js`) | `clinicId` (auto 16-digit), `doctorId` (unique), `modules.{dental,eye,ayush,physio}`, name/address/category/timing/photos/facilities/treatments/insurance/faqs/license, `established_year`, `social` |
| `Doctor` (`models/Doctor.js`) | `doctor_type:'clinic'|'hospital'`, `facilityId`, `approved`, `clinic_reception_phone`, fees, specialization, `user_id` |
| `ClinicPackage` (`models/ClinicPackage.js`) | `hospitalId` (ref Facility), `branchId`, `name`, `category`, `price`, `mrp`, `includedServices[]`, `validDays`, `active`, `createdBy` |
| `ClinicBranch` (`models/ClinicBranch.js`) | `hospitalId`, `name`, `address`, `city`, `phone`, `manager`, `active` |
| Linked | `Token` (queue), `Appointment`, `Billing`, `Campaign` (camps), `Staff` (HR row), `Review`, `Test` (`providerType:'clinic'`), `License`, `FeaturedListing`, `Dispute`, `SavedFavorite`, `CommissionConfig` |

## 5. Frontend

### Public routes (`frontend/src/App.tsx`)

| Route | Page | Purpose |
|---|---|---|
| `/clinic`, `/clinic-doctors` | `pages/ClinicDoctors.tsx` | Clinic-doctor listing with specialty/qualification/language/experience filters + BookingModal |
| `/clinic-doctors/:id` | `pages/ClinicDoctor.tsx` | Clinic-doctor detail, reviews, related doctors |
| `/clinic/:clinicId` | `pages/ClinicDetail.tsx` | Facility detail: photos, priced services, facilities, timings, insurance, FAQs, map, reviews |

Shared: `components/ClinicCard.tsx`.

### Clinic console (`frontend/src/pages/clinic/*`, gated by `CLINIC_ROLES`)

| Route | Page | Purpose |
|---|---|---|
| `/clinic/dashboard` | `ClinicDashboard.tsx` | Master console: emergency flying-squad bar, schedule, appointments, transactions, reviews, lab bookings |
| `/clinic/admin` | `ClinicAdminDashboard.tsx` | Executive cockpit: KPIs, doctors/rooms, revenue stream, alerts, staff |
| `/clinic/doctor` | `ClinicDoctorDashboard.tsx` | Queue rail + consultation workspace |
| `/clinic/reception` | `ClinicReceptionDashboard.tsx` | Walk-in registration (UHID), live token queue |
| `/clinic/cashier` | `ClinicCashierDashboard.tsx` | Pending invoices, payment settlement, UPI QR |
| `/clinic/nurse` | `ClinicNurseDashboard.tsx` | Vitals queue/capture, BMI |
| `/clinic/branch-manager` | `ClinicBranchManagerDashboard.tsx` | Cross-branch KPI comparison |
| `/clinic/telemed-coordinator` | `ClinicTelemedCoordinatorDashboard.tsx` | Video session manager |
| `/clinic/overview` | `ClinicOverview.tsx` | Overview KPIs, roster, camps, recalls (Doc 12 §2/§3) |
| `/clinic/appointments*`, `/home-visit`, `/in-person` | `ClinicAppointments.tsx` | Channel tabs, offline approval, reschedule & prescription modals |
| `/clinic/schedule`, `/clinic/fees` | `ClinicSchedule.tsx`, `ClinicFees.tsx` | Slot settings/breaks/booking window; per-mode fee cards |
| `/clinic/patients`, `/clinic/prescriptions`, `/clinic/consultations` | `ClinicPatients.tsx`, `ClinicPrescriptions.tsx`, `ClinicConsultations.tsx` | Patient cards, prescriptions (DoctorRecordsDashboard filtered), clinical records CRUD |
| `/clinic/tests`, `/clinic/test-requests` | `ClinicTests.tsx`, `ClinicTestRequests.tsx` | In-clinic test catalogue, incoming bookings |
| `/clinic/management`, `/clinic/staff`, `/clinic/packages`, `/clinic/branches` | `ClinicManagement.tsx`, `ClinicStaff.tsx`, `ClinicPackages.tsx`, `ClinicBranches.tsx` | Facility profile, staff CRUD, packages/branches CRUD |
| `/clinic/billing`, `/payment-history`, `/earnings`, `/analytics` | `ClinicBilling.tsx`, `ClinicPaymentHistory.tsx`, `ClinicEarnings.tsx`, `ClinicAnalytics.tsx` | Invoices, transactions, earnings, analytics |
| `/clinic/reviews`, `/clinic/certificates`, `/clinic/inventory` | `ClinicReviews.tsx`, `ClinicCertificates.tsx`, `ClinicInventory.tsx` | Ratings, certificates with QR verification, pharmacy stock |
| `/clinic/notifications`, `/clinic/platform-settings` | `ClinicNotifications.tsx`, `ClinicPlatformSettings.tsx` | Notification center; ops master settings (modes, emergency/refund policy, auto-confirm, signature) persisted on `Doctor.settings` |

Landing logic: role→dashboard map in `App.tsx`; `CLINIC_OPS_ROLES` users land
on `/clinic/admin`. API wrappers: `frontend/src/lib/api.js`
(`getClinicProfile`, `getClinicStaff`, `getClinicOverview`, `setClinicModules`,
`getClinicRosterToday`, `getClinicCamps`).

## 6. Key workflows

1. **Registration → approval**: `POST /api/facilities/register` →
   `pending` → superadmin/kyc_reviewer approves → facility usable as tenant.
2. **Staff onboarding**: `POST /api/clinics/staff` (admin) creates a `User`
   with a temp password and `mustResetPassword: true`; the invite variant
   additionally creates the HR `Staff` row.
3. **Packages & branches**: tenant-scoped CRUD; branch create requires both
   `staff:manage` and `hospital:manage`; every branch mutation is audited.
4. **Daily ops**: roster → token queue → walk-in registration → consultation
   → cashier settlement; billing flows ride the shared `/api/billing` routes.
5. **Public discovery**: approved `Doctor(doctor_type:'clinic')` rows appear
   in `/api/clinics/public` and geo-nearby facility search.

## 7. Permissions used by clinic routes

`billing:read` (overview, camps), `appointments:read` (roster),
`staff:manage` + `hospital:manage` (branch create),
`staff:manage` (branch update/toggle/delete), plus the role lists inlined in
`clinics.js`. `clinic:manage` is held only by `clinic_owner_analytics`
(superadmin bypasses).

## 8. Seeds & demo data

- `backend/seed-demo.mjs` seeds `clinicprofiles` from
  `backend/mock-data/clinics.json` (5 profiles mapped to seeded doctors) and
  prints `clinic@findmedi.com` (`clinic_doctor`, facility `green-clinic`);
  `clinicadmin@findmedi.com` (`clinic_admin`) comes from `mock-data/users.json`.
- `backend/src/services/demoSeedService.js` upserts counsellor/psychiatrist
  doctors with `doctor_type:'clinic'` but does not seed clinic Facilities.
- Spec references: `docs/hms-roadmap/12-clinic-doctor-and-clinic-dashboard.md`
  (Doc 12), `docs/hms-roadmap/01-clinical-specialties-dialysis-icu-ot.md`,
  CMS-69/CMS-70 in `backend/src/config/cmsDashboardSpec.js`.

## 9. Known gaps / issues (as implemented today)

1. **Three `clinics.js` endpoints have no `protect` middleware** —
   `GET /dashboard`, `GET /doctors`, `POST /staff/invite`. There is no global
   auth middleware, so `req.user` is undefined and their inline role checks
   fail closed (403) for direct calls. The frontend does not call them
   (staff UI uses `POST /clinics/staff`), but they are effectively dead.
2. **`PUT /modules` has no role restriction** — any authenticated user can
   flip module toggles on their own ClinicProfile.
3. **Two staff-role vocabularies** — `CLINIC_STAFF_ROLES`
   (`nurse, technician, helper, accountant, lab_receptionist, pharmacist`) for
   CRUD vs `CLINIC_STAFF_INVITE_ROLES` (`clinic_*` roles) for the invite flow
   (`backend/src/utils/validate.js` vs `clinics.js`).
4. **Doc 12 path drift** — roadmap text writes `/api/clinic/overview` while
   the implementation mounts `/api/clinics/overview`.
5. **Cross-domain overlap** — `ClinicDashboard.tsx` drives the emergency
   "flying squad" flow (`/emergency-doctor/*`), tying the clinic console to
   the emergency module.
