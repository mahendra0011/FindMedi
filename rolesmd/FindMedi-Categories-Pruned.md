# FindMedi — Final Category Catalogue (pruned)

> Ye wo catalogue hai jo faltu rows hatane aur duplicates merge karne ke baad bacha. **Isme koi Phase/timeline column nahi hai** — sab categories ek hi list me hain.
> **Status source:** latest `origin/main` (commit `be3d9520`, 2026-10-13) ke models, routes, pages aur `FACILITY_SUBTYPES` ke naam. Depth/quality verify nahi ki — ✅ ka matlab "code me dikha", "fully complete" nahi.

| Status | Matlab |
|---|---|
| ✅ | Code me model/route/page/subtype dikha |
| 🟡 | Partial: sirf tag/sub-feature ya sirf model, flow/page nahi dikha |
| ❌ | Nahi mila |

| Kind | Matlab |
|---|---|
| **Facility** | Physical provider (hospital, clinic, lab…) |
| **Practitioner** | Individual professional |
| **Service** | Bookable service |
| **Product** | Order/rent/buy hone wali cheez |
| **Event** | Registration wali cheez (camp, workshop) |
| **Info** | Sirf listing/information — booking/payment nahi |

**Tier:** T1 = PHI (sabse sensitive) · T2 = health-adjacent · T3 = commerce/wellness (patient ka medical data yahan nahi dikhana)
**Reg tags (lawyer se verify karo, state-wise alag):** CEA clinical establishment · DL drug licence · CDSCO devices/cosmetics · FSSAI food · AYUSH council · RCI · NMC · PCPNDT/AERB · ART IVF Act · MHCA · BMW · THOA organ act · DPDP

---

## 1. Healthcare facilities

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Hospital: multi-specialty / super-specialty / single-specialty | Facility | ✅ | T1 | CEA, BMW |
| Nursing home / maternity home | Facility | ✅ | T1 | CEA |
| Day-care / surgery centre | Facility | ✅ | T1 | CEA |
| Government / district hospital / medical-college hospital | Facility | ✅ | T1 | — |
| Trauma centre / TB-chest / infectious-disease / psychiatric / rehabilitation hospital / cancer centre | Facility | ✅ | T1 | CEA |
| Clinic: single-doctor / polyclinic / specialty clinic | Facility | ✅ | T1 | CEA |
| Urgent-care / 24x7 clinic | Facility | ✅ | T1 | CEA |
| Corporate / industrial clinic | Facility | ✅ | T1 | CEA |
| Campus / school / college clinic | Facility | ✅ | T1 | — |
| Railway / ESI / CGHS / defence hospital & dispensary | Facility | ✅ | T1 | — |
| Mohalla / community clinic | Info + Facility | ✅ | T1 | — |
| Medical college & teaching hospital | Facility | ✅ | T1 | NMC |

> Telemedicine ek **mode** hai (clinic/doctor ka), alag category nahi — `telemedicine_clinic` subtype sirf listing ke liye.

## 2. Practitioners

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Doctor (OPD, slots, fees, video/audio/chat/home visit) | Practitioner | ✅ | T1 | NMC |
| Dentist, dietitian, yoga teacher, phlebotomist, physio, nurse, counsellor (PractitionerProfile roles) | Practitioner | ✅ | T1/T2 | council-wise |
| Specialty + sub-specialty tree (canonical) | — | 🟡 (taxonomy migration script hai; coverage verify karo) | T1 | — |
| Hospital ↔ independent practitioner linkage | — | ✅ | T1 | — |

