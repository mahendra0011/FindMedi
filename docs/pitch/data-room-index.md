# Data room index — FindMedi

> Purpose: investor / partner / due-diligence index. Stages: (1) request letter → NDA → (2) reviewed data room
> FindMedi opens upon qualified interest, (3) Q&A log appended. Do not publish this index externally.

## A. Company & incorporation
- Certificate of incorporation + CIN (pending final draft with counsel sign-off)
- Cap table (founder + ESOP pool draft)
- Founder bios + clinician advisor bio (NMC registration redacted)
- Registered address + GST registration

## B. Product & technology
- Architecture overview (`docs/platform-architecture.md`)
- Roadmap + R-1→R4 gates (`FindMedi-Final-Docs/14-Implementation-Roadmap.md`)
- Wireframes / design system (`11-Design-System.md`, `12-Wireframes-and-Screen-Flows.md`)
- Test coverage report: 450 (doc-mapped) backend integration + 447 frontend unit + 5 Telemedicine + 14 critical E2E journeys (hi+en)
- Authz manifest: `backend/authz-manifest.json` — 1,907 routes classified, 0 unclassified

## C. Security & compliance
- `SECURITY.md`
- `docs/privacy/DPIA.md` (PostHog/Unleash/Sentry flows included)
- `docs/privacy/RETENTION.md`
- `docs/legal/privacy-policy-alignment.md`
- `docs/legal/ACCEPTANCE-LOG.md`
- Break-glass policy + DPO review process (`docs/superadmin-privacy-implementation-status.md`)
- Pentest status: ZAP baseline in CI (staging); external pentest planned but **not yet executed** — see `docs/pitch/security-compliance-slide.md`

## D. Business & unit economics
- `docs/business/unit-economics-sheet.md` (pre-pilot, illustrative; replace with measured data at pilot)
- `docs/business/budget-1k-bookings.md` (infra+support cost model)
- `docs/business/pricing-hypotheses.md` (H1–H6, EXP-001..005)
- `docs/legal/agreed-terms.md` (current ToS/Privacy/Provider Agreement acceptance rates; awaiting counsel sign-off)
- `FindMedi-Final-Docs/16-Business-and-Unit-Economics.md`

## E. Market & competition
- `docs/pitch/market-sizing.md` (InsightRx, IBEF, Ken Research sourced)
- `docs/pitch/competitor-research.md` (Tata 1mg, Apollo 24/7, PharmEasy, Practo, Netmeds, Lybrate/Portea)
- Beachhead strategy (tier-2/3 city launch)

## F. Traction & pipeline (pre-revenue — mark as such)
- Live verified catalogue (2 seed providers: Smile Dental Studio + Dr. Priya Sharma — clearly marked demo)
- Pilot interest log (LOIs from 2 clinics in Jabalpur — verbal; convert to written before sharing)
- Pipeline metrics: `crm` command-center dashboard (leads → applications → live) — internal only; aggregate export masked for sharing

## G. Team & advisors
- Founder bios, advisor CVs, hiring plan 12m (see `docs/pitch/team-advisors-slide.md`)
- Advisor letters of interest (pending written consents — required before sharing)

## H. Fundraising
- `docs/pitch/fundraising-ask.md` (ask, use of funds, milestones, KPIs)
- Proposed terms sheet draft (counsel-reviewed — placeholder until counsel signs)
- Runway model (`docs/business/budget-1k-bookings.md`)

## I. References
- Provider reference 1: Smile Dental Studio owner (verbal) — get written consent before sharing identity
- Provider reference 2: Dr. Priya Sharma (verbal) — get written consent
- Partner reference: to be chosen (RWA / diagnostic chain / IMA chapter) — not yet engaged

## J. Due diligence checklist (to be filled with advisors)
- [ ] Incorporation docs filed
- [ ] Cap table reconciled
- [ ] Security posture sign-off (pentest done or scheduled)
- [ ] Privacy DPIA + records of processing shared
- [ ] Unit economics refreshed with pilot data
- [ ] Cap table / ESOP pool approved
- [ ] Advisors signed letters
- [ ] Data-room access tested on external drive/SaaS (ShareVault/DocBase)

## Rules for sharing
- NDA first, always.
- No sharing of production DB, raw patient records, or PHI.
- Aggregates only; k-anonymised cohorts ≥ 10 (see CRM command-center k-anonymous export).
- All exports logged to `auditLog`; share-with who, when, what.
