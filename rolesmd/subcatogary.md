# FindMedi — Subcategories + Current Categories ka Audit + Naye Additions

> Is file me 3 cheezein hain:
> **Part A** — Aapke repo me jo categories/enums abhi hain, unka audit (sahi hai ya nahi, kya galat/missing hai)
> **Part B** — Taxonomy ko sahi tarah se kaise structure karo (taaki lists alag-alag jagah drift na hon)
> **Part C** — **Saari categories ke subcategories** (existing + naye), Indian cities ke real-world hisaab se
> **Part D** — Migration plan + validation rules
>
> **Source:** repo clone (`backend/src/models`, `frontend/src/pages`, `backend/mock-data`) se asli lists nikaal kar. Static review hai — app run nahi ki.
> **Medical/regulatory lists** (drug schedules, accreditation, specialties) general knowledge se hain; launch se pehle clinician/regulatory advisor se verify karwa lo.

| Symbol | Matlab |
|---|---|
| ✅ | Sahi / acchi tarah covered |
| 🟡 | Hai par incomplete ya mixed |
| ❌ | Missing |
| 🐞 | Bug/inconsistency jo fix karni chahiye |

---

# PART A — Current categories ka audit

## A0. Pehle meri purani master file me 4 corrections

Code me aur dhyan se dekha to ye cheezein pehle se hain (maine ❌ bataya tha):

| Item | Pehle maine kaha | Asliyat (repo) |
|---|---|---|
| Mortuary van / freezer vehicle | ❌ | 🟡 `Ambulance.ambulanceType` me `MORTUARY` aur `PATIENT_TRANSPORT` hai; `lifeSupportTier` me `NICU` bhi hai |
| Blood components | (mention nahi) | ✅ `BloodBank.components`: Whole Blood, PRBC, Platelets, FFP, Cryoprecipitate |
| Home sample collection | 🟡 | ✅ `Test.homeCollection` + `homeCollectionFee`; `Test.providerType` me `phlebotomist`, `lab_technician`, `radiographer`, `sonographer` |
| Category hierarchy | (mention nahi) | ✅ `Category.parent` field hai (subcategory support model me pehle se hai), par UI hardcoded lists use karta hai |

## A1. Sabse bade problems (🐞) — pehle ye theek karo

| # | Problem | Kahan | Asar | Fix |
|---|---|---|---|---|
| 1 | **Specialty spelling/naming inconsistent** | `JoinPlatform.tsx`: Orthopedics, Pediatrics, Gynecology, Dentistry · `HospitalDirectory/ClinicDoctors`: Orthopaedics, Paediatrics, Obstetrics & Gynaecology, Dentist · seed: Orthopedics/Pediatrics · `Home.tsx`: Gynecologist/Pediatricians | Search/filter me doctors miss hote hain ("Orthopedics" doctor "Orthopaedics" filter me nahi dikhega) | Ek canonical specialty list + aliases (Part B) |
| 2 | **`Doctor.specialization` free-text String (required)** | `models/Doctor.js:7` | Typos, duplicates, analytics kharab | Canonical `specialtyCode` + optional `subSpecialtyCodes[]`, display name alag |
| 3 | **Test categories 3 alag lists** | seed: Pathology/Imaging/Cardiac (3) · `AdminTestCatalog`: 9 categories + 4 departments · `AllTests.tsx`: 21 categories | Admin jo category banata hai wo patient-side filter me nahi aati | Ek hi `Category(type:'test')` tree, dono UI use karein |
| 4 | **`Test.category` free-text required** | `models/Test.js:5` | Typo = test kisi filter me nahi | Category `code` se reference |
| 5 | **Admin `Category` model aur hardcoded UI lists duplicate** | `models/Category.js` vs 6+ frontend files | Superadmin category edit kare to frontend change nahi hota | UI ko API se categories fetch karwao (cache ke saath) |
| 6 | **`Category` unique index `{name,type}`** | `Category.js` | Same naam do parents ke neeche nahi ban sakta (jaise "Paediatric" Dental ke neeche aur Medicine ke neeche) | Index `{type, parent, name}` ya `{type, code}` |
| 7 | **`Category.type` sirf 4: test, medicine, department, service** | `Category.js` | Specialty, facility-type, diet, event, wellness jaisi types ke liye jagah nahi | Types extend karo (Part B) |
| 8 | **Medicine.category me alag-alag dimensions mixed** | `Medicine.js:6` | Antibiotic (therapeutic class) + Prescription/OTC/Generic (sales class) + Baby Care/Ayurvedic/Devices/Personal Care (product line) ek hi enum me. Aur `Vitamin` + `Vitamins` duplicate | 4 alag fields: therapeutic class, Rx schedule, product line, form |
| 9 | **Rx schedule nahi** | `Medicine.prescriptionReq` sirf boolean | Schedule H / H1 / X / narcotic (NDPS) control nahi — pharmacy compliance ke liye zaruri | `rxSchedule` enum (Part C §5) + H1 register + audit |
| 10 | **Appointment modes duplicate** | `Hospital/Facility.appointmentModes`: `home` & `home_visit`; `audio`, `voice`, `call` | Ek hi cheez 3-4 naamo se | Normalize: `in_person`, `video`, `audio`, `chat`, `home_visit` |
| 11 | **Facility `type` sirf 4 (hospital/clinic/lab/pharmacy)**; JoinPlatform me `diagnostic` key hai | `Facility.js:8` vs `JoinPlatform.tsx` | Mapping implicit; sub-type (nursing home, dental clinic, eye hospital) nahi | `type` + `subType` + `ownership` + `systemOfMedicine` (Part C §1) |
| 12 | **`Psychology` doctor-specialty list me** | `HospitalDirectory/ClinicDoctors` | Psychologist MD nahi hota; counsellor/psychologist alag provider type hai (aapke `MentalHealth` flow me) | Specialty list se hata ke "Mental health professionals" alag group |
| 13 | **Radiology modality vs Equipment type mismatch** | `Radiology.modality`: 7 · `Equipment.type`: 13 (PET, DEXA, EEG…) | Equipment hai par us par order nahi ban sakta | Modality list ko equipment ke saath align |
| 14 | **Language list adhoora** | `LAWYER_LANGUAGES`, `COUNSELLOR_LANGUAGES`: 11 languages | Odia, Assamese, Bhojpuri etc. missing — tier-2/3 shehron me zaruri | Part C §26 |

## A2. Har current category list ka verdict

### Facility / Provider types
| Current | Verdict | Add karo |
|---|---|---|
| `Facility.type`: hospital, clinic, lab, pharmacy | 🟡 | `subType`, `ownership`, `systemOfMedicine`, `accreditations[]`, `schemesAccepted[]` (Part C §1) |
| `JoinPlatform` types: hospital, clinic, diagnostic, pharmacy, delivery, rider, assistant, lawyer, counsellor, psychiatrist | 🟡 | independent doctor, physiotherapist, dietitian, nurse, blood bank, ambulance operator, dental, eye/optician, AYUSH, yoga/wellness/gym, equipment rental, event organizer |
| `Hospital.subscriptionPlan`: free/basic/premium | ✅ | — |
| `RiderProfile.transferScope`: local/regional/intercity | ✅ | `outstation`, `airport` optional |
| `Staff.role` (16) | 🟡 | Part C §24 |

