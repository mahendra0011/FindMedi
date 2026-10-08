# Platform Expansion — Phases & TODOs

> Source: 12 doc files in [`rolesmd/`](../rolesmd/) (`1.md`…`10.md` + `catogary.md` + `subcatogary.md`).
> Ye file **single source of truth** hai ki naye provider types (dental, eye, AYUSH, yoga/gym,
> dietitian, home nursing, equipment rental, camps, govt facilities…) repo me **kis order me**
> add honge aur har phase ka **engineering TODO** kya hai.
>
> Status legend (doc set se): ✅ repo me hai · 🟡 partial · 🆕 naya banana hai · T1/T2/T3 = data
> sensitivity tier · P1–P4 = category launch phase · R0–R4 = rollout phase.

**Build order (matlab ye file padhne ka order):** taxonomy fix → generic Provider/Service model →
onboarding + approval → cards/detail/profiles → booking flows → dashboards → cross-cutting →
phase-wise categories.

---

## 0. Source docs map

| Doc | File | Kya batata hai |
|---|---|---|
| 00 Index | `rolesmd/1.md` | conventions, glossary, build order, security hook |
| 01 Onboarding | `rolesmd/2.md` | config-driven join wizard, per-type fields/docs, approval workflow |
| 02 Cards | `rolesmd/3.md` | har entity ka card (fields, badges, CTAs, states) |
| 03 Detail pages | `rolesmd/4.md` | facility detail pages + section registry |
| 04 Profiles | ⚠️ **folder me missing** | practitioner profile pages (dentist, physio, dietitian, yoga trainer, lawyer practice-areas…) |
| 05 Booking/Orders | `rolesmd/5.md` | flows A–G, state machines, payments |
| 06 Patient dashboard | `rolesmd/6.md` | dashboard restructure + new routes |
| 07 Role dashboards | `rolesmd/7.md` | 24 naye role dashboards + permission matrix |
| 08 Admin/ops | `rolesmd/8.md` | KYC queue, moderation, taxonomy admin |
| 09 Cross-cutting | `rolesmd/9.md` | search, trust, notifications, payments, privacy (P0–P2) |
| 10 Data model | `rolesmd/10.md` | models, APIs, migration, rollout R0–R4, test/KPI lists |
| Category master | `rolesmd/catogary.md` | 27 sections, P1–P4 phase split |
| Subcategory audit | `rolesmd/subcatogary.md` | current-taxonomy problems + canonical tree + migration D1–D3 |

> Numbering note: folder ke `N.md` = doc `0(N-1)` (i.e. `1.md`=`00-INDEX`, `5.md`=`05-Booking`).
> Header titles inside files authoritative hain. Doc **04 (Provider Profiles) is set me hai hi nahi** —
> sirf 10 numbered files + 2 catalogue files = 12 total; 04 baad me paste/author karna hoga.

---

## 1. Phase map (kya kab)

| Phase | Kya | Weeks | Source |
|---|---|---|---|
| **R0 — Foundations** | Taxonomy fix (Category `code/aliases/path`, canonical specialties), `Provider`/`ProviderTypeConfig`/`ProviderApplication` models, config-driven join, admin approval upgrades, search v2, security TODOs | 2–4 | `10.md` §7, `subcatogary.md` D1 |
| **R1 — P1 categories** | Dental · Eye/Optical · Dietitian · AYUSH · Home sample collection · Home nursing · Equipment rental · Jan Aushadhi · Govt PHC/UPHC/Arogya Mandir · PM-JAY filter · Helpline directory · Govt hospitals — cards/detail/profile + booking flows A/B/C/G + patient dashboard v2 | 4–6 | `catogary.md` phase summary |
| **R2 — Engagement** | Gym/Yoga/Wellness (membership flow D) · Health camps/events engine (E) · Diabetes/BP programs · Women & child (vaccination, antenatal) · Elder care · Dialysis · Ortho/spine · Child therapy · Dermatology · Home doctor visit · Non-emergency transport · Second opinion · WhatsApp notifications | — | `catogary.md`, `10.md` §7 |
| **R3 — Commerce** | Supplements/health-food/skincare/devices marketplace (FSSAI/CDSCO) · Cancer/cardiac centres · Corporate wellness · Courses · Community forums · Medical EMI · AQI/dengue alerts | — | `catogary.md` |
| **R4 — Sensitive/regulated** | IVF · De-addiction · Palliative/hospice · Mortuary/funeral · Organ pledge · Transplant · Cosmetic surgery · Medical tourism · Research recruitment · Pharma/device B2B — **pentest + legal review ke baad hi** | — | `catogary.md`, `10.md` §7 |

