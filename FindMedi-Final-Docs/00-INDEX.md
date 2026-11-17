# FindMedi Platform Docs — Index

> Ye set: 00 index + 01-25 (execution + product/feature specs) + 26-28 (remaining-work consolidations of docs 01-15; originals intact). Naye categories ko existing FindMedi me kaise add karna hai - onboarding se leke dashboard tak.
>
> **Base:** repo scan (roles, JoinPlatform, cards, detail pages, BookingModal, dashboards) plus later verification passes (unit/integration tests, seed dry-run, typecheck/build). Har checklist item tabhi tick hoga jab uska code + evidence dono ho; human approval (legal/finance/content) wale items alag track hote hain.

> **Open TODO audit (2026-11-15, re-run after revert):** 34 Markdown files, 289 checklist entries, 251 checked and 38 open. Full file-and-line inventory, source paths and current evidence: [`00-Reference/FindMedi-Open-Items.md`](00-Reference/FindMedi-Open-Items.md). "100%" is not claimed while any required item remains open. Docs 01-15 were re-verified end-to-end (codebase/tests/Chrome) on 2026-11-15 and restored (an earlier same-day edit had deleted them; reverted); the remaining items from those docs are consolidated with verbatim detail in files 26-28.

## Category alignment (current catalogue)

Ye saari files **`FindMedi-Categories-Pruned.md`** (24 sections) aur **`FindMedi-Subcategories-Pruned.md`** ke hisaab se align hain — reference files `00-Reference/` folder me hain: `FindMedi-Categories-Pruned.md`, `FindMedi-Subcategories-Pruned.md`, `FindMedi-Browse-By-Specialties.md`, `FindMedi-Browse-By-Specialties-TODO.md`. Faltu categories kisi file me nahi hain (hata di gayi categories ki list `FindMedi-Categories-Pruned.md` ke aakhir me hai).
`🆕` marker = spec ke hisaab se naya build; repo me abhi kya hai uska status `FindMedi-Categories-Pruned.md` ke Status column me hai (latest `origin/main` ke models/routes/pages se).

## Files