## 3. Diagnostics

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Pathology lab | Facility | ✅ | T1 | CEA, NABL(opt) |
| Imaging / radiology centre | Facility | ✅ | T1 | AERB, PCPNDT |
| Integrated diagnostic centre | Facility | ✅ | T1 | CEA |
| Collection centre / franchise | Facility | ✅ | T1 | — |
| Home-collection lab + phlebotomist | Service | ✅ | T1 | — |
| Mobile diagnostic van / camp lab | Facility | ✅ | T1 | — |
| Cardiac diagnostics (ECG, Echo, TMT, Holter) | Facility | ✅ | T1 | CEA |
| Sleep lab, PFT, EEG/EMG, audiometry | Facility | 🟡 (sleep_lab hai; baaki tests tag) | T1 | CEA |
| Genetic / molecular / NIPT lab | Facility | ✅ | T1 | PCPNDT |
| Health packages (full-body, senior, women, cardiac…) | Product | ✅ | T1 | — |
| Lab booking / orders / reports | Service | ✅ | T1 | DPDP |

## 4. Pharmacy & medicines

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Retail pharmacy / medical store | Facility | ✅ | T1 | DL + pharmacist |
| Hospital pharmacy | Facility | ✅ | T1 | DL |
| Jan Aushadhi Kendra | Facility | ✅ | T2 | PMBJP |
| Generic store / 24x7 / chain / online pharmacy | Facility | ✅ | T2 | DL |
| Ayurvedic / homeopathic medicine store | Facility | ✅ | T2 | AYUSH |
| Surgical / ortho store | Facility | ✅ | T3 | — |
| Wholesale / distributor | Facility | ✅ | T3 | DL wholesale |
| Medicine catalogue + Rx orders + delivery + returns + offers | Product | ✅ | T1/T2 | DL |
| Schedule H1 register / narcotic count | — | ✅ | T1 | DL |
| Drug-interaction / ADR checks | — | ✅ | T2 | — |
| Medicine reminders / dose log | Service | ✅ | T1 | — |
| Chronic-medicine refill subscription | Service | ❌ | T1 | DL |
| Cold-chain medicines (insulin, vaccines) | Product | ❌ | T1 | DL |

## 5. Emergency & critical care

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| SOS / emergency request / emergency doctor request | Service | ✅ | T1 | — |
| Ambulance (BLS/ALS/NICU) + tracking + driver app | Service | ✅ | T1 | permits |
| Non-emergency patient transport (ambulance type) | Service | ✅ | T1 | — |
| Blood bank + blood request + donor screening | Facility | ✅ | T1 | licence |
| ICU / bed / OT availability | — | ✅ | T1 | — |
| Oxygen cylinder / concentrator supply | Product | 🟡 (rental model se ho sakta hai) | T2 | — |
| Helpline directory (112, 108, 102, Tele-MANAS 14416, women/child/poison) | Info | 🟡 (disclaimer/grievance me mention; dedicated page nahi) | T3 | — |
| First-responder / CPR volunteers | Service | ❌ | T2 | — |

## 5A. Hospital departments ke andar chalne wale clinical programs (mix of facility features)
Chemotherapy cycles/protocols ✅ · dialysis sessions + water-quality ✅ · ICU flowsheet/scores ✅ · partogram/labour/antenatal ✅ · newborn screening/bilirubin ✅ · sterilisation (CSSD) ✅ · infection control ✅ · BMW logs ✅ — ye categories nahi, hospital modules hain; listing me "services offered" ke taur par dikhao.

## 6. AYUSH & integrative

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Ayurveda / Homeopathy / Unani / Siddha / Naturopathy-Yoga clinic (system-of-medicine dimension + `ayush_clinic`) | Facility | ✅ | T1 | AYUSH |
| Panchakarma centre | Facility | 🟡 (alag subtype/flow nahi) | T1 | AYUSH |
| Naturopathy & yoga hospital | Facility | 🟡 | T1 | AYUSH |
| Acupuncture / acupressure / cupping | Practitioner | ❌ | T2 | state rules |

