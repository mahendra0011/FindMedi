# 08. Roles & Permissions Matrix

## 8.1 Roles jo already enum me hain (VERIFIED)
superadmin, hospital_admin, doctor, clinic_doctor, patient, lab_owner, lab_receptionist, lab_technician, pathologist, pharmacy_owner, pharmacist, nurse, radiologist, dietitian, physiotherapist, counsellor, psychiatrist, accountant, security, technician, helper, delivery_boy, rider, assistant, lawyer, ambulance, dentist, optician, phlebotomist, blood_bank_admin, dialysis_admin, fertility_admin, maternity_admin, rehab_admin, tpa_agent, medical_reviewer, kyc_reviewer, moderator, support_agent, finance_admin, catalog_manager, compliance_officer, content_editor, city_manager, platform_admin, support_l1/l2, dpo, security_admin, clinical_safety, analyst, auditor ...

## 8.2 Roles jo ADD karne chahiye (hospital operations ke liye) [NEW]
| Role | Kaam | Landing page |
|---|---|---|
| `receptionist` / `front_desk` | registration, appointments, token, billing counter (OPD), visitor pass | /frontdesk |
| `billing_executive` | IPD/OPD billing, interim bill, deposits, discharge billing | /billing/desk |
| `cashier` | cash counter shift, receipts, refunds (limit) | /billing/counter |
| `insurance_desk` (TPA coordinator) | pre-auth, claims (tpa_agent hai; hospital-side role alag) | /insurance/desk |
| `medical_director` / `cmo` | clinical KPIs, approvals, M&M reviews | /director |
| `nursing_supervisor` / `matron` | ward staffing, roster, incident review | /nursing/supervisor |
| `ward_nurse`, `icu_nurse`, `ot_nurse` (nurse ke sub-roles) | scoped ward/ICU/OT | module-wise |
| `anaesthetist`, `surgeon` (doctor specialty flags) | OT lists, PAC, op notes | /ot |
| `ot_technician`, `cssd_technician` | OT setup, sterilisation | /ot, /cssd |
| `store_keeper` / `purchase_officer` | inventory, GRN, PO | /inventory |
| `hr_manager` | roster, payroll, credentials | /hr |
| `biomedical_engineer`, `maintenance` | assets, PM, tickets | /assets |
| `housekeeping_supervisor`, `ward_boy` | bed cleaning tasks, patient transport | /housekeeping |
| `dietician_head`, `kitchen_staff` | diet production | /diet |
| `mortuary_attendant` | mortuary | /mortuary |
| `medical_records_officer` (MRD) | file/record retrieval, coding (ICD), certificates, DSR support | /mrd |
| `quality_officer` | NABH, incidents, audits | /quality |
| `infection_control_nurse` | HAI surveillance | /infection-control |
| `pharmacovigilance_officer` | ADR reporting | /pv |
| `call_center_agent` | bookings/enquiry | /callcenter |

## 8.3 Permission matrix (core modules)
Legend: C=create, R=read, U=update, D=delete/cancel, A=approve, X=export, — = none, (own)=only own/assigned, (dept)=department scoped

| Module | Hospital Admin | Doctor | Nurse | Receptionist | Billing | Pharmacist | Lab Tech | Radiologist | Accountant | Store | HR |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Patient demographics | CRUA | R | R | CRU | R | R | R | R | R | — | — |
| Clinical notes (EMR) | R(audit) | CRU(own) | CRU(nursing) | — | — | R(limited) | R(limited) | R(limited) | — | — | — |
| Appointments/Token | CRUDA | RU(own) | R | CRUD | R | — | — | — | — | — | — |
| Prescriptions | R | CRU(own) | R | — | — | R,Verify | — | — | — | — | — |
| Lab orders/results | R | C,R(review) | C(basic),R | — | R | — | CRU,Validate | — | — | — | — |
| Radiology | R | C,R | R | — | R | — | — | CRU | — | — | — |
| IPD admission/discharge | CRUA | C,Approve discharge | RU | C(admit desk) | Clear-billing | Clear-pharmacy | — | — | — | — | — |
| MAR / vitals | R | R | CRU | — | — | — | — | — | — | — | — |
| OT scheduling | A | C,R | CRU(ot nurse) | — | R | — | — | — | — | consumables | — |
| Billing/Invoice | R,A(discount) | R | — | C(OPD) | CRUD | C(pharmacy) | — | — | R,X | — | — |
| Refund/discount approval | A | — | — | — | request | — | — | — | A(by limit) | — | — |
| Insurance/TPA | R | R | — | — | CRU | — | — | — | R | — | — |
| Inventory/PO | A | — | request | — | — | request | request | — | R | CRUD | — |
| Staff/Roster/Payroll | A | R(own) | R(own) | — | — | — | — | — | R | — | CRUD |
| Reports/Analytics | R,X | R(own) | R(dept) | R(basic) | R | R | R | R | R,X | R | R |
| Audit logs | R | — | — | — | — | — | — | — | — | — | — |
| Break-glass | request | request | — | — | — | — | — | — | — | — | — |

## 8.4 Rules
1. **Least privilege + scope**: har permission `(hospitalId, facilityId, departmentId)` scoped.
2. **Segregation of duties**: jo bill banata hai wo discount approve nahi karega; jo PO banata hai wo GRN approve nahi karega; refund request ≠ refund approve.
3. **Doctor sees only treating patients** by default; others via break-glass/referral/consult-request.
4. **Admin ≠ clinician**: hospital_admin ko clinical notes read-only + audited (IPD `doctor-notes adminOnly` ko fix karo: `clinician` role-set ya `doctor` allow karo).
5. Sensitive categories (HIV, psychiatry, MTP, abuse): extra consent flag, restricted view.
6. Role changes audited, quarterly access review (`AccessReview` model exists: schedule it).
7. Add test: **permission matrix snapshot test** (this table → automated test).