| # | File | Kya hai |
|---|---|---|
| 00 | `00-INDEX.md` | Ye file: map, build order, glossary |
| 26 | `26-Remaining-Mobile-and-Native.md` | Docs 01-15 survivors: the 5 incomplete mobile/native items from doc 15 (verbatim quotes + evidence + close criteria) |
| 27 | `27-Remaining-Legal-Security-Compliance.md` | Docs 01-15 survivors: the 8 incomplete legal/security/compliance items (verbatim quotes + evidence + close criteria) |
| 28 | `28-Remaining-Ops-Research-Launch.md` | Docs 01-15 survivors: the 3 incomplete ops/research items (verbatim quotes + evidence + close criteria) |
| 01 | `01-JoinPlatform-Onboarding.md` | Config-driven provider catalogue & wizard: 103 types in 8 groups, fields/docs per type, approval workflow, probation. **Verified done** (code + tests + Chrome) — remaining: none |
| 02 | `02-Listing-Cards.md` | Card anatomy + 38 card types (catalogue map): fields, badges, CTAs, states. **Verified done** (code + cards registry + tests + Chrome search) — remaining: none |
| 03 | `03-Facility-Detail-Pages.md` | Common layout + 26 type-specific detail pages: sections, SEO, trust, edge states. **Verified done** (code + Chrome live provider detail) — remaining: none |
| 04 | `04-Provider-Profiles.md` | Doctor/dentist/physio/etc. profile pages. Mostly done; 1 item open (NMC legal rule set) -> see `27-Remaining-Legal-Security-Compliance.md` S1 |
| 05 | `05-Booking-and-Order-Flows.md` | Appointments, home visit, lab, pharmacy, rental, camps, memberships. **Verified done** (flow code + Chrome booking modal, mode switching, telemedicine consent gate) — remaining: none |
| 06 | `06-Patient-Dashboard-Changes.md` | Patient dashboard additions. **Verified done** (code + adapter + tests + Chrome render) — remaining: none |
| 07 | `07-New-Role-Dashboards.md` | Shared modules + 30 role dashboards + permission matrix. **Verified done** (code + role-gated routes, typecheck) — remaining: none (role-gated click-through requires credentials) |
| 08 | `08-Admin-and-Moderation.md` | Superadmin/ops: categories, approvals, verification, moderation, disputes. **Verified done** (code + tests) — remaining: none |
| 09 | `09-Missing-Pieces-and-Cross-Cutting.md` | Search, notifications, trust & safety, payments, support, SEO, i18n, etc. Mostly done; 3 items open (grievance contacts, pentest, staffing) -> see `27-...` S2, `28-...` O1 |
| 10 | `10-Data-Model-and-API-Additions.md` | Models/fields/endpoints, migration. **Verified done** (all 12 checklist items) — remaining: none |
| 11 | `11-Design-System.md` | Tokens, components, a11y, i18n, PWA. **Verified done** (semantic tokens + components + vitest + a11y gates) — remaining: none |
| 12 | `12-Wireframes-and-Screen-Flows.md` | ASCII wireframes: home, search, cards, wizard, booking, orders, dashboards, ops, SOS. Design reference; 1 item open (usability study) -> see `28-Remaining-Ops-Research-Launch.md` O2 |
| 13 | `13-Legal-Drafts.md` | ToS, Privacy, Provider Agreement, Refund, Community, Disclaimer, Claims, Grievance. Drafts done; 4 items open (lawyer review, privacy sign-off, G.O/DPO contacts, localisation) -> see `27-Remaining-Legal-Security-Compliance.md` S2-S5 |
| 14 | `14-Implementation-Roadmap.md` | Sprint plan R-1 -> R4, DoD, risks. Plan complete; 2 items open (design sign-off, security review) -> see `27-Remaining-Legal-Security-Compliance.md` S6/S7 |
| 15 | `15-Mobile-App-Strategy.md` | PWA -> Capacitor -> native. Most done; 5 items open (native Android work) -> see `26-Remaining-Mobile-and-Native.md` M1-M5 |
| 16 | `16-Business-and-Unit-Economics.md` | Revenue streams, pricing, unit-economics formulas + illustrative example, legal guardrails |
| 17 | `17-Analytics-Event-Taxonomy.md` | PHI-free event dictionary, funnels, governance, architecture |
| 18 | `18-QA-and-Test-Plan.md` | Test pyramid, real-DB integration, E2E journeys, non-functional, clinical safety, UAT, release gates |
| 19 | `19-DevOps-Scaling-and-Cost.md` | Stage-wise infra, CI/CD, observability/SLOs, scaling, cost framework, DR |
| 20 | `20-Support-and-Ops-Playbooks.md` | SLAs, 17 SOPs, escalation matrix, staffing, provider success, field ops |
| 21 | `21-Marketing-Brand-SEO-Plan.md` | Brand, SEO (YMYL), partnerships, lifecycle, compliance, 90-day plan |
| 22 | `22-Pitch-Deck-Outline.md` | Slide-by-slide outline, Q&A prep, data room (**numbers aapke real data se**) |

| 23 | `23-SuperAdmin-Design-and-Privacy.md` | Super admin: role split, sections add/remove, break-glass PHI access, masked support, code changes |

| 24 | `24-Ops-CRM-and-Team-Management.md` | Super admin CRM: supply pipeline, partnerships, field ops, tasks, team, OKRs, command center, automation, build-vs-buy |

| 25 | `25-Access-Control-IAM-Design.md` | AWS-IAM jaisa tenant-level access control: custom roles/policies, scopes, conditions, temporary access, simulator, analyzer, healthcare controls, security |

> **Files 11-25 = "execution layer"**: business, analytics, QA, DevOps, ops, marketing, pitch, superadmin/IAM. Docs 01-15 (product/feature specs + design/legal/roadmap/mobile) verified done or open per item; remaining items consolidated in 26-28.

## Is set ki conventions

