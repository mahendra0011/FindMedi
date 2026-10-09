# 03. End-to-End Real-World Flows (aur repo me jahan tootta hai)

Legend: ✅ exists, ⚠️ partial, ❌ missing

## Flow A: OPD (walk-in + appointment)

```
Patient arrives/books → Registration (UHID) → Token → Vitals (nurse) → Doctor consult
 → Orders (lab/radiology/pharmacy/procedure) → Billing → Payment → Follow-up → Reports to patient
```
| Step | Status | Gap / To-do |
|---|---|---|
| Online booking, slots, waitlist | ✅ | |
| Walk-in registration, UHID | ✅ `OPDRegistration`, `User.uhid` | Receptionist role nahi (F7). ABHA link, photo/ID capture, duplicate patient detection (phone+DOB+name fuzzy) add karo |
| Token / queue | ⚠️ `Token` model, `OPDToken` page | Live display screen, call-next, doctor-wise queue, no-show handling, priority (senior/emergency) |
| Pre-consult vitals by nurse | ⚠️ Triage/VitalsLog | OPD vitals station page (BP, SpO2, weight, height→BMI, pain score) linked to Appointment |
| Consultation (SOAP, diagnosis ICD-10, history, allergies) | ⚠️ DoctorConsultation | Structured EMR: chief complaint, HPI, examination, ICD-10 search, templates per specialty, previous visit panel, allergy banner |
| Prescription | ✅ | Drug-interaction/allergy check, dose templates, generic substitution, e-sign (NMC format), QR verification |
| Order lab/radiology from consult | ❌ | `prescriptionId`/`consultationId` ref (F5/F6); order → lab queue → result back into consult |
| Billing at counter | ✅ Billing | Auto-charge consult fee on check-in; package/membership discount; GST; receipts |
| Follow-up | ⚠️ | Auto follow-up date + reminder + free follow-up window rule (e.g. 7 days) |
| Patient copy (PDF Rx, bill, reports) | ✅ PDF | WhatsApp/SMS/email delivery, DigiLocker/ABDM push |

## Flow B: IPD (admission → discharge)

```
Admission advice → Pre-auth (if insured) → Deposit → Bed allot → Admission note/consent
 → Daily: rounds, vitals, MAR, I/O, diet, orders, nursing notes → Procedures/OT → Charges accrue daily
 → Discharge order → Clearances (nurse, pharmacy, billing) → Final bill → Settlement/TPA → Discharge summary → Follow-up
```
| Step | Status | Gap / To-do |
|---|---|---|
| Admission with bed | ✅ `POST /ipd/admissions` | Admission source (OPD/ER/Referral), expected LOS, payer type (cash/insurance/corporate/govt scheme), attendant details, MLC flag |
| Pre-authorization | ⚠️ Insurance | Link pre-auth to admission; estimate-vs-actual tracker; enhancement request |
| **Advance deposit** | ❌ | `IpdDeposit` ledger: receive, adjust, refund |
| Bed types & tariff | ⚠️ Bed has type | Room-type tariff master (per-day bed, nursing, RMO, visit charges) + auto daily accrual job |
| Bed transfer | ❌ (F8) | `POST /ipd/admissions/:id/transfer` (ward change, tariff change, history) |
| Doctor rounds & orders | ⚠️ doctor-notes `adminOnly` (F10) | CPOE: diet, lab, radiology, drug, nursing orders; doctor role allowed; order sets/protocols |
| Nursing: vitals/MAR/I-O/wound | ✅ | Barcode/wristband scan for MAR, missed-dose alerts, shift handover note (SBAR) |
| Consents (admission, surgery, anesthesia, blood, high-risk, DAMA) | ⚠️ ConsentRecord | IPD consent templates + e-signature + witness + language |
| Charge capture (lab, rad, pharmacy, OT, procedures) | ❌ F2 | Every order creates `ChargeItem` on admission account; final bill pulls them |
| Discharge | ⚠️ F1,F3,F4 | State machine: `Initiated → DoctorApproved → NursingClear → PharmacyClear → BillingClear → Discharged` |
| Discharge summary | ⚠️ text only | Structured: diagnosis, procedures, course, investigations, condition, medicines, advice, follow-up, red flags; PDF + ABDM |
| Death/DOD, LAMA/DAMA, referral-out | ⚠️ `DOD` enum | Death certificate, mortuary handover, LAMA/DAMA form |
| Final bill + TPA | ⚠️ | Itemised bill, package vs non-package, co-pay, non-payable items, claim file generation |