## 7. Specialty centres

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Dental clinic (chart, treatment plan, lab work) | Facility | ✅ | T1 | CEA, DCI |
| Eye hospital / clinic (exam, surgery leads) | Facility | ✅ | T1 | CEA |
| Optical shop (job cards, spectacles/lenses) | Facility | ✅ | T3 | — |
| Dialysis centre | Facility | ✅ | T1 | CEA |
| Cancer / chemo / radiotherapy centre | Facility | ✅ | T1 | AERB, CEA |
| ENT / audiology / hearing-aid centre | Facility | ❌ | T1 | RCI |
| Cardiac cath-lab / heart institute | Facility | 🟡 (cardiac diagnostics only) | T1 | CEA |
| Orthopaedic / joint / spine centre | Facility | 🟡 (specialty_clinic) | T1 | CEA |
| Diabetes / thyroid / endocrine centre | Facility | 🟡 (chronic care plan) | T1 | CEA |
| Skin / hair / laser clinic | Facility | 🟡 (specialty_clinic) | T1 | CEA (claims) |
| Pain clinic / wound-care / diabetic-foot clinic | Facility | ❌ | T1 | CEA |
| Urology / lithotripsy | Facility | ❌ | T1 | CEA |
| Plastic / cosmetic surgery | Facility | ❌ | T1 | CEA |
| Sexual-health clinic (discreet) | Facility | ❌ | T1 | CEA |
| Travel-medicine / vaccination clinic | Facility | 🟡 (vaccination module hai) | T1 | CEA |
| Transplant centre | Facility | ❌ | T1 | THOA |

## 8. Mental & emotional health

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Psychiatrist | Practitioner | ✅ | T1 | NMC/MHCA |
| Psychologist / counsellor / therapist / peer mentor | Practitioner | ✅ | T1 | RCI |
| De-addiction / rehabilitation centre | Facility | ✅ (subtype) | T1 | MHCA |
| Child & adolescent / couple / family counselling | Practitioner | 🟡 (concern tags) | T1 | RCI |
| Support groups (cancer, diabetes, grief, AA/NA, caregivers) | Service | ❌ | T1 | — |
| Meditation / mindfulness programs | Service | 🟡 (wellness module) | T3 | — |
| Student / workplace stress programs | Service | ❌ | T2 | — |
| Grief / bereavement counselling | Practitioner | 🟡 (concern tag) | T1 | RCI |

## 9. Rehab & therapy

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Physiotherapy clinic / home physio (dashboard, route) | Facility + Practitioner | ✅ | T1 | allied-health |
| Rehabilitation centre | Facility | ✅ | T1 | — |
| Child development / autism / special-education centre | Facility | ✅ (subtype) | T1 | RCI |
| Sports / neuro / cardiac-pulmonary rehab | Service | 🟡 (physio focus tags) | T1 | — |
| Occupational therapy / speech therapy | Practitioner | ❌ | T1 | RCI |
| Prosthetics & orthotics | Facility | ❌ | T2 | RCI |

## 10. Women, maternity & child

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Gynaecology / obstetrics / paediatrics | — | merged into §2 specialties | T1 | — |
| Maternity: antenatal, labour, partogram | Service | ✅ | T1 | CEA |
| IVF / fertility clinic (cycles) | Facility | ✅ | T1 | ART Act |
| Vaccination schedule + alerts + centres | Service | ✅ | T1 | UIP |
| Child growth charts / milestones | Service | ✅ | T1 | — |
| Women's health tracking (cycle, PCOS, menopause) | Service | ✅ | T1 | — |
| Newborn screening / birth record | Service | ✅ | T1 | — |
| Lactation consultant / doula / prenatal classes | Practitioner | ❌ | T2 | — |
| Adolescent / school health programs | Service | ❌ | T1 | — |

## 11. Elderly & long-term care

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Caregiver / attendant booking | Practitioner | ✅ | T2 | — |
| Family members + shared dashboard | — | ✅ | T1 | DPDP |
| Home nursing | Service | 🟡 (nurse role + assistant; agency flow nahi) | T1 | — |
| Elder-care home / assisted living | Facility | ✅ | T2 | state |
| Palliative / hospice | Facility | ✅ | T1 | — |
| Remote vitals + medication monitoring for family | Service | ✅ | T1 | — |
| Dementia / Alzheimer's care | Service | ❌ | T1 | — |
| Fall-detection / emergency devices | Product | ❌ | T2 | CDSCO |
| Geriatric day-care centre | Facility | ❌ | T2 | — |

