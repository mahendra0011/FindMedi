# FindMedi — "Browse by Specialties": Category + Subcategory (complete)

> Aapki image wali grid ("Browse by Specialties") ka poora check + final specialty tree: har tile ke sub-specialties, conditions, procedures, icons, UI/drill-down aur data model.
> **Source:** current workspace review (2026-11-09) — backend taxonomy/category routes and frontend specialty browse/filter pages. Frontend production build and focused specialty tests passed; full app/browser flow was not exercised.
>
> | Mark | Matlab |
> |---|---|
> | ✅ `CODE` | Repo ki taxonomy me pehle se hai |
> | ➕ `CODE` | Naya add karna hai |
> | ↔ | Cross-list: ek hi cheez do jagah dikhe (duplicate record nahi) |
> | 🔒 | Sensitive: discreet mode, neutral notifications |
> | ⚠ | Claims-restricted (cosmetic/hair/weight-loss/sexual-health/IVF) |

---

## 1. Abhi kya hai (verified)

| Cheez | Current state |
|---|---|
| Top-level specialties (tiles) | **43** (`SPEC.GENMED` … `SPEC.GENETICS`) — aapki image me 35 tiles (Infertility tak) dikh rahe hain, neeche 8 aur: Nuclear Medicine, PMR, Occupational, Palliative, Sleep, Allergy & Immunology, Infectious Disease, Clinical Genetics |
| Sub-specialty entries | **300** (dotted codes, jaise `SPEC.CARDIO.INTERVENTIONAL`) - total taxonomy **343** (43 + 300) |
| Jahan "Browse by Specialties" dikhta hai | `HospitalDirectory`, `ClinicDoctors`, `HospitalDoctors`, `HospitalProfile` — facility pages scoped lists; browse-all page has 13 grouped tiles |
| Sub-specialty UI me | Browse grid previews child chips; specialty detail page drills down to subs, conditions, procedures, doctors, tests and packages |
| Tile ka number (1, 0…) | Browse-all tiles city-aware distinct doctor/facility counts dikhate hain; zero state se specialty detail ka request option milta hai |
| Frontend list | Browse grid React Query se `GET /categories/specialties?tree=1` leta hai; visuals/legacy alias map UI-only presentation helpers hain |
| API | `GET /categories/specialties` flat list deta hai; `?tree=1` grouped tree (43 roots, 300 subs) deta hai; bulk and per-code count routes available hain |
| Doctor model | `specialtyCode` + `subSpecialtyCodes[]` + `conditionsTreated[]` + `procedures[]` |

In §3, labels like “Repo abhi (0 subs)” preserve the earlier source snapshot for comparison; they are historical baseline counts. The complete current child list is §3 plus §4.1.

### Implementation status
1. Browse tiles show child previews, grouped navigation and specialty drill-down.
2. Duplicate entries resolve to canonical codes; `alsoUnder` shows a single record under secondary parents.
3. `SPEC.PSURG.*` legacy codes resolve to canonical `SPEC.PAEDSURG.*` child codes.
4. All 43 root tiles have children in the taxonomy tree; the supplement under §4 records child links omitted from the original per-specialty lists.
5. Doctor condition/procedure tags and symptom-to-specialty search are available.
6. Browse tiles show provider counts and available-only filtering when counts load.
7. The browse tree is served from `GET /categories/specialties?tree=1`.

---

## 2. Final tiles — 43 (grouped for "Browse all")

Home par API tree se city ke **doctor-count ke hisaab se ranked up to 8 tiles** (zero-count tiles muted + Request; ye supply/availability ranking hai, patient-demand analytics nahi), “Browse all” par 13 groups:

| Group | Tiles (icon: lucide) |
|---|---|
| **Primary & Emergency care** | General Medicine (`Stethoscope`) · Geriatrics (`Clock`) · Emergency Medicine (`Siren`) |
| **Heart & Vascular** | Cardiology (`Heart`) · Cardiothoracic Surgery (`HeartPulse`) · Vascular Surgery (`Activity`) |
| **Bones, Joints & Muscles** | Orthopaedics (`Bone`) · Rheumatology (`Bone`) · Sports Medicine (`Dumbbell`) · PMR / Rehabilitation (`Accessibility`) |
| **Brain & Nerves** | Neurology (`Brain`) · Neurosurgery (`Brain`) · Sleep Medicine (`Moon`) |
| **Women & Child** | Obstetrics & Gynaecology (`Flower2`) · Infertility 🔒 (`Baby`) · Paediatrics (`Baby`) · Paediatric Surgery (`Scissors`) · Neonatology (`Baby`) |
| **Skin, Eye, ENT & Dental** | Dermatology (`Sparkles`) · Ophthalmology (`Eye`) · ENT (`Ear`) · Dental & Oral Medicine (`Smile`) |
| **Digestive, Liver, Kidney & Urinary** | Gastroenterology (`Pill`) · Hepatology (`Pill`) · Nephrology (`Droplets`) · Urology (`Droplets`) |
| **Lungs, Allergy & Infection** | Pulmonology (`Wind`) · Allergy & Immunology (`ShieldAlert`) · Infectious Disease (`Bug`) |
| **Hormones, Blood & Cancer** | Endocrinology (`Zap`) · Haematology (`Droplet`) · Oncology (`Ribbon`) · Palliative Medicine 🔒 (`HeartHandshake`) |
| **Mind** | Psychiatry 🔒 (`Brain`) |
| **Surgery & Anaesthesia** | General Surgery (`Scissors`) · Plastic & Reconstructive Surgery ⚠ (`Sparkles`) · Anaesthesiology (`Syringe`) |
| **Diagnostics & Lab medicine** | Radiology (`Scan`) · Pathology (`Microscope`) · Nuclear Medicine (`Atom`) · Clinical Genetics (`Dna`) |
| **Men's health & Work health** | Sexology & Andrology 🔒 (`ShieldPlus`) · Occupational Medicine (`HardHat`) |

> Browse visuals are sourced through `data/specialtyVisuals`; all 43 documented root icon suggestions have a corresponding unique icon in the current visual map.

---

## 3. Har specialty ke subcategories, conditions, procedures

> Format: **Sub-specialties** (code) · **Conditions/symptoms** (search + chips) · **Common procedures**.

### 3.1 General Medicine — `SPEC.GENMED`
**Repo abhi (5 subs):** `FAMILY`, `INTERNAL`, `HOSPITALIST`, `PREVENTIVE`, `TRAVEL_MED`
**Subs:** Family Physician ✅ `…FAMILY` · Internal Medicine ✅ `…INTERNAL` · Hospitalist ✅ `…HOSPITALIST` · Preventive Medicine ✅ `…PREVENTIVE` · Travel Medicine ✅ `…TRAVEL_MED` · ➕ `…LIFESTYLE` Lifestyle & Chronic-disease care · ➕ `…FEVER` Fever & Infections clinic
**Conditions:** fever, cold/cough, body pain, weakness, diabetes, high BP, thyroid, infections, general check-up
**Procedures:** health check-up, vaccination, BP/sugar monitoring, ECG, referral