### Doctors / specialties
| Current | Verdict |
|---|---|
| Directory list: 24 specialties | 🟡 — kaafi common hain, par super-specialty/allied bahut missing (Part C §2) |
| `JoinPlatform.SPECIALTIES`: 16 (Ayurveda, Homeopathy, Physiotherapy, Dentistry shamil) | 🟡 — "Specialty" aur "system of medicine" ek hi list me mix |
| Seed `departments.json`: 10 | ✅ demo data, par production departments ka alag canonical list chahiye |
| `Home.tsx` featured: General Physician, Gynecologist, Dermatologist, Pediatricians, Neurologist, Gastroenterologist (6, "45+" jaise **hardcoded counts**) | 🐞 counts hardcode hain — real DB se aane chahiye warna misleading |

### Diagnostics
| Current | Verdict |
|---|---|
| `AllTests` 21 categories (Blood, Urine/Stool, Basic Screening, Cardiac, Imaging, Advanced Imaging, Invasive, Advanced Cardiac, Panels, Neurological, Microbiology, Serology, Fertility, Pulmonology, Arthritis/Autoimmune, Prenatal, Eye, ENT, Dental, Toxicology, Preventive Packages) | 🟡 — organ-system + test-type + level (basic/advanced) mixed. Missing: Hormone/Thyroid, Vitamin, Liver, Kidney, Lipid, Diabetes, Allergy, Cancer markers, Genetic, Histopathology/Cytology, STD, Coagulation (Part C §4) |
| `Radiology.modality`: X-Ray, MRI, CT, Ultrasound, Echo, ECG, Mammography | 🟡 — Echo/ECG imaging nahi, cardiac diagnostics hain. Missing: PET-CT, DEXA, Fluoroscopy, Angiography, Doppler, OPG/dental X-ray, EEG/EMG/NCV, TMT |
| `HealthPackage.category`: Basic, Comprehensive, Cardiac, Diabetic, Women, Senior Citizen, Corporate, Other | 🟡 — Men, Child, Thyroid, Liver, Kidney, Bone, Pre-employment, Pre-marital, Pregnancy, Cancer screening, Fitness etc. missing |
| `Test.providerType` (hospital, clinic, lab_technician, phlebotomist, radiographer, sonographer) | ✅ |
| `Test.sampleType` free-text | 🟡 → enum (Blood, Serum, Plasma, Urine, Stool, Sputum, Swab, CSF, Tissue, Semen, Body fluid…) |

### Pharmacy
| Current | Verdict |
|---|---|
| `Medicine.category` (24 values, mixed) | 🐞 Part A1 #8 |
| `Medicine.form`: Tablet, Capsule, Syrup, Injection, Drop, Cream, Inhaler, Infusion, Other | 🟡 — Ointment, Gel, Lotion, Powder/Sachet, Suppository, Patch, Spray, Lozenge, Eye/Ear/Nasal drops, Kit missing |
| Medicine fields: name, genericName, manufacturer, batch, expiry, prices, stock, `prescriptionReq`, interactions, contraindications | 🟡 — Missing: `composition` (salt + strength), `strength`, `packSize`, `mrp`, `gstRate`, `hsnCode`, `rxSchedule`, `storage` (cold-chain), `habitForming`, `ageRestriction`, `isGenericOfBrand`, `atcCode` |
| `PharmacyOffer`, returns, preferred pharmacy | ✅ |

### Emergency / Transport
| Current | Verdict |
|---|---|
| `Ambulance.ambulanceType`: BLS, ALS, PATIENT_TRANSPORT, MORTUARY | ✅ — add `NICU`, `AIR`, `BIKE_RESPONDER`, `NEONATAL` (tier me NICU hai par type me nahi) |
| `Vehicle.type`: bike, auto, e_rickshaw, car, van | 🟡 — wheelchair-accessible van, stretcher van missing |
| `Emergency.severity`: Critical/Serious/Stable | ✅ |
| `Emergency.condition` free-text | 🟡 — `emergencyType` enum add (cardiac, stroke, trauma/RTA, burns, poisoning, obstetric, paediatric, psychiatric, snake-bite, drowning, allergic) for routing + analytics |

### Blood bank
| Current | Verdict |
|---|---|
| Blood groups (8) + components (5) + crossmatch + reaction types | ✅ strong |
| Missing | Donor eligibility/deferral reasons, apheresis (SDP/RDP), irradiated/leukoreduced flags, TTI (HIV, HBV, HCV, syphilis, malaria) screening status |

### Nutrition / diet
| Current | Verdict |
|---|---|
| `DietOrder.dietType`: Regular, Diabetic, Low Sodium, Liquid, Soft, High Protein, Low Fat, Renal, NPO, Other | 🟡 — Cardiac, Bland, Low-residue, Clear liquid vs Full liquid, Pureed/dysphagia, Tube/enteral, Gluten-free, Neutropenic, Paediatric, Weight-loss, Keto |
| `mealType`: Breakfast, Lunch, Evening Snack, Dinner | 🟡 — Early-morning tea, Mid-morning, Bedtime, Supplement |
| Dietary preference (veg, non-veg, jain, vegan, eggetarian), allergies | ❌ add as separate field |

### Mental health
| Current | Verdict |
|---|---|
| `COUNSELLOR_CONCERNS` (16) | 🟡 — Grief, Anger, Parenting, Marriage/premarital, Eating disorder, OCD, Phobia, PTSD, ADHD, Social anxiety, Postpartum, Body image, Screen/gaming addiction, Chronic-illness coping, Infertility stress, Workplace harassment, Financial stress, LGBTQ+ affirming (Part C §8) |
| `COUNSELLOR_TYPES`: professional, peer-mentor | ✅ but peer mentor ke liye **guardrails** (crisis escalation, no medical advice, no diagnosis) |
| `MentalHealth.treatmentType`: Medication, Therapy, Counseling, Combined | 🟡 — modality (CBT, DBT, etc.) alag field |
| `riskAssessment`: Low/Medium/High/Immediate | ✅ |
| Modes: google-meet, voice-call, in-person | 🟡 — chat-based, Google Meet par PHI/consent concern (apna LiveKit use karo) |

### Insurance / Billing
| Current | Verdict |
|---|---|
| Claim/preAuth statuses | ✅ |
| Policy types, scheme types | ❌ → Part C §20 |
| `Billing.source`: manual, appointment, lab, pharmacy, ipd, ot, radiology, physio, diet | ✅ — add `ambulance`, `blood_bank`, `home_service`, `equipment_rental`, `membership`, `event` |
| `paymentMethod`: Cash, Card, UPI, Cheque, Insurance, Online, Other | ✅ — add `Wallet`, `NetBanking`, `EMI`, `Govt scheme` |

### Hospital ops
| Current | Verdict |
|---|---|
| `Inventory.category`: Medical Supplies, Surgical Instruments, Disposables, Stationery, Cleaning, Electrical, Others | 🟡 — Implants, Linen, Reagents/lab kits, Contrast/films, Medical gases, Kitchen, BMW bags, PPE, Fire safety, IT |
| `Inventory.unit`: Pcs, Box, Pair, Set, Litre, Kg, Meter, Roll | 🟡 — Vial, Ampoule, Strip, Bottle, Tube, Pack, mL, Cartridge |
| `Supplier.category`: 5 | 🟡 — Reagents, Implants, Linen, Gases, Food, IT |
| `Equipment.type` (13) | 🟡 — Ventilator, Defibrillator, Infusion pump, Dialysis machine, Autoclave, Anaesthesia machine, Patient monitor, OT table/light, Ultrasound portable, Fluoroscopy/C-arm, Ambulance equipment |
| `Housekeeping.type` (5) | ✅ — add `Biomedical waste pickup`, `Linen change`, `Pest control` |
| `Record.type` (7): diagnosis, prescription, lab_report, imaging, discharge_summary, bill_invoice, payment_invoice | 🟡 — Vaccination, Consent, Referral letter, Operative note, Histopathology, ECG/Echo, MLC, Medical/fitness certificate, Allergy list, Growth chart, Insurance docs (Part C §24) |
| `Staff.role` (16) | 🟡 — Part C §24 |
| `Staff.shift`, `employmentType` | ✅ |

