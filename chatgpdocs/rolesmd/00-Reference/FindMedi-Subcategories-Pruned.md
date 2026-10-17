# FindMedi — Subcategories (pruned catalogue ke hisaab se)

> `FindMedi-Categories-Pruned.md` ke har section ke subcategories. Faltu categories (veterinary, funeral, tattoo, medical tourism, air ambulance, EMI/crowdfunding, pharma B2B etc.) ke subcategories **nahi** hain. Koi Phase/timeline nahi.
>
> **Repo status (latest `origin/main`, `be3d9520`):**
> - `Category` model ab taxonomy-ready hai: `code`, `nameHi`, `aliases`, `parent`, `path`, `level`, `tier`, `regulatedBy`, `adClaimsRestricted`, `externalCodes` (snomed/atc/loinc/icd10/hsn), text index — ✅
> - `lib/taxonomy.js` aur `lib/canonicalSpecialties.js` hain, par canonical specialty file chhoti hai (47 lines, sirf Orthopaedics spelling alias dikha) — isliye **neeche ki poori tree seed karni hai**.
> - `FACILITY_SUBTYPES`, `FACILITY_OWNERSHIP`, `SYSTEMS_OF_MEDICINE`, `FACILITY_SCHEMES` already hain — jo unme hai wo ✅, naye ➕ se mark hain.
>
> **Code format:** `PREFIX.GROUP.LEAF` (jaise `SPEC.CARDIO.INTERVENTIONAL`). Immutable rakho; naam/aliases badal sakte hain.

| Mark | Matlab |
|---|---|
| ✅ | Repo me already (subtype/enum) |
| ➕ | Naya add karna hai |
| 🔒 | Sensitive: discreet + extra controls (catalogue §24) |

---

## 1. Healthcare facilities — `FAC.*`

**1.1 Hospital**
✅ multi_specialty · super_specialty · single_specialty (eye, ortho, cardiac, cancer, maternity, ENT, kidney, neuro, paediatric) · nursing_home · maternity_hospital · day_care_surgery · government_hospital · district_hospital · medical_college · trauma_centre · rehabilitation_hospital · psychiatric_hospital · tb_chest_hospital · infectious_disease_hospital · cancer_centre · railway_esi_cghs_defence
➕ community_health_centre (CHC alag se mark) · teaching_hospital (medical_college ka alias)

**1.2 Clinic**
✅ single_doctor_clinic · polyclinic · specialty_clinic · dental_clinic · eye_clinic · ayush_clinic · physiotherapy_clinic · fertility_clinic · urgent_care_clinic · corporate_clinic · campus_clinic · telemedicine_clinic · mohalla_community_clinic
➕ skin_hair_clinic · diabetes_clinic · ortho_spine_clinic · ent_clinic · paediatric_clinic · women_clinic · pain_clinic · sleep_clinic · wound_care_clinic · travel_vaccination_clinic

**1.3 Primary govt (Info + Facility)**
✅ phc · chc · uphc · sub_centre · arogya_mandir

**1.4 Lab / diagnostic**
✅ pathology_lab · imaging_centre · diagnostic_centre · collection_centre · home_collection_lab · mobile_diagnostic_van · cardiac_diagnostic_centre · sleep_lab · genetic_molecular_lab · blood_bank
➕ dental_diagnostic · eye_diagnostic · audiology_lab

**1.5 Pharmacy**
✅ retail_pharmacy · hospital_pharmacy · jan_aushadhi_kendra · generic_store · pharmacy_24x7 · online_pharmacy · ayurvedic_homeopathic_store · surgical_ortho_store · chain_pharmacy · wholesale_pharmacy

**1.6 Wellness / rehab / long-term care**
✅ wellness_centre · fitness_centre · elder_care_home · assisted_living · hospice_palliative · de_addiction_centre 🔒 · child_development_centre · rehabilitation_centre
➕ yoga_studio · dialysis_centre · optical_shop · hearing_aid_centre · geriatric_daycare

**1.7 Ownership** ✅: government · private · trust_charitable · corporate_chain · cooperative · ppp · military_railway_esi
**1.8 System of medicine** ✅: allopathy · ayurveda · homeopathy · unani · siddha · yoga_naturopathy · sowa_rigpa* · integrative  (*sowa_rigpa listing me rakho par practitioner category me nahi — unverifiable)
**1.9 Accreditation** ➕: NABH (full / entry-level) · NABL · JCI · NQAS (govt) · Kayakalp · ISO 9001 · AERB registered · ART registered
**1.10 Schemes accepted** ✅ (`FACILITY_SCHEMES`): PM-JAY · CGHS · ESI · ECHS · state scheme · private cashless · TPA-empanelled · corporate tie-up
**1.11 Amenities** ➕: 24x7 · ICU · NICU/PICU · emergency/trauma · blood bank · in-house pharmacy · ambulance · parking · wheelchair access · lift · cafeteria · pickup-drop · prayer room · visitor lodging · female staff available · Wi-Fi
**1.12 Services offered (tags)** ➕: OPD · IPD · day-care · emergency · surgery · dialysis · chemo · IVF · vaccination · home collection · home visit · telemedicine · health packages · second opinion

