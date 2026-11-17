# Take-rate/plan pricing hypotheses & pilot experiment plan

> Source: `FindMedi-Final-Docs/16-Business-and-Unit-Economics.md` §2, §3, §11.
> **Status:** pre-pilot (R1). Hypotheses to be validated with one-city pilot data; no price is locked platform-wide before the experiment.

## Hypotheses

| ID | Hypothesis | Metric | Status |
|---|---|---|---|
| H1 | 10–15% commission on appointments is sustainable for providers (payout ≥ 85% of GMV per booking) | Provider activation rate; payout complaints per 1k bookings | untested |
| H2 | Free provider tier drives supply; conversion to paid at ~100 bookings/mo | Provider activation vs paying conversion | untested |
| H3 | Subscription plans (Basic ₹999/mo, Premium ₹2,499/mo) improve provider LTV and retention | Provider LTV:CAC, churn | untested |
| H4 | Patient-side convenience fee of ₹20–50 for home visits does not depress conversion > X% | Home-visit funnel (view→book) | untested |
| H5 | Featured listing price at ₹999/mo for 30 days boosts bookings < 25% without quality loss | Sponsored CTR, booking share, rating trend | untested |
| H6 | Events: ₹49 nominal ticket reduces no-shows vs free | Event no-show rate | untested |

## Experiment design

### Design principles
- Only one variable per experiment.
- City-randomized (Bhopal vs city pair) where feasible; user-randomized otherwise.
- Feature flag control (`featureFlags.ts`/`featureFlags.js` with PostHog; no new deploy per variant).
- Pre-registered success/guardrail metrics; stop on guardrail breach.

### Guardrails (auto-stop if breached)
- Booking success rate drops > 3% vs holdback.
- Refund rate > 3% of GMV.
- Complaint rate > 2× baseline.
- Payment failure share > 5%.
- Provider rejection of price > 25% of sampled onboarded providers.

### Experiments (order)
1. **EXP-001 Pricing A/B (take rate)** — Bhopal: 8% vs 12% take rate for dental/consult categories. 4 weeks. Primary: provider activation (first booking ≤14d); guardrail: payout disputes.
2. **EXP-002 Plan pricing (Basic vs Premium)** — first 50 providers/city: free 60-day trial of Premium vs direct Basic. Measures conversion & churn at day 60.
3. **EXP-003 Featured listing price** — ₹499 vs ₹999 vs ₹1,499/mo. 6 weeks. Guardrail: rating drift, compliant-claims enforcement.
4. **EXP-004 Patient fee (home visit)** — free vs ₹29 vs ₹49. 4 weeks. Guardrail: funnel drop-off > 15% = stop.
5. **EXP-005 Event ticket** — free vs ₹49. Camps only. Measures no-show rate.

## Sample size & duration
Rule of thumb (pre-pilot, 1 city, low baseline variance):
- Conversion experiments: ≥ 200 eligible providers per arm (or 4 weeks, whichever longer).
- Home-visit fee: ≥ 300 eligible bookings per arm (3 weeks).
- Events: ≥ 150 registrations per arm.
If a city lacks volume after 2 weeks, extend rather than shrink — do not declare "no effect" from under-powered tests.

## Feature-flag implementation
- Flags: `pricing_exp_a`, `pricing_exp_b`, `plan_featured_pricing`, `home_visit_fee_*` in Unleash/PostHog (`frontend/src/services/featureFlags.ts`, `backend/src/services/featureFlags.js`).
- Assignment logged as `experiment_exposed` { flag, variant } (see events.yaml; variant tag only, no PHI).
- Cohort resolved at pricing service call time (`pricingService.js`).
- All variants exist on disk as data; no code branches per variant.

## Review cadence
- Weekly (in pilot): 30-min experiment readout, stop/continue decision.
- Monthly: ops review with finance — update `unit-economics-sheet.md` with realized values.
- Quarterly: pricing review (this doc versioned).
- All changes require founder + finance sign-off; records appended at the bottom of this file.

## When parameters land in production
Pricing changes ship guarded by flags and stay reversible per variant. No platform-wide price change without: (1) pilot evidence in `unit-economics-sheet.md`, (2) finance sign-off, (3) one-liner in `17-Analytics-Event-Taxonomy.md` noting the variant exposure (if external/marketing-visible), (4) provider notice per Provider Agreement (30 days for material fee changes).

## Sign-off log
| Date | Change | Decision by | Evidence |
|---|---|---|---|
| 2026-11-15 | Initial hypotheses drafted | docs audit + repo scan | this file |