### Lawyer
| Current | Verdict |
|---|---|
| `STATE_BAR_COUNCILS`, `COURTS_OPTIONS` | ✅ |
| **Practice areas / specializations** | ❌ not found — add (Part C §21) |

---

# PART B — Taxonomy ko sahi tarah se banao

## B1. Principles
1. **Ek source of truth** — DB me `Category` tree; frontend/backend dono wahin se padhein. Hardcoded arrays sirf fallback.
2. **Stable `code`, badalne wala `name`.** Doctor/Test ko `code` se link karo (`SPEC.CARDIO`), naam change/translate ho sakta hai.
3. **Aliases/synonyms** — "Orthopedics" = "Orthopaedics" = "Bone doctor" = "हड्डी रोग".
4. **Alag dimensions alag fields** — specialty ≠ system of medicine ≠ provider type ≠ condition ≠ service.
5. **Levels:** Domain → Category → Subcategory → (optional) Leaf. Max 3–4 levels.
6. **Regulatory metadata** category par rakho (kaunsa license chahiye, kaunsa tier T1/T2/T3, ad-claim restricted hai ya nahi).
7. **Free-text sirf "Other (specify)"** — aur admin review queue me jaye.

## B2. Recommended `Category` schema
```js
{
  code: 'SPEC.CARDIO',                 // stable, unique per type
  type: 'specialty',                   // specialty | sub_specialty | facility_type | provider_type | test | imaging |
                                       // medicine_class | medicine_form | rx_schedule | product_line | diet | condition |
                                       // service | event_type | program | wellness | device | language | ...
  name: { en: 'Cardiology', hi: 'हृदय रोग' },
  aliases: ['Cardiologist', 'Heart', 'Hridya rog'],
  parent: ObjectId | null,             // hierarchy (already in your schema)
  path: 'SPEC.CARDIO',                 // materialized path for fast subtree queries
  level: 0,
  tier: 'T1',                          // data sensitivity (T1/T2/T3)
  regulatedBy: ['CEA', 'NMC'],         // regulatory tags
  adClaimsRestricted: false,           // cosmetic/sexual-health/weight-loss etc.
  externalCodes: { snomed: '', atc: '', loinc: '', icd10: '', hsn: '' },
  isActive: true, displayOrder: 10, icon: ''
}
// index: { type: 1, code: 1 } unique ; { type:1, parent:1, name:1 } ; text index on name+aliases
```

## B3. Naye `type` values jo `Category.type` me add hone chahiye
`specialty, sub_specialty, facility_type, provider_type, imaging, medicine_class, medicine_form, rx_schedule, product_line, diet, condition, event_type, program, wellness, device, language, accreditation, scheme, insurance_policy, legal_practice_area, record_type, emergency_type`

## B4. Search/filter facets (sab categories ke saath kaam karein)
City/area/pincode · distance · open now/24x7 · **government/private/trust** · system of medicine · specialty/sub-specialty · **home-visit / online / in-person** · language · gender of provider (women-friendly) · fee range · rating · availability (today/tomorrow) · **Ayushman/CGHS/ESI/insurance/TPA accepted** · accreditation (NABH/NABL) · wheelchair-accessible/parking/ambulance · verified badge · sort (nearest, rating, price, earliest slot)

---

# PART C — Saari categories + subcategories

> Format: **Category** → subcategories. `[✅/🟡/❌]` = repo me status. Naye additions bold me.
> Tier tag: T1 (PHI) · T2 · T3 (commerce).

## 1. Facilities / Provider types

**1.1 Facility type** (`Facility.type` ✅ 4 + sub-types)
- **Hospital** [✅] → Multi-specialty · Super-specialty · Single-specialty (eye, ortho, cardiac, cancer, maternity, ENT, kidney, neuro, paediatric) · Nursing home (<50 beds) · Teaching/medical-college hospital · District/civil hospital · Community Health Centre (CHC) · **Trauma centre** · **Rehabilitation hospital** · **Psychiatric hospital** · **TB/chest hospital** · **Infectious disease hospital** · **Cancer centre** · **Day-care surgery centre**
- **Clinic** [✅] → Single-doctor clinic · Polyclinic · Specialty clinic (derma, ortho, ENT, ophthal, paediatric, gyne, diabetes, etc.) · **Dental clinic** · **Eye clinic/optometry** · **Homeopathy/Ayurveda clinic** · **Physiotherapy clinic** · **Fertility clinic** · **Urgent-care/24x7 clinic** · **Corporate/industrial clinic** · **Mohalla/community clinic** · **Telemedicine-only clinic**
- **Lab / Diagnostic** [✅] → Pathology lab · Imaging/radiology centre · Integrated diagnostic centre · **Collection centre (franchise)** · **Home-collection-only lab** · **Mobile diagnostic van** · **Cardiac diagnostic centre** · **Sleep lab** · **Dental/eye/ENT diagnostic** · **Genetic/molecular lab** · **Blood bank (standalone)**
- **Pharmacy** [✅] → Retail medical store · Hospital pharmacy · **Jan Aushadhi Kendra** · **Generic store** · **24x7 pharmacy** · **Online/delivery-only pharmacy** · **Ayurvedic/homeopathic store** · **Surgical/ortho store** · **Chain outlet** · **Wholesale/stockist**
- **Primary govt** [❌] → PHC · UPHC · Sub-centre · Ayushman Arogya Mandir · Anganwadi session site
- **Wellness / fitness** [❌] → see §15
- **Rehab / long-term** [❌] → Elder-care home · Assisted living · Hospice/palliative · De-addiction centre · Child-development centre · Rehab centre

**1.2 Ownership:** Government · Private · Trust/charitable · Corporate chain · Cooperative · PPP · Military/Railway/ESI
**1.3 System of medicine:** Allopathy · Ayurveda · Homeopathy · Unani · Siddha · Yoga & Naturopathy · Sowa-Rigpa · Integrative
**1.4 Accreditation:** NABH (full/entry-level) · NABL · JCI · NQAS (govt) · Kayakalp · ISO 9001 · AERB (radiology) · ART registered · NABH dental
**1.5 Schemes accepted:** Ayushman Bharat PM-JAY · CGHS · ESI · ECHS · State schemes · Private insurance cashless · TPA-empanelled · Corporate tie-ups
**1.6 Facility amenities:** 24x7 · ICU · NICU/PICU · Emergency/Trauma · Blood bank · Pharmacy in-house · Ambulance · Parking · Wheelchair access · Cafeteria · Pickup-drop · Wi-Fi · Prayer room · Visitor lodging · Female-staff available

