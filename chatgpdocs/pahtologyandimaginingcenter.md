# Pathology & Imaging Centre — Specification & Implementation Status

> Scope: the diagnostics vertical — pathology/lab (LIS) and imaging/radiology
> (RIS/PACS). Filename kept as-is for link stability (`pahtology…`).
> There is **no** separate `pathology.js` or `imaging.js` module: pathology is
> `backend/src/routes/lab.js` (56 endpoints) and imaging is
> `backend/src/routes/radiology.js` (38 endpoints). Catalogs:
> `/api/tests` (`routes/tests.js`), CPOE wrapper `/api/orders`
> (`routes/orders.js`). Both mount in `backend/src/index.js` (:846, :854).

## 1. Lab (pathology / LIS)

### 1.1 Catalog — `Test` model + `Category(type:'test')`

- `Test` (`backend/src/models/Test.js`): name, `categoryCode` (TEST.*),
  price, refs/critical limits, `resultFormat`
  (Text|Numeric|Table|Image), `verificationRole`
  (pathologist|lab_owner|both), TAT hours, NABL/AERB flags, `sampleType`,
  home-collection flag, `providerType` (lab_technician/phlebotomist/
  radiographer/sonographer).
- **There is no `TestCategory` model.** Categories are canonical
  `Category` docs with `type:'test'` and codes `TEST.BLOOD_BASICS …
  TEST.HEALTH_PACKAGES` (23 codes incl. `TEST.IMAGING_BASIC/ADVANCED`), plus
  legacy free-text `Test.category`.
- Catalog CRUD: `GET /api/tests` (public search, rate-limited),
  `POST|PUT|DELETE /api/tests[/:id]` (manage limited to
  superadmin/hospital_admin/clinic_doctor/lab_owner; price edits push
  `priceHistory` + audit), `GET /api/tests/stats`.

### 1.2 Orders & results lifecycle (`/api/lab`)

State vocabulary: `LAB_ORDER_STATUSES` (16 values),
`LAB_REJECTION_REASONS` (11), `LAB_OUTSOURCE_STATUSES` (7, forward-only) in
`backend/src/utils/validate.js`. **Results are embedded** — there is no
separate result collection; values live in `LabOrder.tests[]`.

| Stage | Endpoints |
|---|---|
| Create | `POST /orders` (subject server-resolved; posts pending `ChargeItem` `source:'lab'`) |
| Sample | `PUT /orders/:id/register-sample`, `/collect-sample`, `/tests/:index/{reject,recollect,accept}` |
| Intake | `PUT /orders/:id/receive`, `GET /receiving` |
| Result entry | `PUT /orders/:id/enter-result` (prev-value/delta check) |
| Verification | `PUT /orders/:id/verify` — **separation of duties: rejects a role that can enter results** (`lab.js:510`) |
| Release | `PUT /orders/:id/finalize`, `PUT /orders/:id/deliver-report` (+`reportUrl`) |
| Amendment | `GET /orders/:id/report/versions`, `POST /orders/:id/correct-report` |
| Outsourcing | `PUT /orders/:id/tests/:index/{outsource,outsource/status,outsource/result}`, `GET /outsourced` |
| Critical callback | `POST /orders/:id/callback` (call-back log) |
| Lifecycle misc | `GET /orders[/:id]`, `PUT /orders/:id/{status,cancel}`, `POST /orders/:id/tests` |

**Worklists / QC / analytics**: `GET /worklist` (per-section tech queue),
`GET /sections` (8: Biochemistry, Hematology, Clinical Pathology,
Microbiology, Histopathology, Cytology, Serology, Molecular),
`GET /tat`, `GET /stats`, `GET /outbreak` (H3-geohash abnormal clusters),
`POST /qc`, `GET /qc/chart` (Westgard flags via `QcRun`).

