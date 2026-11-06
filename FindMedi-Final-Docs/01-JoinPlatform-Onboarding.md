# 01 — Join Platform / Provider Onboarding

> **Current (✅):** `JoinPlatform.tsx` me 10 types: Hospital, Clinic, Diagnostic, Pharmacy, Delivery, Rider, Assistant, Lawyer, Counsellor, Psychiatrist.
> Base steps: **Facility Type → Admin Account → Facility Info → Doctors & Services → Review & Submit**. Delivery/Rider/Assistant ke apne steps (Personal & KYC → Vehicle → Bank/Payout → Availability → Review).
> Status flow: `pending → approved / rejected / suspended` (+ `PendingApproval`, `License`, `KycCommand` superadmin pages).
>
> **Goal:** naye 20+ provider types ko ek hi **config-driven wizard** me lana (har type ka naya page nahi).

---

## 1. Design principle: Config-driven wizard

Har provider type ek **JSON config** se define ho: steps, fields, documents, validations, approval rules.

```js
{
  typeKey: 'dental_clinic',
  group: 'clinical',                // clinical | wellness | commerce | home_service | transport | community | professional
  tier: 'T1',                       // data sensitivity
  label: 'Dental Clinic',
  icon: 'Smile',
  steps: ['account', 'business', 'location', 'practitioners', 'services', 'documents', 'payout', 'availability', 'agreement', 'review'],
  requiredDocs: ['clinical_establishment_reg', 'dentist_council_reg', 'bmw_authorization', 'owner_id'],
  optionalDocs: ['nabh', 'fire_noc'],
  approval: { level: 'manual_kyc', slaHours: 48 },
  backend: { model: 'Facility', subType: 'dental' },
  ...
}
```
Backend me same config validate kare (frontend ka trust nahi).

## 2. Landing page: "Join FindMedi" (type chooser)

Grouped chooser — pruned catalogue (`FindMedi-Categories-Pruned.md`) aur subcategory list ke hisaab se. Har type ek `ProviderTypeConfig` (typeKey) hai jo Facility subtype / Practitioner role / Vendor / Organizer se map hota hai.

| Group | Types (catalogue section) |
|---|---|
| 🏥 Hospitals & clinics (§1) | Hospital (multi/super/single-specialty, nursing & maternity home, day-care surgery, govt/district, trauma, cancer, TB-chest, psychiatric, rehabilitation hospital) · Clinic (single-doctor, polyclinic, specialty, urgent-care, corporate/campus, telemedicine) · Dental clinic · Eye clinic · AYUSH clinic · Physiotherapy clinic · Fertility/IVF clinic 🔒 · Dialysis centre |
| 🧪 Diagnostics (§3) | Pathology lab · Imaging centre · Diagnostic centre · Collection centre/franchise · Home-collection lab · Mobile diagnostic van · Cardiac diagnostic centre · Sleep lab · Genetic/molecular lab · Blood bank |
| 💊 Pharmacy (§4) | Retail · Hospital pharmacy · Jan Aushadhi Kendra · Generic store · 24x7 · Online · Ayurvedic/Homeopathic store · Surgical/ortho store · Wholesale |
| 🏛 Govt facilities (§18) | PHC · CHC · UPHC · Sub-centre · Arogya Mandir (claim listing — info-first) |
| 👨‍⚕️ Practitioners (§2) | Doctor · Dentist · Physiotherapist · Dietitian/Nutritionist · Nurse · Psychologist/Counsellor/Psychiatrist 🔒 · AYUSH practitioner · Speech/Occupational therapist · Audiologist/Optometrist · Phlebotomist/Lab tech · Radiographer/Sonographer · Pharmacist |
| 🧠 Rehab & child development (§8–9) | Rehabilitation centre · Child-development/special-education centre · De-addiction centre 🔒 |
| 🧘 Wellness & fitness (§14) | Gym · Yoga studio/teacher · Wellness centre/spa · Personal trainer/group instructor · Sports academy |
| 🏠 Home & elder care (§11, §21) | Home-nursing agency · Attendant/caregiver · Elder-care home/assisted living · Hospice/palliative 🔒 · Home physio |
| 🛒 Commerce (§13, §15, §16) | Equipment rental/sale · Optical shop · Health-food/supplement store · Skincare/personal-care brand · Medical-device seller · Diet kitchen/tiffin |
| 🚗 Transport & delivery (§5, §22) | Ambulance operator · Patient-transport operator · Delivery partner · Rider/driver |
| 🎪 Events & community (§17, §23) | Camp/event organizer · NGO/CSR/RWA partner · Support-group host 🔒 · Training provider (CPR/first-aid) · Corporate wellness provider |
| ⚖️ Professional (§19) | Lawyer · TPA/cashless desk |