---

## 2. Practitioners — `SPEC.*` / `PRO.*`

**2.1 Specialty → sub-specialties** (canonical spelling: Orthopaedics, Paediatrics, Obstetrics & Gynaecology; aliases: Orthopedics, Pediatrics, Gynecology…)

| Specialty (code) | Sub-specialties |
|---|---|
| General / Family Medicine (`SPEC.GEN`) | Family physician · Internal medicine · Hospitalist · Preventive medicine · Travel medicine |
| Cardiology (`SPEC.CARDIO`) | Interventional · Electrophysiology · Heart failure · Paediatric cardiology · Preventive · Cardiac imaging |
| CTVS (`SPEC.CTVS`) | Cardiac surgery · Thoracic surgery · Vascular surgery · Endovascular |
| Neurology (`SPEC.NEURO`) | Stroke · Epilepsy · Movement disorders · Headache · Neuromuscular · Paediatric neurology |
| Neurosurgery (`SPEC.NSURG`) | Spine · Brain tumour · Functional · Paediatric · Endovascular |
| Orthopaedics (`SPEC.ORTHO`) | Joint replacement · Sports/arthroscopy · Spine · Trauma · Paediatric ortho · Hand/microsurgery · Foot & ankle · Ortho-oncology |
| Obstetrics & Gynaecology (`SPEC.OBGYN`) | Obstetrics/high-risk · Infertility/IVF · Gynae-oncology · Laparoscopic · Urogynaecology · Adolescent gynae · Menopause · Fetal medicine |
| Paediatrics (`SPEC.PAED`) | Neonatology · Paediatric cardiology/neurology/nephrology/pulmonology/gastro/endocrinology/haem-onc · Developmental · Adolescent · Vaccination |
| Paediatric Surgery (`SPEC.PSURG`) | Neonatal surgery · Urology · Oncology |
| Dermatology (`SPEC.DERM`) | Medical derma · Cosmetology/aesthetics · Trichology · Venereology 🔒 · Paediatric derma · Dermatosurgery |
| ENT (`SPEC.ENT`) | Otology · Rhinology · Laryngology · Head & neck · Paediatric ENT · Sleep surgery |
| Ophthalmology (`SPEC.OPHTH`) | Cataract · Retina · Cornea · Glaucoma · Paediatric · Oculoplasty · Squint · Refractive/LASIK · Neuro-ophthalmology |
| Dental & Oral (`SPEC.DENTAL`) | see §3 |
| Psychiatry (`SPEC.PSY`) 🔒 | Child & adolescent · Geriatric · De-addiction · Neuropsychiatry · Perinatal · Sleep |
| Gastroenterology (`SPEC.GI`) | Hepatology · Endoscopy/ERCP · IBD · Paediatric GI · GI surgery · Bariatric |
| Pulmonology (`SPEC.PULM`) | Critical care · Sleep medicine · Interventional · TB & chest · Allergy-asthma · Occupational lung |
| Endocrinology & Diabetology (`SPEC.ENDO`) | Diabetes · Thyroid · Obesity · Paediatric endocrine · PCOS/hormonal · Bone/osteoporosis · Pituitary |
| Nephrology (`SPEC.NEPH`) | Dialysis · Transplant · Glomerular · Paediatric nephro · Hypertension |
| Urology (`SPEC.URO`) | Andrology 🔒 · Endourology/stones · Uro-oncology · Paediatric urology · Female urology · Transplant |
| Rheumatology (`SPEC.RHEUM`) | Arthritis · Lupus/connective tissue · Vasculitis · Paediatric rheumatology |
| Oncology (`SPEC.ONCO`) | Medical · Surgical · Radiation · Paediatric · Haemato-oncology · Gynae-onco · Head & neck · Breast · Palliative onco |
| Haematology (`SPEC.HAEM`) | Clinical haematology · Thalassemia/sickle cell · Bleeding disorders · BMT |
| General Surgery (`SPEC.GSURG`) | Laparoscopic · Bariatric · Breast · Colorectal · Endocrine · Hernia · Trauma · Proctology |
| Plastic & Reconstructive (`SPEC.PLASTIC`) | Cosmetic 🔒 · Burns · Hand · Craniofacial · Microvascular |
| Anaesthesiology & Pain (`SPEC.ANAES`) | Pain medicine · Critical care · Cardiac · Paediatric · Palliative |
| Radiology (`SPEC.RAD`) | Interventional · Neuro · Musculoskeletal · Breast · Paediatric · Nuclear medicine |
| Pathology (`SPEC.PATH`) | Histopathology · Cytology · Haematopathology · Microbiology · Biochemistry · Transfusion medicine · Molecular/genetics |
| Emergency & Critical Care (`SPEC.EM`) | Emergency medicine · Intensivist · Trauma |
| Geriatrics (`SPEC.GERI`) | Memory clinic · Falls · Palliative · Polypharmacy |
| PMR / Rehabilitation Medicine (`SPEC.PMR`) | Neuro rehab · Spine rehab · Sports · Paediatric rehab · Prosthetics/Orthotics |
| Sports Medicine (`SPEC.SPORTS`) | Injury prevention · Performance · Exercise physiology |
| Infectious Disease (`SPEC.ID`) | HIV 🔒 · Tropical medicine · Infection control · Travel |
| Allergy & Immunology (`SPEC.ALLERGY`) | Asthma-allergy · Food allergy · Immunodeficiency |
| Sexology / Andrology (`SPEC.SEX`) 🔒 | Sexual dysfunction · Sexual health (discreet) |
| Genetics (`SPEC.GEN2`) | Prenatal · Oncogenetics · Rare diseases |
| Sleep · Palliative · Occupational · Nuclear Medicine | (single-level specialties) |