### 3.2 Cardiology — `SPEC.CARDIO`
**Repo abhi (6 subs):** `INTERVENTIONAL`, `EP`, `PAED`, `HEART_FAILURE`, `PREVENTIVE`, `IMAGING`
**Subs:** Interventional ✅ `…INTERVENTIONAL` · Electrophysiology ✅ `…EP` · Paediatric Cardiology ✅ `…PAED` (↔ `SPEC.PAED.CARDIOLOGY`) · Heart Failure & Transplant ✅ `…HEART_FAILURE` · Preventive Cardiology ✅ `…PREVENTIVE` · Cardiac Imaging ✅ `…IMAGING` · ➕ `…REHAB` Cardiac Rehabilitation · ➕ `…STRUCTURAL` Structural Heart
**Conditions:** chest pain, palpitations, high BP, breathlessness, heart attack, heart failure, high cholesterol, fainting
**Procedures:** ECG, Echo, TMT, Holter, angiography, angioplasty, pacemaker/ICD, TAVI

### 3.3 Cardiothoracic Surgery — `SPEC.CTVS`
**Repo abhi (3 subs):** `CARDIAC`, `THORACIC`, `VASCULAR`
**Subs:** Adult Cardiac Surgery ✅ `…CARDIAC` · Thoracic Surgery ✅ `…THORACIC` · Vascular & Endovascular ✅ `…VASCULAR` (↔ Vascular Surgery) · ➕ `…CONGENITAL` Congenital Heart Surgery · ➕ `…TRANSPLANT` Heart/Lung Transplant · ➕ `…MIS` Minimally Invasive Cardiac Surgery
**Conditions:** valve disease, coronary blockage, aortic aneurysm, lung tumour, congenital heart defect
**Procedures:** CABG, valve replacement/repair, lobectomy, VATS, aortic repair

### 3.4 Vascular Surgery — `SPEC.VASC`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs (✅/➕ marks repo ke hisaab se):** `…ENDOVASCULAR` Endovascular · `…VENOUS` Varicose Vein & Venous Disease · `…DIABETIC_FOOT` Diabetic Foot & Limb Salvage · `…ACCESS` Dialysis Access (AV fistula) · `…AORTIC` Aortic Surgery · `…PAD` Peripheral Artery Disease
**Conditions:** varicose veins, leg pain on walking, leg swelling/DVT, aneurysm, non-healing foot ulcer
**Procedures:** angioplasty/stenting, bypass, EVAR, laser vein ablation, AV fistula creation

### 3.5 Orthopaedics — `SPEC.ORTHO`
**Repo abhi (8 subs):** `JOINT`, `SPORTS`, `SPINE`, `TRAUMA`, `PAED`, `HAND`, `FOOT_ANKLE`, `ONCO`
**Subs:** Joint Replacement ✅ `…JOINT` · Sports Medicine & Arthroscopy ✅ `…SPORTS` (↔ Sports Medicine) · Spine Surgery ✅ `…SPINE` · Orthopaedic Trauma ✅ `…TRAUMA` · Paediatric Orthopaedics ✅ `…PAED` · Hand & Microsurgery ✅ `…HAND` · Foot & Ankle ✅ `…FOOT_ANKLE` · Orthopaedic Oncology ✅ `…ONCO` · ➕ `…SHOULDER_ELBOW` Shoulder & Elbow
**Conditions:** knee pain, back pain, neck pain, fracture, arthritis, shoulder pain, sprain, sciatica, heel pain
**Procedures:** knee/hip replacement, ACL repair, arthroscopy, fracture fixation, spine surgery, joint injections

### 3.6 Obstetrics & Gynaecology — `SPEC.OBGY`
**Repo abhi (7 subs):** `HIGH_RISK`, `INFERT_IVF`, `LAPAROSCOPY`, `ONCO`, `UROGYNAE`, `ADOLESCENT`, `MENOPAUSE`
**Subs:** High-Risk Obstetrics & MFM ✅ `…HIGH_RISK` · Infertility & Reproductive Medicine ✅ `…INFERT_IVF` (↔ Infertility) · Gynaecological Laparoscopy ✅ `…LAPAROSCOPY` · Gynaecological Oncology ✅ `…ONCO` · Urogynaecology ✅ `…UROGYNAE` · Adolescent Gynaecology ✅ `…ADOLESCENT` · Menopause & Midlife Health ✅ `…MENOPAUSE` · ➕ `…ANTENATAL` Antenatal & Postnatal Care · ➕ `…FETAL` Fetal Medicine · ➕ `…FAMILY_PLANNING` Contraception & Family Planning
**Conditions:** pregnancy care, irregular periods, PCOS (↔ Endocrinology), fibroids, white discharge, pelvic pain, menopause symptoms, infertility
**Procedures:** antenatal scans, normal/C-section delivery, hysterectomy, laparoscopy, Pap smear, IUD insertion, D&C

### 3.7 Paediatrics — `SPEC.PAED`
**Repo abhi (7 subs):** `NEONATO`, `CARDIOLOGY`, `SURGERY`, `HAEM_ONC`, `DEVELOPMENTAL`, `ADOLESCENT`, `VACCINATION`
**Subs:** Neonatology ✅ `…NEONATO` (↔ Neonatology) · Paediatric Cardiology ✅ `…CARDIOLOGY` (↔ `CARDIO.PAED`) · Paediatric Surgery ✅ `…SURGERY` (↔ Paediatric Surgery) · Paediatric Haemato-oncology ✅ `…HAEM_ONC` · Developmental Paediatrics ✅ `…DEVELOPMENTAL` · Adolescent Paediatrics ✅ `…ADOLESCENT` · Vaccination & Immunisation ✅ `…VACCINATION` · ↔ Paediatric Neurology (`NEURO.PAED`) · ↔ Paediatric GI (`GASTRO.PAED`) · ↔ Paediatric Pulmonology (`PULMO.PAED`) · ↔ Paediatric Nephrology (`NEPHRO.PAED`) · ↔ Paediatric Endocrinology (`ENDO.PAED`) · ➕ `…ALLERGY` Paediatric Allergy & Asthma · ➕ `…NUTRITION` Growth & Nutrition clinic
**Conditions:** fever in child, cough/cold, diarrhoea/vomiting, growth/height issues, vaccination schedule, allergies, bedwetting, frequent infections
**Procedures:** vaccination, growth monitoring, nebulisation, newborn check, developmental screening

### 3.8 Paediatric Surgery — `SPEC.PAEDSURG`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs:** Neonatal Surgery ✅ `SPEC.PAEDSURG.NEONATAL` (legacy alias: `SPEC.PSURG.NEONATAL`) · Paediatric Urologic Surgery ✅ `SPEC.PAEDSURG.UROLOGY` (legacy alias: `SPEC.PSURG.UROLOGY`) · Paediatric Surgical Oncology ✅ `SPEC.PAEDSURG.ONCOLOGY` (legacy alias: `SPEC.PSURG.ONCOLOGY`) · Paediatric Laparoscopy ✅ `SPEC.PAEDSURG.LAPAROSCOPY` · Congenital Anomalies Surgery ✅ `SPEC.PAEDSURG.CONGENITAL`
**Conditions:** hernia in child, undescended testis, appendicitis, congenital anomalies, phimosis
**Procedures:** hernia repair, orchidopexy, circumcision, pyloromyotomy