**Launch rules (har nayi category par):** ek-ek phase, ek city se · tier-wise security (T1 = full
stack, T3 ko PHI kabhi nahi) · type-wise docs mandatory, unverified = no "verified" badge ·
health-claims moderation · sensitive categories me discreet notifications · state-wise regulation
lawyer se confirm.

---

## 2. TODOs — R0 Foundations (pehle ye)

### T0.1 Taxonomy (sabse pehle — `subcatogary.md` A1 + D1)

- [ ] Canonical specialty list + aliases banao (Hinglish/spelling variants: Orthopedics/Orthopaedics, Pediatrics/Paediatrics, Gynecology/Obstetrics & Gynaecology)
- [ ] `backend/src/models/Category.js` upgrade:
  - [ ] `type` enum 4 → 10+ (`specialty`, `facility_type`, `test`, `medicine`, `department`, `service`, `diet`, `event`, `wellness`, `legal_practice`, …) — abhi `Category.js:5` par sirf `test|medicine|department|service`
  - [ ] Add `code` (`^[A-Z]+(\.[A-Z0-9_]+)+$`, immutable), `aliases[]`, `path`, `level`, `externalCodes`
  - [ ] Unique index `{name,type}` → `{type,parent,name}` (ya `{type,code}`) — abhi `Category.js:14` duplicate-name blocker
- [ ] Migration script: `Doctor.specialization` (free-text, `Doctor.js:7`) → `specialtyCode` + `subSpecialtyCodes[]`; purane values `aliases` me; **dry-run report pehle**
- [ ] Same for `Facility.specialties[]`
- [ ] `Test.category` free-text (`Test.js:5`) → `categoryCode`; 3 test-category lists (seed 3 · AdminTestCatalog 9+4 · AllTests 21) → ek `Category(type:'test')` tree
- [ ] `Facility.type` 4-value enum (`Facility.js:8`) → `type` + `subType` + `ownership` + `systemOfMedicine`
- [ ] Medicine split: `Medicine.category` ek enum me mixed dimensions (`Medicine.js:6`) → `therapeuticClass` + `rxSchedule` (H/H1/X/NDPS) + `productLine` + `form`; `Vitamin`/`Vitamins` merge
- [ ] Appointment modes normalise: `home|home_visit`, `audio|voice|call` → `in_person|video|audio|chat|home_visit` (read-compat layer ke saath)
- [ ] `GET /api/categories/public?type=specialty` (cached, DTO-only) — abhi `routes/categories.js` me sirf superadmin CRUD hai, public GET **nahi hai**
- [ ] Frontend hardcoded lists API se populate karo (parity ke baad delete): `JoinPlatform.tsx:36`, `HospitalDirectory.tsx:16`, `ClinicDoctors.tsx:16,21`, `Doctors.tsx:8`, `HospitalDoctors.tsx:14`, `AdminDoctors.tsx:9`, `Appointments.tsx:10`, `OPDToken.tsx:78,134`, `DoctorConsultation.tsx:476`, `Reports.tsx:137`, `Inventory.tsx:163`, `Staff.tsx:88`
- [ ] `Home.tsx:64` hardcoded `"45+"` counts → DB counts
- [ ] `frontend/src/data/healthcareCatalogue.ts` routes → category-driven (specialty param codes se map ho)
- [ ] Superadmin category tree editor UI (extend `routes/categories.js` + admin page)
- [ ] Search: text index on `name+aliases`, spelling + Hindi/Hinglish synonyms ("bone doctor", "baccho ka doctor")

### T0.2 Generic provider/service models (`10.md` §2)

