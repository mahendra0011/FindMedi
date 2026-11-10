# FindMedi — Subcategories (pruned catalogue ke hisaab se)

> `FindMedi-Categories-Pruned.md` ke har section ke subcategories. Koi Phase/timeline nahi.
>
> **Revalidated (2026-11-10):** previously-➕ groups (community_health_centre, teaching_hospital, skin_hair_clinic … travel_vaccination_clinic, dental/eye diagnostics, audiology_lab, yoga_studio, dialysis_centre, optical_shop, hearing_aid_centre, geriatric_daycare, accreditations, amenities, service tags, Info schemes) now exist in `FACILITY_SUBTYPES`/`FACILITY_ACCREDITATIONS`/amenity+service enums or Info pages — no pending subtype additions remain in this document.
>
> **Workspace status (2026-11-09):**
> - `Category` model supports `code`, `nameHi`, aliases, parent/path/level, tier, regulation, claims flags, external codes and text search.
> - Canonical specialty taxonomy contains 43 roots and 300 sub-specialties; its complete tree is listed in §2, including cross-listed children. The specialty API, aliases and focused tests were checked.
> - `FACILITY_SUBTYPES`, `FACILITY_OWNERSHIP`, `SYSTEMS_OF_MEDICINE`, `FACILITY_SCHEMES` remain catalogue references; this document's non-specialty entries are not part of the specialty-tree verification.
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
✅ community_health_centre (CHC alag se mark) · teaching_hospital (medical_college ka alias)

**1.2 Clinic**
✅ single_doctor_clinic · polyclinic · specialty_clinic · dental_clinic · eye_clinic · ayush_clinic · physiotherapy_clinic · fertility_clinic · urgent_care_clinic · corporate_clinic · campus_clinic · telemedicine_clinic · mohalla_community_clinic
✅ skin_hair_clinic · diabetes_clinic · ortho_spine_clinic · ent_clinic · paediatric_clinic · women_clinic · pain_clinic · sleep_clinic · wound_care_clinic · travel_vaccination_clinic

**1.3 Primary govt (Info + Facility)**
✅ phc · chc · uphc · sub_centre · arogya_mandir

**1.4 Lab / diagnostic**
✅ pathology_lab · imaging_centre · diagnostic_centre · collection_centre · home_collection_lab · mobile_diagnostic_van · cardiac_diagnostic_centre · sleep_lab · genetic_molecular_lab · blood_bank
✅ dental_diagnostic · eye_diagnostic · audiology_lab

**1.5 Pharmacy**
✅ retail_pharmacy · hospital_pharmacy · jan_aushadhi_kendra · generic_store · pharmacy_24x7 · online_pharmacy · ayurvedic_homeopathic_store · surgical_ortho_store · chain_pharmacy · wholesale_pharmacy

**1.6 Wellness / rehab / long-term care**
✅ wellness_centre · fitness_centre · elder_care_home · assisted_living · hospice_palliative · de_addiction_centre 🔒 · child_development_centre · rehabilitation_centre
✅ yoga_studio · dialysis_centre · optical_shop · hearing_aid_centre · geriatric_daycare

**1.7 Ownership** ✅: government · private · trust_charitable · corporate_chain · cooperative · ppp · military_railway_esi
**1.8 System of medicine** ✅: allopathy · ayurveda · homeopathy · unani · siddha · yoga_naturopathy · sowa_rigpa* · integrative  (*sowa_rigpa listing me rakho par practitioner category me nahi — unverifiable)
**1.9 Accreditation** ✅: NABH (full / entry-level) · NABL · JCI · NQAS (govt) · Kayakalp · ISO 9001 · AERB registered · ART registered
**1.10 Schemes accepted** ✅ (`FACILITY_SCHEMES`): PM-JAY · CGHS · ESI · ECHS · state scheme · private cashless · TPA-empanelled · corporate tie-up
**1.11 Amenities** ✅: 24x7 · ICU · NICU/PICU · emergency/trauma · blood bank · in-house pharmacy · ambulance · parking · wheelchair access · lift · cafeteria · pickup-drop · prayer room · visitor lodging · female staff available · Wi-Fi
**1.12 Services offered (tags)** ✅: OPD · IPD · day-care · emergency · surgery · dialysis · chemo · IVF · vaccination · home collection · home visit · telemedicine · health packages · second opinion

---

## 2. Practitioners - SPEC.* / PRO.*

Current canonical specialty tree from backend/src/lib/taxonomy.js (43 root specialties; sub-specialty cross-lists keep one canonical code).

