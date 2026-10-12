# Findmedi Production Cutover Plan (F7)

This plan governs the transition from legacy hospital systems to Findmedi production deployment.

---

## 1. Cutover Schedule & Timeline

| Phase | Duration | Scope | Owner |
|---|---|---|---|
| **T-14 Days** | 2 days | Staging dry-run of all migrations (`MIGRATIONS.md`) + UAT sign-offs | Lead Architect |
| **T-7 Days** | 3 days | Staff end-user refresher training per department | Hospital Ops Head |
| **T-48 Hours** | 1 day | Change freeze on code & infrastructure. Pre-seed master catalogs. | DevOps Lead |
| **T-0 (Cutover Night)** | 6 hours | Maintenance window (22:00 - 04:00 IST). Final delta migration. | Cutover Team |
| **T+1 to T+14 Days** | 2 weeks | Dual-run / Parallel operation with shadow data entry & reconciliation | MRD & Dept Heads |

---

## 2. Maintenance Window Execution Checklist (T-0)

- [ ] **22:00 IST:** Announce planned maintenance window; switch legacy system to read-only mode.
- [ ] **22:15 IST:** Perform final incremental database backup of legacy data.
- [ ] **22:45 IST:** Run Findmedi database migration scripts:
  ```bash
  node scripts/migrate-bed-unique.js --apply
  node scripts/backfill-encounters.mjs --apply
  node scripts/migrate-category-taxonomy.mjs --apply
  ```
- [ ] **00:30 IST:** Run record count reconciliation script to verify patient, active admission, and inventory ledger parity:
  ```bash
  node scripts/verify-migration-parity.mjs
  ```
- [ ] **01:30 IST:** Deploy production containers with updated environment variables (`docs/go-live/env-checklist.md`).
- [ ] **02:00 IST:** Run smoke test suite across all 12 core hospital workflows.
- [ ] **03:30 IST:** Verify PACS connectivity, E-invoice credentials, and payment gateway webhooks.
- [ ] **04:00 IST:** Open hospital network routing to Findmedi production portal.

---

## 3. Parallel Run (Dual-Running Period)

For 14 days following cutover:
- **Primary System:** Findmedi handles all live OPD registrations, IPD bed allotments, pharmacy dispense, and billing.
- **Shadow Logging:** Key statutory records (Narcotics H1 register, MLC register, Birth/Death certificates) are dual-logged in physical ledgers.
- **Daily Reconciliation:** Finance and inventory teams perform 18:00 IST daily reconciliation between system cash collection and physical bank deposits.

---

## 4. Rollback Criteria & Abort Protocol

Cutover will be aborted and rolled back to legacy system if:
1. Data migration encounters unresolvable integrity errors resulting in $>0.1\%$ patient or billing record discrepancy.
2. Production latency exceeds 2000ms p95 under standard early-morning OPD registration volume.
3. Critical patient safety block occurs (e.g. inability to admit emergency patients or dispense critical medications) and cannot be resolved within 30 minutes.

### Rollback Steps
1. Re-point internal DNS routing to legacy server.
2. Export delta transactions logged in Findmedi back to legacy format.
3. Notify clinical staff to resume operations on legacy system.
4. Convene post-mortem review before rescheduling cutover.