**1.7 Individual provider types** (JoinPlatform `PLATFORM_TYPES` ✅ 10)
Existing: Hospital · Clinic · Diagnostic · Pharmacy · Delivery partner · Rider/Driver · Assistant/Attendant · Lawyer · Counsellor · Psychiatrist
**Add:** Independent doctor · Dentist · Physiotherapist · Dietitian/Nutritionist · Nurse (home) · Phlebotomist · Lab technician · Radiographer · Ambulance operator · Blood-bank · Optometrist · AYUSH practitioner · Yoga teacher · Fitness trainer · Equipment-rental vendor · Event/camp organizer · Speech/occupational therapist · Special educator · Palliative care provider

## 2. Doctors — Specialties & sub-specialties

> **Canonical list** (ek spelling: "Orthopaedics", "Paediatrics", "Obstetrics & Gynaecology" — display me regional spelling alias se)

| Specialty (code) | Sub-specialties / focus areas | Repo |
|---|---|---|
| **General / Family Medicine** | Family physician · General practitioner · Internal medicine · Hospitalist · Travel medicine · Preventive medicine | ✅ |
| **Cardiology** | Interventional · Electrophysiology · Heart failure · Paediatric cardiology · Preventive cardiology · Cardiac imaging | ✅ |
| **Cardiothoracic & Vascular Surgery (CTVS)** | Cardiac surgery · Thoracic surgery · Vascular surgery · Endovascular | ❌ |
| **Neurology** | Stroke · Epilepsy · Movement disorders · Headache · Neuromuscular · Neuro-immunology · Paediatric neurology | ✅ |
| **Neurosurgery** | Spine · Brain tumour · Functional · Paediatric · Endovascular neuro | ✅ |
| **Orthopaedics** | Joint replacement · Sports medicine/arthroscopy · Spine · Trauma · Paediatric ortho · Hand/microsurgery · Foot & ankle · Oncology ortho | ✅ |
| **Obstetrics & Gynaecology** | Obstetrics/high-risk pregnancy · Infertility/IVF · Gynae-oncology · Laparoscopic gynae · Urogynaecology · Adolescent gynae · Menopause · Fetal medicine | ✅ |
| **Paediatrics** | Neonatology · Paediatric cardiology/neurology/nephrology/pulmonology/gastro/endocrinology/haematology-oncology · Developmental paediatrics · Adolescent medicine · Vaccination · Paediatric surgery | ✅ |
| **Dermatology** | Medical derma · Cosmetology/aesthetics · Trichology · Venereology · Paediatric derma · Dermatosurgery · Allergy skin | ✅ |
| **ENT** | Otology · Rhinology · Laryngology · Head & neck surgery · Paediatric ENT · Audiology link · Sleep surgery | ✅ |
| **Ophthalmology** | Cataract · Retina · Cornea · Glaucoma · Paediatric · Oculoplasty · Squint · Refractive/LASIK · Neuro-ophthalmology | ✅ |
| **Dental / Oral health** | Orthodontics · Endodontics · Periodontics · Prosthodontics · Oral surgery/Implantology · Paedodontics · Oral medicine/radiology · Cosmetic dentistry | 🟡 "Dentist" only |
| **Psychiatry** | Child & adolescent · Geriatric · De-addiction · Neuropsychiatry · Forensic · Sleep · Perinatal | ✅ |
| **Gastroenterology** | Hepatology · Endoscopy/ERCP · IBD · Paediatric gastro · Surgical gastro/GI surgery · Bariatric | ✅ |
| **Pulmonology / Chest** | Critical care · Sleep medicine · Interventional pulmonology · TB & chest · Allergy-asthma · Occupational lung | ✅ |
| **Endocrinology & Diabetology** | Diabetes · Thyroid · Obesity · Paediatric endocrine · PCOS/hormonal · Bone/osteoporosis · Pituitary | ✅ |
| **Nephrology** | Dialysis · Transplant · Glomerular · Paediatric nephro · Hypertension | ✅ |
| **Urology** | Andrology · Endourology/stones · Uro-oncology · Paediatric urology · Female urology · Transplant · Men's sexual health | ✅ |
| **Rheumatology** | Arthritis · Lupus/connective tissue · Vasculitis · Paediatric rheumatology | ✅ |
| **Oncology** | Medical · Surgical · Radiation · Paediatric · Haemato-oncology · Gynae-onco · Head & neck onco · Breast · Palliative onco | 🟡 (Medical only) |
| **Haematology** | Clinical haematology · Thalassemia/sickle · Bleeding disorders · BMT | ❌ |
| **General Surgery** | Laparoscopic · Bariatric · Breast · Colorectal · Endocrine surgery · Hernia · Trauma · Proctology | 🟡 "General & Laparoscopic" |
| **Plastic & Reconstructive Surgery** | Cosmetic · Burns · Hand · Craniofacial · Microvascular | ❌ |
| **Anaesthesiology & Pain** | Pain medicine · Critical care · Cardiac anaesthesia · Paediatric anaesthesia · Palliative | ❌ |
| **Radiology** | Interventional · Neuro · Musculoskeletal · Breast · Paediatric · Nuclear medicine | 🟡 (imaging tests, not doctor type) |
| **Pathology** | Histopathology · Cytology · Haematopathology · Microbiology · Biochemistry · Transfusion medicine · Molecular/genetics | 🟡 |
| **Emergency & Critical Care** | Emergency medicine · Intensivist · Trauma | ❌ |
| **Geriatrics** | Memory clinic · Falls · Palliative · Polypharmacy | ❌ |
| **Physical Medicine & Rehab (PMR)** | Neuro rehab · Spine rehab · Sports · Paediatric rehab · Prosthetics/Orthotics | ❌ |
| **Sports Medicine** | Injury prevention · Performance · Exercise physiology | ❌ |
| **Infectious Disease** | HIV · Tropical medicine · Hospital infection control · Travel | ✅ |
| **Allergy & Immunology** | Asthma-allergy · Food allergy · Immunodeficiency | ❌ |
| **Sexology / Andrology** | Sexual dysfunction · Marital counselling (medical) · STD | ❌ (discreet) |
| **Genetics** | Prenatal · Oncogenetics · Rare diseases | ❌ |
| **Sleep Medicine, Palliative Medicine, Occupational Medicine, Nuclear Medicine** | — | ❌ |

**AYUSH practitioner specialties:** Ayurveda (Kayachikitsa, Panchakarma, Shalya, Shalakya, Prasuti-Streeroga, Kaumarbhritya, Swasthavritta) · Homeopathy (constitutional, paediatric, skin, chronic) · Unani · Siddha · Naturopathy · Yoga therapy

**Mental-health professionals (alag group, MD nahi):** Clinical psychologist · Counselling psychologist · Counsellor · Psychotherapist · Child psychologist · Neuropsychologist · Rehabilitation psychologist · Psychiatric social worker · Art/music/dance therapist · De-addiction counsellor · Peer mentor (guardrails ke saath)

## 3. Dental (sub-tree)
Check-up/cleaning · Fillings · Root canal (RCT) · Crown/bridge · Dentures · Implants · Braces/aligners · Extraction/wisdom tooth · Gum treatment · Teeth whitening/cosmetic · Paediatric dentistry · Oral cancer screening · TMJ · Emergency dental (toothache/trauma) · Dental X-ray/OPG/CBCT

## 4. Diagnostics

