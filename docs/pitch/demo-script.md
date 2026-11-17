# Demo script — FindMedi (10 minutes, assume patient + provider flow)

> Purpose: angel/seed investor demo. Every step below has been verified against the live local build (2026-11-15). Routes are current `BrowserRouter` paths.
> **Backup video:** `docs/pitch/demo-backup.webm` — 6.3s, 484 KB, ~612 kbps, recorded 2026-11-16 with Playwright (`frontend/e2e/demo-backup.spec.ts`); shows splash → search "dental" → Smile Dental Studio card → Facility detail → Book Appointment modal → Escape. Quality is acceptable as emergency fallback. 
> **Context note:** Q&A rehearsal (investor role-play with advisor) remains a human activity — recording alone does not close the item. Live investor execution also requires a human in the room.

## Setup (2 minutes — before screen-share)
1. Backend + frontend running (`npm run dev` root).
2. Seeded data present: `smile-dental-studio` + `dr-priya-sharma` live and verified (from build seed). Search returns them.
3. Zoom/meeting ready; screen font ≥ 18px.

## 0. Opening — 30 seconds
Open `/` (home page). Say:
> "FindMedi is India's unified healthcare discovery and booking platform — doctors, labs, pharmacies, dentists, yoga studios, diagnostics, home services, equipment rentals, health camps — one search, verified providers, transparent prices, real reviews."

**Show:** hero → city selector (picks "Jabalpur") → search bar pre-filled "dentist" → tap Search.

## 1. Search flow (2 minutes) — the patient's problem
**Show:** search results with Smile Dental Studio card:
> VERIFIED badge · rating 4.7 (12 reviews) · price ₹600 · "Sponsored" label on the paid placement card if shown.
- Point out **sort strip** (Relevance / Nearest / Rating / Price low-high / Earliest / Experience / Most booked) — pick "Rating".
- Point out **quick chips** (Open now / 24x7 / Home visit / Video / Under ₹500 / Parking / Wheelchair …). Tap "Video" — count changes.
- Point out **Grid/List toggle** + distance/address + review count.

Say:
> "No CAPTCHA wall, no phone-number gate. Search → verified card → one tap to book."

## 2. Verify the listing — 1 minute
Tap the **Smile Dental Studio** card → `/facility/dental_clinic/smile-dental-studio`.
**Show:**
- Facility detail: specialties, price list (RCT ₹2,800 / cleaning ₹600 / etc.), hours table, amenities (parking, wheelchair, women-only hours).
- **Verified badge** + rating breakdown (5★ 82%, etc.).
- "Book Appointment" CTA (top-right + sticky rail).

Say:
> "Verification is on-screen. Any patient looking at any provider sees what was checked and what was not — no star inflation, no fake listings."

## 3. Booking flow — 2 minutes
Tap **Book Appointment**.
> Booking sheet opens with discreet mode toggle (shows our privacy-first design), provider, time-slot picker, fee breakdown, cancellation policy (2h full refund / 2h− partial / <4h standby fee).

Say:
> "Booking, payment, records, reminders — one flow. Cancellation is upfront; patient decides in seconds what to pay and when to cancel."

## 4. Provider view — 1 minute (the other side)
Open `/join-platform`.
**Show:**
- Full taxonomy search — type "Cardio" — narrows to cardiac specialty centers.
- "Answer 3 quick questions to discover your flow" wizard.
- 103 provider types across 8 groups with SLA/tier tags.

Say:
> "Same platform powers discovery and onboarding. A dentist in Jabalpur starts in the wizard, uploads licences, gets KYC-reviewed, and is live in 48 hours with a payout run every month."

## 5. Records + privacy — 30 seconds
Open `/patient/records` (or Records section).
> "Every booking flows to the patient's health record automatically. Consent center, access logs, discreet mode for sensitive categories (mental-health, IVF, de-addiction). AES-256 at rest, hash-chained audit log."

## 6. Platform proof (1 minute — slides back in)
Back to deck:
- "243 of 289 checklist items verified done across 26 doc areas — security, payments, pharmacy, booking, dashboards."
- "Authz manifest: 1,907 routes classified, 0 unclassified."
- "Zero PHI access for any platform role without an approved break-glass grant with DPO review."
- "CI in 12 suites. Playwright critical journeys in English + Hindi."

## Q&A prep cheatsheet
| Question | Answer |
|---|---|
| Market size? | See `docs/pitch/market-sizing.md` — India healthcare ~$400B FY26, beachhead SAM ~$2–3B, 5-yr SOM ~$20–30M GMV. |
| Why now? | DPDP-era privacy expectations + digital health penetration + tier-2/3 gap (larger slice, no tier-1-generic product). |
| Revenue? | Take rate on booking (10–15%) + subscription plans + featured listings + events/enrolment. |
| Unit economics? | See `docs/business/unit-economics-sheet.md`; model only, replace with pilot data. |
| Why no big player? | Tata/Apollo are pharmacy or hospital-led, tier-1-first, no discreet/scheduled provider types — we focus tier-2/3 + full 103-category discovery. |
| Legal risk? | NMC telemedicine rule work (legal sign-off pending), ASCI ad-claims workflow (rules enforced, sign-off pending), DPDP — redacted, lawyer-signed before public launch. |
| Moat? | Verified supply density + discreet sensitive categories + config-driven onboarding loop (provider density flywheel). |
| Ask? | Pre-seed / seed — `$1–2M`, 18–24 months runway, 5 cities, 1,000 verified providers. See `docs/pitch/fundraising-ask.md`. |

## Demo failure runbook
1. Blank search → fall back to `/join-platform` (always loads).
2. Booking sheet fails → show the fee breakdown & cancellation policy UI statically.
3. Live API down → pivot to `docs/pitch/` screens via slides with the same narrative.
4. Always have a backup short screen-recording on USB / phone offline.