- [ ] 🆕 `Provider` — view/wrapper over `Facility/Hospital/Clinic` (feature-flag, **no destructive merge**)
- [ ] 🆕 `ProviderTypeConfig` — JSON config: `typeKey, group, tier, label, icon, steps[], requiredDocs[], optionalDocs[], approval{level,slaHours}, backend{model,subType}` (frontend + backend dono validate karein)
- [ ] 🆕 `ProviderApplication` (draft→submitted→under_review→needs_info→approved→live / rejected→appeal) + 🆕 `ProviderDocument` (status, expiryDate, verifiedBy/At, rejectionReason, version; 60/30/7-day expiry reminders)
- [ ] 🆕 `Practitioner` **ya** `Doctor` extend (decision + flag)
- [ ] 🆕 `Service`/`Offering`, 🆕 `Product`, 🆕 `Rental`/`AssetUnit`, 🆕 `Membership`/`Program`, 🆕 `Event` + `EventRegistration`
- [ ] Extend `Booking`/`Appointment` → generic booking + state machines; `PharmacyOrder` → generic `Order` (idempotency, double-booking protection)
- [ ] 🆕 `ModerationItem`, `Strike`, `PolicyAcceptance`, `DataSubjectRequest`; extend `Review`, `ConsentRecord`, `NotificationTemplate` (`discreetVariant`, locales)
- [ ] `Category` as in T0.1; `PatientProfile` extras (FamilyMember-based)
- [ ] Role registry + permission sets: `User.role` enum me naye roles (`rolesmd/7.md` §3: `dentist`, `optician`, `yoga_instructor`, `gym_owner`, `equipment_vendor`, `product_vendor`, `event_organizer`, `ngo_admin`, `blood_bank_admin`, `kyc_reviewer`, `finance_admin`, …) + authz manifest entries + audit events
- [ ] Feature flags per type/city (existing flag mechanism par)
- [ ] T1 field encryption (counselling/rehab/dental notes), T3 isolation from PHI

**Gate:** migration reversible (backup + mapping table), dual-read/dual-write period, contract tests for public DTOs.

---

## 3. TODOs — R1 onboarding + approval

- [ ] `JoinPlatform.tsx` → **config-driven wizard**: grouped type chooser (8 groups, ~25 types — `rolesmd/2.md` §2) + search/quiz; steps `account→business→location→practitioners→services→documents→payout→availability→agreement→review` config se
- [ ] Server-side config validation (frontend config par trust nahi), `.strict()` schemas
- [ ] Per-type docs upload: ClamAV scan, magic-byte, EXIF strip, private storage, signed short-lived URLs, view = audit event
- [ ] Payout/bank step: penny-drop + PAN name match, encrypted at rest
- [ ] Approval workflow upgrades (`rolesmd/2.md` §6): auto-checks (duplicate phone/GST/PAN/reg-no, blocklist), review queue + SLA (T3 24h · T1 48h · high-risk 3–5d), Needs-Info round-trip, tiered approval (T1 = KYC + clinical reviewer; high-risk = **two-person**), probation (no Trusted badge, booking cap, payout hold), appeal, live status tracker
- [ ] Admin ops console (`rolesmd/8.md`): KYC queue (extend `PendingApproval`/`License`/`KycCommand`), provider mgmt, catalog/tree admin, UGC moderation queues, disputes, finance/commission, feature flags, console audit
- [ ] Checklist (`8.md` §16): type-wise KYC configs · two-person approval · moderation SLAs + crisis escalation · `adClaimsRestricted` claim filters · DPDP DSR workflow · dual-approval/break-glass · reviewer PHI masking · versioned policy acceptance
- [ ] Post-approval: activation checklist (profile ≥80%, payout verified, slots, invites, policies, test booking) + staff invite flow (expiring single-use links, 2FA for owners via `TWO_FACTOR_REQUIRED_ROLES`)
- [ ] Anti-fraud: doc reuse across accounts, reg-no↔name mismatch, device/IP clustering, disposable email/VOIP, bank↔owner mismatch

---

## 4. TODOs — R1 discoverability (cards, detail, profiles)

- [ ] **Cards** (`rolesmd/3.md`): base card anatomy common banao; upgrade existing 7 cards (Doctor, Hospital, Clinic, Diagnostic, Pharmacy = View-only→CTA, Assistant, Lawyer, Counsellor); 🆕 ~16 cards (dentist, eye, AYUSH, physio/rehab, dietitian, nurse/home-nursing, yoga, gym, wellness, rental, product, package, event/camp, membership, govt facility, blood bank, ambulance, support-group, content)
- [ ] Card data contract (API per card kya dega) + variants (list/compact/map/featured) + filter chips + anti-patterns avoid
- [ ] **Detail pages** (`rolesmd/4.md`): section-registry pattern (`sectionsByType` → standalone components fed by public DTO, empty = auto-hide); upgrade Hospital/Clinic/Diagnostic/Pharmacy; 🆕 dental, eye, AYUSH, dialysis, maternity/IVF, rehab, blood bank, ambulance, gym, yoga, wellness, rental, store, govt facility, event, NGO, program
- [ ] Public DTO: gallery, services/prices, practitioners, verification{status,verifiedAt,scope}, stats — **never** full licence numbers, owner contacts, bank, internal notes (extend `dtoLeak.spec.js` 🟡)
- [ ] SEO/sharing: slug routes, OG tags, `Last verified/updated` display
- [ ] **Profiles** (doc 04 missing — spec re-derive from `rolesmd/3.md` card fields + `rolesmd/2.md` per-type fields): doctor upgrade + dentist, physio, dietitian, counsellor, psychiatrist, AYUSH practitioner, nurse, yoga trainer, lawyer (practice areas add — abhi missing), assistant
- [ ] Interactions: Book (→ BookingModal), Call (masked relay + `call_clicked` log), Directions, Save, Share (UTM, no PHI), Report → moderation

