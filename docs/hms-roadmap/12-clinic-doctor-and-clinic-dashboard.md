# 12. Clinic Doctor & Clinic Dashboard (audit + clinic-as-business + v2)

## 1. Audit (verified)

- Clinic doctor pages under `frontend/src/pages/clinic/*` + `ClinicDoctor.tsx`;
  `ClinicDetail.tsx` public page; `ClinicProfile` model.
- Gaps: no **business view** (revenue, outstanding, repeat %, no-show %),
  no **session/template management** (consult duration, buffer, overbooking),
  no **camp workflow**, no **dental/eye/AYUSH module toggles**.

## 2. Clinic-as-business model

A clinic is a small business: footfall → conversion → collection → repeat.
Dashboard answers: how many visited, how many paid, how many return.

```
[Row 1]  Today: appointments · walk-ins · completed · no-shows · collection
[Row 2]  Revenue (7d sparkline) | Outstanding | Repeat-patient %
[Row 3]  Doctor roster today (who is in, slots left) | Queue (tokens waiting)
[Row 4]  Pending: lab results to review · prescriptions to sign · payments to reconcile
[Row 5]  Services & price list (ServicePrice rows) | Packages/memberships | Camps hosted
```

## 3. Backend (built)

- `GET /api/clinic/overview?from=&to=` — visits, collection, outstanding,
  repeat %, no-show % (tenant = own clinic).
- `GET /api/clinic/roster/today` — doctors with slots + tokens waiting.
- Module toggles: `ClinicProfile.modules = { dental, eye, ayush, physio }`
  gating service lists and detail sections.
- Camp lite: reuse Event/Campaign models (`type: health_camp`) + registrations
  count; full organiser flow stays in events module.

## 4. Acceptance

- Numbers reconcile with Billing ledger (same aggregation code path as
  dashboard revenue).
- Toggles hide/show modules without breaking detail pages (section registry
  auto-hide on empty).
- Tenant isolation: clinic sees only its own rows.
