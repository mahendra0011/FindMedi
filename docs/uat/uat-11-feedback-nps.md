# UAT Flow 11: Patient Experience, Post-Discharge Feedback & NPS Tracking

## Objective
Verify automated SMS/WhatsApp feedback survey dispatch upon discharge, patient rating submission, Net Promoter Score (NPS) aggregation, and grievance escalation.

## Preconditions
- User roles: `quality_officer`, `hospital_admin`, `patient_relations`.
- Completed patient discharge in IPD/OPD.
- Configured feedback survey questions (Doctor care, Nursing attentiveness, Cleanliness, Billing clarity).

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/hospital/feedback` | System | Simulate post-discharge automated feedback trigger (sent 2 hours post-discharge). | Feedback invite logged with one-time secure survey token. | [ ] |
| 2 | `/patient/reviews` | Patient | Open survey link. Submit ratings: 5/5 for Nursing, 4/5 for Doctor, 2/5 for Food & Canteen. NPS: 8. | Survey saved; response stored with department attribution tags. | [ ] |
| 3 | `/hospital/feedback` | Quality Officer | Open Patient Experience Dashboard. Inspect live NPS score gauge. | NPS score recalculates (Promoters - Detractors); department sentiment breakdown reflects rating. | [ ] |
| 4 | `/hospital/calls` | Patient Relations | Review low rating alert for Food & Canteen (< 3 stars). Create follow-up inquiry ticket. | Grievance ticket created in CRM; assigned to Dietary & Kitchen Supervisor with 24h SLA. | [ ] |
| 5 | `/superadmin/tickets`| Hospital Admin | Inspect resolution of patient grievance with corrective action note. | Ticket marked `Resolved`; patient closure acknowledgment logged. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