**2.2 AYUSH practitioner** (`PRO.AYUSH.*`): Ayurveda (Kayachikitsa · Panchakarma · Shalya · Shalakya · Prasuti-Streeroga · Kaumarbhritya · Swasthavritta) · Homeopathy (classical · paediatric · skin · chronic) · Unani · Siddha · Naturopathy · Yoga therapy

**2.3 Allied & therapy professionals** (`PRO.ALLIED.*`): Physiotherapist · Occupational therapist · Speech-language pathologist · Audiologist · Dietitian/Nutritionist · Optometrist · Prosthetist/Orthotist · Radiographer · Sonographer · Lab technician · Phlebotomist · Pharmacist · Nurse (staff/home) · Paramedic/EMT

**2.4 Mental-health professionals** (`PRO.MH.*`) 🔒: Clinical psychologist · Counselling psychologist · Counsellor · Psychotherapist · Child psychologist · Neuropsychologist · Rehabilitation psychologist · Psychiatric social worker · Art/music/dance therapist · De-addiction counsellor · Peer mentor (guardrails ke saath, clinical nahi)

**2.5 Wellness professionals** (`PRO.WELL.*`): Yoga teacher · Personal trainer · Group-fitness instructor · Sports coach · Meditation teacher

---

## 3. Dental sub-tree — `SPEC.DENTAL.*`
**Specialties:** Orthodontics · Endodontics · Periodontics · Prosthodontics · Oral & maxillofacial surgery · Implantology · Paedodontics · Oral medicine & radiology · Cosmetic dentistry
**Procedures:** Check-up & cleaning · Fillings · Root canal (RCT) · Crown/bridge · Dentures · Implants · Braces/aligners · Extraction/wisdom tooth · Gum treatment · Teeth whitening · Paediatric dentistry · Oral cancer screening · TMJ · Emergency dental (toothache/trauma)
**Imaging:** Dental X-ray (RVG) · OPG · CBCT

---

## 4. Diagnostics — `DIAG.*`