**4.1 Test categories (organ + panel based, ek tree)** — current 21 ko restructure:
- **Blood basics** → CBC · ESR · Blood group & Rh · Peripheral smear · Coagulation (PT/INR, aPTT, D-dimer) · Iron studies
- **Diabetes** → Fasting/PP/Random glucose · HbA1c · Insulin/C-peptide · Urine microalbumin · Glucose tolerance
- **Lipid & Heart** → Lipid profile · Troponin · CK-MB · NT-proBNP · hs-CRP · Homocysteine · Lp(a)
- **Liver** → LFT · Hepatitis panel (A/B/C/E) · AFP · Ammonia
- **Kidney** → KFT/RFT · Electrolytes · Uric acid · Urine routine · Cystatin C · Urine ACR
- **Thyroid & Hormones** → TSH/T3/T4 · Anti-TPO · Cortisol · Prolactin · Testosterone · Estradiol/FSH/LH · AMH · PTH
- **Vitamins & Minerals** → Vit D · B12 · Folate · Calcium · Magnesium · Zinc
- **Infection / Serology** → Dengue · Malaria · Typhoid (Widal/Typhidot) · TB (CBNAAT/IGRA) · HIV · COVID/Flu · Chikungunya · Leptospira · Scrub typhus
- **Microbiology / Culture** → Urine/blood/stool/sputum/wound culture & sensitivity · AFB smear · Fungal
- **Allergy** → IgE total · Food allergy panel · Inhalant allergy panel
- **Autoimmune / Arthritis** → RA factor · Anti-CCP · ANA · ANCA · Complement
- **Cancer markers** → PSA · CA-125 · CA 19-9 · CEA · AFP · Beta-hCG
- **Women's health / Prenatal** → Pregnancy test · Dual/Triple/Quad marker · NIPT · Pap smear · OGTT · TORCH
- **Men's health** → PSA · Semen analysis · Testosterone
- **Paediatric** → Newborn screening · Neonatal bilirubin · Growth/thyroid
- **Histopathology / Cytology** → Biopsy · FNAC · Frozen section · Immunohistochemistry
- **Genetic / Molecular** → Karyotype · Thalassemia · BRCA · Pharmacogenomics · PCR panels
- **Stool / Urine specials** → Stool occult blood · Calprotectin · 24-hr urine
- **STD / Sexual health** → VDRL · HIV · Chlamydia/Gonorrhoea PCR (discreet)
- **Toxicology / Drug screening** → Urine drug screen · Alcohol · Heavy metals
- **Eye / ENT / Dental / Pulmonary tests** → Perimetry, OCT, Audiometry, Tympanometry, Spirometry (PFT), OPG
- **Neuro / Cardiac functional** → ECG · Echo · TMT · Holter · EEG · EMG/NCV · Sleep study (PSG)
- **Preventive Packages** → (see §4.3)

**4.2 Imaging modalities** (`Radiology.modality` 7 → expand)
X-Ray (digital, contrast) · Ultrasound (abdomen, pelvic, obstetric, TVS, doppler, thyroid, breast) · CT (HRCT chest, CT angiography, CT head, cardiac CT) · MRI (brain, spine, joints, MR angio, cardiac, MRCP) · Mammography · **DEXA/bone density** · **PET-CT** · **Nuclear scan (thyroid, bone)** · **Fluoroscopy/barium** · **Angiography (cath-lab)** · **OPG/CBCT (dental)** · **Echo/Stress echo** · **Elastography/FibroScan**

**4.3 Health-package categories** (`HealthPackage.category` 8 → expand)
Basic · Comprehensive/Master · **Executive** · Cardiac · Diabetic · **Thyroid** · **Liver** · **Kidney** · **Bone & joint** · Women · **Men** · **Child/Paediatric** · Senior citizen · **Pregnancy/Antenatal** · **Pre-marital** · **Pre-employment/Corporate** (Corporate ✅) · **Cancer screening** · **Fever/seasonal** · **Vitamin/Immunity** · **Fitness/athlete** · **Allergy** · **Sexual health (discreet)** · **Travel/visa medical** · **Insurance medical** · Other

**4.4 Sample types (enum):** Blood (whole/serum/plasma) · Urine (spot/24h) · Stool · Sputum · Swab (throat/nasal/wound/vaginal) · CSF · Tissue/biopsy · Semen · Body fluid · Saliva · Hair/nail · Breath

## 5. Pharmacy & medicine categories

**5.1 Therapeutic class (ATC-style)** — current list ko sahi dimension me:
- Antibiotics (penicillins, cephalosporins, macrolides, quinolones, aminoglycosides, tetracyclines…) · Antivirals · Antifungals · Antiparasitic/anthelmintic · Antimalarial · Anti-TB
- Analgesic/NSAID · Muscle relaxant · Anaesthetic · Opioid (controlled)
- Cardiovascular: Antihypertensive (ACEi/ARB/BB/CCB) · Diuretic · Statin/lipid-lowering · Antiplatelet · Anticoagulant · Antiarrhythmic · Nitrates
- Endocrine: Antidiabetic (oral, **insulin**, GLP-1) · Thyroid · Corticosteroid · Sex hormones/contraceptives
- GI: Antacid/PPI · Antiemetic · Laxative · Antidiarrhoeal · Probiotics/ORS
- Respiratory: Bronchodilator · Inhaled steroid · Cough/cold · Antihistamine · Mucolytic
- CNS: Antiepileptic · Antidepressant · Antipsychotic · Anxiolytic/sedative · Antiparkinson · Migraine · Dementia
- Dermatological: Antifungal/antibacterial topicals · Steroid creams · Emollients · Acne · Anti-lice/scabies
- Eye / Ear / Nose: drops, ointments
- Urological / Renal / Prostate · Gynaecological · Oncology · Immunosuppressant · Vaccines/biologicals
- Vitamins, minerals, nutritional supplements · Antidotes · Anti-allergic · Haematinics (iron, B12, folic)

**5.2 Rx schedule (`rxSchedule`)** — compliance ke liye zaruri:
`OTC` · `Schedule H` (prescription needed) · `Schedule H1` (register keeping, e.g., certain antibiotics/anxiolytics) · `Schedule X` (strict) · `Schedule G` (caution) · `Narcotic/NDPS` · `Non-scheduled prescription` · `Ayurvedic (OTC/Rx)`
> Pharmacy flow me Schedule H/H1/X par prescription upload mandatory, H1 register + audit.

**5.3 Dosage form** (`form` 9 → expand): Tablet · Capsule · Syrup/Suspension · Injection (IV/IM/SC) · Infusion · Drops (oral/eye/ear/nasal) · **Ointment** · Cream · **Gel** · **Lotion** · **Powder/Sachet** · **Suppository/Pessary** · **Patch** · **Spray** · Inhaler/Rotacap/Nebuliser solution · **Lozenge** · **Kit** · Other

**5.4 Product line** (alag field): Prescription medicines · OTC · Generic · Branded · **Ayurvedic/Herbal** · **Homeopathic** · **Unani/Siddha** · Supplements (vitamins, protein, omega, probiotics) · Baby care · Personal care · Sexual wellness (discreet) · Women's hygiene · Elder care (diapers etc.) · Diabetic care (strips, lancets) · Surgical/ortho · Medical devices · First aid · Hygiene (sanitiser, masks) · Health foods/nutrition drinks

**5.5 Special handling flags:** Cold-chain (2–8°C) · Controlled/narcotic · Habit-forming · Age-restricted · Pregnancy-unsafe · Look-alike sound-alike (LASA) warning

