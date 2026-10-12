# UAT Flow 14: Drug-Drug Interaction (DDI) Real-Time Alerting & Override Audit

## Objective
Verify real-time drug interaction checking during doctor EMR prescription writing and pharmacist dispensing, blocking prescription sign on major conflict without documented clinical override reason.

## Preconditions
- User roles: `doctor`, `pharmacist`, `clinical_pharmacist`.
- Curated 145-pair drug interaction database loaded (`interactions.json`).
- Active patient consultation in Doctor Workspace.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/doctor/emr` | Doctor | Prescribe first drug: `Warfarin 5 mg tablet`. | Added to draft prescription without warning. | [ ] |
| 2 | `/doctor/emr` | Doctor | Add second drug: `Aspirin 75 mg tablet`. | Real-time DDI engine debounces 300ms and detects major conflict. Major severity red banner appears: "Severe risk of major bleeding and gastrointestinal hemorrhage". | [ ] |
| 3 | `/doctor/emr` | Doctor | Attempt to click "Sign & Issue Prescription" without override. | Action blocked: "Major drug interaction requires documented clinical override reason". | [ ] |
| 4 | `/doctor/emr` | Doctor | Select override reason: `Benefit outweighs risk — patient has mechanical heart valve`, add note: `Weekly INR monitoring scheduled`. Click "Sign". | Prescription signs successfully; `DdiOverride` logged with timestamp, user ID, and reason. | [ ] |
| 5 | `/pharmacy/dispense` | Pharmacist | Open prescription in Dispense queue. Verify items. | Pharmacist dispensing dialog shows amber warning noting doctor override reason on file; dispense proceeds with audit trail. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