**Analyzer integration**: `POST /ingest/astm` (API-key or auth),
`POST /ingest/hl7` (ORU^R01), `POST /analyzer-upload`,
`POST /ingest/emulate` (dry-run packet generator). Support libs:
`backend/src/lib/hl7.js`, `astm.js`, `services/lisAnalyzerDriver.js`.
**Note: `/ingest/astm` and `/ingest/hl7` are unauthenticated** (§7.6).

**Bookings / home collection**: `GET|POST /bookings`,
`PUT|DELETE /bookings/:id`, `PUT /bookings/:id/visit`
(start/handover/complete/fail), `GET /phlebotomists`, report dispatch via
`POST /bookings/:id/dispatch-report`, `GET /report-deliveries`
(courier = `PharmacyDelivery` rows carrying `labBookingId/labOrderId`).

**QC/catalog/logistics/export**: `GET /tests` (catalog search),
`GET /equipment` + CRUD, `GET /packages[...]`, `GET /export` (CSV/JSON,
tenant-scoped, 5 000-row cap, audited).

### 1.3 Report formats

Per test: `resultValue` string + `normalRange/unit/flag` (H/L/HH/LL).
`LabOrder.reportUrl` (single), `reportVersion`/`reportVersions[]`
(corrected-by, reason, content). Delivery modes: Digital / Courier / Pickup.
PDF: `POST /api/reports/generate-lab-report`
(`services/pdfService.js#generateLabReportPDF`), email via
`POST /api/reports/email/lab-result`.

## 2. Imaging (radiology / RIS / PACS)

### 2.1 Orders lifecycle (`/api/radiology`)

`Radiology` model: 18 modalities (X-Ray…PET, DEXA, EEG, TMT),
**20-state status enum**, report `findings/impression/recommendation`,
`reportVersions[]` (amendmentReason + signature), `imageUrls[]`,
`studyNumber/reportNumber/studyUid`, `dicomStudy{transferStatus,
storageStatus}`, `safetyScreening`, `criticalFinding` (Red/Orange/Yellow +
escalation lifecycle), `preparation.checklist`, `contrast{}`, refs to
`encounterId/admissionId/prescriptionId`.

| Group | Endpoints |
|---|---|
| Orders | `POST /orders` (charge `source:'radiology'` via `ServicePrice` `RAD-<MODALITY>`), `GET /orders[/:id]`, `PUT /orders/:id/{cancel,status,modify,schedule,start,complete,screening,report,deliver}` |
| Critical findings | `PUT /orders/:id/{acknowledge-critical,critical/escalate,critical/close}`, `GET /critical` |
| Prep & contrast | `GET /preparation`, `PUT /orders/:id/preparation`, `PUT /orders/:id/contrast` |
| Modalities (machine master) | `GET /modalities[/:id]`, `POST`, `PUT`, `DELETE` — AE title, port, slot duration, capacity, prep rules, report templates, price |
| Scheduling | `GET|POST /appointments`, `PUT /appointments[/:id]`, `PUT /appointments/:id/checkin` (overlap-checked), `GET /schedule/availability` |
| Dose | `POST /dose`, `GET /dose` (`DoseLog`: DAP/DLP/CTVol/µGy·cm²) |
| Stats | `GET /stats` |

### 2.2 PACS / DICOM

`GET /dicom/ping` (C-ECHO), `GET /dicom/worklist` (C-FIND),
`GET /dicom/viewer-url` (OHIF deep-link, falls back to Orthanc),
`GET /dicom/studies`, `POST /dicom/link`, `POST /dicom/retry`.
Client: `backend/src/lib/dicom.js` (`DicomClient`, env `ORTHANC_*`,
`OHIF_URL`). Pixel storage today = generic `POST /api/upload`
(`type: medical_image|xray`) stored as URLs on `Radiology.imageUrls`.
Tests: `backend/test/integration/dicom.spec.js`,
`radiologyDicom.spec.js`.

## 3. Order → result flow