## 6. Emergency (types & services)
**Emergency type (add `emergencyType`):** Cardiac (chest pain/arrest) · Stroke · Trauma/Road accident · Burns · Poisoning/overdose · Obstetric · Paediatric/neonatal · Psychiatric/self-harm · Snake/animal bite · Drowning · Allergic/anaphylaxis · Respiratory distress · Diabetic emergency · Seizure · Fire/disaster
**Ambulance types:** BLS · ALS · NICU/Neonatal · Patient transport (non-emergency) · Mortuary · **Air ambulance** · **Bike responder** · **Cardiac ambulance**
**Blood services:** by group + component (✅) · **Donor drives** · **Apheresis (SDP/RDP)** · **Rare-group registry**
**Helplines:** 112 · 108/102 · Tele-MANAS 14416 · Women 181 · Child 1098 · Poison centre · Anti-venom

## 7. AYUSH & traditional
- **Ayurveda:** Kayachikitsa (general) · Panchakarma (Vamana, Virechana, Basti, Nasya, Raktamokshana) · Shalya (surgery/Kshar sutra) · Shalakya (eye-ENT-dental) · Prasuti-Stri Roga · Kaumarbhritya (paediatric) · Manasika · Swasthavritta (lifestyle) · Ayurvedic spa/Abhyanga
- **Homeopathy:** Classical · Paediatric · Skin · Chronic disease · Allergy
- **Unani:** Hijama (cupping) · Ilaj-bil-Tadbeer · General
- **Siddha:** Varmam · General
- **Yoga & Naturopathy:** Hydrotherapy · Mud therapy · Fasting therapy · Yoga therapy (disease-specific) · Diet therapy
- **Others:** Acupuncture/acupressure · Cupping · Reflexology · Chiropractic · Reiki (claims-restricted)

## 8. Mental & emotional health

**Concerns** (`COUNSELLOR_CONCERNS` 16 ✅ → expand):
Existing: Anxiety · Stress · Student pressure · Exam pressure · Loneliness · Mild depression · Relationship issues · Emotional healing · Trauma · Sleep · Burnout · Career stress · Addiction recovery · Meditation · Self-confidence · Motivation
**Add:** Grief/bereavement · Anger management · Parenting · Marriage/premarital · Breakup · **OCD** · **Phobias/panic** · **PTSD** · **Social anxiety** · **ADHD (adult/child)** · **Eating disorders** · **Body image** · **Postpartum/perinatal** · **Infertility stress** · **Chronic-illness coping (cancer, diabetes)** · **Caregiver burnout** · **Screen/gaming/social-media addiction** · **Workplace harassment/toxic workplace** · **Financial stress** · **LGBTQ+ affirming** · **Gender/sexual identity** · **Senior loneliness** · **Child behaviour** · **Bullying** · **Substance use (alcohol/tobacco/drugs)**

**Therapy modalities:** CBT · DBT · REBT · Psychodynamic · Mindfulness-based · Family/couple therapy · Play therapy (children) · Art/music therapy · Trauma-focused/EMDR · Motivational interviewing · Group therapy
**Provider mode:** In-person · Video · Audio · Chat (async) — **sensitive sessions ke liye apna LiveKit/E2E, third-party meet nahi**
**Risk tiers:** Low/Medium/High/Immediate ✅ → **crisis protocol** (helpline link, escalation, no auto-chat for Immediate)
**Programs:** Student wellness · Workplace EAP · Parenting · Sleep · Stress-at-work · De-addiction · Women's mental health · Senior emotional wellbeing

## 9. Rehab & therapy
- **Physiotherapy** [✅ module] → Orthopaedic · Neuro (stroke, Parkinson, spinal cord) · Sports injury · Cardio-respiratory · Paediatric · Geriatric · Women's health/pelvic floor · Post-operative · Pain management · Vestibular · Lymphoedema/oncology rehab
- **Occupational therapy:** ADL training · Hand therapy · Sensory integration · Cognitive rehab
- **Speech & language therapy:** Stuttering · Aphasia · Voice · Swallowing (dysphagia) · Language delay
- **Child development:** Autism · ADHD · Cerebral palsy · Learning disability · Early intervention · Special education
- **Audiology & hearing:** Hearing test · Hearing aid fitting · Cochlear implant support · Tinnitus
- **Prosthetics & orthotics:** Limb prosthesis · Braces/splints · Footwear
- **Cardiac / pulmonary rehab · Stroke rehab · Addiction rehab · Vision rehab**
- **Home vs centre-based** delivery

## 10. Women, maternity & child
- **Women:** Gynae consult · Menstrual disorders · PCOS · Menopause · Breast health · Contraception · Cervical screening · Fertility · Adolescent health · Women-only clinics
- **Maternity:** Antenatal care · Delivery (normal/C-section) · High-risk pregnancy · Postnatal care · **Lactation consultant** · **Doula** · **Prenatal yoga/classes** · **Newborn care**
- **Fertility/IVF:** IUI · IVF · ICSI · Egg/sperm freezing · Donor programs · Surrogacy (ART Act) · Male infertility
- **Child:** Newborn screening · Vaccination (UIP + optional) · Growth/development tracking · Paediatric nutrition · Paediatric emergencies · School health · Teen health · Child mental health

## 11. Elderly & long-term care
Home nursing · Attendant/caregiver (✅) · Elder-care home · Assisted living · Dementia/Alzheimer's care · Palliative/hospice · Geriatric physio · Fall-prevention · Memory clinic · Senior health packages (✅) · Medication management · Remote family dashboard (✅) · Senior social clubs/day-care · Medical transport for seniors

## 12. Chronic-disease programs
Diabetes (Type 1/2, gestational, diabetic foot, retinopathy) · Hypertension · Heart disease/cardiac rehab · Thyroid · PCOS · Obesity/weight management · Asthma/COPD · CKD/dialysis · Arthritis/osteoporosis · Epilepsy · Cancer survivorship · Liver disease · Migraine · Sleep apnoea · Depression/anxiety follow-up · Quit-smoking/alcohol · HIV care

## 13. Nutrition & food
- **Diet types:** Regular · Diabetic · Cardiac/heart-healthy · Low-sodium · Renal · High-protein · Low-fat · Low-residue · Bland · Clear liquid · Full liquid · Soft · Pureed/dysphagia · Tube/enteral · Gluten-free · Neutropenic · Paediatric · Weight-loss · Keto · Post-surgery · Pregnancy/lactation · Geriatric · NPO
- **Dietary preference:** Veg · Non-veg · Eggetarian · Vegan · Jain · Halal
- **Meal type:** Early-morning · Breakfast · Mid-morning · Lunch · Evening snack · Dinner · Bedtime · Supplement
- **Dietitian focus:** Clinical · Diabetes · Renal · Sports · Paediatric · Weight management · PCOS · Geriatric · Pregnancy · Gut health
- **Food stores:** Organic · Millets · Diabetic-friendly · Sugar-free · Gluten-free · Baby food · Protein/sports · Ayurvedic food · Herbal teas (FSSAI)
- **Supplements:** Multivitamin · Protein · Omega-3 · Probiotics · Iron/calcium · Herbal · Immunity (claims-restricted)
- **Tiffin/cloud kitchen:** Healthy meals · Calorie-controlled · Diabetic · Hospital-diet delivery

