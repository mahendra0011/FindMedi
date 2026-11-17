# Per-category unit-economics sheet

> Source: `FindMedi-Final-Docs/16-Business-and-Unit-Economics.md` §5.2–§5.3.
> **Fill status:** pre-pilot (R0/R1). Cells marked `ILLUSTRATIVE` are the §16 worked-example/assumption values; replace with measured pilot data once city #1 crosses 2 weeks of steady operation. Do not present any cell to a bank/investor without replacing the illustrative values.

## Formulas (in ₹, GST-inclusive unless noted)

```
AOV                 = average order value (booking or order)
GMV                 = Σ transaction value
Take rate           = net commission revenue ÷ GMV
Revenue / booking   = AOV × take rate (+ platform fee + ads share)
Variable cost/bkg   = gateway + notifications + support + refund-leak + incentives + video minutes + maps calls
Contribution/bkg    = Revenue/bkg − Variable cost/bkg
Patient LTV         = Contribution/bkg × bookings/yr × retention-years (− reactivation cost)
Provider LTV        = Subscription + commission contribution over active life − success costs
CAC (patient/prov)  = acquisition spend ÷ new paying patients/activated providers
Payback (months)    = CAC ÷ monthly contribution per customer
Break-even bkgs/mo  = Fixed monthly costs ÷ Contribution per booking (blended)
```

## Category rows (pre-pilot illustrative)

| Category | AOV | Take rate | Provider payout % | Gateway+var cost/bkg | Support cost/bkg | Contribution/bkg | Frequency/yr | Refund % | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Dental (RCT/cleaning) | ₹800 | 12% | 88% | ₹32 | ₹6 | ₹54 | 3 | 1% | §16 example worked to ₹64/bkg; refill-style repeat |
| Cardiology (consult) | ₹1,500 | 10% | 90% | ₹38 | ₹6 | ₹106 | 1.5 | 1% | High-trust, high-AOV consult |
| Dermatology (consult) | ₹1,200 | 10% | 90% | ₹32 | ₹6 | ₹82 | 2 | 1% | High repeat within 30d |
| Diagnostics (CBC/MRI) | ₹600 | 8% | 92% | ₹22 | ₹6 | ₹26 | 2 | 2% | Price-sensitive, bundle with scan slots |
| Pharmacy (OTC order) | ₹300 | 5% | 95% | ₹24 | ₹6 | −₹15 | 6 | 3% | Must not subsidise; retention use only |
| Wellness (Gym/Yoga) | ₹2,000 | 15% | 85% | ₹40 | ₹6 | ₹254 | 1.2 | 2% | Membership/program recurring — ARPU higher |
| Home nursing | ₹2,500 | 12% | 88% | ₹80 | ₹12 | ₹208 | 4 | 1% | Home-visit logistics in var cost |
| Equipment rental (CPAP/wheelchair) | ₹1,500/mo + ₹2,000 deposit | 15% | 85% | ₹60 | ₹12 | ₹153 | 2 | 1% | Deposit float handled per §16 guardrails |
| Events/camps (ticket) | ₹500 | 20% | 80% | ₹15 | ₹4 | ₹81 | 1 | 2% | Sponsor funding ≠ influence on care |
| AYUSH (consult) | ₹700 | 10% | 90% | ₹26 | ₹6 | ₹38 | 2 | 1% | Growing segment; watch claims policy |
| Eye/ENT | ₹900 | 10% | 90% | ₹28 | ₹6 | ₹56 | 2 | 1% | |
| Lab packages | ₹2,000 | 8% | 92% | ₹45 | ₹8 | ₹105 | 1.5 | 2% | Cash collections via lab partner settlements |

## Provider economics

| Metric | Source | Target (R1) |
|---|---|---|
| Activation (first booking ≤14d) | Ops dashboard (`crm command-center` aggregates) | ≥ 70% of activated providers book within 14d |
| Active provider (≥ N bookings/mo) | `ProviderApplication`/`Provider.status === 'live'` | ≥ 60% after 30d |
| Provider LTV | subscription + commission | ≥ ₹5,000 per active provider |
| Payout TAT | `payouts` job + reconciliation | ≤ 3 working days |
| Quality | rating avg (verified reviews) | ≥ 4.2 |

## Patient economics

| Metric | Source | Target (R1) |
|---|---|---|
| Bookings/active patient/yr | bookings table cohort | ≥ 3 |
| Contribution/yr | above × take rate | ≥ ₹150 |
| LTV | 2-year retention model | ≥ ₹300 |
| CAC target (LTV:CAC ≥ 3) | paid + organic split | ≤ ₹100 |
| Payback | months to break even | ≤ 8 months |

## Scenarios (fill the three columns before R1 decision gate)

| Variable | Conservative | Base | Optimistic |
|---|---|---|---|
| Take rate (blended) | 8% | 10% | 12% |
| Refund % | 3% | 1.5% | 0.5% |
| Repeat frequency/yr | 2 | 3 | 4 |
| Provider churn/mo | 12% | 8% | 4% |
| Patient CAC | ₹150 | ₹100 | ₹60 |

## When to replace illustrative numbers
Multi-week window after city #1 goes live, once: (a) ≥ 100 completed bookings, (b) ≥ 40 live providers with ≥ 1 booking, (c) clean reconciliation of the first payout run, (d) one month of notification/support cost actuals. Replace cell-by-cell and attach the pilot export (`booking_status=completed`, `join_application.status=approved`).

## Governance
- **Owner:** founder/finance lead; reviewed monthly with ops.
- **Data sources:** `Appointment` (completed), `Payment`, `Membership`, `Provider`, `ProviderApplication`, `ServiceCity` (`launchGate` readiness).
- **Related docs:** `pricing-hypotheses.md`, `budget-1k-bookings.md`, `docs/ops/monthly-metrics-review.md`, `16-Business-and-Unit-Economics.md`.
