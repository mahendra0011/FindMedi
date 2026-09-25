# 26 - ABHA National Health ID & ABDM Electronic Health Record Consent Specification

## 1. Architectural Mandate
FindMedi is architected for full compliance with the **Ayushman Bharat Digital Mission (ABDM)** (`healthId.js`, `Patient.js`, `records.js`).
Every Indian citizen on the platform can create or link their 14-digit **ABHA (Ayushman Bharat Health Account)** number via Aadhaar/Mobile OTP to securely exchange medical records across hospitals, clinics, and diagnostic labs nationwide.

---

## 2. ABDM Milestone Architecture Flow

```
   [ PATIENT APPLICANT ]                                   [ ABDM GATEWAY / NHA ]
            │                                                         │
 1. Enter 12-Digit Aadhaar / Mobile                                   │
            │                                                         │
            ▼ (POST /api/v1/health-id/generate-otp)                   │
   [ FindMedi ABDM Gateway Service ] ────────────────────────────────►│
            │                                                         │
            │◄──────────────── Inbound OTP Transmitted ───────────────┤
            │                                                         │
 2. Patient Inputs 6-digit Aadhaar OTP                                │
            │                                                         │
            ▼ (POST /api/v1/health-id/verify-otp)                     │
   [ FindMedi ABDM Gateway Service ] ────────────────────────────────►│
            │                                                         │
            │◄─── Verified KYC: ABHA Number & ABHA Address (@abdm) ───┤
            │                                                         │
 3. Link ABHA Profile with FindMedi `User.js` & `Patient.js`          │
 4. Generate Digital ABHA Health Card (PNG / PDF with QR)             │
```

---

## 3. Electronic Health Record (EHR) Consent Manager Protocol
ABDM prohibits sharing a patient's medical records without explicit, revocable cryptographic consent.

### Consent Workflow:
1. **Consent Request**: A consulting doctor requests access to past 6 months of lab reports.
2. **Push Notification to Patient**: Patient receives an in-app consent prompt specifying:
   - Data Types: Diagnostic Lab Reports, Prescriptions.
   - Purpose of Care: General Consultation.
   - Validity Window: 24 hours.
3. **Cryptographic Grant**: Upon patient approval, FindMedi's Health Information Provider (HIP) node encrypts and streams the records to the Health Information User (HIU) doctor using ephemeral ECDH key pairs.

---

## 4. Golden Security Guardrails
- **Zero Plaintext Aadhaar Storage**: Aadhaar numbers are never stored in MongoDB. Only the 14-digit ABHA ID and a SHA-256 hashed token are retained.
- **Revocable Access**: Patients can revoke consent at any moment via the Patient Privacy Settings screen.