## Flow C: Emergency

```
Arrival (walk-in/ambulance) → Triage (ESI 1-5) → Resuscitation/stabilize → Doctor → Orders → Disposition (admit/discharge/refer/expire)
```
- ✅ Triage, Emergency, SOS, ambulance dispatch.
- ❌/⚠️: **MLC registration** (police intimation, injury certificate), **ER trauma timeline** (door-to-doctor, golden hour), **Code Blue/Stroke/STEMI** protocols and alerts, **unknown/unidentified patient** quick-register (temp UHID), **ER → IPD one-click admission**, **ER billing at the end** (not before treatment), **ambulance handover note**.

## Flow D: OT (Surgery)

```
Surgery booking → Pre-anaesthesia check (PAC) → Consent → Pre-op checklist → OT scheduling → WHO Safety Checklist
 → Intra-op notes (anaesthesia record, implants, swab count) → Recovery/PACU → Post-op orders → Billing → Sterilisation of instruments
```
- ✅ OperationTheatre model/page, SterilisationLog model.
- ❌: PAC form, WHO surgical safety checklist (sign-in/time-out/sign-out), swab/instrument count, implant register, surgeon/anaesthetist/OT-nurse team + fees split, OT utilization report, CSSD instrument set tracking (see file 06), blood requisition.

## Flow E: Laboratory (LIS)

```
Order → Sample collection (barcode) → Accession → Analyzer/manual result → Validation (tech → pathologist) → Report → Critical alert → Delivery
```
- ✅ LabOrder, LabBooking, sample collection page, report pages.
- ❌/⚠️: **barcode/label print**, **sample rejection reasons + recollect**, **reference ranges by age/sex + auto H/L flags**, **critical value call-back log**, **analyzer interface (ASTM/HL7)**, **TAT tracking**, **QC (Levey-Jennings)**, **outsourced test tracking**, **NABL report format**, **cumulative/trend report**.

## Flow F: Radiology (RIS/PACS)
- ✅ Radiology model/page.
- ❌: modality worklist (DICOM MWL), PACS/DICOM viewer integration (Orthanc / OHIF), structured report templates, radiation dose log, contrast allergy/creatinine checklist, TAT, prior-study compare.

## Flow G: Pharmacy (Hospital + Retail)
- ✅ Pharmacy orders, delivery, returns, inventory with expiry, Rx verification queue.
- ❌/⚠️: **IPD indent → issue → return** (ward-wise), **batch-wise FEFO dispensing**, **narcotic/H1/X register (Schedule drugs)**, **GRN/PO/supplier invoices & purchase return**, **MRP/GST/HSN**, **substitution (generic)**, **stock transfer between stores**, **drug interaction at dispensing**, **cold-chain log**.

## Flow H: Billing → Insurance → Accounts
- ✅ Billing, Insurance model with preAuth/claim lifecycle.
- ❌: cash-counter shift opening/closing & denomination, credit/debit notes, bill cancellation approval, discount authority matrix, package billing, panel/corporate (credit) billing with ageing, TPA desk workflow & document checklist, GST invoices, doctor payout/commission statements, day-book, ledger, expense & vendor payments (see file 05).

## Flow I: Patient journey continuity
Appointment → Rx → Lab → Pharmacy → Follow-up must be one **Episode of Care**.
- Add `Encounter` (visit) entity: `encounterId` links consult, orders, Rx, bills, documents. Every order/charge carries `encounterId` (+ `admissionId` for IPD).
- This single change fixes F1, F2, F5, F6.
