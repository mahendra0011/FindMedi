# 04 — Provider / Practitioner Profile Pages (Spec)

> **Existing (✅):** Doctor profile (`DoctorProfile`, `HospitalDoctor`, doctor cards), `LawyerProfile`, `AssistantProfile`, `TechnicianDetail`, `PsychiatristDetail` (mind module).
> **Goal:** ek **`PractitionerProfileLayout`** jo type ke hisaab se sections badle — doctor se leke yoga trainer tak.

---

## 1. Common profile layout

```
[Breadcrumb]
[Header: photo · name (+title) ✓ · specialty/role · ★ avg (n) · experience · languages · Save · Share · Report]
[Sticky booking widget: mode tabs → date → slots → Book]   (right rail desktop / bottom sheet mobile)
[Sections: About · Services & Fees · Experience & Education · Where they practise · Availability · Reviews · FAQs · Related]
```

### 1.1 Common sections

| Section | Content |
|---|---|
| **Header** | Photo (real, reviewed), full name, title (Dr./Physio/Ar./Yogi), role/specialty chips, verification badge ("Registration verified: Council, Reg# partially masked, verified on date") |
| **Quick facts** | Experience, languages, gender, consultation modes, response time, patients served (only if public-safe aggregate), city/area |
| **About** | Bio (300–600 chars), approach/philosophy, conditions treated, special interests |
| **Services & Fees** | Table per **mode** (in-person / video / audio / chat / home visit): duration, fee, follow-up fee/window, what's included |
| **Education & Experience** | Degrees (institute, year), fellowships, certifications, work history, memberships (IMA, IAP, IDA…), awards, publications (optional) |
| **Where they practise** | Clinics/hospitals/studios with address, days/timings, map; per-location fees |
| **Availability** | Weekly pattern, next 7 days slots, leave calendar, emergency/after-hours info |
| **Reviews** | Rating histogram, verified-booking badge, filter by mode/condition, provider replies, report review |
| **Q&A / FAQs** | Provider FAQs + platform defaults ("What to carry?", "How follow-ups work") |
| **Content** (optional) | Articles/videos authored by them (doctor-reviewed ✓) |
| **Related** | Similar practitioners nearby, other doctors in same clinic |
| **Disclaimer** | "Not for emergencies. Call 108/112." (medical profiles) |

### 1.2 Booking widget behaviour
- Mode selector (only modes the provider supports; icons) → fee updates
- Date strip (next 14 days) → time slots (morning/afternoon/evening), **waitlist** if full ✅
- "Book for: Self / Family member ✅ / Someone else"
- Instant confirm vs **request-based** (provider approves) — configurable per provider
- Show cancellation policy + fee before pay
- Sticky price breakup (fee + platform fee + GST)

### 1.3 SEO
`/doctors/<specialty>/<city>/<slug>` · JSON-LD `Physician` (medical) / `Person`+`LocalBusiness` (wellness) · only publish `aggregateRating` with real reviews · noindex unverified.

### 1.4 Privacy
Profile = professional info only. Never expose personal mobile/email/home address; use platform messaging/relay. Home-based practitioners: show **area** only.

---

## 2. Type-specific profiles

### Profile ↔ catalogue map

| Catalogue §2 group | Profiles |
|---|---|
| Doctors & specialties | 2.1 Doctor · 2.2 Dentist · 2.7 Psychiatrist |
| AYUSH practitioners | 2.3 |
| Allied & therapy | 2.4 Physio · 2.5 Dietitian · 2.8 Speech/OT/special educator · 2.11 Phlebotomist/lab tech · 2.17 Optometrist/Audiologist · 2.18 Radiographer/Sonographer · 2.20 Pharmacist · 2.9 Nurse |
| Mental-health professionals 🔒 | 2.6 Counsellor/Psychologist · 2.7 Psychiatrist |
| Wellness professionals | 2.12 Yoga teacher · 2.13 Personal trainer · 2.19 Group-fitness/meditation instructor |
| Care & support | 2.10 Attendant/caregiver |
| Professional | 2.14 Lawyer · 2.15 TPA desk executive |
| Community | 2.16 Event host/trainer |



### 2.1 Doctor ✅ (upgrade)
- Canonical **specialty + sub-specialty** (taxonomy), conditions treated, procedures performed
- Registration: **council name + reg no. (masked)**, "Verified" with scope
- Affiliations: hospitals/clinics with days/timings/fee each
- Modes: in-clinic, video, audio, chat, home visit (fee each)
- **Consultation info:** duration, follow-up window ("free follow-up 7 days"), what to carry, fasting/prep
- Languages, gender (women-doctor filter)
- Insurance/schemes accepted at their location
- Online prescription & e-records via platform ✅ (ABHA/consent ✅)
- **Second-opinion** option 🆕
- Content: health tips/articles (doctor-reviewed)
- Reviews: verified-visit only; no medical outcome claims in ratings text (moderation)
- **Not shown:** diagnosis-related patient stats, success rates, "cures"