**Creation paths (lab)**:
1. `POST /api/lab/orders` (`lab.js:164`) — optional `encounterId`;
   auto `openAdmissionFor` + `postCharge({source:'lab', sourceRef:{model:'LabOrder'}})`.
2. `POST /api/pharmacy/prescriptions/:id/send-to-lab` — sets
   `prescriptionId + encounterId + appointmentId`, posts a `ChargeItem` per test.
3. `POST /api/orders` — CPOE wrapper (`kind: lab|radiology|…`) scoped to
   encounter/admission.

**Creation path (imaging)**: `POST /api/radiology/orders`; scheduling is
decoupled via `ImagingAppointment.radiologyOrderId` (the `Appointment`
collection has no lab/radiology fields — removed by design, see
`models/Appointment.js`).

**Lineage**: `LabOrder → patientId, doctorId, encounterId, admissionId,
prescriptionId, appointmentId, hospitalId/facilityId`. Reverse references:
`Order.linkedDocs.labOrderId` (declared, never written — §7.5),
`PharmacyDelivery.labOrderId`, FHIR `GET /api/fhir/DiagnosticReport`
(`routes/fhir.js:78`), label verify (`routes/print.js:142`), search,
dashboards, `clinicalAlerts` `lab-panic` rule, patient-merge re-parenting.

**Separation of duties**: doctor review (`GET /api/orders/review-inbox`,
`PUT /api/orders/review-lab/:id` → `LabOrder.reviewedBy/At`) is distinct
from pathologist verification (`PUT /api/lab/orders/:id/verify`), which
rejects any role holding `lab:enter_result`.

**Charges**: `lib/charges.js#postCharge` → `ChargeItem.source`
`'lab'`/`'radiology'` rolls into IPD/billing; `LabOrder.isBilled/billAmount`,
`Radiology.refundFlag`.

## 4. Data model summary

| Model | File | Role |
|---|---|---|
| `Test` | `models/Test.js` | Catalog master (format, TAT, verification role, NABL/AERB) |
| `Category` (`type:'test'`) | `models/Category.js` | Canonical 23-code category tree (TEST.*) |
| `LabOrder` | `models/LabOrder.js` | Order + **embedded** `tests[]` (sample, section, resultValue, flags, outsourced sub-doc, verifier, rejection); `status`, `priority` Routine/Urgent/STAT, `reportVersion` |
| `LabBooking` | `models/LabBooking.js` | Walk-in/home-collection booking, prescription verification, phlebotomist dispatch, delivery mode |
| `QcRun` | `models/QcRun.js` | QC runs + Westgard flags |
| `HealthPackage` | `models/HealthPackage.js` | Bundles of `Test` refs |
| `Radiology` | `models/Radiology.js` | Imaging order/report/study/critical/dose (see §2.1) |
| `ImagingModality` | `models/ImagingModality.js` | Machine master (AE title, capacity, templates) |
| `ImagingAppointment` | `models/ImagingAppointment.js` | Booked slot → `radiologyOrderId`, machine, staff |
| `DoseLog` | `models/DoseLog.js` | Radiation exposure log |
| `Equipment`, `PharmacyDelivery`, `Order` | respective files | Equipment, report courier, CPOE wrapper |

## 5. Roles & permissions

Source: `backend/src/config/permissions.js`.

**Lab strings**: `lab:manage|read|book|enter_result|verify|cancel|receive|
assign|finalize|correct|visit|print|export|order`, patient self-scope
`lab:read:own`, `lab:book:own`.

| Role | Key grants |
|---|---|
| `lab_owner` / `lab_admin` / `lab_manager` (family) | manage, read, book, verify, cancel, receive, assign, finalize, correct, print, export, reports:read |
| `lab_receptionist` | read, book |
| `lab_technician` + 8 section techs (`biochem…molecular_tech`) | read, enter_result |
| `pathologist` | read, verify |
| `lab_supervisor` | full set incl. visit/print |
| `lab_receiving` | read, book, receive, assign, print |
| `report_coordinator` | read, finalize, correct, print, export |
| `phlebotomist` / `home_collection_staff` | read, book, visit |
| `hospital_admin` | `lab:*` broad + `radiology:read/write/cancel/amend` |
| `doctor` | `lab:order`, `lab:read`, `radiology:read`, `radiology:order` |
| `patient` | `lab:read:own`, `lab:book:own`, `radiology:read:own` |