**4.1 Test categories (organ + panel)**
- **Blood basics:** CBC · ESR · Blood group & Rh · Peripheral smear · Coagulation (PT/INR, aPTT, D-dimer) · Iron studies
- **Diabetes:** Glucose (fasting/PP/random) · HbA1c · Insulin/C-peptide · Urine microalbumin · GTT
- **Lipid & heart:** Lipid profile · Troponin · CK-MB · NT-proBNP · hs-CRP · Homocysteine · Lp(a)
- **Liver:** LFT · Hepatitis panel (A/B/C/E) · AFP · Ammonia
- **Kidney:** KFT · Electrolytes · Uric acid · Urine routine · Cystatin C · Urine ACR
- **Thyroid & hormones:** TSH/T3/T4 · Anti-TPO · Cortisol · Prolactin · Testosterone · Estradiol/FSH/LH · AMH · PTH
- **Vitamins & minerals:** Vit D · B12 · Folate · Calcium · Magnesium · Zinc
- **Infection / serology:** Dengue · Malaria · Typhoid · TB (CBNAAT/IGRA) · HIV 🔒 · COVID/Flu · Chikungunya · Leptospira · Scrub typhus
- **Microbiology / culture:** Urine/blood/stool/sputum/wound culture & sensitivity · AFB smear · Fungal
- **Allergy:** Total IgE · Food panel · Inhalant panel
- **Autoimmune / arthritis:** RA factor · Anti-CCP · ANA · ANCA · Complement
- **Cancer markers:** PSA · CA-125 · CA 19-9 · CEA · AFP · Beta-hCG
- **Women's / prenatal:** Pregnancy test · Dual/Triple/Quad marker · NIPT · Pap smear · OGTT · TORCH
- **Men's health:** PSA · Semen analysis · Testosterone
- **Paediatric:** Newborn screening · Neonatal bilirubin
- **Histopathology / cytology:** Biopsy · FNAC · Frozen section · IHC
- **Genetic / molecular:** Karyotype · Thalassemia · BRCA · Pharmacogenomics · PCR panels
- **STD / sexual health** 🔒: VDRL · HIV · Chlamydia/gonorrhoea PCR
- **Toxicology:** Urine drug screen · Alcohol · Heavy metals
- **Functional:** ECG · Echo · TMT · Holter · EEG · EMG/NCV · Sleep study (PSG) · Spirometry (PFT) · Audiometry · Tympanometry · Perimetry/OCT

**4.2 Imaging modalities (`DIAG.IMG.*`):** X-ray (digital, contrast) · Ultrasound (abdomen, pelvic, obstetric, TVS, doppler, thyroid, breast) · CT (HRCT chest, angiography, head, cardiac) · MRI (brain, spine, joints, MR angio, cardiac, MRCP) · Mammography · DEXA · PET-CT · Nuclear scan · Fluoroscopy/barium · Angiography · Elastography/FibroScan · OPG/CBCT
**4.3 Health-package categories:** Basic · Comprehensive/Master · Executive · Cardiac · Diabetic · Thyroid · Liver · Kidney · Bone & joint · Women · Men · Child · Senior citizen · Pregnancy/antenatal · Pre-marital · Pre-employment/corporate · Cancer screening · Fever/seasonal · Vitamin/immunity · Fitness/athlete · Allergy · Sexual health 🔒 · Travel/visa medical · Insurance medical
**4.4 Sample types (enum):** Blood (whole/serum/plasma) · Urine (spot/24h) · Stool · Sputum · Swab (throat/nasal/wound/vaginal) · CSF · Tissue/biopsy · Semen · Body fluid · Saliva · Hair/nail · Breath

---

## 5. Pharmacy & medicines — `MED.*`

**5.1 Therapeutic class (ATC-style):**
Antibiotics (penicillins, cephalosporins, macrolides, quinolones, aminoglycosides, tetracyclines) · Antivirals · Antifungals · Antiparasitic/anthelmintic · Antimalarial · Anti-TB · Analgesic/NSAID · Muscle relaxant · Anaesthetic · Opioid (controlled) · Cardiovascular (antihypertensive, diuretic, statin, antiplatelet, anticoagulant, antiarrhythmic, nitrates) · Endocrine (oral antidiabetic, **insulin**, GLP-1, thyroid, corticosteroid, hormones/contraceptives) · GI (antacid/PPI, antiemetic, laxative, antidiarrhoeal, probiotics/ORS) · Respiratory (bronchodilator, inhaled steroid, cough/cold, antihistamine, mucolytic) · CNS (antiepileptic, antidepressant, antipsychotic, anxiolytic/sedative, antiparkinson, migraine, dementia) · Dermatological topicals · Eye/ear/nose · Urological/renal/prostate · Gynaecological · Oncology · Immunosuppressant · Vaccines/biologicals · Vitamins/minerals/haematinics · Antidotes · Anti-allergic

**5.2 Rx schedule (`rxSchedule`):** OTC · Schedule H · Schedule H1 (register) · Schedule X · Schedule G · Narcotic/NDPS · Non-scheduled prescription · Ayurvedic (OTC/Rx)
**5.3 Dosage form:** Tablet · Capsule · Syrup/Suspension · Injection (IV/IM/SC) · Infusion · Drops (oral/eye/ear/nasal) · Ointment · Cream · Gel · Lotion · Powder/Sachet · Suppository/Pessary · Patch · Spray · Inhaler/Rotacap/Nebuliser solution · Lozenge · Kit
**5.4 Product line (alag field):** Prescription · OTC · Generic · Branded · Ayurvedic/Herbal · Homeopathic · Unani/Siddha · Supplements · Baby care · Personal care · Women's hygiene · Elder care (diapers etc.) · Diabetic care (strips, lancets) · Surgical/ortho · Medical devices · First aid · Hygiene · Health foods
**5.5 Special handling flags:** Cold-chain (2–8°C) · Controlled/narcotic · Habit-forming · Age-restricted · Pregnancy-unsafe · Look-alike sound-alike

