# UAT Flow 16: Vendor KYC Statutory Verification & Purchase Order Enforcement

## Objective
Verify supplier onboarding with GSTIN checksum validation, statutory document upload (Drug License, PAN, GST, MSME), compliance review approval workflow, and procurement purchase order gating against unverified/expired vendors.

## Preconditions
- User roles: `inventory_manager`, `hospital_admin`, `finance_admin`.
- Procurement center accessible at `/hospital/procurement`.
- `VENDOR_KYC_STRICT=1` enabled in hospital configuration.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/hospital/procurement` | Inventory Manager | Open "Suppliers & KYC" tab. Fill "Add Supplier" form with invalid GSTIN: `22AAAAA0000A1Z9`. | Creation rejected with 400: "Invalid GSTIN: checksum mismatch". | [ ] |
| 2 | `/hospital/procurement` | Inventory Manager | Correct GSTIN to valid format: `23AAAAA0000A1Z5`. Submit. | Supplier created with status `Pending`. Displayed in table with amber "Pending" badge. | [ ] |
| 3 | `/hospital/procurement` | Inventory Manager | Attempt to raise Purchase Order for this Pending supplier under strict policy. | PO submission rejected: "Supplier KYC is Pending — complete KYC verification before ordering". | [ ] |
| 4 | `/hospital/procurement` | Hospital Admin | Click "Review KYC" on the supplier. Modal opens. Attach Drug License: `DL-2026-MP-0012`, expiry date: 2 years future. | Document attached; list updates to show document on file with expiry date. | [ ] |
| 5 | `/hospital/procurement` | Hospital Admin | Click "Approve & Verify". | Vendor status updates to `Verified` (emerald badge); decision note and verifier ID logged to audit trail. | [ ] |
| 6 | `/hospital/procurement` | Inventory Manager | Re-attempt Purchase Order creation. | PO successfully created and submitted with order ID generated. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