## 12. Chronic-disease programs

| Category | Kind | Status | Tier |
|---|---|---|---|
| Chronic care plans + vitals logging + reminders | Service | ✅ | T1 |
| Diabetes / hypertension / heart programs (doctor + dietitian + tracking bundle) | Service | 🟡 (plan/membership models hain; bundle verify) | T1 |
| Thyroid / PCOS / obesity / asthma-COPD / CKD / arthritis programs | Service | 🟡 (same engine par configure) | T1 |
| Cancer survivorship / follow-up | Service | 🟡 (oncology module) | T1 |
| Quit-smoking / quit-alcohol | Service | ❌ | T1 |

## 13. Nutrition & food

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Diet kitchen / meal plans / meal subscription | Product | ✅ | T2 | FSSAI |
| Hospital diet / canteen | — | ✅ | T1 | FSSAI |
| Dietitian / nutritionist (dashboard) | Practitioner | ✅ | T1/T2 | RD/IDA |
| Healthy tiffin / cloud kitchen | Product | 🟡 (diet kitchen se overlap) | T3 | FSSAI |
| Organic / millet / health-food stores | Product | 🟡 (Product model) | T3 | FSSAI |
| Supplements / protein / vitamins | Product | 🟡 (Product model) | T3 | FSSAI |
| Baby food / infant formula | Product | ❌ | T3 | FSSAI + IMS Act |

## 14. Fitness & wellness

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Gym / fitness centre (dashboard, plans, memberships) | Facility | ✅ | T3 | GST, shop est. |
| Yoga studio / teacher / camp (dashboard) | Facility + Practitioner | ✅ | T3 | YCB |
| Wellness centre / retreat / spa (wellness side) | Facility | ✅ | T3 | — |
| Personal trainer / online coach | Practitioner | 🟡 | T3 | — |
| Zumba / Pilates / dance / martial arts | Service | 🟡 (class via plan/membership) | T3 | — |
| Sports academy / swimming / turf | Facility | ❌ | T3 | — |
| Corporate wellness programs | Service | ✅ (Corporate, CorporateEmployee, billing dashboard) | T3 | — |
| Wellness profile / logs (steps, workouts) | Service | ✅ | T2 | — |
| Running clubs / walkathons / challenges | Event | 🟡 (Event model) | T3 | — |

## 15. Skin, hair & personal care

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Dermatologist / skin clinic | Facility | 🟡 (specialty_clinic) | T1 | CEA |
| Hair-fall / trichology / hair transplant | Facility | 🟡 | T1 | CEA |
| Skincare / dermatology products | Product | 🟡 (`skincare` product kind) | T3 | CDSCO cosmetics |
| Baby care / feminine hygiene / oral care / grooming products | Product | 🟡 | T3 | CDSCO/BIS |
| Ayurvedic / herbal personal care | Product | 🟡 | T3 | AYUSH |
| Cosmetology / laser / aesthetics | Facility | ❌ (claims-restricted) | T1 | CEA, ad rules |

## 16. Medical devices, supplies & rental