---

## 6. Emergency & critical care — `EMG.*`
**Emergency type:** Cardiac (chest pain/arrest) · Stroke · Trauma/road accident · Burns · Poisoning/overdose · Obstetric · Paediatric/neonatal · Psychiatric/self-harm 🔒 · Snake/animal bite · Drowning · Allergic/anaphylaxis · Respiratory distress · Diabetic emergency · Seizure
**Ambulance type:** BLS · ALS · NICU/neonatal · Patient transport (non-emergency) · Mortuary · Cardiac ambulance · Bike responder
**Blood:** groups (A/B/AB/O ±) · components (whole blood, PRBC, platelets RDP/SDP, FFP, cryoprecipitate) · donor drives · rare-group registry
**Helplines (Info):** 112 · 108/102 · Tele-MANAS 14416 · Women 181 · Child 1098 · Poison centre · Anti-venom
**Oxygen supply:** Cylinder · Concentrator (rent/buy) · Refill

---

## 7. AYUSH & integrative — `AYUSH.*`
- **Ayurveda:** Kayachikitsa · Panchakarma (Vamana, Virechana, Basti, Nasya, Raktamokshana) · Shalya (Kshar sutra) · Shalakya · Prasuti-Stri Roga · Kaumarbhritya · Swasthavritta · Abhyanga/therapies
- **Homeopathy:** Classical · Paediatric · Skin · Chronic disease · Allergy
- **Unani:** Hijama (cupping) · Ilaj-bil-Tadbeer · General
- **Siddha:** Varmam · General
- **Yoga & Naturopathy:** Hydrotherapy · Mud therapy · Fasting therapy · Yoga therapy (disease-specific) · Diet therapy
- **Others:** Acupuncture/acupressure · Cupping · Reflexology · Chiropractic

---

## 8. Specialty centres — `CENTRE.*`
- **Dental:** see §3
- **Eye:** Cataract · LASIK/refractive · Retina · Glaucoma · Cornea · Squint · Paediatric eye · Eye camps · Optical (frames, lenses, contact lenses, free eye test)
- **Dialysis:** Hemodialysis · Peritoneal · Isolation (HBV/HCV) · Recurring slot packages · Transplant follow-up
- **Cancer:** Chemotherapy · Radiotherapy · Surgical oncology · Day-care chemo · Palliative · Screening
- **Cardiac:** Cath-lab · Cardiac rehab · Heart check-ups · Pacemaker/device clinic
- **Ortho/spine:** Joint replacement · Spine · Sports injury · Fracture clinic · Physio
- **Diabetes/endocrine:** Diabetes · Thyroid · Obesity · Diabetic foot · Retinopathy screening
- **Skin/hair:** Dermatology · Trichology · Laser · Hair transplant 🔒(claims)
- **Pain · Wound care · Sleep · Urology/lithotripsy · Plastic/cosmetic 🔒 · Sexual health 🔒 · Transplant 🔒 · Travel medicine/vaccination**
- **ENT/audiology:** Hearing test · Hearing-aid fitting · Tinnitus · Cochlear support

---

## 9. Mental & emotional health — `MH.*` 🔒
**Concerns:** Anxiety · Stress · Student/exam pressure · Loneliness · Mild depression · Relationship issues · Trauma · Sleep · Burnout · Career stress · Addiction recovery · Self-confidence · Grief/bereavement · Anger management · Parenting · Marriage/premarital · OCD · Phobias/panic · PTSD · Social anxiety · ADHD · Eating disorders · Body image · Postpartum/perinatal · Infertility stress · Chronic-illness coping · Caregiver burnout · Screen/gaming/social-media addiction · Workplace harassment · Financial stress · LGBTQ+ affirming · Child behaviour · Bullying · Substance use · Senior loneliness
**Therapy modalities:** CBT · DBT · REBT · Psychodynamic · Mindfulness-based · Family/couple · Play therapy · Art/music · Trauma-focused/EMDR · Motivational interviewing · Group
**Mode:** In-person · Video · Audio · Chat (async)
**Risk levels:** Low · Medium · High · Immediate (crisis protocol)
**Programs:** Student wellness · Workplace stress · Parenting · Sleep · De-addiction · Women's mental health · Senior emotional wellbeing · Meditation/mindfulness (T3)