**Info-only listings (§18):** govt facility staff "claim listing" se details update karte hain — booking/payment flow nahi.
**Catalogue ke bahar ki application:** `OUT_OF_SCOPE` reason code se reject (file 08 §17).
**Chooser UX:** search box ("dentist", "gym", "yoga") · group tabs · "Not sure?" quiz (3 questions → type suggest) · "Already registered? Add another branch/service" link.

## 3. Common steps (har type)

| Step | Fields | Notes |
|---|---|---|
| **1. Account** | Name, mobile (OTP), email (OTP), password, Turnstile CAPTCHA, consent (ToS, Privacy, DPDP), referral code | HIBP breach check ✅, no role selection by client |
| **2. Business / Identity** | Legal name, display name, owner name, registration type (proprietorship/partnership/pvt ltd/trust/society/individual), GSTIN (optional), PAN | PAN/GST format validation + (later) API verify |
| **3. Location** | Address, pincode, city/state, **map pin**, landmark, service area (radius/pincodes for home services), timings (per day, break, holidays, 24x7) | Pin ≈ address cross-check; city from `ServiceCity` |
| **4. Practitioners / Staff** | Add doctors/trainers/therapists (name, registration no., photo) | Each practitioner separately verified |
| **5. Services & pricing** | Services from **Category tree**, price, duration, mode (in-person/home/video), insurance/schemes accepted | Only active categories allowed; "Other" → review queue |
| **6. Documents** | Type-wise upload (§5) | ClamAV scan, magic-byte check, EXIF strip, private storage |
| **7. Payout / Bank** | Account holder, bank, IFSC, account no., UPI, cancelled cheque | Penny-drop verify, name match with PAN; encrypted at rest |
| **8. Availability / Capacity** | Slots, max per slot, buffer, advance-booking window, leave calendar | — |
| **9. Policies & Agreement** | Cancellation policy template, commission/fee acceptance, code of conduct, data-processing agreement, e-sign | Version-stamped, stored w/ IP+time |
| **10. Review & Submit** | Summary, edit links, declaration | Submit → `pending` |

**Wizard rules:** autosave draft (server-side, encrypted), resume link on email/SMS, per-step validation, progress bar, mobile-first, Hindi + regional language toggle, upload via camera, "Save & exit".

## 4. Per-type fields & documents

> `[R]` required, `[O]` optional. Regulatory names state ke hisaab se alag ho sakte hain — lawyer se confirm karo. 🔒 = sensitive category (catalogue §24): discreet mode + two-person approval.

### 4.1 Hospitals & clinics (T1)

