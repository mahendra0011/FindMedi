# UAT Flow 15: Schedule H1 & NDPS Narcotic Reconciliation, Dual-Witness & Inspector PDF

## Objective
Verify statutory Schedule H1 / NDPS narcotic dispensing records, monthly opening/purchases/dispensed/adjusted balance reconciliation, dual-witness wastage recording, and drug inspector statutory PDF export.

## Preconditions
- User roles: `pharmacist`, `pharmacy_owner`, `inventory_manager`.
- Prescriptions with Schedule H1 / Narcotic drugs dispensed via pharmacy.
- Initial opening stock recorded in `StockLedger`.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/pharmacy/h1-register` | Pharmacist | Open Schedule H1 & NDPS register page. View "Statutory Register" tab. | Table lists patient name, prescriber council ID, drug name, batch, rx schedule, quantity, and dispensing pharmacist. | [ ] |
| 2 | `/pharmacy/h1-register` | Pharmacist | Switch to "Stock Reconciliation" tab. Select monthly date range. | Balance formula computed: `Expected Closing = Opening + In - Dispensed - Adjusted`. Physical count and variance displayed. Clean inventory shows 0 variance (green badge). | [ ] |
| 3 | `/pharmacy/h1-register` | Pharmacist | Switch to "Adjustments" tab. Record broken ampoule wastage: 2 qty, reason "Accidental breakage in tray", assign witness staff ID. | Action requires separate witness ID (self-witness rejected). Adjustment recorded and deducted from ledger. | [ ] |
| 4 | `/pharmacy/h1-register` | Pharmacist | Click "Export Inspector PDF". | Browser downloads statutory PDF with facility drug license number, running page numbers, inspector audit table, and Pharmacist-in-Charge sign-off line. | [ ] |
| 5 | `/pharmacy/h1-register` | Drug Inspector | Open exported PDF in viewer. Check format against statutory Drugs & Cosmetics Rules 1945. | Formatting compliant; zero formula injection in CSV/PDF; audit log records export timestamp. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