---

## 10. Rehab & therapy — `REHAB.*`
- **Physiotherapy focus:** Orthopaedic · Neuro (stroke, Parkinson, spinal cord) · Sports injury · Cardio-respiratory · Paediatric · Geriatric · Women's health/pelvic floor · Post-operative · Pain management · Vestibular · Lymphoedema
- **Occupational therapy:** ADL training · Hand therapy · Sensory integration · Cognitive rehab
- **Speech & language:** Stuttering · Aphasia · Voice · Dysphagia · Language delay
- **Child development:** Autism · ADHD · Cerebral palsy · Learning disability · Early intervention · Special education
- **Audiology & hearing:** Hearing test · Hearing-aid fitting · Cochlear implant support
- **Prosthetics & orthotics:** Limb prosthesis · Braces/splints · Footwear
- **Other:** Cardiac/pulmonary rehab · Stroke rehab · Vision rehab · Addiction rehab 🔒
- **Delivery:** Centre-based · Home-based

---

## 11. Women, maternity & child — `WCH.*`
- **Women:** Gynae consult · Menstrual disorders · PCOS · Menopause · Breast health · Contraception · Cervical screening · Adolescent health · Women-only filter
- **Maternity:** Antenatal care · Normal/C-section delivery · High-risk pregnancy · Postnatal care · Newborn care · Lactation consultant · Doula · Prenatal classes/yoga
- **Fertility (IVF)** 🔒: IUI · IVF · ICSI · Egg/sperm freezing · Male infertility · Donor programs (ART Act compliant)
- **Child:** Newborn screening · Vaccination (UIP + optional) · Growth & milestone tracking · Paediatric nutrition · Paediatric emergencies · School health · Teen health · Child mental health

---

## 12. Elderly & long-term care — `ELDER.*`
Home nursing · Attendant/caregiver · Elder-care home · Assisted living · Dementia/Alzheimer's care · Palliative/hospice · Geriatric physio · Geriatric day-care · Fall prevention · Memory clinic · Senior health packages · Medication management · Remote family dashboard · Medical transport for seniors · Fall-detection/emergency devices (product)

---

## 13. Chronic-disease programs — `PROG.CHRONIC.*`
Diabetes (type 1/2, gestational, diabetic foot, retinopathy) · Hypertension · Heart disease/cardiac rehab · Thyroid · PCOS · Obesity/weight management · Asthma/COPD · CKD/dialysis · Arthritis/osteoporosis · Epilepsy · Cancer survivorship · Liver disease · Migraine · Sleep apnoea · Depression/anxiety follow-up 🔒 · Quit-smoking/alcohol 🔒 · HIV care 🔒

---

## 14. Nutrition & food — `NUT.*`
- **Diet types:** Regular · Diabetic · Cardiac/heart-healthy · Low-sodium · Renal · High-protein · Low-fat · Low-residue · Bland · Clear liquid · Full liquid · Soft · Pureed/dysphagia · Tube/enteral · Gluten-free · Neutropenic · Paediatric · Weight-loss · Keto · Post-surgery · Pregnancy/lactation · Geriatric · NPO
- **Preference:** Veg · Non-veg · Eggetarian · Vegan · Jain · Halal
- **Meal type:** Early-morning · Breakfast · Mid-morning · Lunch · Evening snack · Dinner · Bedtime · Supplement
- **Dietitian focus:** Clinical · Diabetes · Renal · Sports · Paediatric · Weight management · PCOS · Geriatric · Pregnancy · Gut health
- **Food/product stores:** Organic · Millets · Diabetic-friendly · Sugar-free · Gluten-free · Baby food · Protein/sports · Ayurvedic food · Herbal teas
- **Supplements:** Multivitamin · Protein · Omega-3 · Probiotics · Iron/calcium · Herbal · Immunity (claims-restricted)
- **Meal service:** Healthy tiffin · Calorie-controlled · Diabetic · Hospital-diet delivery · Meal subscription

---

## 15. Fitness & wellness — `FIT.*`
- **Gym/fitness:** Gym · CrossFit · Functional training · Calisthenics · Personal training · Online coaching · Women-only gym · Senior fitness
- **Yoga:** Hatha · Ashtanga · Vinyasa · Iyengar · Power · Kundalini · Prenatal · Therapeutic · Senior · Kids · Corporate · Retreats/camps
- **Mind-body:** Meditation · Pranayama · Tai chi · Breathwork
- **Dance/aerobics:** Zumba · Aerobics · Dance fitness · Pilates · Barre
- **Sports:** Swimming · Badminton · Cricket · Football · Tennis · Martial arts · Running clubs · Cycling · Trekking
- **Wellness centres:** Naturopathy · Ayurvedic wellness · Detox · Spa/massage (non-clinical) · Sleep programs · Stress-relief
- **Programs:** Weight loss · Strength · Mobility · Postnatal fitness · Back-pain fitness · Diabetes-friendly exercise · Corporate wellness · School fitness
- **Fitness tracking:** Steps · Workouts · Challenges · Streaks (loyalty rewards se linked)

