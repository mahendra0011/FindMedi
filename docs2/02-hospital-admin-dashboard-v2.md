# 02. Hospital Admin Dashboard v2 (real-world design)

Principle: admin ko **5 sawaalon** ka jawab 10 second me milna chahiye:
1. Abhi hospital me kya chal raha hai? (live ops)
2. Paisa kahan hai? (billed / collected / pending)
3. Kya galat ho raha hai? (alerts)
4. Kaun available hai? (staff, beds, ambulance)
5. Trend kya hai? (day/week/month, compare)

## 1. Layout

```
[Top bar]  Hospital switcher (superadmin) | Date range: Today/7d/30d/Custom | Compare toggle | Search UHID/Name | Notifications
[Row 1]    KPI cards (8)
[Row 2]    Live Operations strip (12 tiles, color coded)
[Row 3]    Alerts & Action Center (left)  |  Live OPD Queue (right)
[Row 4]    Revenue split (OPD/IPD/Lab/Pharmacy/Radiology/OT)  |  Collections by payment mode
[Row 5]    Bed occupancy by ward (heatmap) | Department performance table
[Row 6]    Today's schedule: OT list, Discharges due, Admissions due
[Row 7]    Insurance/TPA pipeline | Pharmacy & Inventory health | Lab TAT
[Row 8]    Staff on duty & attendance | Pending approvals (leave, Rx verification, refunds, purchase orders)
[Row 9]    Patient experience (NPS, reviews, complaints) | Compliance (licenses/NABH tasks)
```

## 2. KPI cards (Row 1)

| KPI | Definition | Source |
|---|---|---|
| OPD Visits (period) | completed + in-progress appointments | Appointment |
| New vs Returning patients | first UHID visit vs repeat | Patient/Visit |
| IPD Census | currently admitted | Admission status=Admitted |
| Bed Occupancy % | occupied / total operational beds | Bed |
| Billed Revenue | sum(Billing.amount) | Billing |
| Collected | sum(Billing.paid) by paid date | Billing/Payment |
| Outstanding (A/R) | sum(Billing.balance) | Billing |
| Avg Revenue per Patient (ARPOB for IPD) | revenue / occupied bed days | derived |

Har card pe: previous period compare (▲▼ %), sparkline, click → drill-down page.

## 3. Live Operations strip (12 tiles)

Existing 8 rakho + add:
- ICU beds free / total
- OPD queue waiting (now) + avg wait min
- Discharges pending today
- Critical lab results unacknowledged
- Emergency door-to-doctor time (avg today)
- Blood units low (group-wise < threshold)

Tile colors: green (ok), amber (watch), red (action). Thresholds `SystemSetting` me configurable.

## 4. Alerts & Action Center

| Alert | Trigger | Action link |
|---|---|---|
| Critical lab value not acknowledged > 15 min | LabOrder critical flag | /lab |
| Overdue vitals / MAR missed dose | Admission vitals interval | /ipd |
| Pending discharge > 4 hrs | discharge initiated, bill not cleared | /ipd/discharges |
| Drug expiring ≤ 60 days | Medicine/Inventory expiryDate | /pharmacy/inventory |
| Stock ≤ reorderLevel | Medicine.reorderLevel | /inventory |
| Blood unit expiring ≤ 3 days | BloodBank unit expiry | /bloodbank |
| TPA pre-auth expiring / claim query pending | Insurance.preAuthExpiry, claimStatus | /insurance |
| Staff license/certification expiring | Staff.certifications.expiryDate, License | /staff |
| Equipment maintenance/calibration due | Equipment/AssetUnit | /inventory |
| Refund requests pending | Refund | /billing/refunds |
| Bill overdue > 30 days | Billing.dueDate | /billing |
| Bed cleaning pending > 30 min | Housekeeping | /housekeeping |

Alert model: `DashboardAlert` (type, severity, entityRef, createdAt, ackedBy, ackedAt, snoozeUntil). Realtime push via socket `dashboard:alert`.

## 5. Live OPD Queue widget
- Doctor-wise: waiting, in-consult, done, avg consult time, next token.
- Source: `Token` model + `Appointment`. Need `Token.status` (Waiting/Called/InConsult/Done/NoShow), `calledAt`, `startedAt`, `completedAt`.
- "Call next" button reception/doctor ke liye; display screen (see file 05).

## 6. Revenue section
- Stacked bar: revenue by `Billing.source` (OPD, IPD, Lab, Pharmacy, Radiology, OT, Physio, Other).
- Donut: collections by `paymentMethod` (Cash, Card, UPI, Insurance, Online, Cheque).
- Table: top 10 doctors by revenue + commission (CommissionConfig).
- A/R ageing: 0-30, 31-60, 61-90, 90+.
- Insurance pipeline funnel: Not Submitted → Submitted → Approved/Partial/Rejected → Settled.

## 7. Bed management widget
- Ward-wise grid (General, Semi-private, Private, ICU, NICU, HDU, Isolation, Emergency): free/occupied/cleaning/blocked/reserved.
- Click bed → patient, admitted since, expected discharge, doctor.
- KPIs: ALOS, bed turnover rate, avg bed idle time.

## 8. Department performance table
Columns: Department | OPD visits | IPD admissions | Revenue | Avg wait | Rating | Cancellation %.

## 9. Staff widget
- On duty now by role (doctors/nurses/technicians), absent today, late arrivals, overtime hours, on leave.
- Source: Staff.attendance, shifts, LeaveRequest, doctor schedule.

## 10. Backend: aggregated endpoints (replace 8 calls)

```
GET /api/dashboard/overview?from=&to=&compare=1       -> KPI cards + sparklines
GET /api/dashboard/operations                          -> all live tiles in one call (+ per-tile error flag)
GET /api/dashboard/revenue?from=&to=&groupBy=source|method|doctor|dept
GET /api/dashboard/alerts?status=open
POST /api/dashboard/alerts/:id/ack
GET /api/dashboard/queue
GET /api/dashboard/beds/heatmap
GET /api/dashboard/staff/on-duty
GET /api/dashboard/insurance/pipeline
```
- Cache 30-60s in Redis, hospitalId scoped (tenant), rate-limited.
- Mongo aggregation indexes: `Billing {hospitalId, createdAt}`, `Billing {hospitalId, source, createdAt}`, `Appointment {hospitalId, date, status}`, `Admission {hospitalId, status}`.
- Partial failure: response `{ data, errors: { tileKey: message } }`, UI tile pe "retry" icon.

## 11. Frontend refactor
- Dashboard.tsx ko widget components me todo: `widgets/KpiRow`, `OpsStrip`, `AlertCenter`, `OpdQueue`, `RevenueSplit`, `BedHeatmap`, `StaffOnDuty`, `InsurancePipeline`.
- Widget registry + per-user layout (show/hide/reorder) `UserPreference` me save.
- Role-specific dashboards: hospital_admin, medical_director, finance_admin, nursing_supervisor, front_desk (see file 08).
- Doctor-style "Consultation Hub" cards admin dashboard se hatao; doctor dashboard me rakho.
- Sidebar: grouped, collapsible, config-driven (file 10 me task).

## 12. Acceptance criteria
- Dashboard first paint < 1.5s on 3G-fast (skeleton), data < 2s (cached).
- Har KPI ka drill-down page ho aur same numbers dikhaye (no mismatch).
- Revenue numbers Billing ledger se reconcile ho (test: seed data → expected totals).
- Alert ack/snooze audit logged.
- Hospital A ka data Hospital B ko kabhi na dikhe (tenant test).