| Type | Special fields | Required docs |
|---|---|---|
| **Hospital** (all subtypes) | Beds (general/ICU/NICU), departments, OT count, emergency 24x7, ambulance, blood bank in-house, specialties, accreditations, schemes accepted, ownership | Clinical Establishment reg [R], BMW authorization [R], Fire NOC [R], owner ID [R], NABH [O], pharmacy DL if in-house [R] |
| **Day-care surgery / Nursing & maternity home** | Procedures, OT, delivery rooms, NICU tie-up | Clinic/CEA reg [R], surgeon/obstetrician reg [R], BMW [R], Fire NOC [R] |
| **Clinic** (single-doctor, polyclinic, specialty, urgent-care, corporate/campus, telemedicine) | Clinic type, doctors, consult fee, modes | Clinic reg [R], doctor council reg [R], BMW [R] |
| **Dental clinic** | Chairs, services (RCT, implants, ortho), OPG/RVG in-house, sterilisation protocol | Clinic reg [R], Dentist council reg [R], AERB (if X-ray) [R], BMW [R] |
| **Eye clinic** | Services (cataract, LASIK, retina), OT, optical shop (Y/N), camps | Clinic reg [R], Ophthalmologist reg [R], optometrist reg [O] |
| **AYUSH clinic** | System (Ayurveda/Homeopathy/Unani/Siddha/Naturopathy), Panchakarma facility, in-house medicines | AYUSH council reg [R], clinic reg [R], drug licence (if dispensing) [R] |
| **Physiotherapy clinic** | Focus areas, home-visit radius, equipment | Allied-health/physio council reg [R], clinic reg [R] |
| **Fertility/IVF clinic** 🔒 | IUI/IVF/ICSI, embryology lab, counselling | Clinic reg [R], **ART Act registration** [R], gynae/embryologist reg [R] |
| **Dialysis centre** | Machines, shifts, HBV/HCV isolation, nephrologist | Clinic reg [R], nephrologist reg [R], water-quality test report [O] |
| **Cancer / specialty centre** (cancer, cardiac, ortho-spine, skin-hair, pain, sleep, urology) | Specialty services, equipment, specialists | Clinic reg [R], specialist reg [R], AERB (radiotherapy) [R], BMW [R] |

### 4.2 Diagnostics & blood bank (T1)

| Type | Special fields | Required docs |
|---|---|---|
| **Pathology lab / diagnostic centre** | Tests catalogue, sample types, TAT, NABL | Lab reg [R], Pathologist reg [R], NABL [O], BMW [R] |
| **Imaging centre** | Modalities, machine list, radiologist | **AERB** [R], **PCPNDT** (if USG) [R], radiologist reg [R] |
| **Collection centre / home-collection lab / mobile van** | Coverage area + radius + fee, slots, cold-chain | Lab tie-up proof [R], phlebotomist docs [R], vehicle docs (van) [R] |
| **Cardiac diagnostic / sleep lab / genetic lab** | Tests (ECG/Echo/TMT/Holter, PSG, NIPT/molecular) | Lab/clinic reg [R], specialist reg [R], PCPNDT (NIPT) [R] |
| **Blood bank** | Components, storage, donors, licence | Blood-bank licence [R], medical officer reg [R] |

### 4.3 Pharmacy (T1/T2)

| Type | Special fields | Required docs |
|---|---|---|
| **Retail / 24x7 / chain / online pharmacy** | Delivery radius, Rx handling, cold-chain | **Drug licence (retail Form 20/21)** [R], **pharmacist reg** [R], GST [R] |
| **Hospital pharmacy** | IPD dispensing, H1 register | Drug licence [R], pharmacist reg [R] |
| **Jan Aushadhi Kendra / generic store** | PMBJP authorisation, generic list | Drug licence [R], pharmacist reg [R], PMBJP authorisation (Jan Aushadhi) [R] |
| **Ayurvedic/homeopathic store** | AYUSH products | AYUSH drug licence [R] |
| **Surgical/ortho store** | Braces, belts, footwear | GST [R], device licence (if applicable) [O] |
| **Wholesale/distributor** | B2B supply | Wholesale drug licence [R], GST [R] |

### 4.4 Rehab & long-term care (T1/T2)

| Type | Special fields | Required docs |
|---|---|---|
| **Rehabilitation centre** | Programs, residential/day, staff ratio | State registration [R], RCI/allied reg of therapists [R] |
| **Child-development / special-education centre** | Autism/ADHD/CP programs, assessment tools | RCI reg [R], centre registration [R] |
| **De-addiction centre** 🔒 | Residential beds, programs, family sessions | State registration (MHCA) [R], psychiatrist + psychologist (RCI) reg [R] |
| **Elder-care home / assisted living** | Beds, care levels, staff, meals | State registration [R], fire NOC [R], staff regs [R] |
| **Hospice / palliative** 🔒 | Beds, pain & palliative care team | Clinic reg [R], palliative/pain team regs [R], NDPS licence (opioids) [R] |

