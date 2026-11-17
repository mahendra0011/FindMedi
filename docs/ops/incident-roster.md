# Incident roster & escalation contacts — template (fill in)

> The assigned humans who run the show during an incident. This is the literal answer to the ops staffing item — no name, no go-live.
> Until filled, this doc is a checklist of who must be named. **Owner for filling it in: ops lead + founder (24h SLA from first request).**
> Privacy note: do NOT put personal mobile numbers here unless this file is access-restricted under `infra/nginx/snippets/admin-allowlist.conf`. Prefer on-call aliases (PagerDuty etc.).

---

## Named roles (replace TBD before signing off)

| Role | Name | Primary contact | Backup | Reachable 24×7 | Notes |
|---|---|---|---|---|---|
| Incident Commander (rotating) | TBD | pager-duty alias | escalation | yes | runs the room; no debugging — delegates |
| Engineering Lead | TBD | pager alias | IC backup | yes (P1/P2) | decides rollback vs. mitigate |
| DPO (Data Protection Officer) | TBD | office alias | — | yes | handles DPDP/CERT-In reporting calls |
| Legal Counsel | TBD | office alias | — | business-hours + on-call for Sev-1 | |
| Clinical Advisor | TBD | office alias | — | business-hours + on-call for Sev-1 | medical content/triage sign-off |
| Security Lead | TBD | pager alias | IC backup | yes | for SOP-13 (breach) |
| Finance Ops Lead | TBD | office alias | — | business-hours | for payout incidents |
| Support Lead | TBD | office alias | — | 09:00–21:00 | customer comms |

## On-call rota (weekly)

| Week of | IC on-call | Eng on-call | Notes |
|---|---|---|---|
| 2026-11-16 | TBD | TBD | Launch window |
| 2026-11-23 | TBD | TBD | |

## Escalation tree (text)

```
All hands Sev-3 → Support Lead (business-hours) → Engineering Lead (if unresolved > 4h or > 50 users)
Sev-2 (major flow broken) → Engineering Lead + Support Comms → update status page ≤ 15 min
Sev-1 (safety/breach/money/SOS) → IC + Exec + DPO + Legal + Clinical → war room; status page ≤ 15 min; all-clear ≤ 15 min after recovery
```

## Reachability drill (quarterly, one per drill in `drill-runbook.md`)

- Pager fires at drill start; on-call acknowledges ≤ 5 min
- IC delegates explicit owners within ≤ 15 min
- All-clear acknowledged by two named roles before closing
- Evidence: log line in `drill-runbook.md` scorecard

## Review

Re-publish this page whenever anyone changes role/timezone/pager. Automated reminder: monthly metrics review agenda item #4.