---

## 5. TODOs — R1/R2 booking & order flows (`rolesmd/5.md`)

| Flow | Kaun | TODO |
|---|---|---|
| **A. Slot Booking** | doctor, dentist, physio, dietitian, counsellor, lawyer, yoga 1:1, trainer, nurse visit, lab/imaging, eye test | Extend `BookingModal.tsx`: family member pick, guardian consent (minors), 5–10 min slot hold, waitlist ✅, upload reports, home-visit address, teleconsult + ABDM consents, fee breakup (GST/coupon/wallet/loyalty), state machine `CREATED→SLOT_HELD→PAYMENT_PENDING→CONFIRMED` (+`EXPIRED`, `PENDING_PROVIDER`, reschedule/cancel), provider-configurable cancel policy |
| **B. Request & Quote** | home nursing, dental plan, equipment install, IVF/dialysis intake, non-emergency ambulance | 🆕 quote + advance/escrow + provider respond/decline |
| **C. Order (goods)** | pharmacy ✅, supplements, health food, skincare, devices, optical | Non-medicine order states + delivery-partner flow extend; FSSAI/CDSCO fields (`licenseNo,batch,expiry,claims`), return/recall |
| **D. Membership/Program** | dialysis sessions, gym/yoga, diabetes program, chronic refill, meal subscription, physio package | 🆕 `Membership`/`Program` + renewals/churn |
| **E. Event registration** | camps, workshops, webinars, vaccination/blood drives, CPR training | 🆕 seats/capacity + registration + after-report |
| **F. Emergency/Instant** | SOS ✅, ambulance ✅, blood request 🟡 | reuse existing dispatch; add blood-request if missing |
| **G. Rental** | wheelchair, bed, O2 concentrator, CPAP | 🆕 deposit, delivery, sanitisation, damage/return |