| Category | Kind | Status | Tier | Reg |
|---|---|---|---|---|
| Equipment rental/sale vendor (wheelchair, bed, oxygen concentrator, CPAP) — rentals, asset units, dashboard | Product | ✅ | T3 | MDR 2017 |
| Home monitoring devices (BP, glucometer, oximeter, thermometer, nebuliser) | Product | 🟡 (Product model) | T2/T3 | MDR 2017 |
| Mobility aids (walker, crutches, commode) | Product | ✅ (rental) | T3 | — |
| Spectacles / contact lenses | Product | ✅ (optical job cards) | T3 | — |
| Ortho braces / belts / diabetic footwear / compression stockings | Product | 🟡 (surgical_ortho_store) | T3 | — |
| Wound care / incontinence / diapers | Product | 🟡 | T3 | — |
| Home-test kits | Product | 🟡 | T3 | CDSCO |
| First-aid kits, masks, sanitiser, PPE | Product | 🟡 | T3 | BIS/CDSCO |
| Hearing aids | Product | ❌ | T2 | MDR 2017, RCI |
| Surgical / OT consumables (B2B) | Product | 🟡 (Supplier/PurchaseOrder) | T3 | — |

## 17. Camps, events & preventive health

| Category | Kind | Status | Tier |
|---|---|---|---|
| Health camps (general, eye, dental, diabetes) | Event | ✅ | T2 |
| Vaccination drives | Event | ✅ | T1 |
| Blood-donation drives | Event | 🟡 | T2 |
| Awareness workshops / webinars / live Q&A | Event | ✅ | T3 |
| Yoga Day / wellness events | Event | ✅ | T3 |
| CPR / first-aid / BLS training | Event | 🟡 | T3 |
| Screening programs (cancer, TB, anaemia, BP) | Event | 🟡 | T1 |
| Corporate / RWA / community camps (partners) | Event | ✅ (Partner/Campaign) | T2 |
| School / college health programs | Event | ❌ | T2 |
| Seasonal & environment alerts (dengue, flu, heatwave, AQI) | Info | ❌ | T3 |

## 18. Government facilities & schemes (Info-focused)

| Category | Kind | Status | Tier |
|---|---|---|---|
| PHC / CHC / UPHC / sub-centre / Ayushman Arogya Mandir | Info + Facility | ✅ | T1 |
| Ayushman Bharat PM-JAY empanelled filter + packages | Filter | ✅ | T3 |
| CGHS / ESI / ECHS / state-scheme accepted filter | Filter | ✅ | T3 |
| ABHA / ABDM consent | — | ✅ | T1 |
| Govt hospital OPD queue/token | Service | ✅ | T2 |
| State schemes eligibility info (JSY, PMMVY etc.) | Info | ❌ | T3 |
| Medical council / registration verification lookup | — | 🟡 (License/Credential) | T3 |
| Grievance redressal | Service | ✅ | T2 |

## 19. Insurance, finance & legal

| Category | Kind | Status | Tier |
|---|---|---|---|
| Health insurance (insurers, policies, claims, pre-auth) | Service | ✅ | T1 |
| TPA / cashless desk | Service | 🟡 | T1 |
| Billing / payments / refunds / payouts / wallet / loyalty / referral / coupons | — | ✅ | T1/T2 |
| Medical lawyer / consumer-court help | Practitioner | ✅ | T2 |
| Patient rights info | Info | ✅ | T3 |
| Medico-legal case (MLC) workflow | — | ✅ | T1 |

## 20. Education, content & community

| Category | Kind | Status | Tier |
|---|---|---|---|
| Verified health articles / videos | Info | ✅ | T3 |
| Reviews & ratings (+ moderation) | — | ✅ | T3 |
| AI chat / symptom triage (+ safety events) | Service | ✅ | T1 |
| Courses (CPR, nutrition, yoga-teacher, caregiver training) | Event/Product | ❌ | T3 |
| Community forums / patient groups | Service | ❌ | T2 |
| Myth-busting / fact-check content | Info | ❌ | T3 |
| Multilingual content (Hindi + regional) | — | 🟡 | T3 |

## 21. Home services

| Category | Kind | Status | Tier |
|---|---|---|---|
| Home sample collection | Service | ✅ | T1 |
| Home nursing / attendant | Service | 🟡 | T1 |
| Home doctor visit (mode) | Service | 🟡 | T1 |
| Home physio / therapy | Service | 🟡 | T1 |
| Home medicine / lab / equipment delivery | Service | ✅ | T1 |
| Home vaccination | Service | ❌ | T1 |
| Home ICU setup | Service | ❌ | T1 |
| Remote telehealth monitoring at home | Service | 🟡 | T1 |

