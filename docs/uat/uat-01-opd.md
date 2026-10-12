# UAT Flow 01: Outpatient Department (OPD) Journey

## Objective
Verify end-to-end outpatient journey: patient registration/token generation, queue calling, doctor consultation with prescription & generic substitution, and invoice settlement.

## Preconditions
- Seeded user accounts:
  - Receptionist (`receptionist`)
  - OPD Doctor (`doctor`)
  - Billing Executive (`billing_executive`)
- Seeded doctors with active OPD schedules and consultation fees.
- Pharmacy formulary loaded with generic and branded drug mappings.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/opd-registration` | Receptionist | Register new walk-in patient with demographic details and phone number. | Patient UHID created; QR token code generated. | [ ] |
| 2 | `/opd-token` | Receptionist | Assign patient to Dr. Sharma (General Medicine) and generate queue token. | Token number displayed (e.g., GM-104); status set to `waiting`. | [ ] |
| 3 | `/display/queue` | Public / TV | Observe OPD waiting room queue display screen. | Real-time WebSocket update displays token GM-104 under Dr. Sharma's room. | [ ] |
| 4 | `/doctor-consultation` | Doctor | Select patient GM-104 and click "Call Next". Enter chief complaints and vitals. | Consultation status changes to `in-consultation`; audio chime plays on queue display. | [ ] |
| 5 | `/doctor-consultation` | Doctor | Prescribe Paracetamol 650mg TDS × 3 days. Verify generic substitute prompt. | Generic equivalent (Acetaminophen 650mg) suggested with price comparison; Rx saved. | [ ] |
| 6 | `/doctor-consultation` | Doctor | Add follow-up recall date (+7 days) and complete consultation. | Rx PDF generated with digital QR seal; follow-up scheduled. | [ ] |
| 7 | `/billing` | Billing Executive | Open patient billing profile. Collect OPD consultation fee via UPI/Cash. | Receipt generated with GST breakup and unique receipt number; balance shows 0. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