**Radiology strings**: `radiology:read|write|cancel|amend|order`. Holders:
`radiologist`, `radiology_manager|admin`, `radiology_scheduler`,
`radiology_prep_staff`, modality techs (`mri/xray/ct/us/mammo_technician`),
`pacs_admin`, `radiology_receptionist`, `reporting_assistant`,
`clinic_radiology_tech`.

Route-level: `lab.js` defines `LAB_DEPT_ROLES` (11), `LAB_STAFF_ROLES`,
`REPORT_DISPATCH_ROLES`; object-level checks go through
`authorizeObject` (tenant `hospitalId/facilityId`).

## 6. Frontend

- **Lab business console** — `frontend/src/pages/labcenter/` (20 pages,
  `/lab-business/*`, role `lab_owner`): Dashboard, Appointments, Billing,
  BookingManagement, Equipment, Packages, PrescriptionQueue,
  ReceivingDashboard, SampleCollection, SampleTracking, SectionWorkbench,
  Reports, ReportsAnalytics, QualityQc, OutsourceDesk, TestCatalog, Staff,
  Reviews, **PathologistVerificationDashboard** (also `/lab/verify`).
- **Hospital lab ops** — `pages/Lab.tsx` (full lifecycle console),
  `pages/LabOps.tsx` (queue: pending, verify, review-ack, TAT),
  `pages/hospital/LabAnalyzerEmulatorPage.tsx`,
  `pages/admin/AdminTestCatalog.tsx`, `AdminLabSettings.tsx`.
- **Radiology console** — `frontend/src/pages/radiology/` (10 pages,
  `/radiology/*`): Dashboard, Scheduling, ModalityMaster, ModalityDashboard
  (`/radiology/mri|xray|ct|ultrasound|mammography`), PreparationQueue,
  PacsDashboard, CriticalFindings, ReportCenter, ReceptionConsole, MIS.
  Plus `pages/Radiology.tsx` (orders + `PacsDicomViewer` + screening/
  reporting modals) and shared `components/radiology/*`.
- **Public/discovery** — `AllTests.tsx`, `HospitalTestBooking.tsx`,
  `DiagnosticCenters.tsx`, `DiagnosticCenterDetail.tsx` (`/lab/:clinicId`),
  `ImagingCenterDetail.tsx` (`/imaging/:clinicId`).
- **Role dashboards** — `UniversalLisDashboard.tsx` /
  `UniversalRisDashboard.tsx` (`/lab/dashboard/:roleKey?`,
  `/radiology/dashboard/:roleKey?`; 46 LIS screens × 21 role keys,
  41 RIS screens × 16 role keys) backed by `lib/lisDashboardSpec.ts` and
  `lib/risDashboardSpec.ts`; `PhlebotomistDashboard.tsx` (`/lab/collection`).
- **Patients/doctors** — `patient/PatientReports.tsx`,
  `doctor/DoctorTestResults.tsx`, `PDFReports.tsx` (manual lab-report
  composer), `DiagnosticDashboard.tsx` (`/admin/diagnostic`).

## 7. Seeds & demo data