- [ ] Common payments: UPI/card/netbanking/wallet ✅, pay-at-venue (provider-optional), loyalty ✅, coupon ✅ — **EMI (P3) deferred** (real gateway adapter = `DEFERRED_TODOS.md` #1)
- [ ] Notifications per flow (push/in-app ✅, SMS DLT templates, email ✅, WhatsApp = P1) + preference centre + **discreet mode** (no PHI on lock screen)
- [ ] Post-service: review (verified-booking only ✅-ish), refund/cancel, no-show policy, disputes (extend `Dispute`, `SupportTicket`)
- [ ] State-machine tests: double booking, idempotency, refund math

---

## 6. TODOs — dashboards (`6.md`, `7.md`)

**Patient (R1):**
- [ ] Restructure dashboard: alerts strip, "Today" card, personalised quick actions, Health snapshot, Upcoming, Orders & deliveries, Programs/memberships, Family & caregivers (extend), Records (extend), Discover, Wallet/Rewards/Referral ✅, Insurance & claims, Support & safety, Settings/privacy
- [ ] New routes: `/patient/timeline|programs|rentals|meals|events|vaccinations|insurance|wellness|consents|privacy|emergency-card`; `/patient/saved` extend (collections)
- [ ] First-time onboarding (language+city → who → interests) + persona variants (parent/elderly/caregiver/fitness/chronic/new-mother — defaults only, permissions nahi)
- [ ] Summary §8: API additions (dashboard aggregate endpoint)

**New role dashboards (R1: dentist, eye, dietitian, physio, home nursing, phlebotomist; R2: yoga, gym, wellness, equipment, product, event/NGO, blood bank, dialysis, IVF/maternity, rehab, govt, TPA, content, moderator, finance, KYC):**
- [ ] Shared dashboard shell + reuse calendar/bookings/payouts/reviews/staff modules; sidebar from permissions (config, not hardcoded)
- [ ] Mobile-first field UX (phlebotomist/nurse/rider/camp): offline queue, geo check-in, camera upload, OTP handover, SOS
- [ ] Per-role KPIs (`7.md` §7) + security checklist (`7.md` §8): enum + authz manifest + tests, least-privilege, 2FA for privileged, T1 field encryption, capped/audited exports, T3 no medical records

---

## 7. TODOs — cross-cutting P0 (`9.md`, launch se pehle)

- [ ] **Discovery:** unified search (P0, Hinglish + spelling), home/landing SEO (P0), map/nearby (P1), compare/shortlist (P2)
- [ ] **Trust (P0):** tiered expiring verification badges, verified-booking reviews, transparent pricing (GST breakup, estimate-vs-final), safety/hygiene info, disclaimers (not medical advice · emergency → 108/112 · intermediary role), grievance officer + E-Commerce Rules disclosures, "last verified" timestamps
- [ ] **Notifications (P0):** preference centre (category/channel/quiet hours/language/discreet), multilingual templates, no PHI in SMS, rate limits + dedupe + delivery receipts, provider-side alerts (booking/cancel/review/doc-expiry); WhatsApp = P1, IVR = P2
- [ ] **Payments/finance (P0):** GST invoices (platform+provider), TDS 194O, credit notes, escrow for quotes, reconciliation, payment-failure recovery, medical-expense statements — gateway adapter blocked on `DEFERRED_TODOS.md` #1
- [ ] **Trust & Safety (P0):** SOS always-visible ✅, helpline directory (112/108/102/14416/181/1098), mental-health crisis escalation, home-visit safety (ID/OTP/live-share/panic), harassment + child-safety reporting
- [ ] **Privacy (P0):** granular consent centre, DSR (access/correct/erase/export) with SLAs, children's (<18) guardian consent, retention/deletion automation, sensitive-category discreet display, vendor disclosure
- [ ] **Compliance map (P0–P1):** DPDP, Consumer Protection (ad-claims), E-Commerce Rules, PCPNDT (no gender-determination content), MHCA 2017 confidentiality, ART Act (IVF), Schedule H/H1/X controls, FSSAI/CDSCO product fields
- [ ] Reliability/ops + security P0 (authz matrix per new route, upload fuzz, IDOR sweeps, log-leak checks — §8)

---

## 8. Testing & rollout gates (har phase par)

- [ ] Contract tests: public DTOs leak nothing (`dtoLeak.spec.js` extend)
- [ ] Authz matrix per new route/role (`authMatrix.spec.js` extend): anon, wrong role, wrong tenant, wrong owner, expired, revoked
- [ ] Config validation test: har provider type config valid + required docs present
- [ ] State-machine tests (booking/order/membership/event) incl. concurrency + idempotency
- [ ] Search relevance (synonyms, Hinglish, spelling) · E2E Playwright: join→approve→live→search→book→pay→complete→review
- [ ] Load: search, slots, checkout, event registration · Security: ZAP baseline, upload fuzzing, IDOR sweep
- [ ] **Repo verification gate:** `npx eslint <touched files>` 0 errors + `npm run build` ✓ (`npm run typecheck` abhi repo-wide pre-existing errors ke wajah use nahi ho sakta)
- [ ] KPIs instrument: join funnel, approval TAT, search no-result, view→book, slot fill, cancel/no-show, payment success, refund TAT, moderation SLA, provider response time, NPS

---

## 9. Security hook (har naye provider type par — `1.md`)

1. Authz = role + tenant + object; server-assigned role/tenant (client se kabhi nahi)
2. Upload scan (ClamAV + magic bytes) · audit log for every reviewer/owner action · rate limits
3. T1 = field encryption + step-up for exports · **T3 (gym, yoga, store) ko patient medical data kabhi nahi**
4. Verified badge sirf document verification ke baad · drafts expire 30 days · no PII in email/SMS links (single-use, short-lived)

---

## 10. Known gaps / decisions pending

- [ ] `FindMedi-Subcategories-and-Category-Audit.md` naam ki alag file nahi mili — content `rolesmd/subcatogary.md` (PART A–D) me hai; decide karo: rename vs yahin reference
- [ ] `rolesmd/` files abhi untracked hain — commit karna hai ya `docs/` me move karna (suggested: `docs/platform-expansion/00-INDEX.md` … style rename, agar plan karo to ye file ka link update karo)
- [ ] `Doctor.specialization` → `specialtyCode` migration ke liye staging DB access + dry-run sign-off
- [ ] `Practitioner` naya model vs `Doctor` extend — R0 me decision chahiye (cards/profiles usi par depend karte hain)
- [ ] Razorpay real adapter (`DEFERRED_TODOS.md` #1) — R1 booking revenue se pehle chahiye
- [ ] State-wise regulatory names (doc lists `[R]` docs) lawyer se confirm — launch city decide hote hi
- [ ] Repo-wide typecheck cleanup (pre-existing errors) — user decision pending
