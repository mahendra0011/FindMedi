# UAT Flow 07: Hospital Procurement, Vendor KYC & Goods Receipt

## Objective
Verify purchase requisition creation, supplier KYC verification gate, purchase order issuance, Goods Receipt Note (GRN) with batch verification, and ABC-VED classification.

## Preconditions
- User roles: `store_keeper`, `purchase_officer`, `hospital_admin`.
- Supplier catalog with active and pending/expired KYC vendors.
- Store inventory catalog with reorder levels.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/inventory` | Store Keeper | Review low stock alert for IV Normal Saline (stock < reorder level 200 bottles). | Item highlighted in reorder workbench; auto-indent generated. | [ ] |
| 2 | `/purchase-center` | Purchase Officer | Attempt to issue PO to vendor with `Pending` or `Expired` KYC docs. | PO creation blocked with `VENDOR_KYC_BLOCK` error; prompts document upload. | [ ] |
| 3 | `/hospital/enterprise` | Purchase Officer | Verify vendor GST, Drug License, and MSME certificate with future expiry date. | Vendor KYC status transitions to `Verified`; audit decision logged. | [ ] |
| 4 | `/purchase-center` | Purchase Officer | Generate Purchase Order for 500 bottles at agreed rate contract price. | PO generated with unique PO number and PDF summary; sent for delivery. | [ ] |
| 5 | `/inventory` | Store Keeper | Process Goods Receipt Note (GRN) against PO upon physical delivery. | Enter received batch numbers, manufacturing/expiry dates; physical quantity reconciled. | [ ] |
| 6 | `/inventory` | Store Keeper | Inspect ABC-VED inventory analysis dashboard. | Normal Saline classified appropriately by consumption value and criticality. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
