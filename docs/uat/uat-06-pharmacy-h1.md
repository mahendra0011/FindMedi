# UAT Flow 06: Pharmacy Dispensation & Schedule H1 Narcotics Compliance

## Objective
Verify e-prescription dispensing, real-time FEFO (First-Expired, First-Out) stock decrement, Schedule H1 / Narcotic statutory register recording, and FDA inspection CSV/PDF export.

## Preconditions
- User roles: `pharmacist`, `pharmacy_owner`, `hospital_admin`.
- Pharmacy inventory with batch-controlled Alprazolam 0.5mg (Schedule H1) and Paracetamol 650mg.
- Registered prescriber with medical council registration number.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/pharmacy` | Pharmacist | Lookup doctor prescription for patient containing Alprazolam 0.5mg Tab. | Prescription details load; Schedule H1 warning banner displayed in amber. | [ ] |
| 2 | `/pharmacy` | Pharmacist | Select batch for Alprazolam based on FEFO recommendation (earliest expiring batch first). | Selected batch stock verified; unit sales price and GST populated automatically. | [ ] |
| 3 | `/pharmacy` | Pharmacist | Enter Prescribing Doctor Name & Council Reg No, Patient Address, and dispensing quantity. | Dispense transaction committed; stock decremented in real-time. | [ ] |
| 4 | `/pharmacy/h1-register` | Pharmacist | Inspect Schedule H1 Register entry for Alprazolam dispensation. | Audit row shows: Date, Patient Name, Prescriber Reg No, Drug Name, Batch No, Qty. | [ ] |
| 5 | `/pharmacy/h1-register` | Pharmacy Owner | Export Schedule H1 Register for Drug Inspector compliance check. | RFC 4180 compliant CSV downloaded with UTF-8 BOM, sanitized against formula injection. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