### 4.5 Practitioners (individual) (T1/T2)

| Type | Special fields | Required docs |
|---|---|---|
| **Doctor** | Specialty (canonical) + sub-specialty, qualifications, experience, reg no., council, languages, fee per mode, affiliations | Council registration [R], degree [R], ID [R], photo [R] |
| **Dentist** | BDS/MDS, specialty, clinic | DCI/state dental council [R] |
| **Physiotherapist** | Focus (neuro/ortho/sports/paeds/geriatric), home-visit radius | Allied-health/physio council reg [R], degree [R] |
| **Dietitian/Nutritionist** | Focus (diabetes, renal, weight, sports, paeds, PCOS), plans offered | RD/degree [R], IDA membership [O] |
| **Nurse (home)** | Skills (injection, IV, wound, catheter, ICU-at-home, palliative), shifts, rate | Nursing council reg [R], police verification [R], ID [R] |
| **Counsellor/Psychologist** 🔒 | Concerns, modalities, languages, modes | Degree [R], **RCI reg** (clinical) [R]; peer mentor: ID + training + guardrails agreement [R] |
| **Psychiatrist** 🔒 | MD psychiatry | Council reg [R] |
| **AYUSH practitioner** | System, specialty | Council reg [R] |
| **Speech/OT therapist, Audiologist, Optometrist** | Focus, paeds/adults | RCI/optometry-council reg [R] |
| **Phlebotomist / Lab tech / Radiographer / Sonographer** | Coverage, slots, kit | DMLT/degree [R], ID [R], police verification [R]; PCPNDT (sonographer) [R] |
| **Pharmacist** | Store affiliation | Pharmacist reg [R] |

### 4.6 Wellness & fitness (T3)

| Type | Special fields | Required docs |
|---|---|---|
| **Yoga teacher/studio** | Styles, batches, online/offline, prenatal/therapy, camps | YCB cert / teaching cert [R for therapy claims], ID [R], shop est. [R for studio] |
| **Gym / fitness** | Facilities, trainers, plans, women-only hours | GST/shop est. [R], trainer certs [O], fire safety [R] |
| **Wellness centre / spa** | Therapies, therapist certs, hygiene | Shop est. [R], therapist certs [R], AYUSH reg (if Ayurvedic clinical) [R] |
| **Personal trainer / group instructor / meditation teacher** | Specialities, modes | Certification [O], ID [R] |
| **Sports academy** | Sport, age groups, coaches | Registration [R], coach cert [O] |

### 4.7 Commerce (T3)

| Type | Special fields | Required docs |
|---|---|---|
| **Equipment rental/sale** | Catalogue (wheelchair, bed, O2 concentrator, CPAP), rent/day, deposit, delivery, sanitisation | GST [R], device licence (if selling devices) [R] |
| **Optical shop** | Frames/lenses brands, free eye test, job cards | Shop licence [R], GST [R], optometrist reg [O] |
| **Health-food / supplement store** | Product lines, brands, certifications | **FSSAI** [R], GST [R] |
| **Diet kitchen / tiffin** | Menus, diet types, delivery slots | **FSSAI** [R], kitchen hygiene docs [R] |
| **Skincare/personal-care brand** | Products, claims | CDSCO cosmetic reg/import licence [R], BIS [O], GST [R] |
| **Medical-device seller** | Device classes | MDR 2017 licence [R] |

### 4.8 Home services & transport (T1/T2)

