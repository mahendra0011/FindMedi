# UAT Flow 12: Hospital Campus Security, Visitor Passes & Guard Rounds

## Objective
Verify visitor pass issuance with webcam capture, RFID/Barcode security checkpoint scans, hospital parking toll tracking, and guard perimeter patrol verification.

## Preconditions
- User roles: `security`, `security_admin`, `hospital_admin`.
- Inpatient bed occupancy data available for visitor validation.
- Defined security checkpoints (Main Gate, Emergency Bay, ICU Entrance, Pharmacy).

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/hospital/security` | Security Guard | Register visitor requesting entry for ICU patient in Bed ICU-02. | Checks patient visitor allowance (Max 2 visitors); warns if quota exceeded. | [ ] |
| 2 | `/hospital/security` | Security Guard | Capture visitor photo via webcam and issue thermal visitor badge with barcode. | Printed pass shows visitor photo, visitor name, patient UHID, and 2-hour expiry window. | [ ] |
| 3 | `/hospital/security` | Security Guard | Scan badge barcode at ICU entrance turnstile reader. | Pass verified as `Active & Authorized`; entry timestamp logged. | [ ] |
| 4 | `/hospital/parking` | Parking Attendant| Issue parking entry slip for vehicle number `DL 01 AB 1234` (Four-Wheeler). | Parking slip printed with entry timestamp and barcode. | [ ] |
| 5 | `/hospital/parking` | Parking Attendant| Scan slip at exit gate after 45 minutes. Collect parking fee. | Hourly fee calculated accurately; receipt printed; parking bay released to vacant pool. | [ ] |
| 6 | `/hospital/security` | Security Admin | Review hourly Guard Patrol Round log across designated perimeter NFC checkpoints. | Patrol completeness percentage tracked; missed checkpoint triggers delay alert. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
