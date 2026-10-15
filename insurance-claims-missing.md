# Insurance & Claims — Missing Features & Capabilities

## [INS-MISSING-01] National Health Claims Exchange (NHCX) ABDM Integration
- **Description**: National Health Authority (NHA) in India mandates integration with the National Health Claims Exchange (NHCX) under the Ayushman Bharat Digital Mission (ABDM) for standardized digital cashless health insurance processing. FindMedi currently only supports manual TPA document uploads and email-based pre-auth PDFs.
- **Current vs Expected Behavior**:
  - *Current*: Hospital TPA desk fills PDF forms, prints them, scans them, and emails them to insurers.
  - *Expected*: Direct FHIR-compliant digital claim packet submission to NHCX gateway:
    1. Pre-authorization request (FHIR Claim resource).
    2. Real-time insurer adjudication polling or webhook callback.
    3. Final discharge claim settlement with digital signature.
- **Flow**: Cashless patient admission, intra-stay query resolution, discharge claim clearance.
- **Root Cause / Logic**: Platform TPA workflow was designed before NHCX FHIR specifications were standardized.
- **Affected Files**: `backend/src/models/Claim.js`, `backend/src/routes/insurance.js`, `backend/src/services/nhcxGateway.js`
- **UI/Frontend Impact**: TPA dashboard shows real-time NHCX status badge ("Submitted to NHCX", "Adjudication in Progress", "Settled via NHCX").
- **Security/Data Risk**: **Medium**. Manual document circulation via email increases PHI exposure compared to end-to-end encrypted NHCX rails.
- **Suggested Fix / Implementation Plan**:
  1. Add NHCX client gateway in `backend/src/services/nhcxGateway.js`.
  2. Implement FHIR Claim resource transformer for FindMedi billing items.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement NHCX FHIR Claim transformer.
  - [ ] Add NHCX webhook listener for automated claim adjudication updates.

---

## [INS-MISSING-02] Patient Deductible & Co-Pay Real-Time Split Calculation
- **Description**: Many corporate and retail health insurance policies in India have mandatory co-pay (e.g. 10% or 20% senior citizen co-pay) or room-rent capping with proportionate deductions. FindMedi's billing module does not calculate the patient co-pay portion automatically when processing insurance bills.
- **Current vs Expected Behavior**:
  - *Current*: Entire billed amount is passed to insurance, or manual arithmetic is performed by the billing clerk, leading to reconciliation errors on discharge.
  - *Expected*: Billing engine automatically computes:
    1. Insurance covered amount.
    2. Patient out-of-pocket co-pay / deductible.
    3. Disallowed consumables (non-payable items per IRDAI list).
    4. Generates two split invoices (one for insurer TPA, one for patient settlement).
- **Flow**: Inpatient billing and discharge summary settlement.
- **Root Cause / Logic**: Billing and insurance modules operated on separate ledgers without a unified copay allocation engine.
- **Affected Files**: `backend/src/routes/billing.js`, `backend/src/models/Billing.js`, `backend/src/services/pricingService.js`
- **UI/Frontend Impact**: Discharge bill preview clearly distinguishes "TPA Payable" vs "Patient Due".
- **Security/Data Risk**: **Low**. Disputed billing amounts and patient dissatisfaction at checkout.
- **Suggested Fix / Implementation Plan**:
  1. Add `coPayPercentage` and `nonMedicalDeduction` fields to `Billing.js`.
  2. Implement split invoice generation in `billPdfService.js`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add copay allocation logic in `billing.js`.
  - [ ] Update bill PDF to display IRDAI non-payable deductions clearly.
