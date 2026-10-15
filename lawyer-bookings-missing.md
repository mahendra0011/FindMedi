# Lawyer Bookings — Missing Features & Capabilities

## [LAW-MISSING-01] Bar Council of India (BCI) Digital Verification & Non-Solicitation Guardrails
- **Description**: Under BCI Rule 36 (Standards of Professional Conduct and Etiquette), advocates in India are strictly prohibited from advertising or directly soliciting legal work. While `lawyers.js` has profiles, it lacks automated State Bar Council enrollment number validation and automated non-solicitation disclaimer enforcement.
- **Current vs Expected Behavior**:
  - *Current*: A lawyer profile can be registered and activated with an unverified state enrollment number string (e.g., "MP/1234/2015").
  - *Expected*: 
    1. Automated or manual two-tier review verification against State Bar Council rolls.
    2. Mandatory BCI compliance waiver checkbox before a user can browse legal profiles.
    3. Prohibition of "Ranked #1 Lawyer" or promotional discounts on legal consultation fees.
- **Flow**: Lawyer onboarding, profile discovery, consultation booking.
- **Root Cause / Logic**: Platform treats lawyers using generic provider schemas rather than statutory legal profession requirements.
- **Affected Files**: `backend/src/models/LawyerProfile.js`, `backend/src/routes/lawyers.js`, `backend/src/routes/adminLawyers.js`
- **UI/Frontend Impact**: Mandatory BCI Rule 36 disclaimer modal before entering the legal assistance section.
- **Security/Data Risk**: **Medium**. Legal liability under Advocates Act 1961 and risk of disciplinary proceedings against participating advocates.
- **Suggested Fix / Implementation Plan**:
  1. Add `bciEnrollmentVerified: { type: Boolean, default: false }` to `LawyerProfile.js`.
  2. Block search listing visibility if unverified.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add BCI verification status in LawyerProfile.
  - [ ] Add statutory BCI disclaimer modal in frontend legal pages.

---

## [LAW-MISSING-02] End-to-End Encrypted Document Vault for Medico-Legal Case Files
- **Description**: Legal consultation attachments (medical negligence claim notices, autopsy reports, hospital records) are uploaded via standard Cloudinary storage without client-side or envelope zero-knowledge encryption.
- **Current vs Expected Behavior**:
  - *Current*: Files uploaded to Cloudinary private folders are decrypted on Cloudinary servers using global platform keys.
  - *Expected*: High-security medico-legal documents must be client-encrypted or envelope-encrypted with a key held only by the lawyer and patient, ensuring platform engineers cannot view legal strategy files.
- **Flow**: Case document upload and discovery exchange.
- **Root Cause / Logic**: Shared document storage pipeline without specialized legal vault isolation.
- **Affected Files**: `backend/src/routes/lawyerBookings.js`, `backend/src/services/chatUploadService.js`
- **UI/Frontend Impact**: Legal document upload displays a "Secured with Medico-Legal Privileged Vault" badge.
- **Security/Data Risk**: **High**. Exposure of confidential evidence before trial.
- **Suggested Fix / Implementation Plan**:
  1. Implement per-case AES-256-GCM envelope encryption for legal files.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Design legal document encryption pipeline.
