# Drill runbook — SOPs 1–17 dry-run drills

> For the operational note on `20-Support-and-Ops-Playbooks.md`: "SOPs 1–17 reviewed; dry-run drills (safety incident, payment mismatch, outage)".
> **Cadence:** quarterly (Q1 safety drill, Q2 payment drill, Q3 outage drill, Q4 breach tabletop). 60-minute drills, off-peak IST time (e.g. 11:30 AM last Sunday).
> **Facilitators:** ops lead + clinical advisor. **Participants:** support T1 (2), finance ops (1), T&S moderator (1), KYC reviewer (1).
> Each drill ends with a 10-minute debrief, action items, and a scorecard appended at the bottom.

---

## Drill 1 — Safety incident (SOP-05 + SOP-06): "Provider no-show for home visit; patient reports distress"

**Inject:** Support receives urgent ticket — home nurse had not arrived; patient is elderly and alone; the patient sounds confused in a voice note.

| Step | Action | Expected outcome | Time |
|---|---|---|---|
| 1 | Support T1 acknowledges ticket with acknowledgment macro | Patient receives safety message within 10 min | ≤ 10 min |
| 2 | T1 calls patient (or emergency contact after 2 unanswered attempts) | Confirm patient is safe; escalate to 108 if imminent danger | ≤ 10 min |
| 3 | T1 pages Safety Lead via incident channel | Safety Lead picks up | ≤ 5 min |
| 4 | Safety Lead suspends the nurse pending investigation; preserves logs | Nurse `status=suspended` set in admin console within 15 min | ≤ 15 min |
| 5 | KYC reviewer re-verifies credentials of the nurse | Findings in 2 hours | ≤ 2 h |
| 6 | Patient care follow-up: free rebooking + counselling info if distress detected | Logged | ≤ 24 h |

**Pass criteria:** acknowledgement ≤ 10 min; escalation to Safety Lead ≤ 5 min; patient safety verified before any resolution; nurse suspended before next shift dispatch; debrief covers re-verification gap.

---

## Drill 2 — Payment mismatch (SOP-02 + SOP-15): "3 transactions captured, bookings not found"

**Inject:** finance ops sees 3 `payment.completed` entries in gateway dashboard; backend has no matching Appointment rows.

| Step | Action | Expected outcome | Time |
|---|---|---|---|
| 1 | Finance ops records transaction IDs and customer refs | 3 transactions identified | ≤ 5 min |
| 2 | Finance runs the reconciliation query (`GET /api/commission/recon`) | Report lists affected payments | ≤ 5 min |
| 3 | Auto-confirm if slot holds valid (reservation still there) — else auto-refund | At least 2 of 3 handled within 30 min | ≤ 30 min |
| 4 | Finance logs the incident with pattern (gateway timeout? client duplicate?) | Root-cause tag noted | ≤ 1 h |
| 5 | Customers notified within 1h via in-app + WhatsApp | Refund/confirmation message sent | ≤ 1 h |
| 6 | Post-mortem 48h: cross-check webhook failures over 24h | Fix filed if systemic | ≤ 48 h |

**Pass criteria:** detection ≤ 5 min; 100% of the 3 reconciled with correct status; customer communication within 1h; post-mortem written within 48h.

---

## Drill 3 — Platform outage (SOP-17): "API 5xx spike for 10 minutes"

**Inject:** uptime probe fails 5/6 consecutive checks; error budget alerts fire.

| Step | Action | Expected outcome | Time |
|---|---|---|---|
| 1 | On-call engineer paged | Paged in ≤ 2 min | ≤ 2 min |
| 2 | On-call confirms scope (region/service); flips feature flag if appropriate (e.g., disable chat bot; read-only mode) | Traffic reduced/degraded gracefully | ≤ 5 min |
| 3 | Status page published ≤ 15 min (`docs/ops/status-page.md` playbook once live) | "Investigating" update published | ≤ 15 min |
| 4 | If DB-related: execute DB failover runbook | Replica promoted; connections drained | ≤ 15 min |
| 5 | If app-related: roll back to last known good deploy | Service restored | ≤ 15 min |
| 6 | All-clear status page published with root cause summary | Customers notified | ≤ 15 min after resolution |
| 7 | Post-mortem within 24h: timeline, contributing factors, action items, owner per item | Published to leadership | ≤ 24 h |

**Pass criteria:** acknowledge ≤ 2 min; mitigation ≤ 15 min; customer comms ≤ 15 min after detection; all-clear ≤ 15 min post-recovery; post-mortem ≤ 24h.

---

## Drill 4 — Data breach tabletop (SOP-13): "Employee laptop leaked"

**Inject:** ops receives tip that an engineer's laptop was stolen; laptop had company SSO session cookies + VPN client installed.

| Step | Action | Expected outcome |
|---|---|---|
| 1 | Engineering revokes SSO session + VPN certs via IdP admin console | Accessed blocked ≤ 5 min |
| 2 | Rotate JWT keys (`JWT_KEYS`) via runbook | All tokens invalidated ≤ 15 min |
| 3 | Check audit logs for unusual access in last 72h | Scope report produced |
| 4 | Assess whether PHI was accessed | Data Protection Officer notified per DPDP |
| 5 | Notify customers if PHI confirmed leaked | Breaches reported per CERT-In (6h) |
| 6 | Post-mortem within 24h | Root-cause + fix list |

**Pass criteria:** revocation ≤ 5 min; key rotation ≤ 15 min; scope assessable from logs ≤ 2h; regulator contact ≤ 6h if required; post-mortem ≤ 24h.

---

## Drill scorecard (append per drill)

| Date | Drill | Attendees | Time to detect → mitigate → resolve | What broke | Action items (owner, date) |
|---|---|---|---|---|---|
| | | | | | |