| Seed | What it does |
|---|---|
| `backend/scripts/seed-test-categories.mjs` | Dry-run default, `--apply`: upserts the **23 `Category(type:'test')` docs** (TEST.* codes + aliases) |
| `backend/scripts/migrate-test-categories.mjs` | Backfills `Test.categoryCode` from legacy `Test.category` (fallback `pathology→TEST.BLOOD_BASICS`, `radiology→TEST.IMAGING_BASIC`) |
| `backend/seed-demo.mjs` | Recreates 23 `Test` docs from `mock-data/tests.json` (Pathology/Cardiac/Imaging) + users `pathologist@`, `radiologist@`, `diagnostic@findmedi.com` (all `password`) |
| `backend/scripts/seed-provider-type-configs.mjs` | Provider types `diagnostic` (lab reg + pathologist council + BMW auth, NABL optional) and `imaging_centre` (**AERB + PCPNDT + radiologist council**; modalities/machine list/radiologist on site), plus `phlebotomist`, `home_sample_collection` |
| Frontend fallback | `frontend/src/data/testCategoriesFallback.ts` — same 23 codes with icons/colors |

**Not seeded anywhere**: `LabOrder`, `LabBooking`, `Radiology`,
`ImagingModality`, `ImagingAppointment`, `QcRun`, `DoseLog` — a fresh DB has
catalog only and empty worklists. No demo accounts exist for department
technician roles (biochem_tech…, radiology_scheduler, modality techs,
`pacs_admin`).

## 8. Reporting, print, exports

- MIS categories (`routes/reports.js`): Lab Statistics/TAT/Rejection/
  Outsourcing/Section Workload; Radiology Study Volume/TAT/Revenue/
  Equipment Utilization/Report Pending/Cancelled-No-show.
- `GET /api/lab/export` (CSV/JSON, tenant-scoped, 5 000 cap, audited).
- `routes/print.js` — templates, render, specimen/tube labels,
  `POST /scan/verify` (validates a scan code against `LabOrder`).
- FHIR: `GET /api/fhir/DiagnosticReport?patient=` built from `LabOrder`.

## 9. Known gaps / issues (as implemented today)

1. **No DICOM object ingest** — `DicomReceiver`, `storeDicomFile`,
   `parseDicomHeader` in `backend/src/lib/dicom.js` are referenced nowhere
   in the repo. Only C-ECHO/C-FIND + viewer deep-link + manual
   `dicom/link` exist; no WADO-RS, no series download.
2. **No standalone result model / LOINC observations** — results live only
   inside `LabOrder.tests[]`; FHIR `Observation` serves vitals only.
3. **Permission mismatch for order creation** — `POST /api/lab/orders`
   requires `lab:book|lab:book:own` (`lab.js:164`), but `doctor` holds only
   `lab:order, lab:read`, so a doctor is 403'd creating a lab order even
   though `DiagnosticDashboard`/`Lab.tsx` are routed to doctors. Radiology
   is consistent (`radiology:order`). `clinic_doctor` has no lab/radiology
   grants at all.
4. **Dead frontend KPI fetch** — `frontend/src/pages/dashboards/useLiveKpis.ts`
   calls `GET /radiology/studies`, which does not exist (real path is
   `/radiology/dicom/studies`) — the "Modality Study Worklist" queue can
   never populate.
5. **CPOE link never written** — `Order.linkedDocs.labOrderId/.radiologyId`
   are declared but no create path populates them; the CPOE → order link is
   one-directional and unpopulated.
6. **Unauthenticated analyzer feeds** — `POST /api/lab/ingest/astm` and
   `/ingest/hl7` accept data without `protect` (mitigated only by optional
   API-key logic on ASTM).
7. **Kafka diagnostics events defined but never emitted** — topic
   `findmedi.diagnostics.lab-order-events.v1` + schema +
   `emitLabOrderEvent()` (`lib/kafkaProducer.js:137`) have no callers.
8. **No radiology PDF generator** — lab has `generateLabReportPDF`; imaging
   reports are text + `reportUrl`/`imageUrls`.
9. **No image upload inside radiology routes** — images arrive only via the
   generic `POST /api/upload` as URL strings.
10. **Category dual vocabulary** — `GET /api/lab/tests` filters free-text
    `Test.category` while `GET /api/tests` supports `categoryCode`; the
    migration script bridges them.