## 14. Fitness & wellness
- **Gym/fitness:** Gym · CrossFit · Functional training · Calisthenics · Personal training · Online coaching · Women-only gym · Senior fitness
- **Yoga:** Hatha · Ashtanga · Vinyasa · Iyengar · Power · Kundalini · Prenatal · Therapeutic · Senior · Kids · Corporate · **Yoga camps/retreats**
- **Mind-body:** Meditation · Pranayama · Sound healing · Tai chi · Breathwork
- **Dance/aerobics:** Zumba · Aerobics · Dance fitness · Pilates · Barre
- **Sports:** Swimming · Badminton · Cricket academy · Football · Tennis · Martial arts · Running clubs · Cycling · Trekking groups
- **Wellness centres:** Naturopathy · Ayurvedic wellness · Detox retreats · Spa/massage (non-clinical) · Sleep programs · Stress-relief
- **Programs:** Weight loss · Strength · Mobility · Postnatal fitness · Back-pain fitness · Diabetes-friendly exercise · Corporate wellness · School fitness
- **Fitness tech:** Wearable integration · Challenges · Streaks · Rewards (loyalty ✅)

## 15. Skin, hair & personal care
- **Clinics:** Dermatology · Cosmetology/aesthetics · Trichology/hair · Laser · Hair transplant · Anti-ageing
- **Conditions:** Acne · Pigmentation · Eczema/psoriasis · Fungal infections · Hair fall · Dandruff · Allergy · Vitiligo · Warts · Scars
- **Products:** Sunscreen · Moisturiser · Cleanser · Medicated shampoo · Anti-acne · Anti-fungal · Baby skin care · Hair oils · Oral care · Feminine hygiene · Men's grooming · Ayurvedic/herbal
- **Services:** Facials (wellness) · Massage · Salon (hygiene-compliant)
- **Compliance:** Cosmetic/claims restricted (`adClaimsRestricted: true`), CDSCO cosmetics, no "cure" claims

## 16. Devices & supplies
- **Monitoring:** BP monitor · Glucometer + strips · Pulse oximeter · Thermometer · Weighing scale · ECG patch/wearable · CGM
- **Respiratory:** Nebuliser · Oxygen concentrator · CPAP/BiPAP · Inhaler spacer · Oxygen cylinder
- **Mobility:** Wheelchair · Walker · Crutches · Cane · Commode chair · Shower chair · Stair-lift
- **Bed & furniture:** Hospital bed (manual/electric) · Air mattress · Bed-side table · Over-bed table
- **Orthopaedic:** Knee/back/neck braces · Splints · Compression stockings · Diabetic footwear · Orthotic insoles
- **Hearing / Vision:** Hearing aids · Spectacles · Contact lenses · Magnifiers
- **Wound / continence:** Dressings · Bandages · Adult diapers · Catheters · Ostomy
- **Home-test kits:** Pregnancy · Glucose · Dengue/COVID/HIV (CDSCO-approved) · Ovulation
- **First aid / hygiene:** First-aid kits · Masks · Gloves · Sanitiser · PPE
- **Mode:** Buy · **Rent** · Repair/service · Refurbished
- **Compliance:** Medical Devices Rules 2017 class (A/B/C/D), manufacturer license, warranty

## 17. Preventive / camps / events

**Event types (`event_type`):** Free health-checkup camp · Specialty camp (eye, dental, diabetes, cardiac, ortho, women) · Vaccination drive · **Blood-donation drive** · Screening (cancer, TB, anaemia, BP/sugar) · Awareness workshop/seminar · Webinar/live Q&A · **CPR/First-aid/BLS training** · Yoga/wellness event (Yoga Day etc.) · Walkathon/run · School/college health program · Corporate wellness day · RWA/community camp · Mental-health awareness · Nutrition workshop · Caregiver training · Disease-awareness days (World Heart/Diabetes/TB/Cancer Day…)
**Event fields:** organiser · partner facility · date/time · venue/online · capacity · fee (free/paid) · registration · consent (data) · outcome report
**Seasonal alerts:** Dengue/malaria · Flu/COVID · Heatwave · Air quality · Water-borne disease · Cold-wave

## 18. Government & schemes
Facility types (PHC/CHC/UPHC/Arogya Mandir) · PM-JAY empanelled hospital filter · CGHS/ESI/ECHS/state-scheme facilities · Jan Aushadhi · Maternal-child schemes (JSY, PMMVY) · Immunisation (UIP) · National programs (TB, NCD, mental-health) · Disability/UDID help · Free-medicine lists · Grievance (✅)

## 19. Records (`Record.type` 7 → expand)
Existing: diagnosis · prescription · lab_report · imaging · discharge_summary · bill_invoice · payment_invoice
**Add:** vaccination_record · consent_form · referral_letter · operative_note · histopathology_report · ecg_echo_report · mlc_report · medical_certificate (fitness/sick leave) · allergy_list · growth_chart · insurance_claim_docs · pre_auth · death/birth intimation · ABHA-linked document · patient-uploaded external report · wearable export
(FHIR DocumentReference/Observation types se map karna aage integration me kaam aayega)

## 20. Insurance & finance
- **Policy types:** Individual · Family floater · Senior-citizen · Critical illness · Top-up/super top-up · Group/corporate · Maternity cover · Accident/personal · Government scheme (PM-JAY/CGHS/ESI/ECHS/state) · Disease-specific (diabetes etc.)
- **Claim types:** Cashless · Reimbursement · Pre-authorisation · Day-care · OPD cover · Pre/post hospitalisation · Ambulance cover · AYUSH cover
- **Payment methods:** + Wallet · NetBanking · EMI · Govt scheme · Insurance direct-settlement
- **Finance services:** Medical EMI · Medical loan · Crowdfunding/NGO aid · HSA/FSA-style savings · Subscription plans
- **Billing sources:** + ambulance · blood-bank · home-service · equipment-rental · membership · event

## 21. Legal (Lawyer profile) — practice areas (❌ abhi missing)
Medical negligence · Consumer-court (health) · Insurance-claim disputes · MLC/medico-legal cases · Criminal (medical negligence, 304A) · Hospital compliance/licensing · Clinical Establishments Act · Mental Healthcare Act matters · Disability rights · Organ-donation legalities · Labour (medical staff) · Property/inheritance (elder care) · Child-protection (POCSO) · Women's protection (DV Act) · Cyber/privacy (DPDP)
**Add fields:** state bar council ✅ · courts ✅ · languages ✅ · experience · consultation modes · fee type

## 22. Home services
Home doctor visit · Home nursing · Home sample collection (✅) · Home physiotherapy · Home vaccination · Home ICU setup · Home dialysis support · Home elder-care/attendant (✅) · Home dietitian · Home yoga/fitness trainer · Home oxygen/equipment setup · Home medicine delivery (✅) · Home palliative care · Teleconsult follow-up

## 23. Transport & logistics
- **Vehicle types** (`Vehicle.type` 5): bike · auto · e_rickshaw · car · van → **add:** wheelchair-accessible van · stretcher van · bus (group camps) · mini-truck (equipment)
- **Ambulance:** see §6
- **Delivery partner types:** medicine delivery · lab-sample courier (cold-chain) · equipment delivery · blood/organ courier · meal delivery
- **Ride use-cases:** OPD visit · dialysis/chemo trips · discharge · diagnostics · vaccination · elderly pickup
- **Transfer scope:** local · regional · intercity (✅) · **airport**

