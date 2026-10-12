# UAT Flow 13: Interactive Patient NPS Prompt, Deduplication & Detractor Escalation

## Objective
Verify the in-app interactive Net Promoter Score (NPS) feedback prompt on completed appointments/orders, one-time submission deduplication per visit (`refId`), and automated detractor task generation for scores $\le 6$.

## Preconditions
- User roles: `patient`, `patient_relations`, `hospital_admin`.
- Completed appointment or delivered medicine order for patient.
- Feedback deduplication index active (`patientId + context + refId`).

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/patient/appointments` | Patient | View completed appointment. Click "Rate Experience". | Interactive feedback modal opens with 0–10 NPS score scale, optional 1–5 stars, and comment box. | [ ] |
| 2 | Modal Prompt | Patient | Select NPS score 4 (Detractor, tinted red), star rating 2, enter comment: "Long waiting time in triage". Click "Submit Feedback". | Feedback submitted via `POST /api/feedback`; success toast displayed; modal closes. | [ ] |
| 3 | `/patient/appointments` | Patient | Re-open completed appointment card. | "Feedback Submitted" indicator appears; subsequent submissions for same visit are disabled/blocked with 409 conflict. | [ ] |
| 4 | `/hospital/patient-relations` | Patient Relations | Open Relations dashboard & Tasks queue. | System automatically generated detractor grievance alert task for score $\le 6$ with 24h SLA. | [ ] |
| 5 | `/hospital/feedback` | Quality Officer | Open NPS Analytics dashboard. | Detractor count incremented; NPS score updated; department breakdown tags appointment. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
