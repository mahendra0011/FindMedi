# UAT Flow 02: Inpatient (IPD) Admission, Clinical Care & TPA Discharge

## Objective
Verify patient admission to ward/ICU bed, nursing vitals tracking with SOFA delta alert, clinical discharge summary, and TPA insurance cashless pre-auth settlement.

## Preconditions
- User roles: `receptionist`, `ward_nurse`, `doctor`, `tpa_agent`, `billing_executive`.
- Available beds in General Ward and ICU.
- Configured TPA / Insurance providers in system master.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/hospital/beds` | Receptionist | Select vacant bed (e.g., ICU-02) and admit patient for observation. | Bed status changes from `vacant` to `occupied`; admission record generated. | [ ] |
| 2 | `/nursing` | Ward Nurse | Record hourly vitals (BP, SpO2, MAP, GCS) and lab values (platelets, creatinine). | Vitals history charts render without gaps; SOFA score calculated dynamically. | [ ] |
| 3 | `/hospital/safety` | Nurse / Doctor | Simulate SOFA score worsening by $\ge 2$ points within 24h. | Alert engine fires `sofa-delta-2` critical alert in Doctor notification inbox. | [ ] |
| 4 | `/ipd/discharges` | Doctor | Initiate discharge planning; compile discharge summary with diagnoses, procedures, and advice. | Discharge summary PDF renders with Devanagari/Hindi labels where applicable. | [ ] |
| 5 | `/insurance/desk` | TPA Agent | Submit pre-authorization request for claim amount Rs. 45,000 with attached clinical notes. | Claim moves to `Under Review`; query tracking inbox reflects submission. | [ ] |
| 6 | `/insurance/desk` | TPA Agent | Approve pre-auth for Rs. 40,000 with deduction note. | Claim status changes to `Pre-Auth Approved`; co-pay of Rs. 5,000 computed. | [ ] |
| 7 | `/billing` | Billing Executive | Finalize IPD package billing: adjust approved TPA credit; collect patient co-pay. | Invoice finalized; QR e-invoice generated if above turnover threshold; bed status marked `dirty/cleaning`. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