## 24. Hospital / clinic operations (B2B)
- **Staff roles** (16 ✅ → expand): existing Doctor · Nurse · Pharmacist · Lab Technician · Radiologist · Dietitian · Physiotherapist · Counselor · Technician · Helper · Security · Accountant · Receptionist · Driver · Ambulance Driver · Hospital admin
  **Add:** Anaesthetist · Surgeon · Resident/Intern · OT technician · Ward boy/Ayah · Paramedic/EMT · Phlebotomist · Radiographer/Sonographer · Cook/Kitchen staff · Housekeeping · Biomedical engineer · Storekeeper · Billing/TPA/insurance executive · Medical-records officer · Social worker · HR · IT support · Quality/infection-control officer · Fire-safety officer
- **Departments:** OPD · IPD · ICU/NICU/PICU/CCU · Emergency · OT · Radiology · Pathology · Pharmacy · Blood bank · Dialysis · Physiotherapy · Dietary · Housekeeping · Billing · Medical records · Biomedical engineering · Infection control · Mortuary · CSSD (sterilisation) · Laundry/linen
- **Inventory categories:** + Implants/prosthetics · Linen · Lab reagents/kits · Radiology films/contrast · Medical gases · Kitchen/food · BMW bags · PPE · Fire-safety · IT
- **Units:** + Vial · Ampoule · Strip · Bottle · Tube · Pack · mL · Cartridge
- **Equipment:** + Ventilator · Defibrillator · Infusion/syringe pump · Dialysis machine · Autoclave · Anaesthesia machine · Patient monitor · OT table/lights · C-arm · Portable USG/X-ray · Suction · Nebuliser · Warmer/incubator
- **Housekeeping:** + Biomedical-waste pickup · Linen change · Pest control · Water-tank cleaning
- **Bed types:** General · Semi-private · Private · Deluxe/suite · ICU · NICU · HDU · Isolation · Day-care · Dialysis chair
- **OT types:** Major · Minor · Cardiac · Neuro · Ortho · Obstetric · Ophthalmic · Day-care
- **Quality & compliance:** NABH checklist · incident reports · BMW logs · fire-drill · calibration/AMC · license expiry reminders

## 25. Education & content
Health articles by specialty · Videos · Doctor Q&A · Myth-busting/fact-check · Disease guides (diabetes, BP, thyroid…) · Pregnancy week-by-week · Child-care · Elder-care guides · First-aid · Yoga/exercise libraries · Recipes (diet) · Mental-health self-help · Medicine information (uses/side-effects) · **Courses** (CPR, caregiver, nutrition, yoga-teacher) · **Webinars** · **Languages:** Hindi + regional · **Accessibility:** audio/large-font · Content moderation: doctor-reviewed badge

## 26. Cross-cutting lists

**Languages (current 11 → expand):** Hindi · English · Marathi · Bengali · Tamil · Telugu · Gujarati · Punjabi · Urdu · Kannada · Malayalam · **Odia · Assamese · Bhojpuri · Rajasthani · Maithili · Konkani · Kashmiri · Sindhi · Nepali · Bundeli · Malvi · Chhattisgarhi · Sanskrit · Sign language (ISL)**
**Consultation modes (normalize):** `in_person` · `video` · `audio` · `chat` · `home_visit`
**Gender preference:** Any · Female provider · Male provider
**Accessibility:** Wheelchair · Ramp/lift · Braille/audio · Sign-language support · Large-font UI · Voice navigation
**Time:** 24x7 · Open now · Morning/Evening · Weekend · Emergency hours
**Payment:** Cash · UPI · Card · Wallet · EMI · Insurance cashless · Govt scheme
**Verification badges:** Licence verified · Registration verified · NABH/NABL · Background-checked (assistants ✅) · Police-verified (✅) · Doctor-reviewed content

---

# PART D — Migration plan + validation

## D1. Kaam ka order (chhota → bada)
1. **Specialty normalization (sabse pehle):** canonical specialty list + aliases banao → script se `Doctor.specialization` aur `Facility.specialties[]` ko canonical codes me map karo → purane values aliases me rakho.
2. **Single source:** `GET /api/categories/public?type=specialty` (cached) banao; frontend lists (`HospitalDirectory`, `ClinicDoctors`, `JoinPlatform`, `AllTests`, `AdminTestCatalog`, `Home`) isi se populate karo.
3. **Category model:** `type` enum extend, `code`, `aliases`, `path`, `level`, `externalCodes`, unique index change; admin UI me tree editor.
4. **Test categories:** 3 lists ko ek tree me merge → `Test.category` ko `categoryCode` banao, migration script.
5. **Medicine:** `therapeuticClass`, `rxSchedule`, `productLine`, `form` alag fields; `Vitamin`/`Vitamins` merge; pharmacy flow me Schedule H/H1/X checks.
6. **Appointment modes normalize** (`home`/`home_visit`, `audio`/`voice`/`call`).
7. **Facility subType/ownership/system/accreditation/schemes** add; onboarding form me.
8. **Naye provider types** onboarding (Phase-wise, "Categories Master" file ke hisaab se).
9. **Hardcoded counts** (`Home.tsx` "45+") hatao → DB counts.

## D2. Validation rules
- Category `code` regex: `^[A-Z]+(\.[A-Z0-9_]+)+$`; immutable after create.
- Provider ka specialty = **valid active code** (free-text sirf "Other" + review queue).
- Specialty sirf us provider type par jo allowed hai (e.g., Dentist → Dental tree; Psychiatry MD only for registered psychiatrist).
- `adClaimsRestricted` categories par listing text me "cure/guarantee" jaise words block/flag.
- T1 categories par PHI controls (authz, audit, field encryption); T3 par patient data nahi.
- Regulatory docs per category: Clinic/Hospital (CEA, BMW), Pharmacy (DL + pharmacist), Lab (NABL optional, pathologist reg), Radiology (AERB, PCPNDT), AYUSH (council), Psychologist/therapist (RCI), Yoga (YCB), Food (FSSAI), Devices (CDSCO).
- Search: text index on `name + aliases`; handle spellings (Orthopedics/Orthopaedics), Hindi/Hinglish (**"bone doctor", "baccho ka doctor"**).

## D3. Safety/compliance notes per sensitive subcategory
| Subcategory | Dhyan rakho |
|---|---|
| Ultrasound/obstetric USG | PCPNDT — gender-determination ka koi content/filter nahi |
| Sexual health/andrology/STD | Discreet notifications, masked listing |
| Cosmetic/weight-loss/hair-growth | Ad-claim restrictions, before/after images ki policy |
| Schedule H/H1/X/NDPS | Prescription mandatory, register, audit, no "quick add to cart" |
| IVF/surrogacy | ART Act registration |
| De-addiction/psychiatric | MHCA 2017 confidentiality, voluntary/involuntary admission rules |
| Peer mentor (mental health) | No diagnosis/medication advice; crisis escalation mandatory |
| Minors (paediatric, child counselling) | Guardian consent, DPDP children's data rules |
| Supplements/health foods | FSSAI, no disease-cure claims |
| Medical devices | CDSCO class, warranty, return policy |

---

## Summary (ek line me)
**Current categories ka core achha hai (hospital/clinic/lab/pharmacy + diagnostic + blood bank + ambulance + mental health), lekin:** specialties inconsistent hain, test/medicine categories mixed-dimension hain aur 3 jagah duplicate hain, Rx schedule/sub-types/ownership/schemes missing hain. Pehle **taxonomy ko ek jagah (DB tree) laao**, phir Part C ke subcategories phase-wise add karo.

*Static review: app run nahi hui. Medical/regulatory lists clinician aur lawyer se confirm karwa lo.*