| Symbol | Matlab |
|---|---|
| ✅ | Repo me already hai |
| 🟡 | Partial / extend karna hai |
| 🆕 | Naya banana hai |
| T1 / T2 / T3 | Data sensitivity tier (T1 = PHI, T3 = commerce/wellness) |
| P1–P4 | Launch phase |

**New roles** were defined in `07-New-Role-Dashboards.md` (restored; implementation unchanged in repo).

## Existing building blocks (reuse karo, dobara mat banao)

| Area | Existing |
|---|---|
| Join flow | `JoinPlatform.tsx` delegates to `JoinWizard.tsx`; 103 API-backed provider types across 8 UI groups, per-type cards/images/config, and config-driven onboarding steps |
| Cards | `DoctorCard, HospitalCard, ClinicCard, DiagnosticCenterCard, PharmacyCard, AssistantCard, LawyerCard` |
| Detail pages | `HospitalProfile, ClinicDetail, DiagnosticCenterDetail, ImagingCenterDetail, MedicineStoreDetail, TechnicianDetail, LawyerProfile, AssistantProfile` |
| Booking | `BookingModal.tsx` — modes `offline / home_visit / video / audio / chat`; pay via card/UPI/netbanking/wallet; waitlist; reschedule frees seat |
| Patient dashboard | Stat tiles (Upcoming Appts, Active Prescriptions, Active Orders, Reports Ready, Notifications, Test Bookings, My Reviews) + Quick actions (Find Doctors, Home Visits, Video, Voice, Chat, Book Lab Test, Buy Medicine, Upload Report, Saved Doctors) + Health & Family, Appointments, Payments |
| Patient pages | Addresses, Appointments, Assistants, Booking history, Care plan, Family, Favorites, Health ID, Lawyers, Medicine orders/reminders, Payment, Prescriptions, Profile, Records, Referral, Refunds, Reports, Reviews, Rewards, Rides, Services, Settings, Support, Vitals |
| Role dashboards | doctor, clinic, labcenter, pharmacy, delivery, rider, ambulance, assistant, lawyer, hospital admin, superadmin (KYC, licenses, approvals, categories, disputes, KPIs, moderation, etc.) |
| Platform | wallet, loyalty/rewards, referral, coupons, chat, video (LiveKit), notifications, audit log, ABHA/consent, multi-city |

## Build order (recommended)

1. **Taxonomy fix** (specialty canonical list, Category tree) — dekho `00-Reference/FindMedi-Browse-By-Specialties.md` + `00-Reference/FindMedi-Subcategories-Pruned.md` + `00-Reference/FindMedi-Browse-By-Specialties-TODO.md`
2. **Generic provider/service model** (file 10) - taaki har naya type naya model na maange
3. **Onboarding (01)** → **Admin approval (08)** - pehle providers aa sakein
4. **Cards (02) + Detail pages (03) + Profiles (04)** - discoverability
5. **Booking/Order flows (05)** - revenue
6. **Dashboards (06, 07)** - retention + operations
7. **Cross-cutting (09)** - trust, search, notifications, support
8. **Phase-wise categories** (P1 → P4)

## Security hook (har naye type par)

- Naya provider type = naya attack surface: authz (role + tenant + object), upload scan, audit log, rate limits, field encryption (T1), admin approval gate — wahi controls jo hospital par hain.
- **T3 providers (gym, yoga, store)** ko patient ka medical data dikhana nahi.
- Verified badge sirf document verification ke baad.

## Glossary

- **Provider** — koi bhi jo service/product deta hai (facility ya individual)
- **Facility** — physical/org entity (hospital, clinic, lab, pharmacy, gym…)
- **Practitioner** — individual professional (doctor, physio, dietitian…)
- **Service** — bookable cheez (consult, test, session, rental, class)
- **Listing** — public page/card of provider/service
- **Slot** — time-bound capacity unit
- **Order** — physical goods flow (medicine, equipment, diet meals)
- **Booking** — time-bound service flow
- **Program/Membership** — recurring/subscription
- **Event** — camp/workshop/webinar with registration