| Specialty | Code | Current sub-specialties |
|---|---|---|
| General Medicine | `SPEC.GENMED` | Diabetology & Metabolic Disorders (`SPEC.ENDO.DIABETES`) ↔ ; Family Physician (`SPEC.GENMED.FAMILY`) ; Fever & Infections Clinic (`SPEC.GENMED.FEVER`) ; Hospitalist (`SPEC.GENMED.HOSPITALIST`) ; Internal Medicine (`SPEC.GENMED.INTERNAL`) ; Lifestyle & Chronic-disease Care (`SPEC.GENMED.LIFESTYLE`) ; Preventive Medicine (`SPEC.GENMED.PREVENTIVE`) ; Travel Medicine (`SPEC.GENMED.TRAVEL_MED`) |
| Cardiology | `SPEC.CARDIO` | Cardiac Imaging (`SPEC.CARDIO.IMAGING`) ; Cardiac Rehabilitation (`SPEC.CARDIO.REHAB`) ; Electrophysiology (`SPEC.CARDIO.EP`) ; Heart Failure & Transplant (`SPEC.CARDIO.HEART_FAILURE`) ; Interventional Cardiology (`SPEC.CARDIO.INTERVENTIONAL`) ; Paediatric Cardiology (`SPEC.CARDIO.PAED`) ↔ ; Preventive Cardiology (`SPEC.CARDIO.PREVENTIVE`) ; Structural Heart Disease (`SPEC.CARDIO.STRUCTURAL`) |
| Cardiothoracic Surgery | `SPEC.CTVS` | Adult Cardiac Surgery (`SPEC.CTVS.CARDIAC`) ; Congenital Heart Surgery (`SPEC.CTVS.CONGENITAL`) ; Heart & Lung Transplant Surgery (`SPEC.CTVS.TRANSPLANT`) ; Minimally Invasive Cardiac Surgery (`SPEC.CTVS.MIS`) ; Thoracic Surgery (`SPEC.CTVS.THORACIC`) ; Vascular Surgery (`SPEC.VASC`) ↔ |
| Vascular Surgery | `SPEC.VASC` | Aortic Surgery (`SPEC.VASC.AORTIC`) ; Diabetic Foot & Limb Salvage (`SPEC.VASC.DIABETIC_FOOT`) ; Dialysis Access Surgery (`SPEC.VASC.ACCESS`) ; Endovascular Therapy (`SPEC.VASC.ENDOVASCULAR`) ; Peripheral Artery Disease Clinic (`SPEC.VASC.PAD`) ; Varicose Vein & Venous Disease (`SPEC.VASC.VENOUS`) |
| Orthopaedics | `SPEC.ORTHO` | Foot & Ankle Surgery (`SPEC.ORTHO.FOOT_ANKLE`) ; Hand & Microsurgery (`SPEC.ORTHO.HAND`) ; Joint Replacement (`SPEC.ORTHO.JOINT`) ; Orthopaedic Oncology (`SPEC.ORTHO.ONCO`) ; Orthopaedic Trauma (`SPEC.ORTHO.TRAUMA`) ; Paediatric Orthopaedics (`SPEC.ORTHO.PAED`) ↔ ; Shoulder & Elbow Surgery (`SPEC.ORTHO.SHOULDER_ELBOW`) ; Spine Surgery (`SPEC.ORTHO.SPINE`) ; Sports Medicine (`SPEC.SPORTS`) ↔ |
| Obstetrics & Gynaecology | `SPEC.OBGY` | Adolescent Gynaecology (`SPEC.OBGY.ADOLESCENT`) ; Antenatal & Postnatal Care (`SPEC.OBGY.ANTENATAL`) ; Contraception & Family Planning (`SPEC.OBGY.FAMILY_PLANNING`) ; Fetal Medicine (`SPEC.OBGY.FETAL`) ; Gynaecological Laparoscopy & Endoscopy (`SPEC.OBGY.LAPAROSCOPY`) ; Gynaecological Oncology (`SPEC.OBGY.ONCO`) ↔ ; High-Risk Obstetrics & Maternal Fetal Medicine (`SPEC.OBGY.HIGH_RISK`) ; Infertility (`SPEC.INFERT`) ↔ ; Menopause & Midlife Health (`SPEC.OBGY.MENOPAUSE`) ; PCOS & Reproductive Endocrinology (`SPEC.ENDO.PCOS`) ↔ ; Urogynaecology (`SPEC.OBGY.UROGYNAE`) |
| Paediatrics | `SPEC.PAED` | Adolescent Paediatrics (`SPEC.PAED.ADOLESCENT`) ; Developmental Paediatrics (`SPEC.PAED.DEVELOPMENTAL`) ; Growth & Nutrition Clinic (`SPEC.PAED.NUTRITION`) ; Neonatology (`SPEC.NEONATO`) ↔ ; Paediatric & Preventive Dentistry (`SPEC.DENTAL.PAEDO`) ↔ ; Paediatric Allergy & Asthma (`SPEC.PAED.ALLERGY`) ↔ ; Paediatric Cardiology (`SPEC.CARDIO.PAED`) ↔ ; Paediatric Dermatology (`SPEC.DERM.PAED`) ↔ ; Paediatric Endocrinology (`SPEC.ENDO.PAED`) ↔ ; Paediatric ENT (`SPEC.ENT.PAED`) ↔ ; Paediatric Gastroenterology (`SPEC.GASTRO.PAED`) ↔ ; Paediatric Haemato-oncology (`SPEC.PAED.HAEM_ONC`) ↔ ; Paediatric Nephrology (`SPEC.NEPHRO.PAED`) ↔ ; Paediatric Neurology (`SPEC.NEURO.PAED`) ↔ ; Paediatric Oncology (`SPEC.ONCO.PAED`) ↔ ; Paediatric Ophthalmology (`SPEC.OPHTH.PAED`) ↔ ; Paediatric Orthopaedics (`SPEC.ORTHO.PAED`) ↔ ; Paediatric Pulmonology (`SPEC.PULMO.PAED`) ↔ ; Paediatric Surgery (`SPEC.PAEDSURG`) ↔ ; Paediatric Vaccination & Immunisation (`SPEC.PAED.VACCINATION`) |
| Paediatric Surgery | `SPEC.PAEDSURG` | Congenital Anomalies Surgery (`SPEC.PAEDSURG.CONGENITAL`) ; Neonatal Surgery (`SPEC.PAEDSURG.NEONATAL`) ; Paediatric Laparoscopic Surgery (`SPEC.PAEDSURG.LAPAROSCOPY`) ; Paediatric Surgical Oncology (`SPEC.PAEDSURG.ONCOLOGY`) ; Paediatric Urologic Surgery (`SPEC.PAEDSURG.UROLOGY`) |
| Neonatology | `SPEC.NEONATO` | High-risk Infant Follow-up (`SPEC.NEONATO.FOLLOWUP`) ; Neonatal Intensive Care (NICU) (`SPEC.NEONATO.NICU`) ; Neonatal Jaundice Care (`SPEC.NEONATO.JAUNDICE`) ; Neonatal Respiratory Support (`SPEC.NEONATO.VENTILATION`) ; Newborn Screening (`SPEC.NEONATO.SCREENING`) ; Preterm & Low Birth Weight Care (`SPEC.NEONATO.PRETERM`) |
| Dermatology | `SPEC.DERM` | Contact & Allergic Dermatitis (`SPEC.DERM.ALLERGY`) ; Cosmetic Dermatology & Aesthetics (`SPEC.DERM.COSMETIC`) ; Dermatology Laser Procedures (`SPEC.DERM.LASER`) ; Dermatosurgery (`SPEC.DERM.DERMATOSURGERY`) ; Medical Dermatology (`SPEC.DERM.MEDICAL`) ; Paediatric Dermatology (`SPEC.DERM.PAED`) ↔ ; Pigmentation & Vitiligo (`SPEC.DERM.PIGMENTATION`) ; Sexology & Andrology (`SPEC.SEXO`) ↔ ; Trichology & Hair Transplant (`SPEC.DERM.TRICHOLOGY`) ; Venereology & STI Medicine (`SPEC.DERM.VENEREOLOGY`) ↔ |
| ENT | `SPEC.ENT` | Audiology & Hearing Sciences (`SPEC.ENT.AUDIOLOGY`) ; Cochlear Implant Programme (`SPEC.ENT.COCHLEAR`) ; ENT Allergy & Rhinitis Care (`SPEC.ENT.ALLERGY`) ; Head & Neck Surgery (ENT) (`SPEC.ENT.HEAD_NECK`) ; Laryngology & Voice (`SPEC.ENT.LARYNGOLOGY`) ; Otology & Neurotology (`SPEC.ENT.OTOLOGY`) ; Paediatric ENT (`SPEC.ENT.PAED`) ↔ ; Rhinology & Sinus Surgery (`SPEC.ENT.RHINOLOGY`) ; Sleep Medicine (`SPEC.SLEEP`) ↔ ; Sleep Surgery (ENT) (`SPEC.ENT.SLEEP_SURGERY`) |
| Ophthalmology | `SPEC.OPHTH` | Cataract & Refractive Surgery (`SPEC.OPHTH.CATARACT`) ; Contact Lens Clinic (`SPEC.OPHTH.CONTACT_LENS`) ; Cornea & External Disease (`SPEC.OPHTH.CORNEA`) ; Dry Eye Clinic (`SPEC.OPHTH.DRY_EYE`) ; Glaucoma Surgery (`SPEC.OPHTH.GLAUCOMA`) ; LASIK & Vision Correction (`SPEC.OPHTH.LASIK`) ; Neuro-ophthalmology (`SPEC.OPHTH.NEURO`) ; Oculoplasty (`SPEC.OPHTH.OCULOPLASTY`) ; Paediatric Ophthalmology (`SPEC.OPHTH.PAED`) ↔ ; Squint & Strabismus (`SPEC.OPHTH.SQUINT`) ; Vitreoretinal Surgery (`SPEC.OPHTH.RETINA`) |
| Dental & Oral Medicine | `SPEC.DENTAL` | Cosmetic Dentistry (`SPEC.DENTAL.COSMETIC`) ; Dental Emergency (`SPEC.DENTAL.EMERGENCY`) ; Endodontics & Conservative Dentistry (`SPEC.DENTAL.ENDO`) ; Geriatric Dentistry (`SPEC.DENTAL.GERIATRIC`) ; Oral & Maxillofacial Surgery (`SPEC.DENTAL.OMFS`) ; Oral Implantology & Periodontics (`SPEC.DENTAL.IMPLANT`) ; Oral Medicine & Radiology (`SPEC.DENTAL.ORAL_MED_RAD`) ; Orthodontics & Dentofacial Orthopaedics (`SPEC.DENTAL.ORTHO`) ; Paediatric & Preventive Dentistry (`SPEC.DENTAL.PAEDO`) ↔ ; Periodontics (`SPEC.DENTAL.PERIO`) ; Prosthodontics (`SPEC.DENTAL.PROSTHO`) |
| Neurology | `SPEC.NEURO` | Dementia & Memory Disorders (`SPEC.NEURO.DEMENTIA`) ; Epilepsy & Seizure Disorders (`SPEC.NEURO.EPILEPSY`) ; Headache Medicine (`SPEC.NEURO.HEADACHE`) ; Movement Disorders & Parkinson's (`SPEC.NEURO.MOVEMENT`) ; Neuro-rehabilitation Medicine (`SPEC.NEURO.NEUROREHAB`) ; Neuromuscular Medicine (`SPEC.NEURO.NEUROMUSCULAR`) ; Paediatric Neurology (`SPEC.NEURO.PAED`) ↔ ; Pain Rehabilitation Medicine (`SPEC.PMR.PAIN`) ↔ ; Sleep Medicine (`SPEC.SLEEP`) ↔ ; Stroke & Neurovascular Medicine (`SPEC.NEURO.STROKE`) |
| Neurosurgery | `SPEC.NEUROSURG` | Cerebrovascular Surgery (`SPEC.NEUROSURG.CEREBROVASCULAR`) ; Endovascular Neurosurgery (`SPEC.NEUROSURG.ENDOVASCULAR`) ; Functional Neurosurgery (`SPEC.NEUROSURG.FUNCTIONAL`) ; Head & Spine Trauma Surgery (`SPEC.NEUROSURG.TRAUMA`) ; Neuro-Oncology & Skull Base Surgery (`SPEC.NEUROSURG.BRAIN_TUMOR`) ; Paediatric Neurosurgery (`SPEC.NEUROSURG.PAED`) ; Spine Neurosurgery (`SPEC.NEUROSURG.SPINE`) |
| Psychiatry | `SPEC.PSYCH` | Addiction Psychiatry & De-addiction (`SPEC.PSYCH.ADDICTION`) ; Child & Adolescent Psychiatry (`SPEC.PSYCH.CHILD`) ; Consultation-Liaison Psychiatry (`SPEC.PSYCH.CONSULT_LIAISON`) ; Forensic Psychiatry (`SPEC.PSYCH.FORENSIC`) ; Geriatric Psychiatry (`SPEC.PSYCH.GERIATRIC`) ↔ ; HIV Medicine & PrEP (`SPEC.INFECT.HIV`) ↔ ; Neuropsychiatry (`SPEC.PSYCH.NEUROPSYCH`) ; Perinatal Psychiatry (`SPEC.PSYCH.PERINATAL`) ; Psychotherapy & Counselling Medicine (`SPEC.PSYCH.PSYCHOTHERAPY`) ; Sleep Medicine (`SPEC.SLEEP`) ↔ |
| Gastroenterology | `SPEC.GASTRO` | Bariatric & Metabolic Surgery (`SPEC.GENSURG.BARIATRIC`) ↔ ; Gastrointestinal Oncology (`SPEC.ONCO.GI`) ↔ ; Gastrointestinal Surgery (`SPEC.GASTRO.SURGERY`) ; GERD & Oesophageal Motility (`SPEC.GASTRO.MOTILITY`) ; Hepatology (`SPEC.HEPAT`) ↔ ; Inflammatory Bowel Disease (IBD) (`SPEC.GASTRO.IBD`) ; Paediatric Gastroenterology (`SPEC.GASTRO.PAED`) ↔ ; Pancreas & Biliary Diseases (`SPEC.GASTRO.PANCREATOBILIARY`) ; Therapeutic GI Endoscopy (`SPEC.GASTRO.ENDOSCOPY`) |
| Hepatology | `SPEC.HEPAT` | Alcohol-related Liver Disease (`SPEC.HEPAT.ALCOHOL`) ; Cirrhosis & Portal Hypertension (`SPEC.HEPAT.CIRRHOSIS`) ; Fatty Liver Disease (NAFLD) (`SPEC.HEPAT.FATTY_LIVER`) ; Liver Transplant Medicine (`SPEC.HEPAT.TRANSPLANT`) ; Paediatric Hepatology (`SPEC.HEPAT.PAED`) ; Viral Hepatitis (B & C) (`SPEC.HEPAT.VIRAL`) ↔ |
| Nephrology | `SPEC.NEPHRO` | CKD Care & Renal Diet (`SPEC.NEPHRO.CKD`) ; Clinical Nephrology & Dialysis (`SPEC.NEPHRO.DIALYSIS`) ; Critical Care Nephrology (`SPEC.NEPHRO.CRITICAL`) ; Glomerular Disease (`SPEC.NEPHRO.GLOMERULAR`) ; Hypertension & Kidney (`SPEC.NEPHRO.HYPERTENSION`) ; Kidney Transplant Medicine (`SPEC.NEPHRO.TRANSPLANT`) ; Paediatric Nephrology (`SPEC.NEPHRO.PAED`) ↔ |
| Urology | `SPEC.URO` | Endourology & Lithotripsy (Stone Surgery) (`SPEC.URO.LITHOTRIPSY`) ; Female Urology (`SPEC.URO.FEMALE`) ; Paediatric Urology (`SPEC.URO.PAED`) ; Prostate Clinic (BPH) (`SPEC.URO.PROSTATE`) ; Sexology & Andrology (`SPEC.SEXO`) ↔ ; Urologic Oncology (`SPEC.URO.ONCO`) ; Urology Transplant (`SPEC.URO.TRANSPLANT`) |
| Pulmonology | `SPEC.PULMO` | Asthma & Allergy Respiratory (`SPEC.PULMO.ASTHMA`) ; COPD & Respiratory Rehab (`SPEC.PULMO.COPD`) ; Interstitial Lung Disease (`SPEC.PULMO.ILD`) ; Interventional Pulmonology (`SPEC.PULMO.INTERVENTIONAL`) ; Occupational Lung Disease (`SPEC.PULMO.OCC_LUNG`) ↔ ; Paediatric Pulmonology (`SPEC.PULMO.PAED`) ↔ ; Pulmonary Critical Care (`SPEC.PULMO.CRITICAL_CARE`) ; Sleep Medicine (`SPEC.SLEEP`) ↔ ; TB & Chest Diseases (`SPEC.PULMO.TB_CHEST`) ↔ |
| Endocrinology | `SPEC.ENDO` | Adrenal Disorders (`SPEC.ENDO.ADRENAL`) ; Bariatric & Metabolic Surgery (`SPEC.GENSURG.BARIATRIC`) ↔ ; Bone & Osteoporosis (`SPEC.ENDO.BONE`) ; Diabetology & Metabolic Disorders (`SPEC.ENDO.DIABETES`) ↔ ; Lipid & Cholesterol Disorders (`SPEC.ENDO.LIPID`) ; Paediatric Endocrinology (`SPEC.ENDO.PAED`) ↔ ; PCOS & Reproductive Endocrinology (`SPEC.ENDO.PCOS`) ↔ ; Pituitary & Neuroendocrinology (`SPEC.ENDO.PITUITARY`) ; Thyroid Disorders & Endocrine Oncology (`SPEC.ENDO.THYROID`) |
| Rheumatology | `SPEC.RHEUM` | Gout & Crystal Arthritis (`SPEC.RHEUM.GOUT`) ; Inflammatory Arthritis (`SPEC.RHEUM.ARTHRITIS`) ; Lupus & Connective Tissue (`SPEC.RHEUM.LUPUS`) ; Osteoarthritis Clinic (`SPEC.RHEUM.OA`) ; Paediatric Rheumatology (`SPEC.RHEUM.PAED`) ; Rheumatoid Arthritis (`SPEC.RHEUM.RA`) ; Spondyloarthritis (`SPEC.RHEUM.SPA`) ; Vasculitis (`SPEC.RHEUM.VASCULITIS`) |
| Oncology | `SPEC.ONCO` | Breast Oncology (`SPEC.ONCO.BREAST`) ; Cancer Survivorship & Follow-up (`SPEC.ONCO.SURVIVORSHIP`) ; Gastrointestinal Oncology (`SPEC.ONCO.GI`) ↔ ; Gynaecologic Oncology (`SPEC.ONCO.GYNAE`) ; Gynaecological Oncology (`SPEC.OBGY.ONCO`) ↔ ; Haemato-oncology (`SPEC.ONCO.HAEMATO`) ↔ ; Head & Neck Oncology (`SPEC.ONCO.HEAD_NECK`) ; Medical Oncology & Chemotherapy (`SPEC.ONCO.MEDICAL`) ; Paediatric Haemato-oncology (`SPEC.PAED.HAEM_ONC`) ↔ ; Paediatric Oncology (`SPEC.ONCO.PAED`) ↔ ; Palliative Oncology (`SPEC.ONCO.PALLIATIVE`) ; Radiation Oncology (`SPEC.ONCO.RADIATION`) ; Surgical Oncology (`SPEC.ONCO.SURGICAL`) ; Thoracic Oncology (`SPEC.ONCO.THORACIC`) |
| Haematology | `SPEC.HAEM` | Anaemia Clinic (`SPEC.HAEM.ANAEMIA`) ; Bone Marrow Transplant & Stem Cell (`SPEC.HAEM.BMT`) ; Clinical Haematology & Bleeding Disorders (`SPEC.HAEM.CLINICAL`) ; Haemato-oncology (`SPEC.ONCO.HAEMATO`) ↔ ; Haemophilia & Coagulation (`SPEC.HAEM.HAEMOPHILIA`) ; Paediatric Haemato-oncology (`SPEC.PAED.HAEM_ONC`) ↔ ; Thalassemia & Sickle Cell (`SPEC.HAEM.THALASSEMIA`) |
| General Surgery | `SPEC.GENSURG` | Bariatric & Metabolic Surgery (`SPEC.GENSURG.BARIATRIC`) ↔ ; Breast Surgery (`SPEC.GENSURG.BREAST`) ; Colorectal Surgery & Proctology (`SPEC.GENSURG.COLORECTAL`) ; Endocrine Surgery (`SPEC.GENSURG.ENDOCRINE`) ; Hepatobiliary & Pancreatic Surgery (`SPEC.GENSURG.HPB`) ; Hernia Surgery (`SPEC.GENSURG.HERNIA`) ; Minimal Access & Laparoscopic Surgery (`SPEC.GENSURG.LAPAROSCOPIC`) ; Trauma & Emergency Surgery (`SPEC.GENSURG.TRAUMA`) |
| Plastic & Reconstructive Surgery | `SPEC.PLASTSURG` | Aesthetic & Cosmetic Surgery (`SPEC.PLASTSURG.COSMETIC`) ; Breast Reconstruction & Oncoplasty (`SPEC.PLASTSURG.BREAST_RECON`) ; Burns & Complex Wound Care (`SPEC.PLASTSURG.BURNS`) ; Craniofacial Surgery (`SPEC.PLASTSURG.CRANIOFACIAL`) ; Reconstructive Hand Surgery (`SPEC.PLASTSURG.HAND`) ; Reconstructive Microsurgery & Burns (`SPEC.PLASTSURG.RECONSTRUCTIVE`) ; Scar Revision Surgery (`SPEC.PLASTSURG.SCAR`) |
| Anaesthesiology | `SPEC.ANAES` | Cardiac Anaesthesia (`SPEC.ANAES.CARDIAC`) ; Critical Care Anaesthesia (`SPEC.ANAES.CRITICAL_CARE`) ; Interventional Pain Medicine (`SPEC.ANAES.PAIN`) ↔ ; Obstetric Anaesthesia & Labour Analgesia (`SPEC.ANAES.OBSTETRIC`) ; Paediatric Anaesthesia (`SPEC.ANAES.PAED`) ; Pain Rehabilitation Medicine (`SPEC.PMR.PAIN`) ↔ ; Palliative Anaesthesia & Sedation (`SPEC.ANAES.PALLIATIVE`) ↔ ; Regional & Ambulatory Anaesthesia (`SPEC.ANAES.REGIONAL`) |
| Radiology | `SPEC.RADIO` | Breast Imaging (`SPEC.RADIO.BREAST`) ; Cardiac Radiology (`SPEC.RADIO.CARDIAC`) ; Interventional Radiology (`SPEC.RADIO.INTERVENTIONAL`) ; Musculoskeletal Radiology (`SPEC.RADIO.MSK`) ; Neuroradiology (`SPEC.RADIO.NEURO`) ; Paediatric Radiology (`SPEC.RADIO.PAED`) ; Ultrasound & Doppler Imaging (`SPEC.RADIO.USG`) |
| Pathology | `SPEC.PATHO` | Clinical Biochemistry (`SPEC.PATHO.BIOCHEM`) ; Clinical Microbiology (`SPEC.PATHO.MICRO`) ; Cytopathology (`SPEC.PATHO.CYTO`) ; Haematopathology (`SPEC.PATHO.HAEMATO`) ; Histopathology (`SPEC.PATHO.HISTO`) ; Molecular Pathology & Genetics (`SPEC.PATHO.MOLECULAR`) ; Transfusion Medicine & Blood Banking (`SPEC.PATHO.TRANSFUSION`) |
| Emergency Medicine | `SPEC.EMERG` | Cardiac Emergencies (`SPEC.EMERG.CARDIAC`) ; Intensive Care Medicine (`SPEC.EMERG.INTENSIVIST`) ; Paediatric Emergencies (`SPEC.EMERG.PAED`) ; Poisoning & Toxicology (`SPEC.EMERG.TOXICOLOGY`) ; Pre-hospital & Ambulance Care (`SPEC.EMERG.PREHOSPITAL`) ; Stroke Emergencies (`SPEC.EMERG.STROKE`) ; Trauma & Resuscitation (`SPEC.EMERG.TRAUMA`) |
| Geriatrics | `SPEC.GERI` | Elder Incontinence & Continence Care (`SPEC.GERI.CONTINENCE`) ; Falls & Fracture Prevention (`SPEC.GERI.FALLS`) ; Frailty & Elder Nutrition (`SPEC.GERI.FRAILTY`) ; Geriatric Palliative Care (`SPEC.GERI.PALLIATIVE`) ↔ ; Geriatric Polypharmacy (`SPEC.GERI.POLYPHARMACY`) ; Geriatric Psychiatry (`SPEC.PSYCH.GERIATRIC`) ↔ ; Memory & Dementia Clinic (`SPEC.GERI.MEMORY`) |
| Sports Medicine | `SPEC.SPORTS` | Exercise Physiology (`SPEC.SPORTS.EXERCISE`) ; Return-to-Play Assessment (`SPEC.SPORTS.RETURN_TO_PLAY`) ; Sports Injury Prevention (`SPEC.SPORTS.PREVENTION`) ; Sports Nutrition (`SPEC.SPORTS.NUTRITION`) ; Sports Performance Medicine (`SPEC.SPORTS.PERFORMANCE`) ; Sports Rehabilitation (`SPEC.PMR.SPORTS`) ↔ |
| Sexology & Andrology | `SPEC.SEXO` | Infertility (`SPEC.INFERT`) ↔ ; Male Infertility & Andrology (`SPEC.SEXO.ANDROLOGY`) ; Sexual Dysfunction Medicine (`SPEC.SEXO.DYSFUNCTION`) ; Sexual Health (Discreet) (`SPEC.SEXO.SECURE`) ; Sexual Health Counselling (`SPEC.SEXO.COUNSELLING`) ; STI & Genital Infection Care (`SPEC.SEXO.STI`) ; Venereology & STI Medicine (`SPEC.DERM.VENEREOLOGY`) ↔ ; Women's Sexual Health (`SPEC.SEXO.WOMEN`) |
| Infertility | `SPEC.INFERT` | Fertility Counselling (`SPEC.INFERT.COUNSELLING`) ; Fertility Preservation (Egg/Sperm Freezing) (`SPEC.INFERT.PRESERVATION`) ; IUI (Intrauterine Insemination) (`SPEC.INFERT.IUI`) ; IVF & ICSI (`SPEC.INFERT.IVF`) ; Male Infertility Treatment (`SPEC.INFERT.MALE`) ; Recurrent Pregnancy Loss (`SPEC.INFERT.RPL`) ; Reproductive Endocrinology (`SPEC.INFERT.REPRO_ENDO`) |
| Nuclear Medicine | `SPEC.NUCMED` | Bone Scan Imaging (`SPEC.NUCMED.BONE`) ; Cardiac Nuclear Imaging (MPI) (`SPEC.NUCMED.CARDIAC`) ; PET-CT Imaging (`SPEC.NUCMED.PET_CT`) ; Radionuclide Therapy (`SPEC.NUCMED.THERAPY`) ; Thyroid Scan & Radioiodine Therapy (`SPEC.NUCMED.THYROID`) |
| Physical Medicine & Rehabilitation | `SPEC.PMR` | Cardiac & Pulmonary Rehabilitation (`SPEC.PMR.CARDIOPULM`) ; Interventional Pain Medicine (`SPEC.ANAES.PAIN`) ↔ ; Neurological Rehabilitation (`SPEC.PMR.NEURO`) ; Paediatric Rehabilitation (`SPEC.PMR.PAED`) ; Pain Rehabilitation Medicine (`SPEC.PMR.PAIN`) ↔ ; Post-stroke Rehabilitation (`SPEC.PMR.STROKE`) ; Prosthetics & Orthotics (`SPEC.PMR.PROSTHETICS`) ; Spine Rehabilitation (`SPEC.PMR.SPINE`) ; Sports Medicine (`SPEC.SPORTS`) ↔ ; Sports Rehabilitation (`SPEC.PMR.SPORTS`) ↔ |
| Occupational Medicine | `SPEC.OCCMED` | Industrial Health Services (`SPEC.OCCMED.INDUSTRIAL`) ; Occupational Lung Disease (`SPEC.PULMO.OCC_LUNG`) ↔ ; Pre-employment & Periodic Health Checks (`SPEC.OCCMED.PRE_EMPLOYMENT`) ; Workplace Ergonomics (`SPEC.OCCMED.ERGONOMICS`) ; Workplace Injury Management (`SPEC.OCCMED.INJURY`) |
| Palliative Medicine | `SPEC.PALLI` | Bereavement & Grief Support (`SPEC.PALLI.BEREAVEMENT`) ; Cancer Pain & Symptom Control (`SPEC.PALLI.CANCER_PAIN`) ; Geriatric Palliative Care (`SPEC.GERI.PALLIATIVE`) ↔ ; Home-based Palliative Care (`SPEC.PALLI.HOME`) ; Hospice & End-of-life Care (`SPEC.PALLI.HOSPICE`) ; Paediatric Palliative Care (`SPEC.PALLI.PAED`) ; Palliative Anaesthesia & Sedation (`SPEC.ANAES.PALLIATIVE`) ↔ |
| Sleep Medicine | `SPEC.SLEEP` | Insomnia & CBT-I (`SPEC.SLEEP.INSOMNIA`) ; Narcolepsy & Hypersomnia (`SPEC.SLEEP.NARCOLEPSY`) ; Obstructive Sleep Apnoea (`SPEC.SLEEP.APNOEA`) ; Paediatric Sleep Medicine (`SPEC.SLEEP.PAED`) |
| Allergy & Immunology | `SPEC.ALLERGY` | Allergic Diseases & Asthma (`SPEC.ALLERGY.ASTHMA`) ; Allergic Rhinitis & Immunotherapy (`SPEC.ALLERGY.RHINITIS`) ; Drug Allergy & Hypersensitivity (`SPEC.ALLERGY.DRUG`) ; Food Allergy & Anaphylaxis (`SPEC.ALLERGY.FOOD`) ; Immunodeficiency & Immune Disorders (`SPEC.ALLERGY.IMMUNO`) ; Paediatric Allergy & Asthma (`SPEC.PAED.ALLERGY`) ↔ ; Urticaria & Angioedema (`SPEC.ALLERGY.URTICARIA`) |
| Infectious Disease | `SPEC.INFECT` | Antimicrobial Stewardship (`SPEC.INFECT.STEWARDSHIP`) ; Extra-pulmonary & Drug-resistant TB (`SPEC.INFECT.TB`) ; HIV Medicine & PrEP (`SPEC.INFECT.HIV`) ↔ ; Infection Prevention & Control (`SPEC.INFECT.CONTROL`) ; TB & Chest Diseases (`SPEC.PULMO.TB_CHEST`) ↔ ; Travel & Expedition Medicine (`SPEC.INFECT.TRAVEL`) ; Tropical Medicine (`SPEC.INFECT.TROPICAL`) ; Viral Hepatitis (B & C) (`SPEC.HEPAT.VIRAL`) ↔ |
| Clinical Genetics | `SPEC.GENETICS` | Genetic Counselling Clinic (`SPEC.GENETICS.COUNSELLING`) ; Oncogenetics (`SPEC.GENETICS.ONCO`) ; Paediatric Genetics (`SPEC.GENETICS.PAED`) ; Pharmacogenomics (`SPEC.GENETICS.PHARMACO`) ; Prenatal & Preconception Genetics (`SPEC.GENETICS.PRENATAL`) ; Rare Disease Genetics (`SPEC.GENETICS.RARE`) |

↔ means the same canonical child is displayed under another specialty; it is not a second category record.

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
Info pages ✅: Maternal-child schemes (JSY, PMMVY) · Immunisation (UIP) · National programs (TB, NCD, mental health) · Free-medicine lists · Grievance redressal ✅

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
