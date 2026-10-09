# 07. Compliance, Interoperability & Security (India-focused)

> Ye technical checklist hai, legal advice nahi. Final compliance ke liye apne legal/compliance advisor se confirm karo.

## 7.1 ABDM (Ayushman Bharat Digital Mission) (P1)
- ABHA number create/verify (Aadhaar OTP / mobile OTP), ABHA address, link to UHID. [VERIFY] repo me `abha|abdm` ke 13 file-hits aaye hain; shayad sirf fields hain, real gateway integration confirm karo.
- Health Information Provider (HIP) + Health Information User (HIU): consent manager flow, care-context linking, push discharge summary/prescription/lab report/OP consult as FHIR bundles.
- Scan & Share (QR registration at OPD counter).
- Health Facility Registry (HFR) ID, Healthcare Professional Registry (HPR) ID for doctors.
- Sandbox → production milestones (M1, M2, M3).

## 7.2 FHIR / HL7 / DICOM (P1)
- FHIR R4 resources: Patient, Practitioner, Organization, Encounter, Condition, Observation, DiagnosticReport, MedicationRequest, AllergyIntolerance, Procedure, DocumentReference, Coverage, Claim.
- Mapping layer `fhirMapper/` (model → FHIR), REST `/fhir/*` read endpoints with scopes (`ApiKey` + `integrations.js` exist).
- HL7 v2 (ADT/ORM/ORU) for analyzers/legacy systems; ASTM for lab analyzers; DICOM MWL/C-STORE to PACS (Orthanc).
- Terminology: ICD-10, SNOMED CT, LOINC (lab), RxNorm/CDSCO drug codes.

## 7.3 NABH / NABL / JCI readiness (P1)
- NABH chapter-wise checklists (AAC, COP, MOM, PRE, HIC, PSQ, ROM, FMS, HRM, IMS) as tasks with evidence upload; `QualityChecklist` model exists, extend with chapter/standard mapping, owner, due date, evidence, internal audit scheduling, CAPA.
- Mandatory registers: incident, near-miss, sentinel, medication error, fall, HAI, needle-stick, ADR (pharmacovigilance PvPI reporting), transfusion reaction, restraint, death review, mortality & morbidity meeting.
- KPIs auto-computed (NABH quality indicators): door-to-needle time, TAT of reports, readmission within 30 days, surgical site infection rate, hand hygiene compliance, patient fall rate, etc.
- Document control: SOP/policy versioning, read-and-acknowledge by staff.

## 7.4 Statutory / Legal registers (P0/P1)
| Requirement | What to build |
|---|---|
| **MLC (Medico-Legal Case)** | MLC flag at ER/OPD/IPD, MLC number, police intimation log, injury report, custody of clothing/evidence, doctor statement, restricted-edit record, tamper-proof |
| **Birth & Death registration** | Forms with ICD cause-of-death, auto-report to registrar (CRS), certificate print |
| **PCPNDT (Form F)** | Mandatory for USG centres: Form F register, sex-determination prohibition banner, retention |
| **MTP Act** | MTP consent, opinion of RMPs, register (confidential) |
| **NDPS / Schedule H, H1, X drugs** | Pharmacy registers (H1 register, narcotic register), prescription retention, e-prescription restrictions |
| **Clinical Establishments Act** | Rate display, patient rights charter (PatientRights page exists), registration renewal tracking |
| **Biomedical Waste Rules 2016** | See file 06 §6.5 |
| **AERB** | Radiology equipment licence, TLD badge dose records for staff |
| **Fire / Electrical / Lift / Pollution NOC** | `License` tracker with expiry alerts |
| **Consumer Protection / grievance** | GrievanceRedressal page exists; add SLA and officer assignment |

## 7.5 Data protection (DPDP Act 2023) (P0)
Exists: ConsentRecord, PolicyAcceptance, DataSubjectRequest, DeletionRequest, PrivacyCentre, breakGlass, AuditLog.
Add / confirm:
- Purpose-wise consent with withdrawal; minors (guardian consent); consent for ABDM sharing separately.
- Data-principal rights: access, correction, erasure, grievance, nominee; SLA timers (`adminDsr.js` exists).
- Data retention policy per record type (medical records typically retained per law/hospital policy; configure, don't hardcode), legal-hold flag blocks deletion.
- Breach register + 72h-style notification workflow (DPO role exists).
- Cross-border/processors register, DPA tracking.
- PHI minimisation in logs/exports; masked views for non-clinical roles.

## 7.6 Security hardening (P0)
- RBAC + ABAC (hospital/facility/department scope). `authz-manifest.json` + `ROLE_PERMISSIONS` exist: add automated test that **every route has an authorization policy** (the repo seems to attempt this: `assertRoleMatrixComplete`).
- **Break-glass** with reason + auto-review within 24h (exists, add dashboard).
- Audit log immutability (hash-chain / WORM store), log every PHI read (not only write), export-audit.
- 2FA mandatory for admin/clinical privileged roles (already for ops roles); device/session management, IP allow-list for admin, idle timeout (auto-logout 15 min on shared nursing PCs), password policy, account lockout.
- Encryption: TLS everywhere, field-level encryption for Aadhaar/ID numbers, KMS-managed keys, encrypted backups, S3 SSE for documents, signed URLs with expiry.
- Secrets: gitleaks (already `.gitleaks.toml`), rotate any key ever committed; check `.env` not in repo.
- Rate limiting + OTP abuse protection, CAPTCHA on public forms, WAF.
- Backups: PITR for Mongo, restore drill quarterly, RPO/RTO documented; **downtime procedure** (read-only emergency mode: offline-printable census, MAR sheets).
- Pen-test + dependency scanning (npm audit, Dependabot, SAST), SBOM.
- Observability: structured logs, traces, alerts (infra folder has some).

## 7.7 Interoperability with devices (P2)
- Bedside monitor/vitals device feed (HL7/MQTT), infusion pump, barcode wristband scanner, label printers (ZPL), thermal receipt printers (ESC/POS), biometric devices, token display, SMS/WhatsApp providers, payment POS, tele-radiology.

## 7.8 Reliability / DR (P1)
- Multi-AZ, health checks, graceful degradation (dashboard tile failure ≠ page failure), idempotent payment webhooks, outbox pattern (`OutboxEvent` exists), job queue retries, DLQ, runbooks.
