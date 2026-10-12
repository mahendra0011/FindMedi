# Findmedi Security & Audit Runbook (F3)

This runbook specifies operational security validation, audit routines, backup recovery drills, and disaster recovery procedures prior to production cutover.

---

## 1. Automated Security Scanning: OWASP ZAP Baseline Scan

ZAP baseline scanning must be executed against staging before any production release.

### Execution Command (Docker)

```bash
# Ensure target staging server is running and accessible
docker run --rm -v $(pwd)/ZAP:/zap/wrk/:rw \
  -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging.findmedi.internal \
  -r baseline-report.html \
  -w baseline-report.md \
  -m 5 \
  -I
```

### Scan Triage & SLA Policy
- **High / Critical Alerts:** Release blockers. Must be mitigated or remediated before cutover approval.
- **Medium Alerts:** Remediation required within 72 hours; requires security officer sign-off for temporary waiver.
- **Low / Informational:** Backlog items addressed in standard sprint cycle.

Results are archived in `ZAP/baseline-report.md`.

---

## 2. Access Control & Authorization Auditing

### Role Matrix Verification
The canonical role matrix snapshot test asserts that no route authorization regressions occur:

```bash
cd backend
npm test test/security/roleMatrixSnapshot.spec.js
npm run authz:coverage
```
Exit Gate: `0 unclassified` routes across the entire API manifest.

### AccessReview Campaigns
- **Frequency:** Monthly for privileged roles (`hospital_admin`, `superadmin`, `pharmacy_manager`, `billing_head`), quarterly for all clinical staff.
- **Procedure:**
  1. Department heads review active user lists and assigned roles in `/settings/team`.
  2. Dormant accounts (>45 days of inactivity) are suspended automatically.
  3. Sign-off logged to `AccessReview` collection with cryptographic signature.

---

## 3. Break-Glass Emergency Access & Audit Chain

### Break-Glass Weekly Audit
- When an attending physician or clinical supervisor invokes break-glass access (e.g., overriding consent during emergency resuscitation), an immutable `AuditLog` entry is generated.
- Every Monday at 08:00 IST, security ops reviews all break-glass events from the preceding 7 days:
  - Validates corresponding patient encounter / emergency admission ID.
  - Flags any unlinked break-glass access for administrative inquiry.

### Audit Hash-Chain Verification
The audit log records each event with SHA-256 hash chaining (`prevHash` -> `hash`):

```bash
cd backend
node scripts/verify-audit-chain.mjs
```
Expected result: `100% hash chain integrity verified`. Any broken links indicate tampering and immediately trigger Incident Severity 1.

---

## 4. Database Point-In-Time Recovery (PITR) Drill

### Recovery Targets
- **RPO (Recovery Point Objective):** $\le 15$ minutes.
- **RTO (Recovery Time Objective):** $\le 60$ minutes.

### Backup Strategy
- Full daily snapshot via MongoDB Atlas / `mongodump` archive with oplog.
- Continuous oplog archival to immutable cloud object storage (S3 with Object Lock / versioning enabled).

### Quarterly Restore Drill Procedure
1. Provision isolated staging database instance.
2. Download latest full dump and replay oplog up to target test timestamp:
   ```bash
   mongorestore --archive=backup-latest.archive --gzip --oplogReplay --oplogLimit="<target_timestamp>"
   ```
3. Run post-restore sanity checks:
   - Patient count parity check.
   - Latest completed bill verification.
   - Hash chain validation on restored `AuditLog` records.
4. Record elapsed time and the result in the drill & assurance log (`docs/legal/COMPLIANCE-REGISTER.md` §2).

---

## 5. Offline Downtime Mode & Contingency Drill

In case of prolonged network or cloud infrastructure failure:

1. **Client-Side Fallback:**
   - Web application switches to Service Worker offline mode (`OfflineIndicator` banner activates).
   - Critical read-only formulary and patient roster cache remains available.
2. **Server-Side Read-Only Mode:** the platform-side half of this drill —
   toggling `downtime.readOnly` and verifying 503s/reads/allowlist — has its own
   procedure in `docs/go-live/runbooks/downtime-drill.md`; record the result in
   `docs/legal/COMPLIANCE-REGISTER.md` §2.
3. **Physical Triplicate Forms:**
   - Pre-printed stationery kept in clinical emergency lockers:
     - OPD Token & Prescription triplicate sheets.
     - IPD Admission & Bed Allocation intake vouchers.
     - Surgical Safety Checklist & Consent slips.
     - Emergency MLC registry logbooks.
4. **Reconnection & Catch-Up Reconciliation:**
   - When network connectivity is restored, records entered manually are transcribed by Medical Records Department (MRD) with `backdated: true` flag and original physical timestamp.