| Type | Special fields | Docs |
|---|---|---|
| **Home-nursing agency** | Nurses roster, services, coverage, 24x7 | Registration [R], nurse regs [R], police-verification process [R] |
| **Attendant/caregiver** | Skills, experience, languages, shift, price | ID, police verification |
| **Ambulance operator** | Fleet (BLS/ALS/NICU/mortuary), driver/EMT, GPS | Vehicle permit/RC/insurance/fitness [R], driver licence [R], EMT cert [R for ALS] |
| **Patient-transport operator** | Vehicle types (incl. wheelchair/stretcher van) | Vehicle docs [R], driver docs [R] |
| **Delivery partner / Rider-driver** | Vehicle, cold-bag capability, scope | ID, DL, vehicle RC, insurance, bank; vehicle fitness/permit; police verification (rider) |

### 4.9 Community, B2B & professional

| Type | Fields | Docs |
|---|---|---|
| **Camp/event organizer** | Org type, past events, partner facility, insurance cover | Org ID [R], registration [O], partner facility LOA [R for clinical camps] |
| **NGO / CSR / RWA partner** | Cause, geography | Registration [R] |
| **Support-group host** 🔒 | Topic, mode, moderation plan | ID [R], training/qualification [O], **safety agreement** [R] |
| **Training provider (CPR/first-aid)** | Courses, certifications issued | Accreditation (Red Cross/St John/AHA partner) [O], trainer certs [R] |
| **Corporate wellness provider** | Programs, corporate clients | GST [R], practitioner docs [R] |
| **Lawyer** | Practice areas, courts, languages | Bar council reg, state, courts, ID, degree |
| **TPA/cashless desk** | Insurers covered, claim help | TPA licence/empanelment [R], authorised signatory letter [R] |

### 4.10 Govt facilities (Info + claim listing)

| Type | Fields | Docs |
|---|---|---|
| **PHC / CHC / UPHC / Sub-centre / Arogya Mandir** | OPD days/timings, free services, contacts, medicines (Jan Aushadhi) | Official ID/designation letter [R] (claim listing); source link; no payout/booking |

## 5. Document handling

- **Types** from enum: `clinical_establishment_reg, medical_council_reg, drug_licence, pharmacist_reg, aerb, pcpndt, nabl, nabh, bmw_authorization, fire_noc, fssai, cdsco_licence, gst, pan, owner_id, address_proof, bank_proof, vehicle_rc, driver_licence, police_verification, degree, training_cert, agreement_signed…`
- Each doc: `status (uploaded/under_review/verified/rejected/expired)`, `expiryDate`, `verifiedBy`, `verifiedAt`, `rejectionReason`, `version`.
- **Expiry tracking:** reminders 60/30/7 days; auto-suspend listing on expiry (grace period configurable).
- **Security:** private storage, signed short-lived URLs, ClamAV, image re-encode, only reviewers with permission can view, view = audit event.
- **Council/registration verification:** manual (admin checks NMC/state council portals) → later API/assisted; record who verified and when.
- **Aadhaar:** collect only masked/last-4 or use DigiLocker/offline XML consent — raw Aadhaar number store nahi (aapke code me already blocked ✅).

## 6. Verification & approval workflow

```
Draft → Submitted → [Auto-checks] → Under Review → (Needs Info ↔ Resubmitted) → Approved → Live
                                   ↘ Rejected (with reason + appeal)         ↘ Suspended / Expired
```

| Stage | What happens |
|---|---|
| **Auto-checks** | Duplicate detection (phone/email/GST/PAN/registration no./address+name fuzzy), format validation, blocklist, document malware scan, CAPTCHA/bot score |
| **Review queue** | Priority by type & SLA; assignee; checklist per type (docs, photos, address, practitioner regs) |
| **Needs Info** | Reviewer comments per document; applicant gets SMS/email/in-app; draft re-opens only flagged steps |
| **Tiered approval** | T1 clinical → KYC reviewer + clinical-compliance reviewer; T3 commerce → single reviewer; high-risk (de-addiction, IVF, mental-health peer mentor, ambulance) → **two-person approval** |
| **Probation** | New provider "Trusted: No" → limited visibility, daily booking cap, manual payout hold for first N days |
| **Go-live** | Welcome mail, onboarding checklist, "Complete profile" score, demo video/training, first-booking test mode |
| **Re-verification** | Annual, or on complaint, or expiry |
| **Appeal** | Rejection ke baad 1 appeal with extra docs |
| **Status page** | Applicant ko live tracker ("Docs received → Under review → Approved") |