### 3.9 Neonatology — `SPEC.NEONATO`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs (✅/➕ marks repo ke hisaab se):** `…NICU` NICU Care · `…PRETERM` Preterm & Low-birth-weight care · `…JAUNDICE` Neonatal Jaundice · `…VENTILATION` Neonatal Respiratory Support · `…SCREENING` Newborn Screening · `…FOLLOWUP` High-risk Infant Follow-up
**Conditions:** premature birth, newborn jaundice, breathing difficulty, low birth weight, feeding problems
**Procedures:** phototherapy, surfactant therapy, CPAP/ventilation, newborn screening

### 3.10 Dermatology — `SPEC.DERM`
**Repo abhi (6 subs):** `COSMETIC`, `TRICHOLOGY`, `MEDICAL`, `VENEREOLOGY`, `PAED`, `DERMATOSURGERY`
**Subs:** Medical Dermatology ✅ `…MEDICAL` · Cosmetic Dermatology & Aesthetics ⚠ ✅ `…COSMETIC` · Trichology & Hair Transplant ⚠ ✅ `…TRICHOLOGY` · Venereology & STI 🔒 ✅ `…VENEREOLOGY` · Paediatric Dermatology ✅ `…PAED` · Dermatosurgery ✅ `…DERMATOSURGERY` · ➕ `…ALLERGY` Contact & Allergic Dermatitis · ➕ `…PIGMENTATION` Pigmentation & Vitiligo · ➕ `…LASER` Laser & Procedures ⚠
**Conditions:** acne, pigmentation, eczema, psoriasis, hair fall, dandruff, fungal infection, skin allergy, warts, vitiligo
**Procedures:** skin biopsy, laser treatments ⚠, chemical peel ⚠, wart/mole removal, patch test

### 3.11 ENT — `SPEC.ENT`
**Repo abhi (7 subs):** `OTOLOGY`, `RHINOLOGY`, `AUDIOLOGY`, `LARYNGOLOGY`, `HEAD_NECK`, `PAED`, `SLEEP_SURGERY`
**Subs:** Otology & Neurotology ✅ `…OTOLOGY` · Rhinology & Sinus ✅ `…RHINOLOGY` · Audiology ✅ `…AUDIOLOGY` (allied audiologist se link) · Laryngology & Voice ✅ `…LARYNGOLOGY` · Head & Neck Surgery ✅ `…HEAD_NECK` · Paediatric ENT ✅ `…PAED` · Sleep Surgery ✅ `…SLEEP_SURGERY` · ➕ `…ALLERGY` Allergic Rhinitis · ➕ `…COCHLEAR` Cochlear Implant
**Conditions:** ear pain, hearing loss, sinusitis, tonsillitis, snoring, vertigo, nasal blockage, voice problems, ear wax
**Procedures:** nasal endoscopy, tonsillectomy, septoplasty, grommet insertion, audiometry, ear wax removal

### 3.12 Ophthalmology — `SPEC.OPHTH`
**Repo abhi (9 subs):** `CATARACT`, `RETINA`, `CORNEA`, `GLAUCOMA`, `LASIK`, `PAED`, `OCULOPLASTY`, `SQUINT`, `NEURO`
**Subs:** Cataract & Refractive ✅ `…CATARACT` · Vitreoretinal ✅ `…RETINA` · Cornea & External Disease ✅ `…CORNEA` · Glaucoma ✅ `…GLAUCOMA` · LASIK & Vision Correction ✅ `…LASIK` · Paediatric Ophthalmology ✅ `…PAED` · Oculoplasty ✅ `…OCULOPLASTY` · Squint ✅ `…SQUINT` · Neuro-ophthalmology ✅ `…NEURO` · ➕ `…CONTACT_LENS` Contact Lens Clinic · ➕ `…DRY_EYE` Dry Eye Clinic
**Conditions:** blurred vision, cataract, glaucoma, red/watery eye, diabetic retinopathy, squint, spectacle power change, floaters
**Procedures:** eye test, phaco/cataract surgery, LASIK, retinal laser, intravitreal injection, OCT

### 3.13 Dental & Oral Medicine — `SPEC.DENTAL`
**Repo abhi (8 subs):** `ORTHO`, `ENDO`, `IMPLANT`, `PAEDO`, `PROSTHO`, `OMFS`, `ORAL_MED_RAD`, `COSMETIC`
**Subs:** Orthodontics ✅ `…ORTHO` · Endodontics ✅ `…ENDO` · Oral Implantology & Periodontics ✅ `…IMPLANT` · Paediatric & Preventive ✅ `…PAEDO` · Prosthodontics ✅ `…PROSTHO` · Oral & Maxillofacial Surgery ✅ `…OMFS` · Oral Medicine & Radiology ✅ `…ORAL_MED_RAD` · Cosmetic Dentistry ⚠ ✅ `…COSMETIC` · ➕ `…PERIO` Periodontics (alag tile) · ➕ `…GERIATRIC` Geriatric Dentistry · ➕ `…EMERGENCY` Dental Emergency
**Conditions:** toothache, cavities, bleeding gums, bad breath, crooked teeth, missing teeth, wisdom tooth, mouth ulcers, tooth sensitivity
**Procedures:** cleaning/scaling, fillings, root canal, crowns/bridges, implants, braces/aligners, extraction, whitening ⚠, OPG/RVG

### 3.14 Neurology — `SPEC.NEURO`
**Repo abhi (6 subs):** `STROKE`, `EPILEPSY`, `MOVEMENT`, `HEADACHE`, `NEUROMUSCULAR`, `PAED`
**Subs:** Stroke & Neurovascular ✅ `…STROKE` · Epilepsy ✅ `…EPILEPSY` · Movement Disorders & Parkinson's ✅ `…MOVEMENT` · Headache ✅ `…HEADACHE` · Neuromuscular ✅ `…NEUROMUSCULAR` · Paediatric Neurology ✅ `…PAED` · ➕ `…DEMENTIA` Dementia & Memory · ➕ `…NEUROREHAB` Neuro-rehabilitation (↔ PMR)
**Conditions:** headache/migraine, seizures, stroke, tremors, numbness/tingling, memory loss, vertigo, facial palsy
**Procedures:** EEG, EMG/NCV, MRI brain, lumbar puncture, botulinum for spasticity/migraine

### 3.15 Neurosurgery — `SPEC.NEUROSURG`
**Repo abhi (5 subs):** `SPINE`, `BRAIN_TUMOR`, `FUNCTIONAL`, `PAED`, `ENDOVASCULAR`
**Subs:** Spine ✅ `…SPINE` · Neuro-Oncology & Skull Base ✅ `…BRAIN_TUMOR` · Functional ✅ `…FUNCTIONAL` · Paediatric ✅ `…PAED` · Endovascular ✅ `…ENDOVASCULAR` · ➕ `…TRAUMA` Head & Spine Trauma · ➕ `…CEREBROVASCULAR` Cerebrovascular Surgery
**Conditions:** brain tumour, slip disc, head injury, hydrocephalus, aneurysm, spinal cord compression
**Procedures:** craniotomy, discectomy/fusion, VP shunt, deep brain stimulation, aneurysm coiling