---

## 16. Skin, hair & personal care — `CARE.*`
- **Clinics:** Dermatology · Trichology/hair · Laser · Hair transplant 🔒 · Cosmetology 🔒
- **Conditions:** Acne · Pigmentation · Eczema/psoriasis · Fungal infections · Hair fall · Dandruff · Allergy · Vitiligo · Warts · Scars
- **Products (`adClaimsRestricted`):** Sunscreen · Moisturiser · Cleanser · Medicated shampoo · Anti-acne · Anti-fungal · Baby skin care · Hair oils · Oral care · Feminine hygiene · Men's grooming · Ayurvedic/herbal

---

## 17. Medical devices, supplies & rental — `DEV.*`
- **Monitoring:** BP monitor · Glucometer + strips · Pulse oximeter · Thermometer · Weighing scale · ECG patch/wearable · CGM
- **Respiratory:** Nebuliser · Oxygen concentrator · CPAP/BiPAP · Inhaler spacer · Oxygen cylinder
- **Mobility:** Wheelchair · Walker · Crutches · Cane · Commode chair · Shower chair
- **Bed & furniture:** Hospital bed (manual/electric) · Air mattress · Bedside/over-bed table
- **Orthopaedic:** Knee/back/neck braces · Splints · Compression stockings · Diabetic footwear · Insoles
- **Hearing/vision:** Hearing aids · Spectacles · Contact lenses · Magnifiers
- **Wound/continence:** Dressings · Bandages · Adult diapers · Catheters · Ostomy
- **Home-test kits:** Pregnancy · Glucose · Dengue/COVID (CDSCO-approved) · Ovulation
- **First aid/hygiene:** First-aid kits · Masks · Gloves · Sanitiser · PPE
- **Mode:** Buy · Rent · Repair/service · Refurbished
- **Compliance fields:** device class (A/B/C/D), licence, warranty, batch, recall

---

## 18. Camps, events & preventive health — `EVENT.*`
**Event types:** Free health-checkup camp · Specialty camp (eye, dental, diabetes, cardiac, ortho, women) · Vaccination drive · Blood-donation drive · Screening (cancer, TB, anaemia, BP/sugar) · Awareness workshop/seminar · Webinar/live Q&A · CPR/first-aid/BLS training · Yoga/wellness event · Walkathon/run · School/college health program · Corporate wellness day · RWA/community camp · Mental-health awareness 🔒 · Nutrition workshop · Caregiver training · Disease-awareness days (Heart/Diabetes/TB/Cancer/Mental Health)
**Seasonal alerts (Info):** Dengue/malaria · Flu/COVID · Heatwave · Air quality · Water-borne disease · Cold-wave
**Event fields:** organiser · partner facility · date/time · venue/online · capacity · fee (free/paid) · eligibility · registration deadline · consent text · result delivery · outcome report

---

## 19. Government & schemes (Info) — `GOV.*`
Facility types: PHC · CHC · UPHC · Sub-centre · Ayushman Arogya Mandir · Jan Aushadhi · Govt hospital OPD queue
Schemes filter ✅: PM-JAY · CGHS · ESI · ECHS · State schemes
Info pages ➕: Maternal-child schemes (JSY, PMMVY) · Immunisation (UIP) · National programs (TB, NCD, mental health) · Free-medicine lists · Grievance redressal ✅

---

## 20. Insurance, finance & legal — `FIN.*` / `LEGAL.*`
- **Policy types:** Individual · Family floater · Senior-citizen · Critical illness · Top-up/super top-up · Group/corporate · Maternity cover · Accident/personal · Government scheme (PM-JAY/CGHS/ESI/ECHS/state) · Disease-specific
- **Claim types:** Cashless · Reimbursement · Pre-authorisation · Day-care · OPD cover · Pre/post hospitalisation · Ambulance cover · AYUSH cover
- **Payment methods:** Cash · Card · UPI · NetBanking · Wallet · EMI(partner) · Cheque · Insurance direct-settlement · Govt scheme
- **Billing sources:** appointment · lab · pharmacy · IPD · OT · radiology · physio · diet · ambulance · blood bank · home service · equipment rental · membership · event
- **Lawyer practice areas:** Medical negligence · Consumer-court (health) · Insurance-claim disputes · MLC/medico-legal · Criminal (medical negligence) · Hospital compliance/licensing · Clinical Establishments Act · Mental Healthcare Act matters · Disability rights · Organ-donation legalities · Labour (medical staff) · Child-protection (POCSO) · Women's protection (DV Act) · Cyber/privacy (DPDP)

