# Budget: infra + SMS/WhatsApp + support per 1k bookings

> Source: `FindMedi-Final-Docs/16-Business-and-Unit-Economics.md` §4 cost structure & §5.3.
> **Status:** pre-pilot engineering budget derived from current deployment. All vendor rates are illustrative until the first month of real usage — replace with invoice actuals before city #2.

## Cost model per 1,000 completed bookings/orders (₹)

| # | Bucket | Cost (₹) | Basis / driver |
|---|---|---|---|
| 1 | Hosting (API + frontend) | 1,200–2,000 | Node API on Render (2 instances at peak) + static frontend; 100k req / month at current scale |
| 2 | Database (Mongo Atlas M10) | 1,500–2,500 | ~2 GB data, 99.9% SLA, PITR backups |
| 3 | Object storage (Cloudinary free→paid) | 200–800 | Cloudinary free tier → paid tier at scale |
| 4 | CDN / edge (Cloudflare Free/Pro) | 0–1,500 | Free tier ok for launch traffic; Pro for cache rules |
| 5 | Redis (attended + BullMQ) | 400–900 | 256 MB RAM plan |
| 6 | OpenSearch (self-host) / managed | 600–1,200 | single-node or Atlas Search |
| 7 | Messaging — SMS (Twilio/MSG91) | 600–1,200 | ~500–800 OTPs + reminders per 1k bookings @ ₹0.60–1.00 |
| 8 | Messaging — WhatsApp (DLT) | 200–600 | template sends, utility category |
| 9 | Messaging — Email (Brevo) | 0–200 | free tier sufficient |
| 10 | Video minutes (LiveKit Cloud) | 400–1,000 | ~10% of bookings as video consults, 10 min avg |
| 11 | Maps (MapTiler/OSM) | 100–400 | geocode + tile requests |
| 12 | Support (1 agent per 600 tickets/mo) | 1,500–3,500 | 8–12% ticket contact rate typical for first-city pilot |
| 13 | Payment gateway | 2% of GMV | pass-through fee; listed for completeness |
| 14 | KYC/verification APIs (Shield) | 200–600 | per verification checked at join/payout |
| 15 | Observability (Sentry free + logs) | 0–400 | Sentry free tier ok; 10k errors/mo |
| 16 | Misc (domain, SSL, DNS) | 50–100 | annualised |
| | **Subtotal (excl. gateway & GMV-linked)** | **~₹6,850–14,950 / 1,000 bookings** |  |

## Fixed (monthly, excluded above)

| # | Bucket | Cost (₹/mo) |
|---|---|---|
| 17 | CI/CD & lint (GitHub Actions) | 0 (public repo) |
| 18 | Staging environment (1x smaller replica) | 2,000–4,000 |
| 19 | Legal/CA retainer (as applicable) | 5,000–20,000 |
| 20 | Security scans (ZAP free in CI) + annual pentest | ~25,000 amortised |
| 21 | Founder + CTO time (opportunity cost) | — |

## Scaling laws

- **Hosting & DB**: sub-linear in bookings (shared compute) — doubles ~every 4× bookings, not per booking.
- **Messaging**: linear in active bookings + reminders at ~1.4 SMS per booking (OTP + day-before) + 1 WhatsApp template where opted in.
- **Support**: linear in tickets; target ticket rate ≤ 5% of bookings with good UX; invest in macros/FAQ first.
- **Money-moving costs (gateway, coupons, refunds)** scale with GMV, not with overhead budget — monitor payback vs payouts weekly.

## Gate criteria (expand budget only when)

- City #1 reaches ≥ 1,000 completed bookings and ≥ 100 paying providers in any 30-day window, AND
- Infra cost per booking ≤ ₹15 (all-in infra+tech, excluding GMV-linked costs), AND
- Support cost per booking ≤ ₹12 with CSAT ≥ 4.0.

## Replacement instructions

Populate rows 1–16 with invoice actuals (Render, Atlas, Cloudinary, Brevo, Twilio/MSG91, LiveKit, MapTiler, Sentry) after month 1 of city #1, then recompute the per-1k unit cost, then update `unit-economics-sheet.md` if targets slip.

## Governance
- **Owner:** founder + finance/ops lead.
- **Reviewed:** monthly with the metrics review (`docs/ops/monthly-metrics-review.md`).
- **Related:** `unit-economics-sheet.md`, `pricing-hypotheses.md`, `16-Business-and-Unit-Economics.md` §4, `17-Analytics-Event-Taxonomy.md`.