### 3.16 Psychiatry 🔒 — `SPEC.PSYCH`
**Repo abhi (6 subs):** `CHILD`, `ADDICTION`, `GERIATRIC`, `NEUROPSYCH`, `PERINATAL`, `SLEEP`
**Subs:** Child & Adolescent ✅ `…CHILD` · Addiction & De-addiction ✅ `…ADDICTION` · Geriatric ✅ `…GERIATRIC` · Neuropsychiatry ✅ `…NEUROPSYCH` · Perinatal ✅ `…PERINATAL` · Sleep Psychiatry ✅ `…SLEEP` (↔ Sleep) · ➕ `…CONSULT_LIAISON` Consultation-Liaison · ➕ `…FORENSIC` Forensic · ➕ `…PSYCHOTHERAPY` Psychotherapy (↔ counsellors/psychologists)
**Conditions:** depression, anxiety, OCD, bipolar, schizophrenia, addiction, sleep problems, ADHD, panic attacks
**Procedures:** assessment, medication management, ECT, rTMS, psychotherapy referral
**Note:** crisis banner (112 / Tele-MANAS 14416), discreet notifications.

### 3.17 Gastroenterology — `SPEC.GASTRO`
**Repo abhi (6 subs):** `HEPATOLOGY`, `ENDOSCOPY`, `IBD`, `PAED`, `SURGERY`, `BARIATRIC`
**Subs:** Hepatology ✅ `…HEPATOLOGY` (↔ Hepatology) · Therapeutic Endoscopy ✅ `…ENDOSCOPY` · IBD ✅ `…IBD` · Paediatric GI ✅ `…PAED` · GI Surgery ✅ `…SURGERY` · Bariatric & Metabolic ✅ `…BARIATRIC` (↔) · ➕ `…PANCREATOBILIARY` Pancreas & Biliary (ERCP) · ➕ `…MOTILITY` GERD & Motility
**Conditions:** acidity, stomach pain, constipation, IBS, jaundice, blood in stool, vomiting, bloating
**Procedures:** endoscopy, colonoscopy, ERCP, FibroScan, variceal banding, polypectomy

### 3.18 Hepatology — `SPEC.HEPAT`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs (✅/➕ marks repo ke hisaab se):** `…FATTY_LIVER` Fatty Liver (NAFLD/MASLD) · `…VIRAL` Hepatitis B & C · `…CIRRHOSIS` Cirrhosis & Portal Hypertension · `…TRANSPLANT` Liver Transplant · `…ALCOHOL` Alcohol-related Liver Disease 🔒 · `…PAED` Paediatric Hepatology
**Conditions:** jaundice, fatty liver, hepatitis, cirrhosis, ascites, raised liver enzymes
**Procedures:** FibroScan, liver biopsy, variceal banding, TIPS, paracentesis

### 3.19 Nephrology — `SPEC.NEPHRO`
**Repo abhi (5 subs):** `DIALYSIS`, `TRANSPLANT`, `GLOMERULAR`, `PAED`, `HYPERTENSION`
**Subs:** Clinical Nephrology & Dialysis ✅ `…DIALYSIS` · Kidney Transplant ✅ `…TRANSPLANT` · Glomerular Disease ✅ `…GLOMERULAR` · Paediatric ✅ `…PAED` · Hypertension & Kidney ✅ `…HYPERTENSION` · ➕ `…CKD` CKD Care & Diet · ➕ `…CRITICAL` Critical-care Nephrology
**Conditions:** kidney failure, protein in urine, swelling, high creatinine, recurrent UTI, high BP with kidney disease
**Procedures:** haemodialysis, peritoneal dialysis, kidney biopsy, AV fistula (↔ Vascular)

### 3.20 Urology — `SPEC.URO`
**Repo abhi (7 subs):** `ANDROLOGY`, `LITHOTRIPSY`, `SEXUAL_HEALTH`, `ONCO`, `PAED`, `FEMALE`, `TRANSPLANT`
**Subs:** Andrology 🔒 ✅ `…ANDROLOGY` (↔ Sexology) · Endourology & Lithotripsy ✅ `…LITHOTRIPSY` · Urological Sexual Medicine 🔒 ✅ `…SEXUAL_HEALTH` (↔) · Urologic Oncology ✅ `…ONCO` · Paediatric Urology ✅ `…PAED` · ✅ `…FEMALE` Female Urology · ➕ `…PROSTATE` Prostate Clinic (BPH) · ✅ `…TRANSPLANT` Kidney Transplant Urology
**Conditions:** kidney stones, enlarged prostate, frequent urination, UTI, blood in urine, urinary leakage
**Procedures:** URS, PCNL, TURP, ESWL lithotripsy, cystoscopy, circumcision

### 3.21 Pulmonology — `SPEC.PULMO`
**Repo abhi (7 subs):** `CRITICAL_CARE`, `SLEEP`, `ASTHMA`, `INTERVENTIONAL`, `TB_CHEST`, `OCC_LUNG`, `PAED`
**Subs:** Pulmonary Critical Care ✅ `…CRITICAL_CARE` · Sleep Pulmonology ✅ `…SLEEP` (↔ Sleep) · Asthma & Allergy ✅ `…ASTHMA` · Interventional ✅ `…INTERVENTIONAL` · TB & Chest Diseases ✅ `…TB_CHEST` · Occupational Lung ✅ `…OCC_LUNG` · Paediatric ✅ `…PAED` · ➕ `…COPD` COPD & Respiratory Rehab · ➕ `…ILD` Interstitial Lung Disease
**Conditions:** breathlessness, chronic cough, asthma, TB, COPD, wheezing, snoring/sleep apnoea
**Procedures:** PFT, bronchoscopy, pleural tap, sleep study, nebulisation

### 3.22 Endocrinology — `SPEC.ENDO`
**Repo abhi (7 subs):** `DIABETES`, `THYROID`, `OBESITY`, `PAED`, `PCOS`, `BONE`, `PITUITARY`
**Subs:** Diabetology ✅ `…DIABETES` · Thyroid ✅ `…THYROID` · Obesity & Metabolic ✅ `…OBESITY` · Paediatric ✅ `…PAED` · PCOS & Reproductive Endocrinology ✅ `…PCOS` (↔ OBGY) · Bone & Osteoporosis ✅ `…BONE` · Pituitary & Neuroendocrinology ✅ `…PITUITARY` · ➕ `…ADRENAL` Adrenal Disorders · ➕ `…LIPID` Lipid Disorders
**Conditions:** diabetes, thyroid problems, weight gain/obesity, PCOS, short stature, osteoporosis, hormonal imbalance
**Procedures:** HbA1c, thyroid profile, CGM, insulin/pump therapy, DEXA scan