**SLA targets:** auto-checks instant · T3 24h · T1 48h · high-risk 3–5 days.

## 7. After approval — activation checklist (provider side)

1. Profile completeness ≥ 80% (photo, bio, timings, services, prices)
2. Payout verified (penny-drop)
3. Slots/availability set
4. Notification preferences + staff accounts invited (RBAC roles)
5. Policies accepted (cancellation, refund)
6. Test booking / sandbox order
7. Training: "How bookings work", "How payouts work", "Privacy rules (do's/don'ts)"
8. Listing goes **Live** → visible in search

## 8. Multi-branch / multi-service

- One owner → many **branches** (each with own address, hours, staff, docs, payouts optional).
- Branch-level admin vs owner-level admin; consolidated analytics.
- "Add another service type" (e.g., clinic adds home-visit + dietitian) — only extra docs for the new service.
- Tenant isolation ✅ existing (`tenantScope`) — branch under same tenant.

## 9. Staff invitation (post-approval)

Owner invites staff by phone/email → role template (receptionist, technician, pharmacist, nurse, billing) → invite link (expiring, single-use) → staff sets password + 2FA → least-privilege permissions → every action audited. **Mandatory 2FA** for owner/admin roles (env `TWO_FACTOR_REQUIRED_ROLES`).

## 10. Fees, commission & agreements

- Plan selection at join: Free / Basic / Premium (`subscriptionPlan` ✅) — benefits (featured listing, analytics, more staff).
- Commission config per type (`CommissionConfig` ✅): % on bookings/orders, payout cycle (T+2/weekly).
- Taxes: GST on commission, TDS on payouts (Section 194O if applicable — finance advisor se confirm).
- **Agreement templates per type** (versioned): Clinical (patient-safety, privacy, no-ghosting), Commerce (return/recall, claims), Wellness (liability waiver, safety), Home services (conduct, safety), Mental-health (crisis protocol, confidentiality).

## 11. Anti-fraud at onboarding

- Same document across multiple accounts → flag
- Photo similarity (stock/ID-reuse) check (later)
- Registration number ↔ name mismatch
- Phone/device/IP clustering across applications
- Disposable email/VOIP numbers
- Bank account ↔ owner-name mismatch
- Rapid-fire submissions (rate limit + CAPTCHA ✅)
- Fake clinic address (pin outside city / residential-only flags for hospitals)

## 12. Edge cases

| Case | Handling |
|---|---|
| Doctor already on platform via hospital, now joins independently | Link profile; one registration number = one practitioner identity, multiple affiliations |
| Same pharmacist across two stores | Allowed only if registration permits; warn |
| Facility changes ownership | Re-KYC, old owner access revoked, history retained |
| Documents expired mid-operation | Warning → grace → auto-hide new bookings (existing honoured) |
| Provider rejected then re-applies | Reuse previous docs, show previous reasons |
| Provider deletes account | Offboarding checklist (pending bookings, payouts, records retention per law) |
| Language barrier | Regional-language form + voice-assisted help + WhatsApp support number |
| Low connectivity | Chunked uploads, retry, draft autosave |

## 13. Metrics

Visit → start → submit → approved funnel · drop-off per step · avg review time · rejection reasons · doc-resubmission rate · time-to-first-booking · % complete profiles.

## 14. Security checklist (join flow)

- [ ] CAPTCHA + rate limit on all steps (Turnstile ✅)
- [ ] OTP to verify phone/email before submit
- [ ] No privilege from client (`role`/`tenant` server-assigned)
- [ ] `.strict()` schemas, config-validated on server
- [ ] Doc upload: ClamAV required, magic bytes, size/pixel limits
- [ ] PII/PHI encrypted at rest (bank, ID numbers)
- [ ] Reviewer access scoped + audited
- [ ] Drafts expire (30 days) and are purge-able
- [ ] Email/SMS reveal no PII; links are single-use, short-lived
