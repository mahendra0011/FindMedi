# 10. Roadmap, Priorities & Checklists

## Phase 0: Quick fixes (1 week)
- [ ] Sidebar: group menu (Front Office / Clinical / Diagnostics / Pharmacy / IPD & OT / Finance / HR / Admin / Compliance), fix duplicate `nav.opdToken`, `nav.reports`, Nursing icon, remove doctor-only links from admin menu; make one config-driven menu.
- [ ] `ipd.js` `doctor-notes` route: allow doctor role (F10); review all `adminOnly` uses on clinical routes.
- [ ] Dashboard: "Active Doctors" = on-duty/active status; add Outstanding (Σ balance) card, today's collection; combine ops tiles into one `/dashboard/operations` call.
- [ ] Add `receptionist` to `User.role` enum + `ROLE_PERMISSIONS` + landing page stub.
- [ ] Add DB indexes for dashboard aggregations.

## Phase 1: Flow integrity (3-4 weeks): *P0*
1. **Encounter + ChargeItem** (file 09 §9.1) and backfill script.
2. **Prescription/Orders → LabOrder/PharmacyOrder/Radiology** with `prescriptionId`, `encounterId`; results appear in doctor inbox.
3. **IPD charge accrual**: daily bed/nursing charge job; order-triggered charges; running bill.
4. **Discharge workflow** state machine + final bill + bed → housekeeping + discharge summary PDF.
5. **IPD deposit**, **bed transfer**, **room tariff**.
6. **Service price master** + discount authority.
7. **Payment gateway** (Razorpay test mode → live), signed webhook settlement (see `DEFERRED_TODOS.md` #1).
8. **Token queue**: call next + display screen + realtime.
9. Receptionist/front-desk dashboard.

Exit criteria: ek patient ka full IPD journey (admit → orders → charges → discharge → bill → payment) seed script + Playwright e2e se green.

## Phase 2: Operations (4-6 weeks): *P1*
- Hospital Dashboard v2 (file 02): alerts center, revenue split, bed heatmap, queue, staff on duty, insurance pipeline.
- TPA desk (pre-auth, claim, settlement reconcile).
- Cash counter shifts, credit notes, refunds approval chain.
- Pharmacy: indent/issue/return, FEFO, schedule-drug registers, GRN/PO/vendor invoice.
- Lab: barcode, ref ranges + flags, critical call-back, TAT, QC.
- OT suite: PAC, WHO checklist, op notes, counts, implants.
- Duty roster + swap + payroll UI + credentials.
- CSSD, housekeeping auto-tasks, BMW log, mortuary, incident reporting.

## Phase 3: Compliance & interoperability (4-6 weeks): *P1*
- ABDM (ABHA, HIP/HIU, consent), FHIR R4 export, HL7/ASTM for analyzers, DICOM/PACS.
- NABH checklists + KPI auto-calc, MLC, birth/death, PCPNDT, MTP.
- DPDP: retention policy, breach register, consent matrix.
- Audit immutability, PHI-read audit, access reviews, pen-test.
- WhatsApp/SMS (DLT) integration.

## Phase 4: Advanced / differentiators: *P2*
- CDSS (interactions, NEWS2), AI scribe (consult → SOAP draft; existing Gemini integration), AI coding (ICD-10 suggestion), no-show prediction, bed-demand forecasting, sepsis early warning.
- ICU flowsheets, oncology, cath-lab, maternity suite, NICU.
- Patient app: ABHA linking, reports locker, bill pay, queue status "you are 3rd", feedback.
- Multi-hospital group view (chain), inter-hospital transfers, central lab.
- Mobile apps for nurses (MAR scan), doctors (rounds), ambulance crew.
- Offline-first for ward tablets, downtime mode.

## Priority matrix

| Item | Impact | Effort | Phase |
|---|---|---|---|
| Discharge → final bill workflow | Very high | M | 1 |
| Encounter + ChargeItem | Very high | L | 1 |
| Prescription → lab/pharmacy link | High | M | 1 |
| Receptionist role + front desk | High | M | 0/1 |
| Payment gateway | High | M | 1 |
| Dashboard v2 | High | L | 2 |
| TPA desk | High | L | 2 |
| Cash counter + credit notes | Medium | M | 2 |
| Roster + payroll UI | Medium | M | 2 |
| ABDM + FHIR | Medium-High (India) | L | 3 |
| NABH/MLC/BMW registers | Medium | M | 2-3 |
| CDSS / AI | Medium | L | 4 |

## Testing checklist (har feature ke saath)
- [ ] Unit tests for services (charge posting, discharge state machine, deposit math).
- [ ] Integration tests (supertest + mongodb-memory-server): tenant isolation, RBAC, idempotency.
- [ ] Contract tests for OpenAPI.
- [ ] Playwright e2e: OPD journey, IPD journey, ER → admit, lab order → result, pharmacy dispense, refund, TPA claim.
- [ ] k6 load test for dashboard + queue endpoints (k6 folder exists).
- [ ] Security tests: IDOR on patientId/admissionId, role escalation, mass-assignment.
- [ ] Data tests: reconciliation (Σ ChargeItems = Σ Bill lines; Σ payments = ledger).
- [ ] Seed script: realistic demo hospital (50 beds, 20 doctors, 3 months data) for demos.

## Definition of Done (per module)
1. Model + migration + indexes. 2. API + zod + RBAC + audit. 3. UI (loading/empty/error states, i18n EN/HI). 4. Realtime events where needed. 5. PDF/print formats. 6. Tests (unit+e2e). 7. Docs (API + user guide + SOP). 8. Dashboard KPI hook-up.

## Demo script (interview/viva ke liye)
1. Receptionist registers walk-in → token → display screen calls.
2. Nurse vitals → doctor consult → Rx + lab order → lab result back to doctor.
3. Doctor advises admission → pre-auth → deposit → bed allot.
4. Daily charges accrue; running bill; bed transfer.
5. Discharge: doctor approve → nurse/pharmacy/billing clear → final bill → TPA claim file → discharge summary on patient app.
6. Admin dashboard: revenue split, A/R, occupancy, alerts all reflect the above live.