### 3.23 Rheumatology — `SPEC.RHEUM`
**Repo abhi (4 subs):** `ARTHRITIS`, `LUPUS`, `VASCULITIS`, `PAED`
**Subs (✅/➕ marks repo ke hisaab se):** `…RA` Rheumatoid Arthritis · `…LUPUS` Lupus & Connective Tissue Disease · `…SPA` Spondyloarthritis · `…VASCULITIS` Vasculitis · `…GOUT` Gout & Crystal Arthritis · `…PAED` Paediatric Rheumatology · `…OA` Osteoarthritis (↔ Orthopaedics)
**Conditions:** joint pain & swelling, morning stiffness, lupus, gout, back stiffness, autoimmune disease
**Procedures:** joint aspiration, biologic infusions, ANA/RA/anti-CCP tests

### 3.24 Oncology — `SPEC.ONCO`
**Repo abhi (8 subs):** `MEDICAL`, `SURGICAL`, `RADIATION`, `PAED`, `HAEMATO`, `HEAD_NECK`, `BREAST`, `PALLIATIVE`
**Subs:** Medical Oncology & Chemotherapy ✅ `…MEDICAL` · Surgical Oncology ✅ `…SURGICAL` · Radiation Oncology ✅ `…RADIATION` · ✅ `…HAEMATO` Haemato-oncology (↔ Haematology) · ✅ `…PAED` Paediatric Oncology (↔) · ➕ `…GYNAE` Gynae Oncology (↔ OBGY) · ✅ `…HEAD_NECK` Head & Neck Oncology · ✅ `…BREAST` Breast Oncology · ➕ `…GI` GI Oncology · ➕ `…THORACIC` Thoracic Oncology · ➕ `…SURVIVORSHIP` Cancer Survivorship & Follow-up
**Conditions:** lump, unexplained weight loss, cancer follow-up, second opinion, post-chemo care
**Procedures:** chemotherapy, radiotherapy, biopsy, PET-CT staging, immunotherapy, tumour board

### 3.25 Haematology — `SPEC.HAEM`
**Repo abhi (2 subs):** `BMT`, `CLINICAL`
**Subs:** BMT & Stem Cell ✅ `…BMT` · Clinical Haematology & Bleeding Disorders ✅ `…CLINICAL` · ➕ `…THALASSEMIA` Thalassemia & Sickle Cell · ➕ `…HAEMOPHILIA` Haemophilia · ➕ `…ANAEMIA` Anaemia Clinic · ➕ `…PAED_ONC` (↔ Paediatric Haemato-oncology)
**Conditions:** anaemia, low platelets, thalassemia, bleeding disorders, blood clots, high/low WBC
**Procedures:** bone marrow biopsy, transfusion, IV iron, plasmapheresis

### 3.26 General Surgery — `SPEC.GENSURG`
**Repo abhi (7 subs):** `LAPAROSCOPIC`, `BARIATRIC`, `COLORECTAL`, `BREAST`, `ENDOCRINE`, `HERNIA`, `TRAUMA`
**Subs:** Minimal Access & Laparoscopic ✅ `…LAPAROSCOPIC` · Bariatric & Metabolic ✅ `…BARIATRIC` (↔) · Colorectal & Proctology ✅ `…COLORECTAL` · ✅ `…BREAST` Breast Surgery · ✅ `…HERNIA` Hernia · ➕ `…HPB` Hepatobiliary & Pancreatic · ✅ `…ENDOCRINE` Endocrine Surgery (thyroid) · ✅ `…TRAUMA` Trauma & Emergency Surgery
**Conditions:** hernia, gallstones, appendicitis, piles, fissure/fistula, breast lump, thyroid swelling, abscess
**Procedures:** laparoscopic cholecystectomy, hernia repair, haemorrhoid/fistula surgery, appendicectomy, thyroidectomy

### 3.27 Plastic & Reconstructive Surgery ⚠ — `SPEC.PLASTSURG`
**Repo abhi (4 subs):** `COSMETIC`, `RECONSTRUCTIVE`, `HAND`, `CRANIOFACIAL`
**Subs:** Aesthetic & Cosmetic ⚠🔒 ✅ `…COSMETIC` · Reconstructive Microsurgery & Burns ✅ `…RECONSTRUCTIVE` · ✅ `…HAND` Hand Surgery (↔ Ortho) · ✅ `…CRANIOFACIAL` Craniofacial & Cleft · ➕ `…BREAST_RECON` Breast Reconstruction · ➕ `…BURNS` Burn Care · ➕ `…SCAR` Scar Revision
**Conditions:** burns, scars, cleft lip/palate, hand injury, post-cancer reconstruction, congenital deformities
**Procedures:** skin grafts, flaps, cleft repair, scar revision, (cosmetic: rhinoplasty/liposuction ⚠ — claims policy)

### 3.28 Anaesthesiology — `SPEC.ANAES`
**Repo abhi (4 subs):** `CRITICAL_CARE`, `CARDIAC`, `PAED`, `PALLIATIVE`
**Subs (✅/➕ marks repo ke hisaab se):** `…PAIN` Pain Medicine · `…CRITICAL` Critical Care · `…CARDIAC` Cardiac Anaesthesia · `…PAED` Paediatric Anaesthesia · `…REGIONAL` Regional Anaesthesia · `…OBSTETRIC` Obstetric Anaesthesia (labour analgesia) · `…PALLIATIVE` (↔ Palliative)
**Conditions:** chronic pain, back pain, cancer pain, pre-operative assessment, labour pain relief
**Procedures:** nerve blocks, epidural, spinal anaesthesia, pre-anaesthetic check-up, ICU care

### 3.29 Radiology — `SPEC.RADIO`
**Repo abhi (5 subs):** `INTERVENTIONAL`, `NEURO`, `MSK`, `BREAST`, `PAED`
**Subs (✅/➕ marks repo ke hisaab se):** `…INTERVENTIONAL` Interventional Radiology · `…NEURO` Neuroradiology · `…MSK` Musculoskeletal · `…BREAST` Breast Imaging · `…PAED` Paediatric Radiology · `…USG` Ultrasound & Doppler (PCPNDT) · `…CARDIAC` Cardiac Imaging (↔ Cardiology)
**Conditions / use:** report second opinion, image-guided biopsy, embolisation, screening
**Procedures:** X-ray, CT, MRI, USG, mammography, image-guided biopsy, embolisation — **no gender-determination content (PCPNDT)**

### 3.30 Pathology — `SPEC.PATHO`
**Repo abhi (7 subs):** `HISTO`, `CYTO`, `HAEMATO`, `MICRO`, `BIOCHEM`, `TRANSFUSION`, `MOLECULAR`
**Subs (✅/➕ marks repo ke hisaab se):** `…HISTO` Histopathology · `…CYTO` Cytopathology · `…HAEMATOPATH` Haematopathology · `…MICRO` Clinical Microbiology · `…BIOCHEM` Clinical Biochemistry · `…TRANSFUSION` Transfusion Medicine (↔ blood bank) · `…MOLECULAR` Molecular Pathology
**Procedures / use:** biopsy reporting, FNAC, culture & sensitivity, special stains, IHC, molecular panels (link: Diagnostics tree)