## 22. Transport & logistics

| Category | Kind | Status | Tier |
|---|---|---|---|
| Ambulance + tracking | Service | ✅ | T1 |
| Patient ride / vehicle booking | Service | ✅ | T2 |
| Delivery partners / riders | Service | ✅ | T2 |
| Medical courier (samples, reports) | Service | ❌ | T2 |
| Cold-chain logistics | Service | ❌ | T2 |

## 23. B2B / institutional customers

| Category | Kind | Status | Tier |
|---|---|---|---|
| Corporate employee health (plans, checkups, billing) | Service | ✅ | T1 |
| Insurers / TPAs | Service | ✅ (Insurer model) | T1 |
| NGOs / CSR / trusts / RWA (partners) | Service | ✅ (Partner model) | T2 |
| Diagnostic franchise networks | Service | 🟡 (collection_centre) | T2 |
| Schools / colleges / hostels | Service | ❌ | T2 |

## 24. Sensitive categories (rakho, par extra controls ke saath)

IVF / fertility · de-addiction / rehab · palliative / hospice · sexual-health clinic · cosmetic surgery · transplant centres · organ / eye / body-donation pledge · mental-health support groups · HIV/STD testing.

**Inke liye zaroori:** discreet notifications (neutral SMS/push text), masked listings, hidden from "recently viewed"/suggestions, alag consent, extra document verification (two-person approval), claims moderation, break-glass-only staff access, restricted-records sensitivity label.

---

## Rules (har category par)

1. **Tier ke hisaab se security:** T1 par full stack (authz, tenant scope, field encryption, audit, step-up). T3 (gym, store, yoga) ko patient ka medical data kabhi mat dikhao.
2. **Type-wise verification documents** mandatory; unverified listing "verified" na dikhe.
3. **Health claims moderate karo** (cure, weight-loss, cosmetic, sexual health) — Drugs & Magic Remedies Act, Consumer Protection Act, ASCI.
4. **Products** me FSSAI/CDSCO/licence fields, batch/expiry, claims, return/recall flow.
5. **Info-only** categories (govt facilities, helplines, schemes, alerts) par booking/payment mat lagao.
6. Regulation state-wise alag hota hai — local lawyer/consultant se confirm karo.

---

## Jo hata diya gaya (traceability ke liye)

**Scope ke bahar / risk zyada:** veterinary pharmacy, pet care, tattoo/piercing, salon, pest control, RO/purifier service, home safety/child-proofing, water/sanitation info, career/life coaching, senior social clubs, Reiki/energy healing, Sowa-Rigpa/folk practitioners, cord-blood banks, air ambulance, medical tourism, cremation/funeral, death-certificate/legal-heir help, crowdfunding/charity, medical EMI/loans, insurance comparison/advisor, pharma and device companies (B2B), govt health department analytics, research/trial recruitment, medical-student CME, claims-fraud detection, fitness-tracker integration (feature), disease-surveillance feed (seasonal alerts me merge).

**Category nahi, feature/filter:** section "Hospital operations (back-office)", section "Cross-cutting capabilities", second-opinion, home-visit doctor, doctor Q&A, telemedicine clinic (mode), report storage, fitness rewards, women-only filter, multilingual/accessibility/offline.

**Duplicate merge:** home collection/nursing/physio (§3, §9, §11 → §21 me ek hi jagah), non-emergency transport + mortuary van (ambulance type), palliative (§11), de-addiction (§8), Jan Aushadhi (§4), helplines (§5), sleep (§3), hearing aids/spectacles (§7/§16), gynaecologist/paediatrician/psychiatrist (§2 specialties), hospital pharmacy/diet (subtype/existing module).
