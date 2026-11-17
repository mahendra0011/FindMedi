# Support team training — curriculum & completion record

> Required for the ops item: "Support team trained (privacy, safety, crisis, refunds, Rx basics)".
> **Prereq:** new support hires complete this before handling tickets solo. Senior agents re-complete annually or after any SOP change.

## Modules (target 2 days; each ends with a 10-question quiz, pass ≥ 80%)

### Module 1 — Platform & privacy basics (2h)
- What FindMedi is / isn't (coordination, not advice; 112/108 routing)
- How to read a ticket; SLA tiers; escalation triggers
- Privacy: OTP never asked; verify identity; masked PII; reveal-with-reason + audit log
- DPDP: access/erase/export requests → verify → DPO queue; no "I'll just look"
- Discreet/sensitive categories: neutral wording, no marketing push, no record screenshots
- Healthcare lingo: Rx, OPD, IPD, vital; basic drug name familiarity

### Module 2 — Safety & crisis (3h; run by Clinical Advisor)
- SOS flow: call to patient/emergency contact → 112 advice → live location → provider suspend
- Crisis keywords: suicide/self-harm/violence → trained-staff script (never banned/punished)
- Tele-MANAS 14416; 112; Rwa/108; hospital ER escalation
- Red-flag symptoms to surface to a human immediately: chest pain, stroke signs, severe bleeding, pregnancy bleeding, suicidal ideation
- What NOT to do: diagnose, advise dosage, promise wait times for SOS

### Module 3 — Bookings, refunds, payments (2h)
- Booking flow end to end; fees shown pre-pay; cancellation tiers (2h+ full refund / 2h− partial / <4h standby)
- Refund trace: payment id → booking → status; when to refund vs escalate
- Wallet credits; coupon/abuse handling; reporting card fraud patterns to T&S
- Refund SLA: 3–7 business days; bank/UPI delays explained to patient scripts

### Module 4 — Orders, Rx & delivery (2h)
- Rx upload: valid doctor/patient/date → licensed pharmacy fulfilment; Schedule H/X stops
- Substitution consent flow (where implemented); wrong-drug = Sev-2 protocol
- Delivery OTP hand-off; returns within 48h (sealed/unopened only); refund path
- Medicine name familiarity (100 common molecules); generics vs brands
- Never: read out a prescription aloud on call; always: confirm via the patient's own message

### Module 5 — Provider onboarding & KYC ops (2h)
- KYC queue: checklists per type; document expiry tracking (60/30/7-day reminders)
- Two-person approval for high-risk types; "needs-info" loop etiquette
- Provider complaint handling: open dispute → evidence 48h → decision → appeal window
- Probation rules (booking caps, payout holds); do not promise payout dates to provider

### Module 6 — Systems & tools (3h; hands-on)
- `SupportTicket` dashboard in admin console; status columns; SLA timer interpretation
- Call recording consent (two-party consent states); screen-share rules (no PHI)
- Macro usage: acknowledgement, no-show apology, refund confirmation, crisis outreach, privacy verification
- `#eng-alerts` vs `#t-safety` vs `#billing-finance` routing
- Escalation etiquette: when to page Engineering vs continue investigation; never page for Tier-3 issues
- Session security: never hold prod credentials; use the shared ops-laptop SSO; log off when leaving

## Completion record (append per agent)

| Name | Role | Date | M1 | M2 | M3 | M4 | M5 | M6 | Quiz pass | Signed off by | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Support T1 | | | | | | | | | | |

## Annual refresh
- Jan: privacy + crisis refresher (mandatory for all support staff)
- May: refund/payments policy refresher
- Sep: provider KYC refresher
- Any post-incident debrief: affected modules re-delivered within 14 days

## Who delivers
Clinical Advisor → Modules 2, 4 (DDI/Rx). Ops Lead → Modules 1, 3, 5, 6. Security Lead → Module 1 privacy segment.
