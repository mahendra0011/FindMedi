# UAT Flow 08: Staff Shift Rostering, Biometric Attendance & Monthly Payroll

## Objective
Verify multi-shift staff scheduling, biometric attendance device log integration, leave application approval, and salary slip calculation with PF/ESI statutory deductions.

## Preconditions
- User roles: `hr_manager`, `accountant`, `hospital_admin`.
- Staff employees seeded across clinical and administrative grades.
- Configured salary structures with PF, ESI, Professional Tax, and TDS rules.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/hr/roster` | HR Manager | Create weekly nursing shift roster (Morning, Evening, Night) for ICU ward. | Roster saved; shift conflict warnings fire if rest duration between shifts is < 8 hours. | [ ] |
| 2 | `/hospital/biometric` | HR Manager | Simulate biometric punch-in sync from entrance fingerprint/face terminals. | In/Out punches matched against shift timetable; late arrivals and half-days flagged. | [ ] |
| 3 | `/admin/leave-requests`| HR Manager | Review and approve medical leave application submitted by Staff Nurse. | Leave ledger decremented; roster automatically indicates approved leave. | [ ] |
| 4 | `/hr/payroll` | Accountant | Trigger monthly payroll run for target pay period. | Pay days calculated (Total Days - Unpaid Leave); gross salary computed. | [ ] |
| 5 | `/hr/payroll` | Accountant | Verify statutory deductions: Provident Fund (12%), ESI (0.75%), and PT. | Deductions accurately calculated against statutory caps; net payable salary verified. | [ ] |
| 6 | `/hr/payroll` | Accountant | Finalize payroll and export bank NEFT transfer batch file + PDF pay slips. | Bank transfer CSV generated; payslips published to staff self-service portal. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