### 3.31 Emergency Medicine — `SPEC.EMERG`
**Repo abhi (2 subs):** `INTENSIVIST`, `TRAUMA`
**Subs (✅/➕ marks repo ke hisaab se):** `…TRAUMA` Trauma Care · `…CARDIAC` Cardiac Emergencies · `…STROKE` Stroke Emergencies · `…PAED` Paediatric Emergencies · `…TOXICOLOGY` Poisoning & Toxicology · `…CRITICAL` Intensive/Critical Care · `…PREHOSPITAL` Pre-hospital & Ambulance Care
**Conditions:** chest pain, accidents/injury, breathlessness, poisoning, burns, seizures, snake bite
**Procedures:** resuscitation (CPR), splinting/suturing, stabilisation, triage — **SOS/ambulance CTA hamesha visible**

### 3.32 Geriatrics — `SPEC.GERI`
**Repo abhi (4 subs):** `MEMORY`, `FALLS`, `PALLIATIVE`, `POLYPHARMACY`
**Subs (✅/➕ marks repo ke hisaab se):** `…MEMORY` Memory Clinic · `…FALLS` Falls & Balance · `…POLYPHARMACY` Polypharmacy Review · `…FRAILTY` Frailty & Nutrition · `…CONTINENCE` Incontinence Care · `…PSYCH` (↔ Geriatric Psychiatry) · `…PALLIATIVE` (↔ Palliative)
**Conditions:** memory loss, falls, multiple medicines, weakness, urinary incontinence, loss of appetite, multi-disease management
**Procedures:** comprehensive geriatric assessment, medication review, fall-risk assessment

### 3.33 Sports Medicine — `SPEC.SPORTS`
**Repo abhi (3 subs):** `PREVENTION`, `PERFORMANCE`, `EXERCISE`
**Subs:** ↔ Sports Medicine & Arthroscopy (`ORTHO.SPORTS`) · ➕ `…INJURY_PREVENTION` Injury Prevention · ✅ `…PERFORMANCE` Performance & Exercise Physiology · ➕ `…NUTRITION` Sports Nutrition (↔ dietitian) · ➕ `…REHAB` Sports Rehab (↔ physio/PMR) · ➕ `…RETURN_TO_PLAY` Return-to-Play Assessment
**Conditions:** sprains/strains, ligament injury, tendonitis, muscle pain, stress fracture, training injuries
**Procedures:** biomechanical assessment, injections, taping, rehab programs

### 3.34 Sexology & Andrology 🔒 — `SPEC.SEXO`
**Repo abhi (2 subs):** `DYSFUNCTION`, `SECURE`
**Subs (✅/➕ marks repo ke hisaab se):** `…DYSFUNCTION` Sexual Dysfunction (ED, premature ejaculation) · `…ANDROLOGY` Male Infertility/Andrology (↔ Urology) · `…WOMEN` Women's Sexual Health · `…COUNSELLING` Sexual Health Counselling (↔ counsellors) · `…STI` STI Care (↔ Dermatology/Venereology)
**Conditions:** erectile problems, low desire, painful intercourse, male infertility, STI concerns
**Procedures:** assessment, hormonal tests, semen analysis, counselling — **discreet UI/notifications, no explicit imagery, claims-restricted**

### 3.35 Infertility 🔒 — `SPEC.INFERT`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs (✅/➕ marks repo ke hisaab se):** `…IUI` IUI · `…IVF` IVF/ICSI · `…MALE` Male Infertility · `…PRESERVATION` Fertility Preservation (egg/sperm freezing) · `…RPL` Recurrent Pregnancy Loss · `…REPRO_ENDO` Reproductive Endocrinology (↔) · `…COUNSELLING` Fertility Counselling
**Conditions:** unable to conceive, irregular ovulation, blocked tubes, low sperm count, repeated miscarriage
**Procedures:** ovulation tracking, IUI, IVF/ICSI, egg/sperm freezing — **ART Act registration, success-rate claims only with audited data**

### 3.36 Nuclear Medicine — `SPEC.NUCMED`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs (✅/➕ marks repo ke hisaab se):** `…PET_CT` PET-CT · `…THYROID` Thyroid Scan & Radioiodine Therapy · `…BONE` Bone Scan · `…CARDIAC` Cardiac Nuclear (MPI) · `…THERAPY` Radionuclide Therapy
**Procedures:** PET-CT, thyroid scan, bone scan, myocardial perfusion scan, radioiodine therapy

### 3.37 Physical Medicine & Rehabilitation — `SPEC.PMR`
**Repo abhi (5 subs):** `NEURO`, `SPINE`, `SPORTS`, `PAED`, `PROSTHETICS`
**Subs (✅/➕ marks repo ke hisaab se):** `…NEURO` Neuro Rehab · `…STROKE` Stroke Rehab · `…SPINE` Spine & Back-pain Rehab · `…SPORTS` Sports Rehab · `…PAED` Paediatric Rehab · `…PROSTHETICS` Prosthetics & Orthotics · `…CARDIOPULM` Cardiac & Pulmonary Rehab · `…PAIN` Pain Rehabilitation
**Conditions:** stroke recovery, spinal cord injury, back pain, cerebral palsy, amputee care, post-fracture stiffness
**Procedures:** rehab programs, gait training, orthotic fitting, spasticity injections (↔ Physiotherapy providers)

### 3.38 Occupational Medicine — `SPEC.OCCMED`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs (✅/➕ marks repo ke hisaab se):** `…PRE_EMPLOYMENT` Pre-employment & Periodic Checks · `…INDUSTRIAL` Industrial Health · `…LUNG` Occupational Lung (↔ Pulmonology) · `…ERGONOMICS` Ergonomics · `…INJURY` Workplace Injury Management
**Conditions:** work-related injuries, exposure to chemicals/dust, pre-employment fitness, repetitive strain
**Procedures:** fitness-for-work exams, audiometry/spirometry surveillance, vaccination for workers

### 3.39 Palliative Medicine 🔒 — `SPEC.PALLI`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs (✅/➕ marks repo ke hisaab se):** `…CANCER_PAIN` Cancer Pain & Symptom Control · `…HOME` Home-based Palliative Care · `…HOSPICE` Hospice (↔ hospice facilities) · `…PAED` Paediatric Palliative · `…BEREAVEMENT` Bereavement Support (↔ counsellors)
**Conditions:** advanced cancer symptoms, pain control, end-of-life care, caregiver support
**Procedures:** symptom management, opioid-safe pain protocols (NDPS compliant), family counselling

### 3.40 Sleep Medicine — `SPEC.SLEEP`
**Repo abhi (0 subs):** — (koi sub nahi)
**Subs:** ↔ Sleep Pulmonology (`PULMO.SLEEP`) · ↔ Sleep Surgery (`ENT.SLEEP_SURGERY`) · ↔ Sleep Psychiatry (`PSYCH.SLEEP`) · ➕ `…APNOEA` Sleep Apnoea · ➕ `…INSOMNIA` Insomnia (CBT-I) · ➕ `…NARCOLEPSY` Narcolepsy & Hypersomnia · ➕ `…PAED` Paediatric Sleep
**Conditions:** snoring, insomnia, daytime sleepiness, restless legs, sleep apnoea
**Procedures:** polysomnography (PSG), CPAP titration, sleep hygiene program

