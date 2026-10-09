# 06. HR, Operations, Inventory, Facility

## 6.1 HR & Roster (P0/P1)
Exists: Staff (attendance, shift, overtime, leaveBalance, certifications), `routes/staff.js` (attendance, bulk attendance, shifts, payroll calculate/history, overtime), LeaveRequest, ScheduleChangeRequest, doctor schedule pages.
Missing:
- **Duty roster** (nurses/doctors/ward-wise, monthly planner, auto-fill rules: max consecutive nights, rest hours, skill mix; swap requests; on-call list). grep = none.
- **Biometric/face/geo attendance** integration + late/early/OT rules, holiday calendar.
- Payroll UI [VERIFY in `Staff.tsx`]: salary structure (basic, HRA, allowances, PF/ESI/PT/TDS), payslip PDF, loans/advances, arrears, full & final.
- Recruitment & onboarding checklist, document vault (degree, registration, police verification), **credentialing & privileging** (doctor's surgical privileges, NMC/State council registration expiry), CME tracking (CMECredit exists).
- Appraisal/KRA, training & mandatory drills (fire, BLS/ACLS), vaccination status of staff (Hep-B), occupational health & needle-stick log.
- Contract doctors / visiting consultants: slot-based pay, per-patient share.

## 6.2 Inventory & Supply Chain (P0)
Exists: Inventory, Supplier, PurchaseOrder, Equipment/AssetUnit, Medicine (reorderLevel, expiry).
Missing/extend:
- **Multi-store hierarchy**: Central store → Sub-stores (OT, ICU, Ward, Pharmacy, Lab) with **indent/requisition → issue → return**, stock transfer, consumption by department.
- Item master: category, UOM/pack conversion, HSN/GST, min/max/reorder, ABC-VED analysis, batch & expiry, storage condition.
- **GRN** (Goods Receipt) against PO, quality check, rejection/return to vendor, 3-way match with invoice.
- Rate contracts, vendor rating, quotation comparison (RFQ), approval matrix for PO value.
- Stock audit/physical count with variance posting, near-expiry & dead stock reports, auto-reorder suggestions, barcode/QR scanning.
- **Implants & high-value consumables** serial/lot traceability (to patient).
- Consignment stock (stents, implants) tracking.
- Linen & laundry tracking, kitchen stores.

## 6.3 Biomedical Engineering / Assets (P1)
- Asset register (tag, serial, purchase, warranty, AMC/CMC, location, custodian), **preventive maintenance schedule**, breakdown ticket with SLA, calibration due, spare parts, condemn/disposal, utilization (ventilator/MRI hours).
- Regulatory: AERB (X-ray) licence, PCPNDT registration (USG), fire NOC, lift licence, pollution board consent, pharmacy/drug licence, NABL. (`License` model + `LicenseExpiryReminder` component exist; make them cover all of these with alerts.)

## 6.4 CSSD (Central Sterile Supply) (P1)
- Instrument set master (contents, count), cycle: collection → washing → packing → sterilisation (autoclave/ETO/plasma: load, cycle no., parameters, BI/CI indicator result) → storage → issue to OT/ward → return; recall by load number if BI fails; patient-wise traceability.
- `SterilisationLog` model exists (used in dental). Extend to hospital CSSD with set tracking.

## 6.5 Housekeeping, Laundry & Biomedical Waste (P0/P1)
- Housekeeping model exists. Add task assignment with room status (dirty→cleaning→ready) auto-linked to **bed discharge** (bed becomes "Cleaning" until housekeeping marks ready), checklists, terminal cleaning for isolation/OT, audit scores.
- **Biomedical Waste (BMW Rules 2016)**: colour-bag-wise weight log per ward/day (yellow/red/white/blue), handover to CBWTF with manifest, monthly/annual report to pollution board (Form IV, Annual Report), needle-stick/sharps injury log, mercury/spill kit log.
- Laundry: linen issue/return per ward, count reconciliation, infected-linen segregation.

## 6.6 Dietary / Kitchen (P1)
- DietOrder + DietKitchen exist. Add diet master (therapeutic diets: diabetic, renal, cardiac, liquid), kitchen production sheet from census, meal-time tracking, delivery confirmation at bed, patient preference/allergy, attendant meal billing, food-safety (FSSAI) temp logs.

## 6.7 Mortuary (P1)
- Body receipt (from ward/ER/outside), tag, cold-chamber allocation, ID verification, **death certificate (Form 4/4A) + cause-of-death (ICD)**, MLC/post-mortem handover to police, release with authorised person + ID, charges, unclaimed-body protocol. (grep: only mentions; no module.)

## 6.8 Ambulance & Transport (extend) (P1)
- Exists: Ambulance, driver routes, dispatch, rides, rider tracking.
- Add: trip sheet, fuel/maintenance log, crew (EMT) assignment, equipment checklist per shift, response-time KPIs, billing per km/type (BLS/ALS/neonatal), inter-hospital transfer form with handover.
- Patient transport within hospital (wheelchair/stretcher requests, porter queue).

## 6.9 Security, Parking, Facility (P2)
- Security rounds log (QR checkpoints), gate pass, incident log, CCTV request, parking slots, fire-drill log, visitor blacklist, lift/AC/DG/water-tank maintenance, energy meters (optional).
- Role `security` exists.

## 6.10 Canteen / Pantry (P2)
- Staff & visitor canteen billing (optional), integrate with payroll deduction.

## 6.11 Help Desk / Ticketing for internal ops (P2)
- IT/maintenance/housekeeping tickets (Task model exists) with SLA, categories, escalation.
