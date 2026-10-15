# Auth & Security — Missing Features & Capabilities

## [SEC-MISSING-01] Automated Field-Level Encryption (AES-256-GCM / CSFLE) for PHI Collections
- **Description**: Highly sensitive clinical notes, mental health therapy records, raw prescription text, patient KYC IDs, and bank account numbers are stored in plaintext in MongoDB Atlas without app-level envelope encryption.
- **Current vs Expected Behavior**:
  - *Current*: MongoDB disk encryption (at rest) is enabled by default in Atlas, but any developer/admin with read access to the cluster, backup dumps, or an internal log snapshot sees plaintext diagnoses, therapy notes, and bank account details.
  - *Expected*: Application-level AES-256-GCM encryption with per-tenant/per-collection Data Encryption Keys (DEKs) wrapped by a Key Encryption Key (KEK) in KMS/Vault.
- **Flow**: Patient consult notes creation, prescription generation, KYC submission, bank account reconciliation.
- **Root Cause / Logic**: Architecture relied on Atlas default encryption-at-rest; application-level CSFLE / field encryption helper was left as a TODO.
- **Affected Files**: `backend/src/models/MentalHealthRecord.js`, `backend/src/models/Prescription.js`, `backend/src/models/BankAccount.js`, `backend/src/models/PatientKyc.js`, `backend/src/utils/fieldEncryption.js`
- **UI/Frontend Impact**: None directly; decrypted transparently before sending authorized DTO to frontend.
- **Security/Data Risk**: **Critical**. If a database backup or developer replica dump is compromised, all patient clinical diagnoses and psychiatric notes are exposed in cleartext.
- **Suggested Fix / Implementation Plan**:
  1. Implement `encryptField(plainText, aad)` and `decryptField(ciphertext, aad)` using Node.js `crypto.createCipheriv('aes-256-gcm', key, iv)`.
  2. Implement blind index (`HMAC-SHA256`) for searchable fields (e.g. hashed phone/accountNo).
  3. Attach Mongoose plugin to encrypt on pre-save and decrypt on find.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Create `backend/src/utils/fieldEncryption.js`.
  - [ ] Add encryption pre-save/post-init hooks to `BankAccount.js` and `MentalHealthRecord.js`.
  - [ ] Add unit test verifying encrypted database rows in memory.

---

## [SEC-MISSING-02] Comprehensive Break-Glass Access Workflow for Emergency Patient History
- **Description**: While a skeleton break-glass service was seeded in Phase 0, clinical routes (EHR, appointments, lab orders, inpatient ICU charts) lack the declarative `@requireBreakGlass` interceptor that allows doctors to access emergency patient data during Code Blue / trauma cases with mandatory justification and real-time audit alerts.
- **Current vs Expected Behavior**:
  - *Current*: If an unconscious trauma patient is rushed to Hospital B, doctors cannot see Hospital A's allergies/history because strict tenant isolation blocks cross-hospital queries, causing medical delays.
  - *Expected*: Emergency physician can invoke "Break-Glass Access" with OTP + mandatory medical reason, granting a 4-hour emergency view of patient vitals and allergies, while triggering SMS/email alerts to the patient and Hospital Compliance Officer.
- **Flow**: Emergency triage, polytrauma admission, ICU transfer.
- **Root Cause / Logic**: Tenant scoping was implemented strictly without an emergency bypass workflow.
- **Affected Files**: `backend/src/services/breakGlassService.js`, `backend/src/middleware/requireBreakGlass.js`, `backend/src/routes/ehr.js`, `backend/src/routes/patients.js`
- **UI/Frontend Impact**: Emergency modal in EHR requiring doctor's credential confirmation and clinical justification before unlocking records.
- **Security/Data Risk**: **High**. Patient safety risk without break-glass; insider snooping risk if break-glass lacks real-time alerting.
- **Suggested Fix / Implementation Plan**:
  1. Wire `requireBreakGlass` middleware into `backend/src/routes/ehr.js`.
  2. Implement emergency event emission via `breakGlassService.js`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Connect `requireBreakGlass` to `/api/ehr/:patientId/emergency`.
  - [ ] Notify patient and compliance officer upon break-glass event.

---

## [SEC-MISSING-03] Global Rate Limiter & Anomaly Probing Detection (Anti-Scraping / Anti-Enumeration)
- **Description**: While per-route rate limiters exist on `/login` and `/book`, there is no global sliding-window rate limiter per tenant or aggregate anomaly detector that flags when a single account requests >500 distinct patient IDs within 5 minutes (bulk scraping / IDOR probing).
- **Current vs Expected Behavior**:
  - *Current*: An authenticated user can iterate through 10,000 appointment/prescription IDs; individual requests return 404 or 403, but no alert is raised and the user IP is not blocked.
  - *Expected*: Anomaly service tracks 403/404 spikes per user/IP in Redis; if threshold (>50 404s/minute) is crossed, session is revoked and IP is banned for 1 hour.
- **Flow**: Continuous background security telemetry across all API routes.
- **Root Cause / Logic**: Lack of aggregate Redis-backed behavioral anomaly tracking.
- **Affected Files**: `backend/src/middleware/rateLimit.js`, `backend/src/services/authAnomalyService.js`, `backend/src/middleware/errorHandler.js`
- **UI/Frontend Impact**: Banned attackers receive 429 Too Many Requests.
- **Security/Data Risk**: **High**. Facilitates brute-force object ID harvesting and stealth reconnaissance.
- **Suggested Fix / Implementation Plan**:
  1. Count 401/403/404 responses per user/IP in Redis sliding window in `errorHandler.js`.
  2. Emit high-priority alert to Slack/Security webhook on threshold breach.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement `recordSecurityProbe(ip, userId, statusCode)` in Redis.
  - [ ] Add automatic temporary lockout on persistent probing.
