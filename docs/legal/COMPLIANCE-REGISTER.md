# Compliance Register (F4)

Source of truth: `regulation → applicability → code evidence → owner → review date`.
Audit runbook (`docs/security/audit-runbook.md` §4) already directs "document drill
elapsed time **in compliance register**" — that table is §2 below. Review cadence:
quarterly, and before every go-live gate. Update this file in the same commit as
any control change.

Status values: `code-ready` (implemented + tested), `partial` (implemented, gaps
noted), `pending-human` (needs lawyer/regulator/advisor input — see
`docs/legal/PLACEHOLDERS-TODO.md`).

## 1. Regulation register

| # | Regulation | Applicability | Code / doc evidence | Status | Owner | Next review |
|---|---|---|---|---|---|---|
| 1 | DPDP Act 2023 + Rules | Data principal rights, consent, retention | `docs/privacy/RETENTION.md`, `docs/privacy/DPIA.md`, DSR clock `backend/src/routes/dsr.js` (`DSR_DEADLINE_MS` = 30 d) + `adminDsr.js` (30 d + once-only +15 d extension), privacy centre `routes/patient.js` (privacy/consents/access-log), `lib/policyAcceptance.js` versioned consent ledger, `retention-gap-baseline.json` (45 collections reviewed) | code-ready (counsel review of notice text pending) | _TBD_ | _TBD_ |
| 2 | IT Rules 2021 (grievance redressal) | Grievance Officer + ack/resolve SLAs in footer/app | `docs/legal/PLACEHOLDERS-TODO.md` (officer name/address + SLA values unfilled) | pending-human | _TBD_ | _TBD_ |
| 3 | ABDM (NHA, Health ID) | Patient consent for health-record linking | `backend/src/models/AbdmConsent.js`, `backend/src/routes/healthId.js` (incl. `/scans` self-scoped receipt route), scan-receipt audit | partial (M1 linkage scope: confirm with ABDM sandbox) | _TBD_ | _TBD_ |
| 4 | NABH (4th ed.) | chapter checklists + assessments | `backend/src/models/QualityChecklist.js`, `routes/quality.js` (POST snapshot immutable, GET history/score, auto/capa) + `routes/qualityChecklists.js`, `lib/qualityScore.js`, `docs/hms-roadmap/` module audit matrix | code-ready (chapter owner assignment pending) | _TBD_ | _TBD_ |
| 5 | BMW (Hazardous Waste) Rules 2016 | bag-wise ABC tracking + authorisation | `backend/src/models/BmwBag.js`, `BmwLog.js`, `routes/bmw.js` (CRUD + expiring), e-waste pages `frontend/src/pages/safety/` | code-ready (site authorisation number: fill in `License`) | _TBD_ | _TBD_ |
| 6 | PCPNDT | pre-conception diagnostics form F + inspections | `backend/src/models/PcpndtFormF.js`, routes in `clinicalAlerts.js` + `quality.js` | partial (offline inspection format: see UAT-12) | _TBD_ | _TBD_ |
| 7 | MTP Act | MTP register entries | `backend/src/models/MtpRegister.js`, routes in `clinicalAlerts.js` / `quality.js` | code-ready | _TBD_ | _TBD_ |
| 8 | NDPS (Schedule H1) | H1 register + gap probe + export | `backend/src/models/H1RegisterEntry.js`, `routes/pharmacy.js` (`/h1-register/export`, gap probe), `frontend/src/pages/pharmacy/H1RegisterPage.tsx`, UAT-06 | code-ready (inspection print format from UAT-12 feedback) | _TBD_ | _TBD_ |
| 9 | Clinical Establishments + AERB/Fire/Lift NOC | facility licences tracked with expiry | `backend/src/models/License.js` + `routes/licenses.js` (expiry monitoring), `routes/facilities.js` | code-ready | _TBD_ | _TBD_ |
| 10 | Telemedicine Guidelines 2020 | e-consent + prescription validity | `backend/src/models/TeleConsent.js`, `routes/doctor.js` (`GET /teleconsult/compliance`, consent create/read, `POST /teleconsult/validate-prescription`) | code-ready | _TBD_ | _TBD_ |
| 11 | GST e-invoicing (IRP) | B2B IRN + signed QR; threshold applicability | `backend/src/services/einvoiceService.js` (E1: sandbox→live, `fetchWithRetry`, 20 s timeout, 24 h cancel window), `.env.example` `EINVOICE_*`, UAT-07 | code-ready (threshold (₹5–10 cr) applicability: CA/advisor confirm) | _TBD_ | _TBD_ |
| 12 | TRAI DLT | registered headers/templates for SMS/WA | `.env.example` `MSG91_TEMPLATE_ID` / DLT note, `services/smsProvider.js` (skip-when-unset) | pending-human (DLT portal registration + template approval) | _TBD_ | _TBD_ |
| 13 | IT Act 2000 §43A / audit trail | tamper-evident audit + break-glass | `docs/security/audit-runbook.md` §2–3, audit hash-chain cron, `AccessReview` campaigns, `break_glass` reports | code-ready | _TBD_ | _TBD_ |

