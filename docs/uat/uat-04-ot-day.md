# UAT Flow 04: Operation Theatre (OT) Day & Surgical Safety Protocol

## Objective
Verify surgical scheduling, OT board management, CSSD sterile tray issuance, WHO Surgical Safety Checklist compliance, and post-op recovery handover.

## Preconditions
- User roles: `surgeon`, `anaesthetist`, `ot_nurse`, `cssd_technician`.
- Configured OT suites (e.g. OT-1 General, OT-2 Ortho).
- CSSD sterile packs inventoried with autoclave indicators.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/ot/board` | OT Coordinator | Schedule Laparoscopic Cholecystectomy for patient in OT-1 at 09:00 IST. | OT schedule slot booked; surgeon, anaesthetist, and scrub nurse rosters assigned. | [ ] |
| 2 | `/cssd` | CSSD Tech | Issue sterile Laparoscopy Tray #4 with autoclave biological indicator batch #B-1092. | Tray linked to surgery ID; expiry validated (>24h remaining). | [ ] |
| 3 | `/forms` | OT Nurse | Initiate WHO Surgical Safety Checklist: Complete **Sign In** (before induction of anaesthesia). | Patient identity, site marking, and anaesthesia safety checks recorded. | [ ] |
| 4 | `/forms` | Surgeon / Nurse | Complete **Time Out** (before skin incision) with team introduction and antibiotic prophylaxis. | Confirms operative consent and blood availability; timer records elapsed interval. | [ ] |
| 5 | `/forms` | Scrub Nurse | Complete **Sign Out** (before patient leaves OT): instrument, swab, and needle count. | Count reconciliation verified as correct; specimen container labeled. | [ ] |
| 6 | `/ot/board` | Anaesthetist | Transfer patient to Post-Anaesthesia Care Unit (PACU / Recovery). Update Aldrete recovery score. | OT-1 marked for terminal cleaning; PACU bed occupancy updated. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
