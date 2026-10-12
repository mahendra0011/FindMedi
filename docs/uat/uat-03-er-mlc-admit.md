# UAT Flow 03: Emergency Room (ER), Medico-Legal Case (MLC) & Emergency Admission

## Objective
Verify rapid triage categorization (Red/Yellow/Green), break-glass medical emergency consent override, statutory MLC register logging with police intimation, and fast-track admission.

## Preconditions
- User roles: `nurse`, `doctor`, `medical_records_officer`.
- Emergency triage bay enabled in system settings.
- Active statutory police station contact master.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/triage` | ER Nurse | Create emergency intake for trauma victim. Tag acuity as `RED (Immediate Resuscitation)`. | Emergency crash cart notification broadcast to ER team; countdown timer starts. | [ ] |
| 2 | `/doctor-consultation` | ER Doctor | Invoke emergency Break-Glass access for unconscious unidentifiable patient. | Immediate unrestricted access to emergency orders; audit log recorded with break-glass tag. | [ ] |
| 3 | `/hospital/safety` | ER Doctor | Check patient for Medico-Legal criteria (road traffic collision). Tag case as `MLC`. | MLC number automatically allocated (format `MLC/YYYY/XXXX`); police intimation memo prepared. | [ ] |
| 4 | `/hospital/safety` | Medical Records Officer | Export and print statutory MLC intimation slip with officer details. | Form generated with non-editable hash and attending medical officer digital signature seal. | [ ] |
| 5 | `/hospital/beds` | ER Nurse | Transfer patient to Emergency ICU bed without upfront billing block. | Transfer completed immediately; bed assigned; emergency credit limit bypass logged. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
