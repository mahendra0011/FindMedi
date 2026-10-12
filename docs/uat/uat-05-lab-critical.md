# UAT Flow 05: Laboratory Sample Lifecycle & Critical Panic Alert

## Objective
Verify lab requisition intake, sample barcoding & collection, analyzer result processing, panic/critical threshold escalation, and pathologist digital verification.

## Preconditions
- User roles: `phlebotomist`, `lab_technician`, `pathologist`, `doctor`.
- Test catalog configured with Serum Potassium (`K+`) panic limits ($< 2.8$ or $> 6.2$ mmol/L).
- Active LIS analyzer emulator or manual result entry enabled.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/lab/collection` | Phlebotomist | Scan requisition order; print barcode labels (e.g. `BC-9901`); collect EDTA & Serum tubes. | Sample status moves to `Collected`; collection timestamp and phlebotomist ID logged. | [ ] |
| 2 | `/lab/receiving` | Lab Receiving Tech | Receive tube in central biochemistry laboratory. | Tube status transitions to `Received in Lab`; accession number assigned. | [ ] |
| 3 | `/lab/worklist/biochem` | Lab Tech | Enter analyzed Serum Potassium result as `6.8 mmol/L` (Panic High). | Result flagged with red critical badge; audio/visual panic alert triggered. | [ ] |
| 4 | `/hospital/safety` | System / Tech | Verify automatic critical escalation to ordering physician. | In-app push notification & SMS alert sent to Dr. Sharma with acknowledgment prompt. | [ ] |
| 5 | `/lab/verify` | Pathologist | Review Delta check against previous patient lab history; digitally sign and authorize report. | Report status changes to `Authorized / Released`; digital signature stamp applied. | [ ] |
| 6 | `/patient/records` | Patient / Doctor | Access signed laboratory report PDF via portal or QR verify URL. | Report opens with reference ranges, critical indicator, and verifiable QR code. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