### 3.41 Allergy & Immunology — `SPEC.ALLERGY`
**Repo abhi (3 subs):** `ASTHMA`, `FOOD`, `IMMUNO`
**Subs (✅/➕ marks repo ke hisaab se):** `…ASTHMA` Asthma-Allergy (↔ Pulmonology) · `…FOOD` Food Allergy · `…DRUG` Drug Allergy · `…RHINITIS` Allergic Rhinitis & Immunotherapy (↔ ENT) · `…URTICARIA` Urticaria & Angioedema (↔ Dermatology) · `…IMMUNODEFICIENCY` Immunodeficiency
**Conditions:** sneezing, hives, food reactions, drug rash, frequent infections, asthma triggers
**Procedures:** skin-prick test, specific IgE, immunotherapy, food challenge (supervised)

### 3.42 Infectious Disease — `SPEC.INFECT`
**Repo abhi (4 subs):** `HIV`, `TROPICAL`, `CONTROL`, `TRAVEL`
**Subs (✅/➕ marks repo ke hisaab se):** `…HIV` HIV Care 🔒 · `…TROPICAL` Tropical Fevers (dengue, malaria, typhoid) · `…TB` TB (↔ Pulmonology) · `…HOSPITAL` Hospital Infection Control · `…TRAVEL` Travel Infections (↔ Travel Medicine) · `…STEWARDSHIP` Antimicrobial Stewardship · `…HEPATITIS` Viral Hepatitis (↔ Hepatology)
**Conditions:** prolonged fever, dengue/malaria, typhoid, TB, HIV, recurrent infections, post-travel illness
**Procedures:** culture-guided therapy, vaccination advice, OPAT/IV antibiotic planning

### 3.43 Clinical Genetics — `SPEC.GENETICS`
**Repo abhi (3 subs):** `PRENATAL`, `ONCO`, `RARE`
**Subs (✅/➕ marks repo ke hisaab se):** `…PRENATAL` Prenatal Genetics · `…ONCO` Oncogenetics · `…RARE` Rare Diseases · `…PAED` Paediatric Genetics · `…PHARMACO` Pharmacogenomics · `…COUNSELLING` Genetic Counselling
**Conditions:** family history of cancer, inherited disorders, developmental delay, recurrent pregnancy loss
**Procedures:** genetic counselling, karyotype, NIPT, exome/panel testing (PCPNDT-aware)

---

## 4. Cross-listing rules (duplicate records nahi)

- Ek sub-specialty ka **ek canonical code**; baaki parents me **secondary parent link** (`alsoUnder: []`) se dikhe — UI par dono jagah chip, data me ek record.
- Canonical choices: `SPEC.NEONATO`, `SPEC.CARDIO.PAED`, `SPEC.PAEDSURG`, `SPEC.VASC`, `SPEC.INFERT`, `SPEC.HEPAT`, `SPEC.SLEEP`, `SPEC.SPORTS`, `SPEC.SEXO` — old duplicate/prefix codes remain resolvable aliases. Doctor saves and profile updates remap codes; `backend/scripts/migrate-doctor-subspecialties.mjs` is available for an explicit one-time migration of stored rows; dry-run connected to the configured database and found 0 rows needing changes (script defaults to read-only and requires `--apply` for writes).
- Doctor count parent par = parent + saare subs ka **distinct** doctors (double count nahi).

### 4.1 Additional children present in the current tree

The original §3 lists missed these children returned by the current tree endpoint. Each code remains one canonical record; parents in the last column are additional display locations only.

| Canonical child | Also shown under |
|---|---|
| `SPEC.ENDO.DIABETES` — Diabetology & Metabolic Disorders | `SPEC.GENMED` |
| `SPEC.ENDO.PCOS` — PCOS & Reproductive Endocrinology | `SPEC.OBGY` |
| `SPEC.DENTAL.PAEDO` — Paediatric & Preventive Dentistry | `SPEC.PAED` |
| `SPEC.DERM.PAED` — Paediatric Dermatology | `SPEC.PAED` |
| `SPEC.ENT.PAED` — Paediatric ENT | `SPEC.PAED` |
| `SPEC.ONCO.PAED` — Paediatric Oncology | `SPEC.PAED` |
| `SPEC.OPHTH.PAED` — Paediatric Ophthalmology | `SPEC.PAED` |
| `SPEC.ORTHO.PAED` — Paediatric Orthopaedics | `SPEC.PAED` |
| `SPEC.PAED.HAEM_ONC` — Paediatric Haemato-oncology | `SPEC.ONCO`, `SPEC.HAEM` |
| `SPEC.SEXO` — Sexology & Andrology | `SPEC.DERM`, `SPEC.URO` |
| `SPEC.SLEEP` — Sleep Medicine | `SPEC.PULMO`, `SPEC.ENT`, `SPEC.PSYCH`, `SPEC.NEURO` |
| `SPEC.PMR.PAIN` — Pain Rehabilitation Medicine | `SPEC.ANAES`, `SPEC.NEURO` |
| `SPEC.ANAES.PAIN` — Interventional Pain Medicine | `SPEC.PMR` |
| `SPEC.INFECT.HIV` — HIV Medicine & PrEP | `SPEC.PSYCH` |
| `SPEC.ONCO.GI` — Gastrointestinal Oncology | `SPEC.GASTRO` |
| `SPEC.OBGY.ONCO` — Gynaecological Oncology | `SPEC.ONCO` |
| `SPEC.ONCO.HAEMATO` — Haemato-oncology | `SPEC.HAEM` |
| `SPEC.GENSURG.BARIATRIC` — Bariatric & Metabolic Surgery | `SPEC.GASTRO`, `SPEC.ENDO` |
| `SPEC.PMR.SPORTS` — Sports Rehabilitation | `SPEC.SPORTS` |
| `SPEC.SPORTS` — Sports Medicine | `SPEC.ORTHO`, `SPEC.PMR` |
| `SPEC.DERM.VENEREOLOGY` — Venereology & STI Medicine | `SPEC.SEXO` |
| `SPEC.GERI.PALLIATIVE` — Geriatric Palliative Care | `SPEC.PALLI` |
| `SPEC.ANAES.PALLIATIVE` — Palliative Anaesthesia & Sedation | `SPEC.PALLI` |
| `SPEC.PAED.ALLERGY` — Paediatric Allergy & Asthma | `SPEC.ALLERGY` |
| `SPEC.PULMO.OCC_LUNG` — Occupational Lung Disease | `SPEC.OCCMED` |
| `SPEC.PULMO.TB_CHEST` — TB & Chest Diseases | `SPEC.INFECT` |
| `SPEC.HEPAT.VIRAL` — Viral Hepatitis (B & C) | `SPEC.INFECT` |

These primary-parent entries were also absent from the original §3 child lists and are now accounted for above: `SPEC.RHEUM.ARTHRITIS` (Inflammatory Arthritis), `SPEC.ONCO.PALLIATIVE` (Palliative Oncology), `SPEC.SPORTS.EXERCISE` (Exercise Physiology), and `SPEC.SEXO.SECURE` (Sexual Health, discreet).

---

## 5. UI spec — "Browse by Specialties"