## 2. Drill & assurance log

Record every run here. This is the table `audit-runbook.md` §4 refers to.

| Control | Procedure (doc / command) | Frequency | Last run | Result | Sign-off |
|---|---|---|---|---|---|
| Restore drill (RTO ≤ 60 min, RPO ≤ 15 min) | `infra/backup/restore-drill.sh` via `docker compose --profile backup run --rm backup-drill` (INF-B-04, procedure `docs/security/audit-runbook.md` §4) | quarterly + after every schema migration | _never_ | _pending_ | _TBD_ |
| Secret rotation | `infra/backup/verify-secret-rotation.sh` (INF-B-05; JWT first = sessions revoke → maintenance window) | 90 days + on suspected exposure | _never_ | _pending_ | _TBD_ |
| Server read-only downtime drill | `docs/go-live/runbooks/downtime-drill.md` | quarterly + pre-go-live | _never_ | _pending_ | _TBD_ |
| Offline/physical contingency drill | `docs/security/audit-runbook.md` §5 (SW offline mode, triplicate forms, MRD backdated catch-up) | semi-annual | _never_ | _pending_ | _TBD_ |
| OWASP ZAP baseline | `ZAP/baseline-report.md` (rerun on staging URL per audit-runbook §1) | every release | 2026-10-12 | _review findings_ | _TBD_ |
| Secret scan (gitleaks) | `.github/workflows/security-scan.yml` (full history) | every push (CI) | 2026-10-13 | pass (commit hook + CI) | automated |
| SAST / container scan | semgrep + Trivy in `security-scan.yml` | every push (CI) | 2026-10-13 | pass | automated |
| Dependency vulns | `check-vuln-regression.mjs` + `npm audit --omit=dev` (0 vulns) | every push (CI) | 2026-10-13 | pass | automated |
| Authz gap gate | `npm run authz:coverage` (baseline 1718, unclassified 0) | every push (CI) | 2026-10-13 | pass | automated |
| Access review campaign | `AccessReview` (audit-runbook §2) | quarterly | _TBD_ | _TBD_ | _TBD_ |
| Break-glass report review | audit-runbook §3 | weekly | _TBD_ | _TBD_ | _TBD_ |

## 3. Pending human sign-offs (cannot be closed in code)

Tracked verbatim from `docs/legal/PLACEHOLDERS-TODO.md` + go-live plan F4:

- [ ] Lawyer review: ToS, Privacy, Provider Agreement, Refund, Grievance policies
- [ ] Company/grievance-officer/DPO particulars filled (PLACEHOLDERS-TODO)
- [ ] GST e-invoice turnover applicability (CA)
- [ ] DLT template approvals (TRAI) + WhatsApp Business template approval
- [ ] Payment gateway live credentials + webhook URLs registered (E3)
- [ ] Pentest report (R1 public launch; rerun before R4 categories)
- [ ] NABH chapter owners assigned; BMW site authorisation number issued
- [ ] UAT: 12 departmental sign-off sheets executed (`docs/uat/`)
- [ ] Restore drill first run (§2 above) → record RTO actual here
