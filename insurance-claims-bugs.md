# Insurance & Claims — Bugs

## [INS-BUG-01] Mass Assignment on Insurance Policy Creation Bypassing Verification
- **Description**: In `backend/src/routes/patientInsurancePolicies.js` line 43, `InsurancePolicy.create({ ...req.body, patientId: actorId(req) })` spreads user-provided body parameters directly into the database.
- **Current vs Expected Behavior**:
  - *Current*: An attacker can send `{ verified: true, sumInsured: 10000000, claimLimit: 10000000, status: 'active' }`, creating a self-verified multimillion-rupee insurance policy that can immediately be used for cashless hospital admission requests.
  - *Expected*: Only policy number, insurer ID, TPA name, policyholder name, and relationship may be supplied by the patient. `verified` must be `false` by default, and `sumInsured`/`claimLimit` must only be set by authorized Hospital TPA desk staff or automated insurer webhook.
- **Flow**: Patient adding an insurance card to their health profile.
- **Root Cause / Logic**: Missing Zod schema validation restricting writable fields on patient policy registration.
- **Affected Files**: `backend/src/routes/patientInsurancePolicies.js:40-60`
- **UI/Frontend Impact**: None directly, but creates severe risk of fraudulent cashless admission authorizations.
- **Security/Data Risk**: **High**. Financial fraud vulnerability. Patients can fabricate coverage limits and bypass TPA desk verification.
- **Steps to Reproduce**:
  1. Authenticate as a normal patient.
  2. Send `POST /api/patient-insurance-policies` with `{ policyNumber: 'POL-1', verified: true, sumInsured: 5000000 }`.
  3. Database shows `verified: true`.
- **Suggested Fix / Implementation Plan**:
  1. Define `createPatientPolicySchema` omitting `verified`, `sumInsured`, `claimLimit`, and `approvedAmount`.
  2. Force `verified: false` and `status: 'pending_verification'` in controller.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Add strict validation schema in `patientInsurancePolicies.js`.
  - [x] Enforce `verified: false` default at schema level.

---

## [INS-BUG-02] Cross-Tenant Cashless Claim Status Tampering
- **Description**: In `backend/src/routes/insurance.js` claim review routes, certain claim update operations query `Claim.findById(req.params.id)` without checking whether the reviewer belongs to the hospital or TPA handling that specific claim.
- **Current vs Expected Behavior**:
  - *Current*: A hospital TPA staff member from Hospital A can approve or reject pre-authorization claims belonging to Hospital B by sending requests with Hospital B's claim ID.
  - *Expected*: TPA desk operations must enforce `claim.hospitalId === req.user.hospitalId` (or matching TPA tenant grant).
- **Flow**: TPA desk submitting cashless hospitalization claims and pre-authorization forms.
- **Root Cause / Logic**: Missing `authorizeObject` or tenant check on `PUT /api/insurance/claims/:id/status`.
- **Affected Files**: `backend/src/routes/insurance.js`, `backend/src/routes/tpa.js`
- **UI/Frontend Impact**: None directly.
- **Security/Data Risk**: **High**. Cross-tenant claim tampering, unauthorized approvals, and financial disputes between hospitals.
- **Steps to Reproduce**:
  1. Log in as TPA coordinator of Hospital 1.
  2. Send `PUT /api/insurance/claims/:claimIdOfHospital2/status` with `{ status: 'approved' }`.
  3. Status updates successfully without 403 error.
- **Suggested Fix / Implementation Plan**:
  1. Add tenant scoping to claim lookup: `Claim.findOne({ _id: req.params.id, hospitalId: req.user.hospitalId })`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [x] Add tenant verification on insurance claim updates.
  - [x] Write integration test verifying cross-tenant claim rejection.