### 5.1 Tile (image jaisa, upgrade)
```
┌──────────────┐
│   [icon]     │  ← unique icon + soft colour per group
│ Cardiology   │
│ 24 doctors   │  ← count (city/facility context)
│ 6 sub-specs  │  ← hint ki andar aur options hain
└──────────────┘
```
- Count: `N doctors` + (page par ho to) `M hospitals`. **0 doctors:** tile muted + “No doctors yet · Request” (click opens specialty detail); browse-all hide-zero toggle: “Show only available”.
- Hover/tap: sub-specialty **chips preview** (top 4 + "+n").

### 5.2 Drill-down (tile click)
```
Cardiology
Sub-specialties: [All] [Interventional] [Electrophysiology] [Paediatric] [Heart Failure] [Preventive] …
Common conditions: [Chest pain] [Palpitations] [High BP] [Breathlessness] …
Procedures: [ECG] [Echo] [Angiography] [Angioplasty] …
Tabs: Doctors | Hospitals & Clinics | Tests & Packages | Articles
Filters: city/area · mode (in-person/video/home) · fee · language · gender · open now · schemes (PM-JAY/insurance)
```
- Sub-specialty chip select → doctors filtered by `subSpecialtyCodes`.
- Conditions chip → doctors with matching `conditionsTreated` (ya specialty fallback).
- "Not sure which doctor?" → symptom checker / AI triage CTA.

### 5.3 Alag-alag jagah alag list (ab har jagah same hai)
| Jagah | Kya dikhe |
|---|---|
| Home | API-backed, city-scoped top 8 tiles by doctor availability + “Browse all specialties”; zero-count tiles muted with Request link |
| Browse all page | 13 groups (§2), search box, A–Z toggle |
| Hospital/Clinic page ka "Browse by Specialties" | **Sirf us facility ke specialties** (count > 0 pehle, zero hidden by default) + sub-specialty chips |
| Doctor filters | Specialty → sub-specialty cascading dropdown |
| Doctor profile setup/editor | Specialty (required) + sub-specialties (multi) + conditions + procedures; editable after account setup |

### 5.4 Search
- Typeahead: specialty, sub-specialty, condition, symptom, procedure, doctor name; Hinglish/Hindi synonyms.
- **Symptom → specialty** examples: seene me dard → Cardiology/Emergency (red-flag banner) · pet dard/acidity → Gastroenterology · daant dard → Dental · aankh lal → Ophthalmology · peshab me jalan → Urology · jodon me dard → Orthopaedics/Rheumatology · neend nahi aati → Psychiatry/Sleep · baal jhadna → Dermatology · bachche ko bukhar → Paediatrics · period irregular → OBGY/Endocrinology · saans phoolna → Pulmonology/Cardiology · sugar → Endocrinology/General Medicine.
- Red-flag symptoms (chest pain, stroke signs, heavy bleeding, self-harm) → emergency/helpline banner pehle.

### 5.5 Other "Browse by" tabs (same page par)
`Specialties` | `Systems of Medicine` (Ayurveda · Homeopathy · Unani · Siddha · Naturopathy-Yoga) | `Allied & Therapy` (Physio · Dietitian · Speech/OT · Audiologist · Optometrist) | `Mind` (Psychologist · Counsellor · Psychiatrist 🔒) | `By Body System / Age / Gender` (Child · Women · Men · Senior).

---

## 6. Data model + API

```js
// Category (type: 'specialty' | 'sub_specialty') — existing model, extra fields in `meta`
{ code:'SPEC.CARDIO', type:'specialty', name:'Cardiology', nameHi:'हृदय रोग', aliases:[...], parent:null,
  alsoUnder:[],                              // cross-list parents
  meta:{ group:'heart-vascular', icon:'Heart', color:'rose', featured:true,
         symptoms:['chest pain','palpitations',...],   // search keywords (hi/en/Hinglish)
         conditions:['High BP','Heart failure',...], procedures:['ECG','Echo',...],
         sensitive:false, adClaimsRestricted:false, relatedTests:['DIAG.CARDIAC'], relatedPackages:['PKG.CARDIAC'] } }

// Doctor — add
conditionsTreated: [{ code:'COND.HIGH_BP', label:'High BP' }],  procedures: [{ code:'PROC.ECHO', label:'Echo' }]
```
**API (single source of truth):**
```
GET /categories/specialties?tree=1                 → 43 tiles with children (sub-specialties) + meta
GET /categories/specialties/:code                  → one specialty: subs, conditions, procedures, related tests/packages
GET /categories/specialties/:code/counts?city=&facilityId=   → doctors/hospitals counts (distinct, parent+subs)
GET /search/suggest?q=                             → specialties + subs + conditions + symptoms + procedures + doctors
GET /platform-content?contentType=article&specialtyCode=SPEC.CARDIO → published, medically reviewed specialty articles
```
- Browse tree React Query se API fetch hota hai; local fallback specialty catalog removed from this page (API cache is 5 minutes).
- Specialty detail ka Articles tab sirf published + medical-review-stamped content dikhata hai; article authoring/review `PlatformContent` workflow se hoti hai. Abhi koi article seed nahi kiya gaya.
- Browse-all ke neeche Systems of Medicine, Allied & Therapy, Mind, aur age/care-area links live search/directory routes tak le jaate hain.
- Current taxonomy metadata/API total is 343 (43 roots + 300 canonical subs); cross-list display links do not add records.
- Seed: `data/categoryTree.mjs`/`taxonomy.js` me upar ke ➕ nodes + `meta` daalo; idempotent seeder (`POST /categories/seed`) se sync.

---

## 7. Checklist
- [x] 43 tiles ke liye unique icons + group colours (`specialtyVisuals`)
- [x] Tile me sub-specialty chips + drill-down page (sub-specialty / conditions / procedures / doctors / hospitals / tests)
- [x] ➕ sub-specialties seed and gaps in existing specialties
- [x] Duplicate codes → canonical + alias + `alsoUnder` cross-list; paediatric-surgery aliases retained
- [x] Doctor `subSpecialtyCodes` canonical resolution + `conditionsTreated` / `procedures` fields and profile editor
- [x] `GET /categories/specialties?tree=1`, `/:code`, `/:code/counts` + API-backed frontend browse tree
- [x] Zero-count handling and "only available" toggle
- [x] Facility pages show facility-scoped specialties/providers
- [x] Symptom/condition/procedure search + Hinglish synonyms + red-flag banners
- [x] Sensitive tiles: discreet labels and filtered suggestions; claims-restricted flags reach moderation
- [x] Claims-restricted categories flagged in taxonomy and moderation
- [x] Backend: 34 focused taxonomy/browse/API tests passed, including detail + count API calls for every one of 343 canonical codes, detail + count resolution for every registered legacy alias, and tree children for all 43 roots; frontend specialty-filter: 12 tests passed.
- [x] Specialty-detail browser flow (including reviewed-articles tab) passed with mocked APIs; frontend production build and backend content-review tests passed.
- [x] Doctor legacy-code migration dry-run connected to configured database and found 0 rows needing changes; the script defaults to read-only and requires `--apply` for writes.
- [x] Specialty live read-only browse/detail flow passed in English and Hindi against the configured backend (2/2 on 2026-11-10); medically reviewed article authoring remains open in `FindMedi-Browse-By-Specialties-TODO.md`.
