# Pharmacy & Lab — Bugs

## [PHARM-LAB-BUG-01] Cross-Tenant IDOR Vulnerability in ASTM & HL7 Machine Result Ingestion
- **Description**: In `backend/src/routes/lab.js` lines 824-826 and 1476, automated analyzer ingestion queries `LabOrder.findOne({ orderId })` or `LabOrder.findOne({ accessionNo: r.sampleId })` without scoping to `req.user.hospitalId` or `req.serviceAccount.tenantId`.
- **Current vs Expected Behavior**:
  - *Current*: When a machine or lab operator uploads ASTM/HL7 frames, sample IDs like "1001" or order IDs like "ORD-001" match ANY hospital's lab order across the entire database and overwrite results.
  - *Expected*: Ingestion queries must strictly scope by the authenticated facility/hospital: `LabOrder.findOne({ orderId: obr.orderId, hospitalId: req.user.hospitalId || req.serviceAccount.tenantId })`.
- **Flow**: Automated Biochemistry / Hematology analyzer result sync into LIS.
- **Root Cause / Logic**: Assuming `orderId` or `sampleId` is globally unique across all independent hospitals on the multi-tenant SaaS platform.
- **Affected Files**: `backend/src/routes/lab.js:824-837, 1476-1492`
- **UI/Frontend Impact**: Hospital A's patient test report gets corrupted with Hospital B's patient lab analyzer values!
- **Security/Data Risk**: **Critical**. Catastrophic data corruption and clinical safety hazard. A diabetic or oncology patient in one hospital could receive false normal or critical lab readings originating from an unrelated hospital.
- **Steps to Reproduce**:
  1. Create a LabOrder in Hospital 1 with orderId "ORD-999".
  2. Create an API key for Hospital 2.
  3. Send an HL7 packet with orderId "ORD-999" using Hospital 2's API key to `POST /api/lab/ingest/hl7`.
  4. Hospital 1's LabOrder test results are updated!
- **Suggested Fix / Implementation Plan**:
  1. Add mandatory tenant scoping to `LabOrder.findOne({ orderId, hospitalId: req.tenantId })`.
  2. Reject ingestion requests if `req.tenantId` is missing.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Add `hospitalId` filter in `backend/src/routes/lab.js` ASTM and HL7 ingestion loops.
  - [x] Add integration test verifying cross-tenant ingestion rejection.

---

## [PHARM-LAB-BUG-02] Mass Assignment on Pharmacy Staff and Health Package Creation
- **Description**: In `backend/src/routes/pharmacy.js` line 2196 and `lab.js` lines 1847 & 1907, staff and packages are created via `PharmacyStaff.create({ ...req.body, ... })` and `HealthPackage.create({ ...req.body, ... })`.
- **Current vs Expected Behavior**:
  - *Current*: Spreads unvalidated body fields directly into the database.
  - *Expected*: Strict validation and explicit whitelisting of allowed attributes using Zod schemas.
- **Flow**: Pharmacy owner adding dispensary staff; Lab manager adding health checkup packages.
- **Root Cause / Logic**: Missing `.strict()` schema parsing before Mongoose model insertion.
- **Affected Files**: `backend/src/routes/pharmacy.js:2196`, `backend/src/routes/lab.js:1847, 1907`
- **UI/Frontend Impact**: None directly.
- **Security/Data Risk**: **Medium**. Privilege escalation if staff flags or internal billing rates can be injected.
- **Steps to Reproduce**:
  1. Send `POST /api/pharmacy/staff` with `{ name: 'John', role: 'owner', isAdmin: true }`.
  2. Observe unauthorized fields accepted into document.
- **Suggested Fix / Implementation Plan**:
  1. Create `pharmacyStaffSchema` with strict property validation.
  2. Replace `...req.body` with validated DTO.
- **Priority**: Medium
- **Phase**: Phase 1
- **TODOs**:
  - [x] Refactor `pharmacy.js` staff creation to use validated schema.
  - [x] Refactor `lab.js` package and equipment creation.
