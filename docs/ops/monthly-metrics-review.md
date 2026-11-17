# Monthly metrics review & quarterly pricing review

> Source: `FindMedi-Final-Docs/16-Business-and-Unit-Economics.md` §9 (key metrics dashboard) & §11 (pricing experiments).
> **Cadence:** monthly metrics review (30 min, ops + finance) + quarterly pricing review (45 min, founder + finance + clinical advisor for sensitive-category pricing changes). Both happen every month/quarter regardless of growth news — no "skip this month" while platform is live.

## Monthly metrics review — agenda

1. **North star (5 min):** completed, satisfied bookings/orders per week, per city (with deltas vs prior 4 weeks).
2. **Marketplace health (10 min):** live providers, supply density, search→booking conversion, slot fill rate, GMV, take rate, cancellation %, no-show %.
3. **Unit economics (5 min):** contribution/booking (by category), CAC, LTV:CAC, payback (from `unit-economics-sheet.md`), refund rate, TAT for payouts.
4. **Ops & support (5 min):** onboarding TAT, KYC rejection %, support first-response/resolution times, top 3 ticket categories, SLA breaches.
5. **Trust & safety (5 min):** incidents per 1,000 bookings, moderation actions, takedowns, refund anomalies, open Sev-1/2 tickets.

### Data inputs (attach links, don't screenshots)
- `infra/observability/grafana/dashboards/findmedi-api.json` (API health) and `findmedi-booking-funnel.json` (funnel).
- Mongo aggregates from `AnalyticsEvent`, `Appointment`, `Payment`, `SupportTicket` (k-anonymous masks).
- `CRM command-center` output (city launch gate status per `ServiceCity.launchGate`).

### Decisions log
Each month appends to the bottom table:

| Month | North-star trend | CAC/LTV | Top action next month | Owner |
|---|---|---|---|---|
| 2026-11 | pre-pilot | pre-pilot | First pilot week's numbers review | founder |

### Cost of skipping
Alert fatigue, pricing creep, silent cash burn, provider churn discovered a quarter too late. The review is the cheapest early-warning system the platform has.

## Quarterly pricing review — agenda

1. **Pricing hypotheses scoreboard** — results of `EXP-001 … EXP-005` (see `pricing-hypotheses.md`); keep, kill, or extend each.
2. **Category take rates** — per-category pricing last quarter vs computed contribution (from finance).
3. **Featured/sponsored load** — cap hit? Rating drift? Claim-enforcement leaks?
4. **Membership plan economics** — plan conversion, ARPU, CAC payback, freeze/cancel reasons.
5. **Provider agreement (fee) compliance** — 30-day notice process for fee changes; doc 04 references.
6. **External factors** — GST/TCS updates, gateway fee changes, competitor price moves (pharmacy/lab).

### Sign-off
- Any pricing/tax change requires CA (GST/TDS/TCS) + founder sign-off recorded in this doc's log.
- Sensitive/regulated category pricing changes (IVF, de-addiction, palliative, mental health) require clinical advisor visibility — even if the change is just a take-rate band.

### Decisions log
Same structure; append each quarter.

## When to skip the review
Never. If the review has nothing new to say, that itself is a finding (signal: measurement pipeline broken — check ingestion health via `analytics-coverage.mjs` and `findmedi-api.json` dashboards).

## Related documents
- `16-Business-and-Unit-Economics.md` (spec §9–§11)
- `docs/business/unit-economics-sheet.md`
- `docs/business/pricing-hypotheses.md`
- `docs/business/budget-1k-bookings.md`
- `docs/ops/load-baselines/README.md`
