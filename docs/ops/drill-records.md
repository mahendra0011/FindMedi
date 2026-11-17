# Drill records — log of executed dry-run drills

> The record of what actually ran. If it isn't written here, the drill didn't happen.
> **Cadence:** quarterly, one drill per quarter (Q1 safety incident, Q2 payment mismatch, Q3 outage, Q4 data breach).
> Attach: drill type, date, attendees, outcome (PASS/FAIL), follow-up actions, sign-off by ops lead + clinical advisor.

## Scorecard (append)

| # | Date | Drill type | Participants | Outcome | Key failure | Action items (owner, due) | Signed by |
|---|---|---|---|---|---|---|---|
| 1 | | safety (SOP-05/06) | T1, T&S, IC, Clinical Advisor | | | | |
| 2 | | payment (SOP-02/15) | T1, Finance Ops, Eng | | | | |
| 3 | | outage (SOP-17) | On-call Eng, Eng Lead | | | | |
| 4 | | breach (SOP-13) | Eng, DPO, Legal | | | | |

## How to add a row

1. Set date to the day the drill happened (not the day it's logged).
2. Participants: name every human in the room, even observers.
3. Outcome: PASS only if every drill in the run crosses its pass criteria in `docs/ops/drill-runbook.md`. Otherwise FAIL, with the reason.
4. Action items: each failure maps to one action, one owner, one date. Carry forward to the next quarter's drill.
5. Sign-off: ops lead + clinical advisor + legal if any patient-safety or privacy item was exercised.
