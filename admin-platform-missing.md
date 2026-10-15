# Admin & Platform Governance — Missing Features & Capabilities

## [ADMIN-MISSING-01] Immutable WORM (Write Once Read Many) Audit Vault for Forensics
- **Description**: While `AuditLog.js` captures administrative actions, the audit logs live in the primary MongoDB cluster where any DBA or superadmin with cluster credentials could theoretically alter or drop the `auditlogs` collection to erase evidence of unauthorized access.
- **Current vs Expected Behavior**:
  - *Current*: Audit logs stored as standard mutable Mongoose documents in MongoDB Atlas.
  - *Expected*: Statutory compliance (CERT-In Direction 2022 & HIPAA Security Rule §164.312(b)) mandates append-only, tamper-evident audit logs:
    1. Cryptographic hash chaining (`prevLogHash` linked to `currentLogHash` forming a Merkle chain).
    2. Streaming replication of audit events to an S3 Object Lock (WORM compliance mode) or external immutable log sink (e.g. AWS CloudWatch / Azure Immutable Blob).
- **Flow**: Forensic investigation following an unauthorized PHI access incident or insider breach.
- **Root Cause / Logic**: Initial audit logging was implemented for application tracking rather than regulatory cryptographic tamper-resistance.
- **Affected Files**: `backend/src/models/AuditLog.js`, `backend/src/middleware/audit.js`, `infra/backup/`
- **UI/Frontend Impact**: Audit log viewer shows "Cryptographically Verified" integrity badge next to log records.
- **Security/Data Risk**: **High**. Internal rogue administrators can tamper with logs to conceal data exfiltration before an external forensic audit.
- **Suggested Fix / Implementation Plan**:
  1. Add `hash: { type: String }` and `prevHash: { type: String }` to `AuditLog.js`.
  2. Compute SHA-256 hash chain on pre-save.
  3. Stream logs via Kafka to an append-only external bucket.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement Merkle hash chain in `AuditLog.js`.
  - [ ] Configure immutable S3 Object Lock export script.

---

## [ADMIN-MISSING-02] Decoy Honeytoken & Canary Patient Records (Insider Snooping Detection)
- **Description**: Healthcare systems face severe risk of insider snooping (receptionists, nurses, or technicians browsing celebrity/VIP medical records or bulk downloading patient charts). FindMedi has no decoy "canary" patient records that silently trigger immediate high-priority alerts when accessed.
- **Current vs Expected Behavior**:
  - *Current*: If a rogue staff member browses arbitrary patient records, only standard access logs are written.
  - *Expected*: Seeded canary patient records (e.g. VIP test profiles):
    1. Clearly identifiable internally via hidden canary tag.
    2. Any query (`GET /api/patients/:canaryId`, `GET /api/appointments?patientId=:canaryId`) immediately alerts the Security Operations Center (SOC) with the employee's name, role, IP, and timestamp.
    3. Revokes staff session if repeated.
- **Flow**: Insider threat detection and unauthorized medical chart snooping.
- **Root Cause / Logic**: Advanced intrusion detection mechanisms were not included in basic RBAC.
- **Affected Files**: `backend/src/services/authAnomalyService.js`, `backend/src/routes/patients.js`, `backend/src/models/Patient.js`
- **UI/Frontend Impact**: None (canary profiles look like regular profiles to intruders).
- **Security/Data Risk**: **High**. Inability to detect stealth insider reconnaissance before mass patient data leaks.
- **Suggested Fix / Implementation Plan**:
  1. Add `isCanary: { type: Boolean, default: false }` to `Patient.js`.
  2. In `patients.js` and `appointments.js`, check `isCanary`; emit critical Slack/Email alert if accessed.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add canary flag on Patient model.
  - [ ] Add canary alert interceptor in patient controller.