---

## 21. Education, content & community — `CONTENT.*`
Health articles by specialty · Videos · Doctor Q&A · Myth-busting/fact-check · Disease guides (diabetes, BP, thyroid) · Pregnancy week-by-week · Child-care · Elder-care guides · First-aid · Yoga/exercise libraries · Recipes (diet) · Mental-health self-help 🔒 · Medicine information (uses/side-effects) · Courses (CPR, caregiver, nutrition, yoga-teacher) · Webinars · Community forums/support groups 🔒 · Reviews · AI chat/triage
**Content badges:** Doctor-reviewed ✓ · Language (Hindi + regional) · Last-reviewed date

---

## 22. Home services — `HOME.*`
Home doctor visit · Home nursing · Home sample collection · Home physiotherapy · Home vaccination · Home ICU setup · Home dietitian · Home yoga/fitness trainer · Home oxygen/equipment setup · Home medicine/lab/equipment delivery · Home palliative care · Tele-follow-up

---

## 23. Transport & logistics — `TRANS.*`
- **Vehicle types:** bike · auto · e-rickshaw · car · van · wheelchair-accessible van · stretcher van
- **Ambulance:** see §6
- **Delivery types:** medicine · lab-sample courier (cold-chain) · equipment · blood/organ courier · meal
- **Use-cases:** OPD visit · dialysis/chemo trips · discharge · diagnostics · vaccination · elderly pickup
- **Transfer scope:** local · regional · intercity · airport

---

## 24. B2B / institutional — `B2B.*`
Corporate employee health (OPD plans, checkups, billing) · Insurers/TPAs · NGOs/CSR/trusts/RWA (partners) · Diagnostic franchise networks · Schools/colleges/hostels

---

## 25. Sensitive categories — extra controls 🔒
**Sub-lists:** IVF/fertility (IUI, IVF, ICSI, freezing) · De-addiction (alcohol, tobacco, drugs, behavioural) · Palliative/hospice · Sexual-health (STD testing, dysfunction) · Cosmetic surgery · Transplant · Organ/eye/body-donation pledge · Mental-health support groups · HIV care/testing
**Controls:** discreet notifications · masked listings · hidden from suggestions/recents · separate consent · two-person KYC approval · claims moderation · restricted-records label · break-glass-only staff access

---

## 26. Reference lists (filters / enums)

**Languages:** Hindi · English · Marathi · Bengali · Tamil · Telugu · Gujarati · Punjabi · Urdu · Kannada · Malayalam · Odia · Assamese · Bhojpuri · Rajasthani · Maithili · Konkani · Kashmiri · Sindhi · Nepali · Bundeli · Malvi · Chhattisgarhi · Sanskrit · Indian Sign Language
**Consultation modes (normalized):** in_person · video · audio · chat · home_visit
**Gender preference:** Any · Female provider · Male provider
**Accessibility:** Wheelchair · Ramp/lift · Braille/audio · Sign-language support · Large-font UI · Voice navigation
**Time:** 24x7 · Open now · Morning/Evening · Weekend · Emergency hours
**Verification badges:** Licence verified · Registration verified · NABH/NABL · Background-checked ✅ (attendants) · Police-verified ✅ · Doctor-reviewed content
**Sort/filters:** Nearest · Rating · Price · Earliest slot · Experience · Most booked · Govt/private · Scheme accepted · Language · Gender · Home visit · Online · Open now · Accessibility · Verified

---

## Seed karne ke rules
1. Har node ko `Category` me `type + code + nameHi + aliases + parent + tier + regulatedBy + adClaimsRestricted` ke saath daalo (model ready hai).
2. 🔒 wali categories par `tier: T1`, `adClaimsRestricted: true` (jahan claims ka risk), aur discreet flag.
3. Info-only (§19, §18 seasonal alerts, §6 helplines) par booking/payment CTA mat lagao.
4. Doctor/Test/Medicine/Facility ko `code` se link karo, free-text se nahi (specialty spelling mismatch isi se jaata hai).
5. Purane free-text values (`Orthopedics`, `Pediatrics`, `Gynecology`) ko aliases me map karo.
6. Regulatory tags lawyer se confirm karo.