### 2.2 🆕 Dentist
Dental sub-specialty (Ortho, Endo, Perio, Prostho, Oral surgery, Paedo), procedures & **price list** (cleaning, RCT, crown, implant, braces), clinic equipment (RVG/OPG), sterilisation note, before/after (consented), emergency slots, EMI, Kids-friendly.

### 2.3 🆕 AYUSH practitioner
System + specialty (Kayachikitsa, Panchakarma, Homeopathy classical…), council reg, treatments with duration/price, diet & lifestyle approach, in-house medicines (if DL), **disclaimer**: complementary care; claims moderated.

### 2.4 🆕 Physiotherapist
Focus areas (Neuro/Ortho/Sports/Paeds/Geriatric/Women's health), conditions treated, techniques (manual, electrotherapy, dry-needling*), **home visit** radius & fee, package pricing (10 sessions), equipment carried, assessment process, exercise-plan sharing via app, progress tracking ✅ (Physio module), registration.
*Techniques listed only if within scope/regulation.

### 2.5 🆕 Dietitian / Nutritionist
Specialties (Diabetes, PCOS, Renal, Weight, Sports, Paediatric, Pregnancy, Gut health), qualifications (RD/MSc), approach (Indian regional diets), **plan types** (1-week, 4-week, 12-week, maintenance), what's included (diet chart, WhatsApp/app check-ins, recipes, grocery list), sample plan (blurred preview), lab-report review, languages, price per plan/consult, success stories (consented, no guaranteed outcomes, "individual results vary").

### 2.6 Counsellor / Psychologist ✅ (mind module)
Type **clearly labelled**: *Clinical psychologist (RCI)* / *Counsellor* / *Peer mentor (not clinical)*. Concerns & modalities, age groups, languages, session length/price, **first session free?**, response time, anonymity option, cancellation, **crisis note** ("If in danger call Tele-MANAS 14416 / 112"), confidentiality statement, supervision/credentials. Mode: in-app video/audio/chat (LiveKit; **not** third-party meet links for sensitive sessions). Discreet mode by default.

### 2.7 Psychiatrist ✅
MD psychiatry, sub-specialty (child/de-addiction/geriatric), prescriptions allowed via platform (NMC telemedicine rules for Schedule drugs), follow-up policy, emergency guidance, discretion.

### 2.8 🆕 Speech / Occupational / Special educator
Focus (stuttering, aphasia, dysphagia / ADL, sensory integration / learning disabilities), age groups, assessment tools used, home vs centre, IEP/progress reports, parent involvement, RCI reg, price per session/package.

### 2.9 🆕 Nurse (home) / Home-nursing agency staff
Skills grid (IV, injection, wound, catheter, ostomy, ICU-at-home, palliative, newborn), experience, shift (4h/12h/24h) & price, languages, gender, **police verification + nursing council** badges, equipment carried, areas covered, reviews. **No** personal contact exposure.

### 2.10 ✅/🆕 Attendant / caregiver (AssistantProfile)
Experience, tasks (bathing, feeding, mobility, dementia care), languages, shift, price, availability calendar, ID & **police verified** ✅, references (optional), reviews, trial day option.

### 2.11 🆕 Phlebotomist / lab technician (TechnicianDetail ✅ extend)
Coverage area, slots, cold-chain kit, tests they can collect, qualification (DMLT), vaccination status (optional), rating, **ID badge** shown to patient at visit (QR verify).

### 2.12 🆕 Yoga teacher
Styles, levels, therapeutic/prenatal certifications (YCB), lineage/training, batches (studio/online/home), trial class, languages, class videos (preview), retreats, packages, women-only batches, **health-clearance note** ("consult your doctor if pregnant/injured"). No disease-cure claims.

### 2.13 🆕 Personal trainer / coach
Specialities (weight loss, strength, mobility, rehab-adjacent, senior fitness), certifications, transformation stories (consented, disclaimer), modes (gym/home/online), plans & price, assessments (PAR-Q), progress tracking, injuries-handled note.

### 2.14 ✅ Lawyer
Practice areas (Part C §21 taxonomy), bar council + state ✅, courts ✅, experience, languages, consultation fee/modes, case types handled, **medical-negligence/consumer-court focus**, documents needed checklist, response time, disclaimers (no legal advice via listing; Bar Council advertising rules — keep content factual, no solicitation claims).

### 2.15 🆕 TPA / cashless desk executive
TPA/insurer empanelment proof, insurers covered, cashless help, claim assistance, fee transparency, disclaimers.

### 2.16 🆕 Event host / trainer (CPR/first-aid, workshops)
Credentials (AHA/Red Cross/St John), courses, certificate issued, batch calendar, price, group/corporate options.

---

### 2.17 🆕 Optometrist / Audiologist
Role, registration ✓ (optometry council / RCI), services (eye test, refraction, contact-lens fitting · hearing test, hearing-aid fitting, tinnitus), equipment, age groups, home/centre options, price list, affiliated clinic/shop, prescription/report sharing via records.

### 2.18 🆕 Radiographer / Sonographer (facility-embedded profile)
Role, qualification, registration ✓ (PCPNDT for sonographers), modalities handled, facility affiliation, shifts (public: "available at <facility>"). Not bookable directly; shown on facility page. **No gender-determination content.**

### 2.19 🆕 Group-fitness / meditation instructor
Class types (Zumba, aerobics, Pilates, dance, meditation, pranayama), certifications, batch timetable, trial class, online/studio, level, price/month, women-only batches, health-clearance note.

### 2.20 🆕 Pharmacist (store-embedded profile)
Name, registration ✓, store affiliation, languages, "ask pharmacist" chat hours. Not a standalone listing; appears on pharmacy page (Rx verification contact).

## 3. Shared elements (all profiles)

### 3.1 Verification badge tiers
| Badge | Meaning |
|---|---|
| ✓ Identity verified | ID + photo match |
| ✓ Registration verified | Council/registration verified on <date> |
| ✓ Background checked | Police verification (attendants/nurses/drivers) |
| ✓ Top rated / Trusted | Algorithmic (rating, completion, low complaints) |
| ✓ Platform-trained | Completed training module |
Hover shows **what** was verified and **when**; expiry → badge removed.

### 3.2 Reviews
- Only after **completed booking** (verified-visit)
- Rate: overall + sub-ratings (communication, punctuality, hygiene, value)
- Text moderation (abuse, PII, medical-claim, defamation); provider can reply; report; edit window
- Sensitive categories: ratings optional/private

### 3.3 Response & reliability signals
Avg response time · on-time % · cancellation rate · acceptance rate (shown as bands, not raw numbers if harmful).

### 3.4 Contact policy
No direct phone/email exposure; in-app chat/call relay; masked numbers; contact only after booking confirmation (configurable).

### 3.5 Multi-language
Profile fields localised (bio in hi/en), languages spoken filter.

---

## 4. Profile management (provider-side editing)

| Area | Features |
|---|---|
| **Completeness meter** | Photo, bio, services, fees, availability, docs verified (target ≥ 85%) |
| **Edit with re-verification** | Changing name/registration/specialty → goes to review; fee/availability instant |
| **Preview as patient** | Live preview + SEO snippet |
| **Media** | Photo guidelines (formal, face visible), intro video (≤60s, moderated) |
| **Services/pricing** | Per mode, packages, follow-up rules, discounts (within platform rules) |
| **Availability** | Recurring templates, exceptions, leave ✅, buffer, max per slot, advance-booking window |
| **Policies** | Cancellation/reschedule/no-show, instant-confirm vs approval |
| **Content** | Write articles (moderated), upload certificates |
| **Privacy** | Hide from search (vacation), discreet mode, number masking |

## 5. Data contract (public DTO)
```
id, slug, name, title, photoUrl, roleType, specialty{code,label}, subSpecialties[], conditions[],
registration{council, numberMasked, verifiedAt}, badges[], experienceYears, languages[], gender,
modes[{mode,fee,duration,followUp}], locations[{facilityId,name,area,timings,fee}],
education[], certifications[], memberships[], bio, services[], packages[],
availabilitySummary, nextSlotAt, rating{avg,count,breakdown}, responseTime, isSponsored
```
Not public: personal phone/email, full registration no., bank, ID docs, home address.

## 6. Edge cases
Practitioner on leave · Registration expired (auto-hide booking) · Multi-clinic conflicts (same slot) · Retired/inactive · Name change · Disputed review · Duplicate profile (merge) · Practitioner leaves facility (affiliation end-date).

## 7. Security / compliance
- [ ] Public DTO only; sanitise bio/FAQ (no HTML); photo/video moderation
- [ ] Medical-claim guard (no "guaranteed cure", success-rate claims) — `adClaimsRestricted` categories
- [ ] Sensitive specialties (sexual health, mental health, de-addiction): discreet labels/notifications
- [ ] Minor-related practitioners: child-safeguarding policy
- [ ] NMC telemedicine rules (consent, ID, prescribing limits) enforced in booking flow
- [ ] Reviews: verified-booking only, rate limit, abuse detection
- [ ] Relay numbers/chat; no PII leaks in share links
