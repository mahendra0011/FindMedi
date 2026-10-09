# 11. Hospital Doctor Dashboard (audit + v2 + EMR workspace)

## 1. Audit (verified)

- Doctor dashboard: `frontend/src/pages/doctor/DoctorDashboard.tsx` — appointments,
  earnings, patients, prescriptions, video/calls/chat entry points.
- Gaps: no **result review inbox** (unreviewed lab/radiology), no **ward-round
  list** (assigned IPD patients), no **OT list** (my surgeries), no **care-team
  patient panel**, no **allergy banner**, no **encounter timeline** per patient.

## 2. v2 layout

```
[Header] Today: my OPD count · IPD rounds pending · unreviewed results (badge) · OT today
[Row 1]  My schedule (slots, tokens waiting for me) | Call-next button
[Row 2]  Result review inbox (lab/radiology Resulted, not Reviewed) | Critical flags
[Row 3]  My IPD rounds (admissions where I am admitting/treating doctor) | Pending discharges needing my approval
[Row 4]  My OT list (today + upcoming) | PAC pending | WHO checklist pending
[Row 5]  Recent encounters (timeline) | Follow-ups due
```

## 3. EMR workspace (per patient/encounter)

- Header: allergy banner (from Record allergies + patient allergies), sensitivity
  badge (restricted → reason already enforced server-side), care-team flag.
- Tabs: Summary (problem list, active meds, allergies) · Consult note (SOAP +
  ICD-10) · Orders (CPOE: lab/radiology/medication/diet/nursing/procedure +
  order sets) · Results (with Reviewed ack) · Prescriptions (send-to-lab/pharmacy
  buttons reference `POST /pharmacy/prescriptions/:id/send-to-*`) · Billing
  (encounter charges) · Documents.

## 4. Backend (built)

- `GET /api/doctor/review-inbox` — Resulted-but-not-Reviewed lab/radiology for
  my patients (doctorId match), tenant-scoped.
- `GET /api/doctor/rounds` — my active admissions (admittingDoctor or primary).
- `GET /api/doctor/ot-list?from=&to=` — my surgeries.
- `PUT /api/lab/orders/:id/review` — mark reviewed (reviewedBy/At); pathologist
  verify stays separate (SoD intact).
- CPOE: `POST /api/orders` (Order model: kind/items/priority/prescriptionId/
  encounterId) + `GET /api/orders?encounterId=` + status transitions
  Ordered→Ack→InProgress→Resulted→Reviewed.

## 5. Acceptance

- Unreviewed count on dashboard == inbox list count (same query).
- Review action audit-logged; verify still requires different user (SoD test).
- Tenant isolation: doctor sees only own tenant rows.
