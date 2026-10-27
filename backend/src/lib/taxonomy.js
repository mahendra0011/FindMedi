import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const CATEGORY_TYPES_LIST = [
  'test', 'medicine', 'department', 'service',
  'specialty', 'sub_specialty', 'facility_type', 'provider_type', 'imaging',
  'medicine_class', 'medicine_form', 'rx_schedule', 'product_line', 'diet',
  'condition', 'event_type', 'program', 'wellness', 'device', 'language',
  'accreditation', 'scheme', 'insurance_policy', 'legal_practice_area',
  'record_type', 'emergency_type', 'info',
];

export const CATEGORY_TYPES = Object.freeze(CATEGORY_TYPES_LIST);
export const CATEGORY_TIERS = Object.freeze(['T1', 'T2', 'T3']);

export const CATEGORY_CODE_RE = /^[A-Z0-9]+(\.[A-Z0-9_]+)+$/;

const SPECIALTIES_LIST = [
  { code: 'SPEC.GENMED', name: 'General Medicine', aliases: ['General Physician', 'Family Medicine', 'Family Doctor', 'Physician', 'General Practice'] },
  { code: 'SPEC.CARDIO', name: 'Cardiology', aliases: ['Cardiologist', 'Heart', 'Heart Specialist'] },
  { code: 'SPEC.CTVS', name: 'Cardiothoracic Surgery', aliases: ['CTVS', 'Cardiothoracic & Vascular Surgery', 'Cardio Thoracic Surgery'] },
  { code: 'SPEC.VASC', name: 'Vascular Surgery', aliases: ['Vascular', 'Angio Surgery', 'Vascular & Endovascular Surgery', 'Endovascular Surgery', 'Vein Specialist'] },
  { code: 'SPEC.ORTHO', name: 'Orthopaedics', aliases: ['Orthopedics', 'Ortho', 'Orthopaedic Surgery', 'Bone & Joint', 'Bone Doctor'] },
  { code: 'SPEC.OBGY', name: 'Obstetrics & Gynaecology', aliases: ['Gynaecology', 'Gynecology', 'Obstetrics', 'Obs & Gynae', 'OB/GYN', 'Gynecologist', 'Gynaecologist'] },
  { code: 'SPEC.PAED', name: 'Paediatrics', aliases: ['Pediatrics', 'Child Specialist', 'Paediatrician', 'Pediatrician'] },
  { code: 'SPEC.PAEDSURG', name: 'Paediatric Surgery', aliases: ['Pediatric Surgery', 'Pediatric Surgeon', 'Paediatric Surgery Specialist', 'Pediatric Surgeon Care'] },
  { code: 'SPEC.NEONATO', name: 'Neonatology', aliases: ['Neonatal', 'Newborn Care', 'Neonatology & Newborn Care', 'Neonatal Intensive Care', 'NICU Specialist'] },
  { code: 'SPEC.DERM', name: 'Dermatology', aliases: ['Dermatologist', 'Skin Specialist', 'Dermato Venereology'] },
  { code: 'SPEC.ENT', name: 'ENT', aliases: ['Otorhinolaryngology', 'Ear Nose Throat', 'ENT Specialist'] },
  { code: 'SPEC.OPHTH', name: 'Ophthalmology', aliases: ['Ophthalmologist', 'Eye Specialist'] },
  { code: 'SPEC.DENTAL', name: 'Dental & Oral Medicine', aliases: ['Dentistry', 'Dentist', 'Dental', 'Oral Medicine'] },
  { code: 'SPEC.NEURO', name: 'Neurology', aliases: ['Neurologist'] },
  { code: 'SPEC.NEUROSURG', name: 'Neurosurgery', aliases: ['Neuro Surgeon'] },
  { code: 'SPEC.PSYCH', name: 'Psychiatry', aliases: ['Psychiatrist', 'Mental Health'] },
  { code: 'SPEC.GASTRO', name: 'Gastroenterology', aliases: ['Gastroenterologist', 'Gastro', 'GI'] },
  { code: 'SPEC.HEPAT', name: 'Hepatology', aliases: ['Liver Specialist', 'Hepatology & Liver Medicine', 'Hepatologist Specialist', 'Liver Disease'] },
  { code: 'SPEC.NEPHRO', name: 'Nephrology', aliases: ['Nephrologist', 'Kidney Specialist'] },
  { code: 'SPEC.URO', name: 'Urology', aliases: ['Urologist'] },
  { code: 'SPEC.PULMO', name: 'Pulmonology', aliases: ['Chest Medicine', 'Chest Physician', 'Respiratory Medicine'] },
  { code: 'SPEC.ENDO', name: 'Endocrinology', aliases: ['Diabetology', 'Diabetologist', 'Diabetes Specialist', 'Endocrinologist'] },
  { code: 'SPEC.RHEUM', name: 'Rheumatology', aliases: ['Rheumatologist', 'Arthritis Specialist'] },
  { code: 'SPEC.ONCO', name: 'Oncology', aliases: ['Cancer Specialist', 'Medical Oncology', 'Surgical Oncology', 'Radiation Oncology'] },
  { code: 'SPEC.HAEM', name: 'Haematology', aliases: ['Hematology', 'Blood Specialist'] },
  { code: 'SPEC.GENSURG', name: 'General Surgery', aliases: ['General Surgeon'] },
  { code: 'SPEC.PLASTSURG', name: 'Plastic & Reconstructive Surgery', aliases: ['Plastic Surgery', 'Reconstructive Surgery'] },
  { code: 'SPEC.ANAES', name: 'Anaesthesiology', aliases: ['Anaesthesia', 'Anesthesiology', 'Pain Medicine', 'Pain Management'] },
  { code: 'SPEC.RADIO', name: 'Radiology', aliases: ['Radiologist', 'Diagnostic Imaging'] },
  { code: 'SPEC.PATHO', name: 'Pathology', aliases: ['Pathologist'] },
  { code: 'SPEC.EMERG', name: 'Emergency Medicine', aliases: ['Casualty', 'Emergency'] },
  { code: 'SPEC.GERI', name: 'Geriatrics', aliases: ['Geriatric Medicine', 'Elder Care'] },
  { code: 'SPEC.SPORTS', name: 'Sports Medicine', aliases: ['Sports Injury', 'Sports Medicine & Arthroscopy', 'Sports Arthroscopy', 'Ligament Surgery', 'ACL Specialist'] },
  { code: 'SPEC.SEXO', name: 'Sexology & Andrology', aliases: ['Sexology', 'Andrology', 'Sex Medicine', 'Andrology & Men\'s Health', 'Male Fertility Specialist', 'Andrologist Specialist', 'Urological Sexual Medicine', 'Men Sexual Health Specialist'] },
  { code: 'SPEC.INFERT', name: 'Infertility', aliases: ['Fertility', 'IVF', 'Infertility & Reproductive Medicine', 'IVF Specialist', 'Fertility Specialist'] },
  { code: 'SPEC.NUCMED', name: 'Nuclear Medicine', aliases: ['Nuclear Medicine Specialist'] },
  { code: 'SPEC.PMR', name: 'Physical Medicine & Rehabilitation', aliases: ['Physical Medicine', 'PMR', 'Rehabilitation'] },
  { code: 'SPEC.OCCMED', name: 'Occupational Medicine', aliases: ['Occupational Health', 'Occ Med'] },
  { code: 'SPEC.PALLI', name: 'Palliative Medicine', aliases: ['Palliative Care'] },
  { code: 'SPEC.SLEEP', name: 'Sleep Medicine', aliases: ['Sleep Study', 'Sleep Disorder', 'Sleep Pulmonology', 'Sleep Apnea Specialist', 'Sleep Psychiatry', 'Insomnia Psychiatry'] },
  { code: 'SPEC.ALLERGY', name: 'Allergy & Immunology', aliases: ['Allergy', 'Immunology', 'Immunology & Allergy'] },
  { code: 'SPEC.INFECT', name: 'Infectious Disease', aliases: ['Infectious Diseases', 'Infection Specialist'] },
  { code: 'SPEC.GENETICS', name: 'Clinical Genetics', aliases: ['Genetics', 'Genetic Counselling'] },

  // Canonical sub-specialties (pruned catalogue SPEC.*)
  { code: 'SPEC.CARDIO.INTERVENTIONAL', name: 'Interventional Cardiology', aliases: ['Interventional Cardiologist', 'Coronary Angioplasty', 'Angioplasty Specialist'] },
  { code: 'SPEC.CARDIO.EP', name: 'Electrophysiology', aliases: ['Cardiac Electrophysiology', 'Arrhythmia Specialist', 'Pacemaker Specialist'] },
  { code: 'SPEC.CARDIO.PAED', name: 'Paediatric Cardiology', aliases: ['Pediatric Cardiology', 'Pediatric Cardiologist', 'Child Heart Specialist', 'Paediatric Cardiology Specialist', 'Child Heart Disease'] },
  { code: 'SPEC.CARDIO.HEART_FAILURE', name: 'Heart Failure & Transplant', aliases: ['Heart Failure Specialist'] },
  { code: 'SPEC.CTVS.CARDIAC', name: 'Adult Cardiac Surgery', aliases: ['Bypass Surgery', 'Open Heart Surgery'] },
  { code: 'SPEC.CTVS.THORACIC', name: 'Thoracic Surgery', aliases: ['Chest Surgery', 'Lung Surgery'] },
  { code: 'SPEC.ORTHO.JOINT', name: 'Joint Replacement', aliases: ['Knee Replacement', 'Hip Replacement', 'Arthroplasty'] },
  { code: 'SPEC.ORTHO.SPINE', name: 'Spine Surgery', aliases: ['Spine Specialist', 'Back Pain Surgery'] },
  { code: 'SPEC.ORTHO.TRAUMA', name: 'Orthopaedic Trauma', aliases: ['Fracture Specialist', 'Bone Trauma'] },
  { code: 'SPEC.ORTHO.PAED', name: 'Paediatric Orthopaedics', aliases: ['Pediatric Orthopedics', 'Child Bone Specialist'] },
  { code: 'SPEC.OBGY.HIGH_RISK', name: 'High-Risk Obstetrics & Maternal Fetal Medicine', aliases: ['High Risk Pregnancy', 'Fetal Medicine'] },
  { code: 'SPEC.OBGY.LAPAROSCOPY', name: 'Gynaecological Laparoscopy & Endoscopy', aliases: ['Gynae Laparoscopic Surgeon'] },
  { code: 'SPEC.OBGY.ONCO', name: 'Gynaecological Oncology', aliases: ['Gynae Onco', 'Cervical Cancer Specialist'] },
  { code: 'SPEC.DERM.COSMETIC', name: 'Cosmetic Dermatology & Aesthetics', aliases: ['Aesthetic Dermatologist', 'Laser Skin Specialist'], claimsRestricted: true },
  { code: 'SPEC.DERM.TRICHOLOGY', name: 'Trichology & Hair Transplant', aliases: ['Hair Specialist', 'Hair Transplant Surgeon'], claimsRestricted: true },
  { code: 'SPEC.ENT.OTOLOGY', name: 'Otology & Neurotology', aliases: ['Ear Specialist', 'Hearing Specialist', 'Cochlear Implant'] },
  { code: 'SPEC.ENT.RHINOLOGY', name: 'Rhinology & Sinus Surgery', aliases: ['Sinus Specialist', 'Nose Specialist'] },
  { code: 'SPEC.ENT.AUDIOLOGY', name: 'Audiology & Hearing Sciences', aliases: ['Audiologist Specialist', 'Hearing Aid Specialist'] },
  { code: 'SPEC.OPHTH.CATARACT', name: 'Cataract & Refractive Surgery', aliases: ['Cataract Surgeon', 'Phaco Surgeon'] },
  { code: 'SPEC.OPHTH.RETINA', name: 'Vitreoretinal Surgery', aliases: ['Retina Specialist', 'Diabetic Retinopathy'] },
  { code: 'SPEC.OPHTH.CORNEA', name: 'Cornea & External Disease', aliases: ['Cornea Specialist', 'Eye Transplant'] },
  { code: 'SPEC.OPHTH.GLAUCOMA', name: 'Glaucoma Surgery', aliases: ['Glaucoma Specialist'] },
  { code: 'SPEC.OPHTH.LASIK', name: 'LASIK & Vision Correction', aliases: ['LASIK Surgeon', 'Refractive Surgery'] },
  { code: 'SPEC.DENTAL.ORTHO', name: 'Orthodontics & Dentofacial Orthopaedics', aliases: ['Orthodontist', 'Braces Specialist', 'Aligners Specialist'] },
  { code: 'SPEC.DENTAL.ENDO', name: 'Endodontics & Conservative Dentistry', aliases: ['Endodontist', 'Root Canal Specialist', 'RCT Specialist'] },
  { code: 'SPEC.DENTAL.IMPLANT', name: 'Oral Implantology & Periodontics', aliases: ['Dental Implant Specialist', 'Periodontist', 'Gum Specialist'] },
  { code: 'SPEC.DENTAL.PAEDO', name: 'Paediatric & Preventive Dentistry', aliases: ['Pedodontist', 'Pediatric Dentist', 'Child Dentist'] },
  { code: 'SPEC.NEURO.STROKE', name: 'Stroke & Neurovascular Medicine', aliases: ['Stroke Specialist'] },
  { code: 'SPEC.NEURO.EPILEPSY', name: 'Epilepsy & Seizure Disorders', aliases: ['Epileptologist', 'Seizure Specialist'] },
  { code: 'SPEC.NEURO.MOVEMENT', name: 'Movement Disorders & Parkinson\'s', aliases: ['Parkinson Specialist'] },
  { code: 'SPEC.NEUROSURG.SPINE', name: 'Spine Neurosurgery', aliases: ['Neuro Spine Surgeon'] },
  { code: 'SPEC.NEUROSURG.BRAIN_TUMOR', name: 'Neuro-Oncology & Skull Base Surgery', aliases: ['Brain Tumor Surgeon'] },
  { code: 'SPEC.PSYCH.CHILD', name: 'Child & Adolescent Psychiatry', aliases: ['Child Psychiatrist'] },
  { code: 'SPEC.PSYCH.ADDICTION', name: 'Addiction Psychiatry & De-addiction', aliases: ['Deaddiction Specialist', 'Substance Abuse Specialist'] },
  { code: 'SPEC.PSYCH.GERIATRIC', name: 'Geriatric Psychiatry', aliases: ['Elderly Mental Health'] },
  { code: 'SPEC.GASTRO.ENDOSCOPY', name: 'Therapeutic GI Endoscopy', aliases: ['Endoscopy Specialist', 'ERCP Specialist'] },
  { code: 'SPEC.GASTRO.IBD', name: 'Inflammatory Bowel Disease (IBD)', aliases: ['Crohns Colitis Specialist'] },
  { code: 'SPEC.PULMO.CRITICAL_CARE', name: 'Pulmonary Critical Care', aliases: ['ICU Pulmonologist'] },
  { code: 'SPEC.PULMO.ASTHMA', name: 'Asthma & Allergy Respiratory', aliases: ['Chest Allergy Specialist'] },
  { code: 'SPEC.ENDO.DIABETES', name: 'Diabetology & Metabolic Disorders', aliases: ['Advanced Diabetes Specialist'] },
  { code: 'SPEC.ENDO.THYROID', name: 'Thyroid Disorders & Endocrine Oncology', aliases: ['Thyroid Specialist'] },
  { code: 'SPEC.ENDO.OBESITY', name: 'Obesity & Metabolic Medicine', aliases: ['Weight Management Specialist'], claimsRestricted: true },
  { code: 'SPEC.NEPHRO.DIALYSIS', name: 'Clinical Nephrology & Dialysis', aliases: ['Dialysis Specialist'] },
  { code: 'SPEC.NEPHRO.TRANSPLANT', name: 'Kidney Transplant Medicine', aliases: ['Renal Transplant Specialist'] },
  { code: 'SPEC.URO.LITHOTRIPSY', name: 'Endourology & Lithotripsy (Stone Surgery)', aliases: ['Kidney Stone Specialist', 'Lithotripsy Specialist'] },
  { code: 'SPEC.URO.PROSTATE', name: 'Prostate Clinic (BPH)', aliases: ['Prostate Specialist', 'Prostate Enlargement'] },
  { code: 'SPEC.ONCO.MEDICAL', name: 'Medical Oncology & Chemotherapy', aliases: ['Chemotherapy Specialist', 'Medical Oncologist Specialist'] },
  { code: 'SPEC.ONCO.SURGICAL', name: 'Surgical Oncology', aliases: ['Cancer Surgeon', 'Surgical Oncologist Specialist'] },
  { code: 'SPEC.ONCO.RADIATION', name: 'Radiation Oncology', aliases: ['Radiotherapy Specialist', 'Radiation Oncologist Specialist'] },
  { code: 'SPEC.HAEM.BMT', name: 'Bone Marrow Transplant & Stem Cell', aliases: ['BMT Specialist', 'Stem Cell Transplant'] },
  { code: 'SPEC.HAEM.CLINICAL', name: 'Clinical Haematology & Bleeding Disorders', aliases: ['Thalassemia Specialist', 'Coagulation Specialist'] },
  { code: 'SPEC.GENSURG.LAPAROSCOPIC', name: 'Minimal Access & Laparoscopic Surgery', aliases: ['Laparoscopic Surgeon Specialist'] },
  { code: 'SPEC.GENSURG.BARIATRIC', name: 'Bariatric & Metabolic Surgery', aliases: ['Weight Loss Surgeon', 'Bariatric Surgeon'], claimsRestricted: true },
  { code: 'SPEC.GENSURG.COLORECTAL', name: 'Colorectal Surgery & Proctology', aliases: ['Proctologist', 'Piles Fissure Surgeon'] },
  { code: 'SPEC.PLASTSURG.COSMETIC', name: 'Aesthetic & Cosmetic Surgery', aliases: ['Cosmetic Surgeon', 'Rhinoplasty Specialist'], claimsRestricted: true },
  { code: 'SPEC.PLASTSURG.RECONSTRUCTIVE', name: 'Reconstructive Microsurgery & Burns', aliases: ['Microvascular Surgeon', 'Burn Care Specialist'] },

  // ─── subcatogary.md §2.1 full tree seed (pruned catalogue ke hisaab se) ───
  // General / Family Medicine (SPEC.GENMED)
  { code: 'SPEC.GENMED.FAMILY', name: 'Family Physician', aliases: ['Family Medicine Consult', 'General Practitioner OPD'] },
  { code: 'SPEC.GENMED.INTERNAL', name: 'Internal Medicine', aliases: ['Internist', 'Internal Medicine Consultant'] },
  { code: 'SPEC.GENMED.HOSPITALIST', name: 'Hospitalist', aliases: ['Inpatient Physician'] },
  { code: 'SPEC.GENMED.PREVENTIVE', name: 'Preventive Medicine', aliases: ['Preventive Health', 'Health Screening Physician'] },
  { code: 'SPEC.GENMED.TRAVEL_MED', name: 'Travel Medicine', aliases: ['Travel Health', 'Traveller Vaccination Consult'] },
  // Cardiology
  { code: 'SPEC.CARDIO.PREVENTIVE', name: 'Preventive Cardiology', aliases: ['Cardiac Risk Reduction'] },
  { code: 'SPEC.CARDIO.IMAGING', name: 'Cardiac Imaging', aliases: ['Echocardiography', 'Cardiac CT MRI'] },
  // Neurology
  { code: 'SPEC.NEURO.HEADACHE', name: 'Headache Medicine', aliases: ['Migraine Specialist', 'Headache Clinic'] },
  { code: 'SPEC.NEURO.NEUROMUSCULAR', name: 'Neuromuscular Medicine', aliases: ['Nerve Muscle Specialist', 'EMG Specialist'] },
  { code: 'SPEC.NEURO.PAED', name: 'Paediatric Neurology', aliases: ['Child Neurologist'] },
  // Neurosurgery
  { code: 'SPEC.NEUROSURG.FUNCTIONAL', name: 'Functional Neurosurgery', aliases: ['DBS Surgery', 'Epilepsy Surgery'] },
  { code: 'SPEC.NEUROSURG.PAED', name: 'Paediatric Neurosurgery', aliases: ['Child Brain Spine Surgery'] },
  { code: 'SPEC.NEUROSURG.ENDOVASCULAR', name: 'Endovascular Neurosurgery', aliases: ['Coiling Embolisation'] },
  // Orthopaedics
  { code: 'SPEC.ORTHO.HAND', name: 'Hand & Microsurgery', aliases: ['Hand Surgeon', 'Microsurgery'] },
  { code: 'SPEC.ORTHO.FOOT_ANKLE', name: 'Foot & Ankle Surgery', aliases: ['Foot Ankle Specialist', 'Foot Deformity'] },
  { code: 'SPEC.ORTHO.ONCO', name: 'Orthopaedic Oncology', aliases: ['Bone Tumour Surgery'] },
  // Obstetrics & Gynaecology
  { code: 'SPEC.OBGY.UROGYNAE', name: 'Urogynaecology', aliases: ['Urogynecology', 'Pelvic Floor'] },
  { code: 'SPEC.OBGY.ADOLESCENT', name: 'Adolescent Gynaecology', aliases: ['Adolescent Gynecology'] },
  { code: 'SPEC.OBGY.MENOPAUSE', name: 'Menopause & Midlife Health', aliases: ['Menopause Clinic', 'HRT'] },
  // Paediatrics (sub-specs listed only here; specialty-row paed entries sit under their own parent)
  { code: 'SPEC.PAED.HAEM_ONC', name: 'Paediatric Haemato-oncology', aliases: ['Child Cancer Blood Specialist'] },
  { code: 'SPEC.PAED.DEVELOPMENTAL', name: 'Developmental Paediatrics', aliases: ['Developmental Paediatrician', 'ADHD Autism Development'] },
  { code: 'SPEC.PAED.ADOLESCENT', name: 'Adolescent Paediatrics', aliases: ['Teen Health'] },
  { code: 'SPEC.PAED.VACCINATION', name: 'Paediatric Vaccination & Immunisation', aliases: ['Child Vaccination'] },
  // Paediatric Surgery (legacy parent prefix SPEC.PS → canonical SPEC.PAEDSURG)
  { code: 'SPEC.PAEDSURG.NEONATAL', name: 'Neonatal Surgery', aliases: ['Newborn Surgery'] },
  { code: 'SPEC.PAEDSURG.UROLOGY', name: 'Paediatric Urologic Surgery', aliases: ['Child Urinary Surgery'] },
  { code: 'SPEC.PAEDSURG.ONCOLOGY', name: 'Paediatric Surgical Oncology', aliases: ['Child Cancer Surgery'] },
  { code: 'SPEC.PAEDSURG.LAPAROSCOPY', name: 'Paediatric Laparoscopic Surgery', aliases: ['Child Laparoscopy'] },
  { code: 'SPEC.PAEDSURG.CONGENITAL', name: 'Congenital Anomalies Surgery', aliases: ['Congenital Anomaly Repair'] },
  // Dermatology
  { code: 'SPEC.DERM.MEDICAL', name: 'Medical Dermatology', aliases: ['Clinical Dermatology'] },
  { code: 'SPEC.DERM.VENEREOLOGY', name: 'Venereology & STI Medicine', aliases: ['STD Specialist', 'Sexually Transmitted Infection'] },
  { code: 'SPEC.DERM.PAED', name: 'Paediatric Dermatology', aliases: ['Child Skin Specialist'] },
  { code: 'SPEC.DERM.DERMATOSURGERY', name: 'Dermatosurgery', aliases: ['Skin Biopsy Surgery', 'Mole Removal'] },
  // ENT
  { code: 'SPEC.ENT.LARYNGOLOGY', name: 'Laryngology & Voice', aliases: ['Voice Specialist', 'Throat Specialist'] },
  { code: 'SPEC.ENT.HEAD_NECK', name: 'Head & Neck Surgery (ENT)', aliases: ['ENT Oncology', 'Thyroid Surgeon ENT'] },
  { code: 'SPEC.ENT.PAED', name: 'Paediatric ENT', aliases: ['Child ENT Specialist'] },
  { code: 'SPEC.ENT.SLEEP_SURGERY', name: 'Sleep Surgery (ENT)', aliases: ['Snoring Surgery', 'Sleep Apnoea Surgery'] },
  // Ophthalmology
  { code: 'SPEC.OPHTH.PAED', name: 'Paediatric Ophthalmology', aliases: ['Child Eye Specialist'] },
  { code: 'SPEC.OPHTH.OCULOPLASTY', name: 'Oculoplasty', aliases: ['Eyelid Surgery', 'Tear Duct Surgery'] },
  { code: 'SPEC.OPHTH.SQUINT', name: 'Squint & Strabismus', aliases: ['Squint Specialist'] },
  { code: 'SPEC.OPHTH.NEURO', name: 'Neuro-ophthalmology', aliases: ['Optic Nerve Specialist'] },
  // Dental & Oral (§3)
  { code: 'SPEC.DENTAL.PROSTHO', name: 'Prosthodontics', aliases: ['Crowns Dentures Specialist'] },
  { code: 'SPEC.DENTAL.OMFS', name: 'Oral & Maxillofacial Surgery', aliases: ['Jaw Surgery', 'Wisdom Tooth Surgeon'] },
  { code: 'SPEC.DENTAL.ORAL_MED_RAD', name: 'Oral Medicine & Radiology', aliases: ['Dental X-ray Specialist'] },
  { code: 'SPEC.DENTAL.COSMETIC', name: 'Cosmetic Dentistry', aliases: ['Smile Design', 'Teeth Aesthetics'], claimsRestricted: true },
  // Psychiatry
  { code: 'SPEC.PSYCH.NEUROPSYCH', name: 'Neuropsychiatry', aliases: ['Brain Behaviour Specialist'] },
  { code: 'SPEC.PSYCH.PERINATAL', name: 'Perinatal Psychiatry', aliases: ['Postpartum Depression Specialist'] },
  // Gastroenterology
  { code: 'SPEC.GASTRO.PAED', name: 'Paediatric Gastroenterology', aliases: ['Child Digestive Specialist'] },
  { code: 'SPEC.GASTRO.SURGERY', name: 'Gastrointestinal Surgery', aliases: ['GI Surgeon', 'Hepatobiliary Surgery'] },
  { code: 'SPEC.GASTRO.BARIATRIC', name: 'Bariatric & Metabolic Medicine', aliases: ['Obesity Medicine'], claimsRestricted: true },
  // Pulmonology
  { code: 'SPEC.PULMO.INTERVENTIONAL', name: 'Interventional Pulmonology', aliases: ['Bronchoscopy Specialist'] },
  { code: 'SPEC.PULMO.TB_CHEST', name: 'TB & Chest Diseases', aliases: ['Tuberculosis Specialist', 'TB Doctor'] },
  { code: 'SPEC.PULMO.OCC_LUNG', name: 'Occupational Lung Disease', aliases: ['Pneumoconiosis Specialist', 'Occupational Asthma'] },
  { code: 'SPEC.PULMO.PAED', name: 'Paediatric Pulmonology', aliases: ['Child Chest Specialist'] },
  // Endocrinology
  { code: 'SPEC.ENDO.PAED', name: 'Paediatric Endocrinology', aliases: ['Child Hormone Specialist'] },
  { code: 'SPEC.ENDO.PCOS', name: 'PCOS & Reproductive Endocrinology', aliases: ['PCOS Specialist', 'Hormonal Disorder'] },
  { code: 'SPEC.ENDO.BONE', name: 'Bone & Osteoporosis', aliases: ['Osteoporosis Specialist', 'Calcium Metabolism'] },
  { code: 'SPEC.ENDO.PITUITARY', name: 'Pituitary & Neuroendocrinology', aliases: ['Pituitary Specialist'] },
  // Nephrology
  { code: 'SPEC.NEPHRO.GLOMERULAR', name: 'Glomerular Disease', aliases: ['Nephrotic Syndrome Specialist'] },
  { code: 'SPEC.NEPHRO.PAED', name: 'Paediatric Nephrology', aliases: ['Child Kidney Specialist'] },
  { code: 'SPEC.NEPHRO.HYPERTENSION', name: 'Hypertension & Kidney', aliases: ['Resistant Hypertension'] },
  // Urology
  { code: 'SPEC.URO.ONCO', name: 'Urologic Oncology', aliases: ['Bladder Prostate Cancer Surgery'] },
  { code: 'SPEC.URO.PAED', name: 'Paediatric Urology', aliases: ['Child Urology'] },
  { code: 'SPEC.URO.FEMALE', name: 'Female Urology', aliases: ['Pelvic Floor Urology', 'Incontinence Specialist'] },
  { code: 'SPEC.URO.TRANSPLANT', name: 'Urology Transplant', aliases: ['Kidney Transplant Surgery'] },
  // Rheumatology
  { code: 'SPEC.RHEUM.ARTHRITIS', name: 'Inflammatory Arthritis', aliases: ['Rheumatoid Arthritis', 'Juvenile Arthritis'] },
  { code: 'SPEC.RHEUM.LUPUS', name: 'Lupus & Connective Tissue', aliases: ['SLE Specialist', 'Autoimmune Connective Tissue'] },
  { code: 'SPEC.RHEUM.VASCULITIS', name: 'Vasculitis', aliases: ['Vascular Inflammation Specialist'] },
  { code: 'SPEC.RHEUM.PAED', name: 'Paediatric Rheumatology', aliases: ['Child Arthritis Specialist'] },
  // Oncology
  { code: 'SPEC.ONCO.PAED', name: 'Paediatric Oncology', aliases: ['Child Cancer Specialist'] },
  { code: 'SPEC.ONCO.HAEMATO', name: 'Haemato-oncology', aliases: ['Blood Cancer Specialist', 'Leukaemia Lymphoma'] },
  { code: 'SPEC.ONCO.HEAD_NECK', name: 'Head & Neck Oncology', aliases: ['Oral Cancer Specialist', 'Thyroid Oncology'] },
  { code: 'SPEC.ONCO.BREAST', name: 'Breast Oncology', aliases: ['Breast Cancer Specialist'] },
  { code: 'SPEC.ONCO.PALLIATIVE', name: 'Palliative Oncology', aliases: ['Cancer Symptom Care'] },
  // General Surgery
  { code: 'SPEC.GENSURG.BREAST', name: 'Breast Surgery', aliases: ['Breast Lump Surgery', 'Mastectomy'] },
  { code: 'SPEC.GENSURG.ENDOCRINE', name: 'Endocrine Surgery', aliases: ['Thyroid Parathyroid Surgery'] },
  { code: 'SPEC.GENSURG.HERNIA', name: 'Hernia Surgery', aliases: ['Hernia Repair', 'Abdominal Wall'] },
  { code: 'SPEC.GENSURG.TRAUMA', name: 'Trauma & Emergency Surgery', aliases: ['Accident Surgery', 'Acute Care Surgery'] },
  // Plastic & Reconstructive
  { code: 'SPEC.PLASTSURG.HAND', name: 'Reconstructive Hand Surgery', aliases: ['Tendon Nerve Repair Hand'] },
  { code: 'SPEC.PLASTSURG.CRANIOFACIAL', name: 'Craniofacial Surgery', aliases: ['Cleft Palate Surgery', 'Jaw Deformity Surgery'] },
  // Anaesthesiology & Pain
  { code: 'SPEC.ANAES.CRITICAL_CARE', name: 'Critical Care Anaesthesia', aliases: ['ICU Anaesthetist'] },
  { code: 'SPEC.ANAES.CARDIAC', name: 'Cardiac Anaesthesia', aliases: ['Cardiac Surgery Anaesthesia'] },
  { code: 'SPEC.ANAES.PAED', name: 'Paediatric Anaesthesia', aliases: ['Child Anaesthesia'] },
  { code: 'SPEC.ANAES.PALLIATIVE', name: 'Palliative Anaesthesia & Sedation', aliases: ['Pain Procedure Sedation'] },
  // Radiology
  { code: 'SPEC.RADIO.INTERVENTIONAL', name: 'Interventional Radiology', aliases: ['Angiography Specialist', 'Image Guided Procedure'] },
  { code: 'SPEC.RADIO.NEURO', name: 'Neuroradiology', aliases: ['Brain Spine Imaging'] },
  { code: 'SPEC.RADIO.MSK', name: 'Musculoskeletal Radiology', aliases: ['Bone Joint Imaging'] },
  { code: 'SPEC.RADIO.BREAST', name: 'Breast Imaging', aliases: ['Mammography Specialist'] },
  { code: 'SPEC.RADIO.PAED', name: 'Paediatric Radiology', aliases: ['Child Imaging'] },
  // Pathology
  { code: 'SPEC.PATHO.HISTO', name: 'Histopathology', aliases: ['Biopsy Report Specialist'] },
  { code: 'SPEC.PATHO.CYTO', name: 'Cytopathology', aliases: ['FNAC Specialist'] },
  { code: 'SPEC.PATHO.HAEMATO', name: 'Haematopathology', aliases: ['Blood Film Specialist'] },
  { code: 'SPEC.PATHO.MICRO', name: 'Clinical Microbiology', aliases: ['Culture Sensitivity Specialist'] },
  { code: 'SPEC.PATHO.BIOCHEM', name: 'Clinical Biochemistry', aliases: ['Lab Biochemistry'] },
  { code: 'SPEC.PATHO.TRANSFUSION', name: 'Transfusion Medicine & Blood Banking', aliases: ['Blood Bank Specialist'] },
  { code: 'SPEC.PATHO.MOLECULAR', name: 'Molecular Pathology & Genetics', aliases: ['PCR Genetics Lab'] },
  // Emergency & Critical Care
  { code: 'SPEC.EMERG.INTENSIVIST', name: 'Intensive Care Medicine', aliases: ['Intensivist', 'Critical Care Physician'] },
  { code: 'SPEC.EMERG.TRAUMA', name: 'Trauma & Resuscitation', aliases: ['Trauma Team Leader'] },
  // Geriatrics
  { code: 'SPEC.GERI.MEMORY', name: 'Memory & Dementia Clinic', aliases: ['Alzheimer Clinic'] },
  { code: 'SPEC.GERI.FALLS', name: 'Falls & Fracture Prevention', aliases: ['Falls Clinic'] },
  { code: 'SPEC.GERI.PALLIATIVE', name: 'Geriatric Palliative Care', aliases: ['Elder End of Life Care'] },
  { code: 'SPEC.GERI.POLYPHARMACY', name: 'Geriatric Polypharmacy', aliases: ['Multiple Medicines Review'] },
  // PMR / Rehabilitation Medicine
  { code: 'SPEC.PMR.NEURO', name: 'Neurological Rehabilitation', aliases: ['Stroke Rehab Specialist'] },
  { code: 'SPEC.PMR.SPINE', name: 'Spine Rehabilitation', aliases: ['Spinal Cord Rehab'] },
  { code: 'SPEC.PMR.SPORTS', name: 'Sports Rehabilitation', aliases: ['Return to Play Rehab'] },
  { code: 'SPEC.PMR.PAED', name: 'Paediatric Rehabilitation', aliases: ['Child Rehab Specialist'] },
  { code: 'SPEC.PMR.PROSTHETICS', name: 'Prosthetics & Orthotics', aliases: ['Artificial Limb Specialist'] },
  // Sports Medicine
  { code: 'SPEC.SPORTS.PREVENTION', name: 'Sports Injury Prevention', aliases: ['Injury Prevention'] },
  { code: 'SPEC.SPORTS.PERFORMANCE', name: 'Sports Performance Medicine', aliases: ['Athlete Performance'] },
  { code: 'SPEC.SPORTS.EXERCISE', name: 'Exercise Physiology', aliases: ['Exercise Testing'] },
  // Infectious Disease
  { code: 'SPEC.INFECT.HIV', name: 'HIV Medicine & PrEP', aliases: ['ART Specialist', 'HIV PrEP'] },
  { code: 'SPEC.INFECT.TROPICAL', name: 'Tropical Medicine', aliases: ['Dengue Malaria Specialist'] },
  { code: 'SPEC.INFECT.CONTROL', name: 'Infection Prevention & Control', aliases: ['Hospital Infection Control', 'IPC'] },
  { code: 'SPEC.INFECT.TRAVEL', name: 'Travel & Expedition Medicine', aliases: ['Travel Infection Prevention'] },
  // Allergy & Immunology
  { code: 'SPEC.ALLERGY.ASTHMA', name: 'Allergic Diseases & Asthma', aliases: ['Allergic Rhinitis Specialist'] },
  { code: 'SPEC.ALLERGY.FOOD', name: 'Food Allergy & Anaphylaxis', aliases: ['Food Intolerance Specialist'] },
  { code: 'SPEC.ALLERGY.IMMUNO', name: 'Immunodeficiency & Immune Disorders', aliases: ['Primary Immunodeficiency'] },
  // Sexology / Andrology
  { code: 'SPEC.SEXO.DYSFUNCTION', name: 'Sexual Dysfunction Medicine', aliases: ['Erectile Dysfunction Specialist', 'Libido Clinic'] },
  { code: 'SPEC.SEXO.SECURE', name: 'Sexual Health (Discreet)', aliases: ['Confidential Sexual Health'] },
  // Genetics
  { code: 'SPEC.GENETICS.PRENATAL', name: 'Prenatal & Preconception Genetics', aliases: ['Prenatal Screening Counselling'] },
  { code: 'SPEC.GENETICS.ONCO', name: 'Oncogenetics', aliases: ['Cancer Genetics Counselling', 'BRCA Counselling'] },
  { code: 'SPEC.GENETICS.RARE', name: 'Rare Disease Genetics', aliases: ['Rare Disorder Diagnosis'] },
  { code: 'SPEC.GENETICS.PAED', name: 'Paediatric Genetics', aliases: ['Child Genetic Disorders'] },
  { code: 'SPEC.GENETICS.PHARMACO', name: 'Pharmacogenomics', aliases: ['Gene Drug Testing'] },
  { code: 'SPEC.GENETICS.COUNSELLING', name: 'Genetic Counselling Clinic', aliases: ['Family History Assessment'] },

  // ─── subcatogary.md §3 full tree completion (➕ nodes; browse drill-down) ───
  // General Medicine gaps
  { code: 'SPEC.GENMED.LIFESTYLE', name: 'Lifestyle & Chronic-disease Care', aliases: ['Lifestyle Modification Clinic'] },
  { code: 'SPEC.GENMED.FEVER', name: 'Fever & Infections Clinic', aliases: ['Fever Clinic'] },
  // Cardiology gaps
  { code: 'SPEC.CARDIO.REHAB', name: 'Cardiac Rehabilitation', aliases: ['Cardiac Rehab Programme'] },
  { code: 'SPEC.CARDIO.STRUCTURAL', name: 'Structural Heart Disease', aliases: ['Structural Cardiologist', 'TAVI Specialist'] },
  // Cardiothoracic gaps
  { code: 'SPEC.CTVS.CONGENITAL', name: 'Congenital Heart Surgery', aliases: ['Congenital Cardiac Surgeon'] },
  { code: 'SPEC.CTVS.TRANSPLANT', name: 'Heart & Lung Transplant Surgery', aliases: ['Heart Transplant Surgeon'] },
  { code: 'SPEC.CTVS.MIS', name: 'Minimally Invasive Cardiac Surgery', aliases: ['Keyhole Heart Surgery'] },
  // Vascular Surgery (childless → full subs)
  { code: 'SPEC.VASC.ENDOVASCULAR', name: 'Endovascular Therapy', aliases: ['Peripheral Angioplasty'] },
  { code: 'SPEC.VASC.VENOUS', name: 'Varicose Vein & Venous Disease', aliases: ['Varicose Vein Specialist', 'Laser Vein Clinic'] },
  { code: 'SPEC.VASC.DIABETIC_FOOT', name: 'Diabetic Foot & Limb Salvage', aliases: ['Diabetic Foot Surgeon'] },
  { code: 'SPEC.VASC.ACCESS', name: 'Dialysis Access Surgery', aliases: ['AV Fistula Surgeon'] },
  { code: 'SPEC.VASC.AORTIC', name: 'Aortic Surgery', aliases: ['Aortic Aneurysm Surgeon'] },
  { code: 'SPEC.VASC.PAD', name: 'Peripheral Artery Disease Clinic', aliases: ['PAD Specialist', 'Claudication Clinic'] },
  // Orthopaedics gaps
  { code: 'SPEC.ORTHO.SHOULDER_ELBOW', name: 'Shoulder & Elbow Surgery', aliases: ['Shoulder Surgeon', 'Elbow Specialist'] },
  // Obstetrics & Gynaecology gaps
  { code: 'SPEC.OBGY.ANTENATAL', name: 'Antenatal & Postnatal Care', aliases: ['Pregnancy Check-up', 'Delivery Care Clinic'] },
  { code: 'SPEC.OBGY.FETAL', name: 'Fetal Medicine', aliases: ['Fetal Therapy', 'Fetal Scan Specialist'] },
  { code: 'SPEC.OBGY.FAMILY_PLANNING', name: 'Contraception & Family Planning', aliases: ['Family Planning Clinic'] },
  // Paediatrics gaps
  { code: 'SPEC.PAED.ALLERGY', name: 'Paediatric Allergy & Asthma', aliases: ['Child Allergy Specialist'] },
  { code: 'SPEC.PAED.NUTRITION', name: 'Growth & Nutrition Clinic', aliases: ['Child Growth Specialist', 'Paediatric Diet'] },
  // Neonatology subs (childless parent → full tree)
  { code: 'SPEC.NEONATO.NICU', name: 'Neonatal Intensive Care (NICU)', aliases: ['NICU Care Specialist'] },
  { code: 'SPEC.NEONATO.PRETERM', name: 'Preterm & Low Birth Weight Care', aliases: ['Premature Baby Care'] },
  { code: 'SPEC.NEONATO.JAUNDICE', name: 'Neonatal Jaundice Care', aliases: ['Newborn Jaundice Treatment'] },
  { code: 'SPEC.NEONATO.VENTILATION', name: 'Neonatal Respiratory Support', aliases: ['Newborn Ventilation'] },
  { code: 'SPEC.NEONATO.SCREENING', name: 'Newborn Screening', aliases: ['Birth Defect Screening'] },
  { code: 'SPEC.NEONATO.FOLLOWUP', name: 'High-risk Infant Follow-up', aliases: ['Preemie Follow-up'] },
  // Dermatology gaps
  { code: 'SPEC.DERM.ALLERGY', name: 'Contact & Allergic Dermatitis', aliases: ['Skin Allergy Specialist'] },
  { code: 'SPEC.DERM.PIGMENTATION', name: 'Pigmentation & Vitiligo', aliases: ['Vitiligo Specialist', 'Melasma Treatment'] },
  { code: 'SPEC.DERM.LASER', name: 'Dermatology Laser Procedures', aliases: ['Skin Laser Clinic'], claimsRestricted: true },
  // ENT gaps
  { code: 'SPEC.ENT.ALLERGY', name: 'ENT Allergy & Rhinitis Care', aliases: ['Nose Allergy Clinic'] },
  { code: 'SPEC.ENT.COCHLEAR', name: 'Cochlear Implant Programme', aliases: ['Cochlear Implant Surgery'] },
  // Ophthalmology gaps
  { code: 'SPEC.OPHTH.CONTACT_LENS', name: 'Contact Lens Clinic', aliases: ['Contact Lens Specialist'] },
  { code: 'SPEC.OPHTH.DRY_EYE', name: 'Dry Eye Clinic', aliases: ['Dry Eye Specialist'] },
  // Dental gaps
  { code: 'SPEC.DENTAL.PERIO', name: 'Periodontics', aliases: ['Gum Disease Treatment'] },
  { code: 'SPEC.DENTAL.GERIATRIC', name: 'Geriatric Dentistry', aliases: ['Elderly Dental Care'] },
  { code: 'SPEC.DENTAL.EMERGENCY', name: 'Dental Emergency', aliases: ['Tooth Pain Clinic', 'Dental Trauma'] },
  // Neurology gaps
  { code: 'SPEC.NEURO.DEMENTIA', name: 'Dementia & Memory Disorders', aliases: ['Memory Loss Specialist'] },
  { code: 'SPEC.NEURO.NEUROREHAB', name: 'Neuro-rehabilitation Medicine', aliases: ['Stroke Neuro Rehab'] },
  // Neurosurgery gaps
  { code: 'SPEC.NEUROSURG.TRAUMA', name: 'Head & Spine Trauma Surgery', aliases: ['Head Injury Surgeon'] },
  { code: 'SPEC.NEUROSURG.CEREBROVASCULAR', name: 'Cerebrovascular Surgery', aliases: ['Brain Aneurysm Surgery'] },
  // Psychiatry gaps
  { code: 'SPEC.PSYCH.PSYCHOTHERAPY', name: 'Psychotherapy & Counselling Medicine', aliases: ['Talk Therapy Psychiatrist', 'CBT Psychiatrist'] },
  // Gastroenterology gaps
  { code: 'SPEC.GASTRO.PANCREATOBILIARY', name: 'Pancreas & Biliary Diseases', aliases: ['Pancreatitis Specialist'] },
  { code: 'SPEC.GASTRO.MOTILITY', name: 'GERD & Oesophageal Motility', aliases: ['GERD Specialist', 'Swallowing Clinic'] },
  // Hepatology (childless → full subs)
  { code: 'SPEC.HEPAT.FATTY_LIVER', name: 'Fatty Liver Disease (NAFLD)', aliases: ['NAFLD Specialist', 'Fatty Liver Treatment'] },
  { code: 'SPEC.HEPAT.VIRAL', name: 'Viral Hepatitis (B & C)', aliases: ['Hepatitis B Specialist', 'Hepatitis C Specialist'] },
  { code: 'SPEC.HEPAT.CIRRHOSIS', name: 'Cirrhosis & Portal Hypertension', aliases: ['Liver Cirrhosis Specialist'] },
  { code: 'SPEC.HEPAT.TRANSPLANT', name: 'Liver Transplant Medicine', aliases: ['Liver Transplant Hepatologist'] },
  { code: 'SPEC.HEPAT.ALCOHOL', name: 'Alcohol-related Liver Disease', aliases: ['Alcohol Liver Specialist'] },
  { code: 'SPEC.HEPAT.PAED', name: 'Paediatric Hepatology', aliases: ['Child Liver Specialist'] },
  // Nephrology gaps
  { code: 'SPEC.NEPHRO.CKD', name: 'CKD Care & Renal Diet', aliases: ['Chronic Kidney Disease Clinic'] },
  { code: 'SPEC.NEPHRO.CRITICAL', name: 'Critical Care Nephrology', aliases: ['ICU Kidney Care'] },
  // Pulmonology gaps
  { code: 'SPEC.PULMO.COPD', name: 'COPD & Respiratory Rehab', aliases: ['COPD Specialist'] },
  { code: 'SPEC.PULMO.ILD', name: 'Interstitial Lung Disease', aliases: ['ILD Specialist', 'Pulmonary Fibrosis'] },
  // Endocrinology gaps
  { code: 'SPEC.ENDO.ADRENAL', name: 'Adrenal Disorders', aliases: ['Adrenal Gland Specialist'] },
  { code: 'SPEC.ENDO.LIPID', name: 'Lipid & Cholesterol Disorders', aliases: ['Cholesterol Specialist'] },
  // Rheumatology gaps
  { code: 'SPEC.RHEUM.SPA', name: 'Spondyloarthritis', aliases: ['Ankylosing Spondylitis Specialist'] },
  { code: 'SPEC.RHEUM.GOUT', name: 'Gout & Crystal Arthritis', aliases: ['Gout Specialist'] },
  { code: 'SPEC.RHEUM.OA', name: 'Osteoarthritis Clinic', aliases: ['Knee Arthritis Pain'] },
  // Oncology gaps (PAED/HaematoMeet cross-listed, codes exist)
  { code: 'SPEC.ONCO.SURVIVORSHIP', name: 'Cancer Survivorship & Follow-up', aliases: ['Cancer Follow-up Care'] },
  // Haematology gaps
  { code: 'SPEC.HAEM.THALASSEMIA', name: 'Thalassemia & Sickle Cell', aliases: ['Sickle Cell Specialist'] },
  { code: 'SPEC.HAEM.HAEMOPHILIA', name: 'Haemophilia & Coagulation', aliases: ['Haemophilia Treatment Centre'] },
  { code: 'SPEC.HAEM.ANAEMIA', name: 'Anaemia Clinic', aliases: ['Anaemia Treatment'] },
  // General Surgery gaps
  { code: 'SPEC.GENSURG.HPB', name: 'Hepatobiliary & Pancreatic Surgery', aliases: ['HPB Surgeon'] },
  // Plastic surgery gaps
  { code: 'SPEC.PLASTSURG.BREAST_RECON', name: 'Breast Reconstruction & Oncoplasty', aliases: ['Breast Reconstruction Surgeon'] },
  { code: 'SPEC.PLASTSURG.BURNS', name: 'Burns & Complex Wound Care', aliases: ['Burn Unit Surgeon'] },
  { code: 'SPEC.PLASTSURG.SCAR', name: 'Scar Revision Surgery', aliases: ['Scar Removal Surgery'] },
  // Anaesthesiology gaps (childless-facing pain/regional/obstetric)
  { code: 'SPEC.ANAES.PAIN', name: 'Interventional Pain Medicine', aliases: ['Pain Specialist', 'Nerve Block Clinic'] },
  { code: 'SPEC.ANAES.REGIONAL', name: 'Regional & Ambulatory Anaesthesia', aliases: ['Regional Block Anaesthetist'] },
  { code: 'SPEC.ANAES.OBSTETRIC', name: 'Obstetric Anaesthesia & Labour Analgesia', aliases: ['Labour Pain Relief'] },
  // Radiology gaps
  { code: 'SPEC.RADIO.USG', name: 'Ultrasound & Doppler Imaging', aliases: ['Ultrasound Specialist', 'Doppler Scan'] },
  { code: 'SPEC.RADIO.CARDIAC', name: 'Cardiac Radiology', aliases: ['Cardiac CT MRI Imaging'] },
  // Emergency gaps (childless-facing; INTENSIVIST covers critical care)
  { code: 'SPEC.EMERG.CARDIAC', name: 'Cardiac Emergencies', aliases: ['Chest Pain Emergency'] },
  { code: 'SPEC.EMERG.STROKE', name: 'Stroke Emergencies', aliases: ['Stroke Code Team'] },
  { code: 'SPEC.EMERG.PAED', name: 'Paediatric Emergencies', aliases: ['Child Emergency'] },
  { code: 'SPEC.EMERG.TOXICOLOGY', name: 'Poisoning & Toxicology', aliases: ['Poison Control'] },
  { code: 'SPEC.EMERG.PREHOSPITAL', name: 'Pre-hospital & Ambulance Care', aliases: ['Ambulance Medicine'] },
  // Geriatrics gaps
  { code: 'SPEC.GERI.FRAILTY', name: 'Frailty & Elder Nutrition', aliases: ['Frailty Clinic'] },
  { code: 'SPEC.GERI.CONTINENCE', name: 'Elder Incontinence & Continence Care', aliases: ['Elderly Continence Clinic'] },
  // Sports Medicine gaps
  { code: 'SPEC.SPORTS.NUTRITION', name: 'Sports Nutrition', aliases: ['Sports Dietitian'] },
  { code: 'SPEC.SPORTS.RETURN_TO_PLAY', name: 'Return-to-Play Assessment', aliases: ['Fit-to-play Clearance'] },
  // Sleep Medicine (childless → full subs)
  { code: 'SPEC.SLEEP.APNOEA', name: 'Obstructive Sleep Apnoea', aliases: ['Sleep Apnoea Clinic', 'CPAP Clinic'] },
  { code: 'SPEC.SLEEP.INSOMNIA', name: 'Insomnia & CBT-I', aliases: ['Chronic Insomnia Treatment'] },
  { code: 'SPEC.SLEEP.NARCOLEPSY', name: 'Narcolepsy & Hypersomnia', aliases: ['Daytime Sleepiness Clinic'] },
  { code: 'SPEC.SLEEP.PAED', name: 'Paediatric Sleep Medicine', aliases: ['Child Sleep Clinic'] },
  // Allergy gaps
  { code: 'SPEC.ALLERGY.DRUG', name: 'Drug Allergy & Hypersensitivity', aliases: ['Drug Rash Specialist'] },
  { code: 'SPEC.ALLERGY.RHINITIS', name: 'Allergic Rhinitis & Immunotherapy', aliases: ['Allergy Shots', 'Sublingual Immunotherapy'] },
  { code: 'SPEC.ALLERGY.URTICARIA', name: 'Urticaria & Angioedema', aliases: ['Hives Specialist'] },
  // Infectious Disease gaps
  { code: 'SPEC.INFECT.TB', name: 'Extra-pulmonary & Drug-resistant TB', aliases: ['MDR TB Specialist'] },
  { code: 'SPEC.INFECT.STEWARDSHIP', name: 'Antimicrobial Stewardship', aliases: ['Antibiotic Steward'] },
  // PMR gaps
  { code: 'SPEC.PMR.STROKE', name: 'Post-stroke Rehabilitation', aliases: ['Hemiplegia Rehab'] },
  { code: 'SPEC.PMR.CARDIOPULM', name: 'Cardiac & Pulmonary Rehabilitation', aliases: ['Cardiac Rehab Programme'] },
  { code: 'SPEC.PMR.PAIN', name: 'Pain Rehabilitation Medicine', aliases: ['Chronic Pain Rehab'] },
  // Occupational Medicine (childless → full subs)
  { code: 'SPEC.OCCMED.PRE_EMPLOYMENT', name: 'Pre-employment & Periodic Health Checks', aliases: ['Fitness Certificate Exam'] },
  { code: 'SPEC.OCCMED.INDUSTRIAL', name: 'Industrial Health Services', aliases: ['Factory Medical Officer'] },
  { code: 'SPEC.OCCMED.ERGONOMICS', name: 'Workplace Ergonomics', aliases: ['Office Ergonomics Assessment'] },
  { code: 'SPEC.OCCMED.INJURY', name: 'Workplace Injury Management', aliases: ['Injury-on-duty Clinic'] },
  // Palliative Medicine (childless → full subs)
  { code: 'SPEC.PALLI.CANCER_PAIN', name: 'Cancer Pain & Symptom Control', aliases: ['Cancer Pain Clinic'] },
  { code: 'SPEC.PALLI.HOME', name: 'Home-based Palliative Care', aliases: ['Home Palliative Doctor'] },
  { code: 'SPEC.PALLI.HOSPICE', name: 'Hospice & End-of-life Care', aliases: ['Hospice Care'] },
  { code: 'SPEC.PALLI.PAED', name: 'Paediatric Palliative Care', aliases: ['Child Palliative'] },
  { code: 'SPEC.PALLI.BEREAVEMENT', name: 'Bereavement & Grief Support', aliases: ['Grief Counselling'] },
  // Sexology gaps (parent-sensitive; subs cross-list to Uro/Derm/Allied)
  { code: 'SPEC.SEXO.ANDROLOGY', name: 'Male Infertility & Andrology', aliases: ['Male Infertility Specialist'] },
  { code: 'SPEC.SEXO.WOMEN', name: 'Women\'s Sexual Health', aliases: ['Female Sexual Health'] },
  { code: 'SPEC.SEXO.COUNSELLING', name: 'Sexual Health Counselling', aliases: ['Sex Counsellor'] },
  { code: 'SPEC.SEXO.STI', name: 'STI & Genital Infection Care', aliases: ['Genital Infection Specialist'] },
  // Infertility (childless → full subs; ART Act claims-restricted)
  { code: 'SPEC.INFERT.IUI', name: 'IUI (Intrauterine Insemination)', aliases: ['IUI Treatment'] },
  { code: 'SPEC.INFERT.IVF', name: 'IVF & ICSI', aliases: ['IVF Centre', 'ICSI Specialist'], claimsRestricted: true },
  { code: 'SPEC.INFERT.MALE', name: 'Male Infertility Treatment', aliases: ['Semen Analysis Clinic'] },
  { code: 'SPEC.INFERT.PRESERVATION', name: 'Fertility Preservation (Egg/Sperm Freezing)', aliases: ['Egg Freezing Clinic', 'Sperm Freezing'] },
  { code: 'SPEC.INFERT.RPL', name: 'Recurrent Pregnancy Loss', aliases: ['Repeated Miscarriage Clinic'] },
  { code: 'SPEC.INFERT.REPRO_ENDO', name: 'Reproductive Endocrinology', aliases: ['Reproductive Hormone Specialist'] },
  { code: 'SPEC.INFERT.COUNSELLING', name: 'Fertility Counselling', aliases: ['IVF Counselling'] },
  // Nuclear Medicine (childless → full subs)
  { code: 'SPEC.NUCMED.PET_CT', name: 'PET-CT Imaging', aliases: ['PET Scan Specialist'] },
  { code: 'SPEC.NUCMED.THYROID', name: 'Thyroid Scan & Radioiodine Therapy', aliases: ['Radioiodine Treatment'] },
  { code: 'SPEC.NUCMED.BONE', name: 'Bone Scan Imaging', aliases: ['Skeletal Scintigraphy'] },
  { code: 'SPEC.NUCMED.CARDIAC', name: 'Cardiac Nuclear Imaging (MPI)', aliases: ['Myocardial Perfusion Scan'] },
  { code: 'SPEC.NUCMED.THERAPY', name: 'Radionuclide Therapy', aliases: ['Radiotheranostics'] },
];

// ─── Browse-by-Specialties meta (subcatogary.md §2 groups + §3 content) ──────
// One object per top-level specialty. `group` is the browse-all card; `icon`
// is the lucide icon name suggestion; `symptoms` are search keywords (en +
// Hinglish); `conditions`/`procedures` are the drill-down chips.
const SPECIALTY_META_INPUT = {
  'SPEC.GENMED': {
    group: 'primary-emergency', icon: 'Stethoscope', nameHi: 'सामान्य चिकित्सा', featured: true,
    conditions: ['Fever', 'Diabetes', 'High BP', 'Thyroid', 'Weakness/fatigue', 'Infection'],
    procedures: ['Health check-up', 'Vaccination (adult)', 'BP/sugar monitoring', 'ECG', 'Referral'],
    symptoms: ['fever', 'bukhar', 'cold cough', 'body ache', 'kamzori', 'diabetes', 'sugar', 'BP', 'thyroid'],
  },
  'SPEC.CARDIO': {
    group: 'heart-vascular', icon: 'Heart', nameHi: 'हृदय रोग', featured: true,
    conditions: ['Chest pain', 'Palpitations', 'High BP', 'Heart failure', 'High cholesterol', 'Breathlessness'],
    procedures: ['ECG', 'Echo', 'TMT', 'Holter', 'Angiography', 'Angioplasty', 'Pacemaker/ICD'],
    symptoms: ['seene me dard', 'chest pain', 'dil ka dara', 'palpitations', 'ghabrahat', 'saans phoolna', 'high BP'],
  },
  'SPEC.CTVS': {
    group: 'heart-vascular', icon: 'HeartPulse', nameHi: 'हृदय-वक्ष शल्य चिकित्सा',
    conditions: ['Valve disease', 'Coronary blockage', 'Aortic aneurysm', 'Lung tumour', 'Congenital heart defect'],
    procedures: ['CABG', 'Valve replacement/repair', 'Lobectomy', 'VATS', 'Aortic repair'],
    symptoms: ['blockage', 'valve', 'open heart surgery', 'bypass'],
  },
  'SPEC.VASC': {
    group: 'heart-vascular', icon: 'Activity', nameHi: 'रक्तवाहिका शल्य चिकित्सा',
    conditions: ['Varicose veins', 'Leg pain on walking', 'DVT/leg swelling', 'Aneurysm', 'Non-healing foot ulcer'],
    procedures: ['Angioplasty/stenting', 'Bypass', 'EVAR', 'Laser vein ablation', 'AV fistula creation'],
    symptoms: ['varicose veins', 'warein phoolna', 'leg pain walking', 'poth wala dard', 'suij leg'],
  },
  'SPEC.ORTHO': {
    group: 'bones-joints', icon: 'Bone', nameHi: 'अस्थि रोग', featured: true,
    conditions: ['Knee pain', 'Back pain', 'Neck pain', 'Fracture', 'Arthritis', 'Shoulder pain', 'Sciatica'],
    procedures: ['Knee/hip replacement', 'ACL repair', 'Arthroscopy', 'Fracture fixation', 'Spine surgery', 'Joint injections'],
    symptoms: ['jodon me dard', 'bone doctor', 'ghutne me dard', 'kamar dard', 'fracture', 'aans', 'haddi'],
  },
  'SPEC.OBGY': {
    group: 'women-child', icon: 'Flower2', nameHi: 'प्रसूति एवं स्त्री रोग', featured: true,
    conditions: ['Pregnancy care', 'Irregular periods', 'PCOS', 'Fibroids', 'Pelvic pain', 'Menopause symptoms', 'Infertility'],
    procedures: ['Antenatal scans', 'Normal/C-section delivery', 'Hysterectomy', 'Laparoscopy', 'Pap smear', 'IUD insertion'],
    symptoms: ['period irregular', 'mahwari', 'periods problem', 'pregnancy', 'garbhvat', 'PCOS', 'safed pani'],
  },
  'SPEC.PAED': {
    group: 'women-child', icon: 'Baby', nameHi: 'बाल रोग', featured: true,
    conditions: ['Fever in child', 'Cough/cold', 'Diarrhoea/vomiting', 'Growth issues', 'Allergies', 'Frequent infections'],
    procedures: ['Vaccination', 'Growth monitoring', 'Nebulisation', 'Newborn check', 'Developmental screening'],
    symptoms: ['bachche ko bukhar', 'child doctor', 'bachhe me pait dard', 'ulti', 'vaccination', 'growth'],
  },
  'SPEC.PAEDSURG': {
    group: 'women-child', icon: 'Scissors', nameHi: 'बाल शल्य चिकित्सा',
    conditions: ['Hernia in child', 'Undescended testis', 'Appendicitis', 'Congenital anomalies', 'Phimosis'],
    procedures: ['Hernia repair', 'Orchidopexy', 'Circumcision', 'Pyloromyotomy'],
    symptoms: ['bacche ki surgery', 'hernia child'],
  },
  'SPEC.NEONATO': {
    group: 'women-child', icon: 'Baby', nameHi: 'नवजात शिशु चिकित्सा',
    conditions: ['Premature birth', 'Newborn jaundice', 'Breathing difficulty', 'Low birth weight', 'Feeding problems'],
    procedures: ['Phototherapy', 'Surfactant therapy', 'CPAP/ventilation', 'Newborn screening'],
    symptoms: ['premature', 'newborn', 'navejadi', 'newborn peeleya'],
  },
  'SPEC.DERM': {
    group: 'skin-eye-ent-dental', icon: 'Sparkles', nameHi: 'त्वचा रोग', featured: true,
    conditions: ['Acne', 'Pigmentation', 'Eczema', 'Psoriasis', 'Hair fall', 'Fungal infection', 'Warts', 'Vitiligo'],
    procedures: ['Skin biopsy', 'Laser treatments', 'Chemical peel', 'Wart/mole removal', 'Patch test'],
    symptoms: ['hair fall', 'baal jhadna', 'kharonch', 'acne', 'keel mahase', 'safed daag', 'khujli'],
  },
  'SPEC.ENT': {
    group: 'skin-eye-ent-dental', icon: 'Ear', nameHi: 'नाक-कान-गला', featured: true,
    conditions: ['Ear pain', 'Hearing loss', 'Sinusitis', 'Tonsillitis', 'Snoring', 'Vertigo', 'Voice problems'],
    procedures: ['Nasal endoscopy', 'Tonsillectomy', 'Septoplasty', 'Grommet insertion', 'Audiometry'],
    symptoms: ['kaan dukhna', 'naak band', 'kharrate', 'sinus', 'chakkar aana', 'awaz'],
  },
  'SPEC.OPHTH': {
    group: 'skin-eye-ent-dental', icon: 'Eye', nameHi: 'नेत्र रोग', featured: true,
    conditions: ['Blurred vision', 'Cataract', 'Glaucoma', 'Red/watery eye', 'Diabetic retinopathy', 'Squint', 'Floaters'],
    procedures: ['Eye test', 'Phaco/cataract surgery', 'LASIK', 'Retinal laser', 'Intravitreal injection', 'OCT'],
    symptoms: ['aankh lal', 'dhundla dikhna', 'chashma number', 'aankh pani', 'cataract'],
  },
  'SPEC.DENTAL': {
    group: 'skin-eye-ent-dental', icon: 'Smile', nameHi: 'दंत चिकित्सा', featured: true,
    conditions: ['Toothache', 'Cavities', 'Bleeding gums', 'Bad breath', 'Crooked teeth', 'Wisdom tooth', 'Mouth ulcers'],
    procedures: ['Scaling', 'Fillings', 'Root canal', 'Crowns/bridges', 'Implants', 'Braces/aligners', 'Extraction'],
    symptoms: ['daant dard', 'dard teeth', 'masudo me khoon', 'cavity', 'safed daant', 'twisted tooth'],
  },
  'SPEC.NEURO': {
    group: 'brain-nerves', icon: 'Brain', nameHi: 'तंत्रिका रोग', featured: true,
    conditions: ['Headache/migraine', 'Seizures', 'Stroke', 'Tremors', 'Numbness/tingling', 'Memory loss', 'Vertigo'],
    procedures: ['EEG', 'EMG/NCV', 'MRI brain', 'Lumbar puncture', 'Botulinum injection'],
    symptoms: ['sar dard', 'migraine', 'jhatke', 'fits', 'lakhwa', 'sunne pan', 'yanadan'],
  },
  'SPEC.NEUROSURG': {
    group: 'brain-nerves', icon: 'Brain', nameHi: 'तंत्रिका शल्य चिकित्सा',
    conditions: ['Brain tumour', 'Slip disc', 'Head injury', 'Hydrocephalus', 'Spinal cord compression'],
    procedures: ['Craniotomy', 'Discectomy/fusion', 'VP shunt', 'Deep brain stimulation', 'Aneurysm coiling'],
    symptoms: ['brain surgery', 'slip disc', 'saleye'],
  },
  'SPEC.PSYCH': {
    group: 'mind', icon: 'Brain', nameHi: 'मानसिक चिकित्सा', featured: true, sensitive: true,
    conditions: ['Depression', 'Anxiety', 'OCD', 'Bipolar', 'Schizophrenia', 'Addiction', 'ADHD', 'Panic attacks'],
    procedures: ['Assessment', 'Medication management', 'ECT', 'rTMS', 'Psychotherapy referral'],
    symptoms: ['depression', 'tension', 'ghabrahat', 'neend nahi aati', 'anxiety', 'adat chhudana'],
  },
  'SPEC.GASTRO': {
    group: 'digestive-liver-renal', icon: 'Pill', nameHi: 'पाचन रोग', featured: true,
    conditions: ['Acidity', 'Stomach pain', 'Constipation', 'IBS', 'Jaundice', 'Blood in stool', 'Bloating'],
    procedures: ['Endoscopy', 'Colonoscopy', 'ERCP', 'FibroScan', 'Variceal banding', 'Polypectomy'],
    symptoms: ['pet dard', 'acidity', 'seene me jalan', 'kabz', 'loose motion', 'khoon stool'],
  },
  'SPEC.HEPAT': {
    group: 'digestive-liver-renal', icon: 'Pill', nameHi: 'यकृत रोग',
    conditions: ['Jaundice', 'Fatty liver', 'Hepatitis', 'Cirrhosis', 'Ascites', 'Raised liver enzymes'],
    procedures: ['FibroScan', 'Liver biopsy', 'Variceal banding', 'TIPS', 'Paracentesis'],
    symptoms: ['kamla', 'peelia', 'fatty liver', 'liver'],
  },
  'SPEC.NEPHRO': {
    group: 'digestive-liver-renal', icon: 'Droplets', nameHi: 'वृक्क रोग',
    conditions: ['Kidney failure', 'Protein in urine', 'Swelling', 'High creatinine', 'Recurrent UTI'],
    procedures: ['Haemodialysis', 'Peritoneal dialysis', 'Kidney biopsy', 'AV fistula surgery'],
    symptoms: ['kidney', 'creatinine', 'suij chehre', 'peshab me protein'],
  },
  'SPEC.URO': {
    group: 'digestive-liver-renal', icon: 'Droplets', nameHi: 'मूत्र रोग',
    conditions: ['Kidney stones', 'Enlarged prostate', 'Frequent urination', 'UTI', 'Blood in urine', 'Urinary leakage'],
    procedures: ['URS', 'PCNL', 'TURP', 'ESWL lithotripsy', 'Cystoscopy', 'Circumcision'],
    symptoms: ['peshab me jalan', 'peshab rukna', 'kidney stone', 'khoon peshab', 'baar baar peshab'],
  },
  'SPEC.PULMO': {
    group: 'lungs-allergy-infection', icon: 'Wind', nameHi: 'श्वसन रोग',
    conditions: ['Breathlessness', 'Chronic cough', 'Asthma', 'TB', 'COPD', 'Wheezing', 'Sleep apnoea'],
    procedures: ['PFT', 'Bronchoscopy', 'Pleural tap', 'Sleep study', 'Nebulisation'],
    symptoms: ['saans phoolna', 'khaansi', 'asthma', 'TB', 'wheezing', 'kharrate'],
  },
  'SPEC.ENDO': {
    group: 'hormones-blood-cancer', icon: 'Zap', nameHi: 'अंतःस्रावी रोग',
    conditions: ['Diabetes', 'Thyroid problems', 'Weight gain/obesity', 'PCOS', 'Short stature', 'Osteoporosis'],
    procedures: ['HbA1c', 'Thyroid profile', 'CGM', 'Insulin/pump therapy', 'DEXA scan'],
    symptoms: ['sugar', 'thyroid', 'motapa', 'vajan badhna', 'PCOS', 'hormone'],
  },
  'SPEC.RHEUM': {
    group: 'bones-joints', icon: 'Bone', nameHi: 'संधिवात',
    conditions: ['Joint pain & swelling', 'Morning stiffness', 'Lupus', 'Gout', 'Back stiffness', 'Autoimmune disease'],
    procedures: ['Joint aspiration', 'Biologic infusions', 'ANA/RA/anti-CCP tests'],
    symptoms: ['ghutna sujan', 'subah khamoshi', 'lupus', 'gout'],
  },
  'SPEC.ONCO': {
    group: 'hormones-blood-cancer', icon: 'Ribbon', nameHi: 'कर्क रोग (कैंसर)',
    conditions: ['Lump', 'Unexplained weight loss', 'Cancer follow-up', 'Second opinion', 'Post-chemo care'],
    procedures: ['Chemotherapy', 'Radiotherapy', 'Biopsy', 'PET-CT staging', 'Immunotherapy', 'Tumour board'],
    symptoms: ['cancer', 'gaanth', 'wajan ghatna'],
  },
  'SPEC.HAEM': {
    group: 'hormones-blood-cancer', icon: 'Droplet', nameHi: 'रक्त रोग',
    conditions: ['Anaemia', 'Low platelets', 'Thalassemia', 'Bleeding disorders', 'Blood clots', 'High/low WBC'],
    procedures: ['Bone marrow biopsy', 'Blood transfusion', 'IV iron', 'Plasmapheresis'],
    symptoms: ['khoon ki kami', 'platelet', 'thalassemia'],
  },
  'SPEC.GENSURG': {
    group: 'surgery-anaesthesia', icon: 'Scissors', nameHi: 'सामान्य शल्य चिकित्सा',
    conditions: ['Hernia', 'Gallstones', 'Appendicitis', 'Piles', 'Fissure/fistula', 'Breast lump', 'Thyroid swelling'],
    procedures: ['Laparoscopic cholecystectomy', 'Hernia repair', 'Haemorrhoid surgery', 'Appendicectomy', 'Thyroidectomy'],
    symptoms: ['ganth', 'bawasir', 'appendix'],
  },
  'SPEC.PLASTSURG': {
    group: 'surgery-anaesthesia', icon: 'Sparkles', nameHi: 'प्लास्टिक शल्य चिकित्सा', adClaimsRestricted: true,
    conditions: ['Burns', 'Scars', 'Cleft lip/palate', 'Hand injury', 'Post-cancer reconstruction'],
    procedures: ['Skin grafts', 'Flaps', 'Cleft repair', 'Scar revision', 'Reconstructive surgery'],
    symptoms: ['aar mark', 'cleft', 'plastic surgery'],
  },
  'SPEC.ANAES': {
    group: 'surgery-anaesthesia', icon: 'Syringe', nameHi: 'निश्चेतना',
    conditions: ['Chronic pain', 'Back pain', 'Cancer pain', 'Pre-operative assessment', 'Labour pain relief'],
    procedures: ['Nerve blocks', 'Epidural', 'Spinal anaesthesia', 'Pre-anaesthetic check-up'],
    symptoms: ['bed put pain', 'dard ki dava'],
  },
  'SPEC.RADIO': {
    group: 'diagnostics-lab', icon: 'Scan', nameHi: 'रेडियो विज्ञान',
    conditions: ['Report second opinion', 'Image-guided biopsy', 'Screening'],
    procedures: ['X-ray', 'CT', 'MRI', 'USG/Doppler', 'Mammography', 'Image-guided biopsy', 'Embolisation (no sex determination)'],
    symptoms: ['X-ray', 'MRI', 'scanning', 'CT'],
  },
  'SPEC.PATHO': {
    group: 'diagnostics-lab', icon: 'Microscope', nameHi: 'पैथोलॉजी',
    conditions: ['Biopsy reporting', 'Culture & sensitivity', 'Blood test reporting'],
    procedures: ['Histopathology report', 'FNAC', 'Culture & sensitivity', 'Special stains/IHC', 'Molecular panels'],
    symptoms: ['lab', 'pathology', 'test'],
  },
  'SPEC.EMERG': {
    group: 'primary-emergency', icon: 'Siren', nameHi: 'आपात चिकित्सा',
    conditions: ['Chest pain', 'Accidents/injury', 'Breathlessness', 'Poisoning', 'Burns', 'Seizures', 'Snake bite'],
    procedures: ['Resuscitation (CPR)', 'Splinting/suturing', 'Stabilisation', 'Triage'],
    symptoms: ['emergency', 'accident', 'hadbaha'],
  },
  'SPEC.GERI': {
    group: 'primary-emergency', icon: 'Clock', nameHi: 'वृद्धा चिकित्सा',
    conditions: ['Memory loss', 'Falls', 'Multiple medicines review', 'Weakness', 'Urinary incontinence'],
    procedures: ['Comprehensive geriatric assessment', 'Medication review', 'Fall-risk assessment'],
    symptoms: ['bhoolna', 'buddhape ka', 'girna'],
  },
  'SPEC.SPORTS': {
    group: 'bones-joints', icon: 'Dumbbell', nameHi: 'खेल चिकित्सा',
    conditions: ['Sprains/strains', 'Ligament injury', 'Tendonitis', 'Muscle pain', 'Stress fracture', 'Training injuries'],
    procedures: ['Biomechanical assessment', 'Injections', 'Taping', 'Rehab programmes'],
    symptoms: ['khel me angeek', 'khelaan', 'muscle pull'],
  },
  'SPEC.SEXO': {
    group: 'mens-work-health', icon: 'ShieldPlus', nameHi: 'यौन स्वास्थ्य', sensitive: true, adClaimsRestricted: true,
    conditions: ['Erectile dysfunction', 'Low desire', 'Painful intercourse', 'Male infertility', 'STI concerns'],
    procedures: ['Assessment', 'Hormonal tests', 'Semen analysis', 'Counselling'],
    symptoms: ['sexual problem', 'na-mardgi', 'kamjori'],
  },
  'SPEC.INFERT': {
    group: 'women-child', icon: 'Baby', nameHi: 'बंध्यता चिकित्सा', sensitive: true, adClaimsRestricted: true,
    conditions: ['Unable to conceive', 'Irregular ovulation', 'Blocked tubes', 'Low sperm count', 'Repeated miscarriage'],
    procedures: ['Ovulation tracking', 'IUI', 'IVF/ICSI', 'Egg/sperm freezing'],
    symptoms: ['IVF', 'test tube baby', 'santan nahi ban rahi'],
  },
  'SPEC.NUCMED': {
    group: 'diagnostics-lab', icon: 'Atom', nameHi: 'न्यूक्लियर चिकित्सा',
    conditions: ['Cancer imaging', 'Thyroid function imaging', 'Bone metastasis imaging'],
    procedures: ['PET-CT', 'Thyroid scan', 'Bone scan', 'Myocardial perfusion scan', 'Radioiodine therapy'],
    symptoms: ['PET scan', 'nuclear'],
  },
  'SPEC.PMR': {
    group: 'bones-joints', icon: 'Accessibility', nameHi: 'शारीरिक चिकित्सा एवं पुनर्वास',
    conditions: ['Stroke recovery', 'Spinal cord injury', 'Back pain', 'Cerebral palsy', 'Amputee care', 'Post-fracture stiffness'],
    procedures: ['Rehab programmes', 'Gait training', 'Orthotic fitting', 'Spasticity injections'],
    symptoms: ['rehab', 'paralysis recovery', 'physiotherapy'],
  },
  'SPEC.OCCMED': {
    group: 'mens-work-health', icon: 'HardHat', nameHi: 'व्यावसायिक स्वास्थ्य',
    conditions: ['Work-related injuries', 'Chemical/dust exposure', 'Pre-employment fitness', 'Repetitive strain'],
    procedures: ['Fitness-for-work exams', 'Audiometry/spirometry surveillance', 'Worker vaccination'],
    symptoms: ['factory injury', 'dust allergy'],
  },
  'SPEC.PALLI': {
    group: 'hormones-blood-cancer', icon: 'HeartHandshake', nameHi: 'उपशामक चिकित्सा', sensitive: true,
    conditions: ['Advanced cancer symptoms', 'Pain control', 'End-of-life care', 'Caregiver support'],
    procedures: ['Symptom management', 'Opioid-safe pain protocols', 'Family counselling'],
    symptoms: ['cancer last stage', 'aakhri din care'],
  },
  'SPEC.SLEEP': {
    group: 'brain-nerves', icon: 'Moon', nameHi: 'निद्रा रोग',
    conditions: ['Snoring', 'Insomnia', 'Daytime sleepiness', 'Restless legs', 'Sleep apnoea'],
    procedures: ['Polysomnography (PSG)', 'CPAP titration', 'Sleep hygiene programme'],
    symptoms: ['neend nahi aati', 'insomnia', 'kharrate', 'neend me saans rukna'],
  },
  'SPEC.ALLERGY': {
    group: 'lungs-allergy-infection', icon: 'ShieldAlert', nameHi: 'एलर्जी एवं प्रतिरक्षा',
    conditions: ['Sneezing', 'Hives', 'Food reactions', 'Drug rash', 'Frequent infections', 'Asthma triggers'],
    procedures: ['Skin-prick test', 'Specific IgE', 'Immunotherapy', 'Food challenge (supervised)'],
    symptoms: ['alleji', 'chheenak', 'pitti', 'annaj se allergy'],
  },
  'SPEC.INFECT': {
    group: 'lungs-allergy-infection', icon: 'Bug', nameHi: 'संक्रमण रोग',
    conditions: ['Prolonged fever', 'Dengue/malaria', 'Typhoid', 'TB', 'HIV', 'Recurrent infections'],
    procedures: ['Culture-guided therapy', 'Vaccination advice', 'OPAT/IV antibiotic planning'],
    symptoms: ['dengue', 'malaria', 'typhoid', 'lamb a fever'],
  },
  'SPEC.GENETICS': {
    group: 'diagnostics-lab', icon: 'Dna', nameHi: 'आनुवंशिकी',
    conditions: ['Family cancer history', 'Inherited disorders', 'Developmental delay', 'Recurrent pregnancy loss'],
    procedures: ['Genetic counselling', 'Karyotype', 'NIPT', 'Exome/panel testing (PCPNDT-aware)'],
    symptoms: ['khandan ki bemari'],
  },
};

// ─── §4 Cross-lists (duplicate records nahi — same record, mehr»jagah chips) ──
// Secondary parents: entry is canonical once; listed again under these parents.
const SPECIALTY_CROSS_LIST = {
  'SPEC.NEONATO': ['SPEC.PAED'],
  'SPEC.CARDIO.PAED': ['SPEC.PAED'],
  'SPEC.PAEDSURG': ['SPEC.PAED'],
  'SPEC.VASC': ['SPEC.CTVS', 'SPEC.GENMED'],
  'SPEC.SPORTS': ['SPEC.ORTHO', 'SPEC.PMR'],
  'SPEC.SEXO': ['SPEC.URO', 'SPEC.DERM'],
  'SPEC.INFERT': ['SPEC.OBGY', 'SPEC.SEXO'],
  'SPEC.HEPAT': ['SPEC.GASTRO'],
  'SPEC.SLEEP': ['SPEC.PULMO', 'SPEC.ENT', 'SPEC.PSYCH', 'SPEC.NEURO'],
  'SPEC.GASTRO.BARIATRIC': ['SPEC.GENSURG', 'SPEC.ENDO'],
  'SPEC.GENSURG.BARIATRIC': ['SPEC.GASTRO', 'SPEC.ENDO'],
  'SPEC.ENDO.OBESITY': ['SPEC.GENSURG', 'SPEC.GASTRO', 'SPEC.GENMED'],
  'SPEC.ENDO.PCOS': ['SPEC.OBGY'],
  'SPEC.ENDO.DIABETES': ['SPEC.GENMED'],
  'SPEC.ONCO.HAEMATO': ['SPEC.HAEM'],
  'SPEC.PAED.HAEM_ONC': ['SPEC.ONCO', 'SPEC.HAEM'],
  'SPEC.OBGY.ONCO': ['SPEC.ONCO'],
  'SPEC.ONCO.PAED': ['SPEC.PAED'],
  'SPEC.ONCO.GI': ['SPEC.GASTRO'],
  'SPEC.PMR.PAIN': ['SPEC.ANAES', 'SPEC.NEURO'],
  'SPEC.PMR.SPORTS': ['SPEC.SPORTS'],
  'SPEC.PULMO.OCC_LUNG': ['SPEC.OCCMED'],
  'SPEC.PULMO.TB_CHEST': ['SPEC.INFECT'],
  'SPEC.PULMO.PAED': ['SPEC.PAED'],
  'SPEC.NEURO.PAED': ['SPEC.PAED'],
  'SPEC.GASTRO.PAED': ['SPEC.PAED'],
  'SPEC.NEPHRO.PAED': ['SPEC.PAED'],
  'SPEC.ENDO.PAED': ['SPEC.PAED'],
  'SPEC.ANAES.PAIN': ['SPEC.PMR'],
  'SPEC.ANAES.PALLIATIVE': ['SPEC.PALLI'],
  'SPEC.GERI.PALLIATIVE': ['SPEC.PALLI'],
  'SPEC.DERM.VENEREOLOGY': ['SPEC.SEXO'],
  'SPEC.DERM.PAED': ['SPEC.PAED'],
  'SPEC.ENT.PAED': ['SPEC.PAED'],
  'SPEC.OPHTH.PAED': ['SPEC.PAED'],
  'SPEC.DENTAL.PAEDO': ['SPEC.PAED'],
  'SPEC.ORTHO.PAED': ['SPEC.PAED'],
  'SPEC.PAED.ALLERGY': ['SPEC.ALLERGY'],
  'SPEC.INFECT.HIV': ['SPEC.PSYCH'],   // 🔒 discreet grouping
};

// ─── §4 Duplicate/legacy code aliases ───────────────────────────────────────
// Doctor.subSpecialtyCodes / sync seeds authored before the de-dup carry these
// old codes. resolveSpecialty() and remapSubSpecialtyCode() translate them.
const SPEC_CODE_ALIAS_INPUT = {
  'SPEC.PAED.NEONATO': 'SPEC.NEONATO',
  'SPEC.PAED.CARDIOLOGY': 'SPEC.CARDIO.PAED',
  'SPEC.PAED.SURGERY': 'SPEC.PAEDSURG',
  'SPEC.PSURG.NEONATAL': 'SPEC.PAEDSURG.NEONATAL',
  'SPEC.PSURG.UROLOGY': 'SPEC.PAEDSURG.UROLOGY',
  'SPEC.PSURG.ONCOLOGY': 'SPEC.PAEDSURG.ONCOLOGY',
  'SPEC.CTVS.VASCULAR': 'SPEC.VASC',
  'SPEC.OBGY.INFERT_IVF': 'SPEC.INFERT',
  'SPEC.GASTRO.HEPATOLOGY': 'SPEC.HEPAT',
  'SPEC.PULMO.SLEEP': 'SPEC.SLEEP',
  'SPEC.PSYCH.SLEEP': 'SPEC.SLEEP',
  'SPEC.ORTHO.SPORTS': 'SPEC.SPORTS',
  'SPEC.URO.ANDROLOGY': 'SPEC.SEXO',
  'SPEC.URO.SEXUAL_HEALTH': 'SPEC.SEXO',
};

export const SPEC_CODE_ALIASES = Object.freeze(
  Object.fromEntries(Object.entries(SPEC_CODE_ALIAS_INPUT).map(([k, v]) => [k, v]))
);

export const SPECIALTY_GROUPS = Object.freeze([
  { id: 'primary-emergency', name: 'Primary & Emergency care', color: 'blue' },
  { id: 'heart-vascular', name: 'Heart & Vascular', color: 'rose' },
  { id: 'bones-joints', name: 'Bones, Joints & Muscles', color: 'sky' },
  { id: 'brain-nerves', name: 'Brain & Nerves', color: 'purple' },
  { id: 'women-child', name: 'Women & Child', color: 'pink' },
  { id: 'skin-eye-ent-dental', name: 'Skin, Eye, ENT & Dental', color: 'indigo' },
  { id: 'digestive-liver-renal', name: 'Digestive, Liver, Kidney & Urinary', color: 'amber' },
  { id: 'lungs-allergy-infection', name: 'Lungs, Allergy & Infection', color: 'cyan' },
  { id: 'hormones-blood-cancer', name: 'Hormones, Blood & Cancer', color: 'orange' },
  { id: 'mind', name: 'Mind', color: 'violet' },
  { id: 'surgery-anaesthesia', name: 'Surgery & Anaesthesia', color: 'slate' },
  { id: 'diagnostics-lab', name: 'Diagnostics & Lab medicine', color: 'teal' },
  { id: 'mens-work-health', name: 'Men\'s health & Work health', color: 'stone' },
]);

export const SPECIALTIES = Object.freeze(
  SPECIALTIES_LIST.map((s) => {
    const meta = SPECIALTY_META_INPUT[s.code] || null;
    const alsoUnder = SPECIALTY_CROSS_LIST[s.code];
    return Object.freeze({
      ...s,
      aliases: Object.freeze([...s.aliases]),
      alsoUnder: Object.freeze(alsoUnder ? [...alsoUnder] : []),
      claimsRestricted: !!s.claimsRestricted,
      sensitive: !!s.sensitive,
      meta: meta
        ? Object.freeze({
            ...meta,
            conditions: Object.freeze([...meta.conditions]),
            procedures: Object.freeze([...meta.procedures]),
            symptoms: Object.freeze([...meta.symptoms]),
          })
        : null,
    });
  })
);

const normalise = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SPEC_BY_KEY = new Map();
const SPEC_BY_CODE = new Map();
for (const specialty of SPECIALTIES) {
  SPEC_BY_CODE.set(specialty.code.toLowerCase(), specialty);
  SPEC_BY_KEY.set(specialty.code.toLowerCase(), specialty);
  SPEC_BY_KEY.set(normalise(specialty.code), specialty);
  SPEC_BY_KEY.set(normalise(specialty.name), specialty);
  for (const alias of specialty.aliases) {
    const key = normalise(alias);
    if (key && !SPEC_BY_KEY.has(key)) SPEC_BY_KEY.set(key, specialty);
  }
}

// Legacy duplicate codes resolve straight to their canonical entry so filters
// and doctor data authored before de-dup keep working.
const SPEC_ALIAS_BY_KEY = new Map();
for (const [legacy, canonical] of Object.entries(SPEC_CODE_ALIASES)) {
  SPEC_ALIAS_BY_KEY.set(legacy.toLowerCase(), canonical);
  const canonicalEntry = SPEC_BY_CODE.get(canonical.toLowerCase());
  if (canonicalEntry) {
    SPEC_BY_KEY.set(legacy.toLowerCase(), canonicalEntry);
    SPEC_BY_KEY.set(normalise(legacy), canonicalEntry);
  }
}

export function resolveSpecialty(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const asCode = raw.toLowerCase();
  return SPEC_BY_KEY.get(asCode) || SPEC_BY_KEY.get(normalise(raw)) || null;
}

export const resolveSpecialtyCode = (value) => resolveSpecialty(value)?.code || null;

// Remaps one stored sub-specialty code to its canonical code (legacy dup
// codes + prefix variants). Unknown codes pass through untouched.
const SPEC_CODE_ALIAS_BY_LOWER = new Map(
  Object.entries(SPEC_CODE_ALIASES).map(([legacy, canonical]) => [legacy.toLowerCase(), canonical])
);

export function remapSubSpecialtyCode(code) {
  const raw = String(code ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  const canonical = SPEC_CODE_ALIAS_BY_LOWER.get(lower) || SPEC_CODE_ALIAS_BY_LOWER.get(normalise(raw));
  if (canonical) return canonical;
  const byLower = SPEC_BY_CODE.get(lower);
  if (byLower) return byLower.code;
  if (/^SPEC\.[A-Z0-9_.]+$/.test(raw.toUpperCase())) {
    const byNormalise = SPEC_BY_CODE.get(normalise(raw));
    if (byNormalise) return byNormalise.code;
  }
  return raw;
}

export function remapSubSpecialtyCodes(codes) {
  if (!Array.isArray(codes)) return [];
  const seen = new Set();
  const out = [];
  for (const code of codes) {
    const mapped = remapSubSpecialtyCode(code);
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      out.push(mapped);
    }
  }
  return out;
}

const TOP_LEVEL_SPEC_RE = /^SPEC\.[A-Z0-9]+$/;

export function isTopLevelSpecialty(specialty) {
  return TOP_LEVEL_SPEC_RE.test(specialty?.code || '');
}

// §5 drill-down: children = own-code subs + cross-listed entries (alsoUnder),
// including sibling top-level tiles (Neonatology under Paediatrics).
export function buildSpecialtyTree() {
  const tops = SPECIALTIES.filter(isTopLevelSpecialty);
  const subs = SPECIALTIES.filter((s) => !isTopLevelSpecialty(s));
  return tops.map((top) => {
    const prefix = `${top.code}.`;
    const children = subs
      .filter((sub) => sub.code.startsWith(prefix) || (sub.alsoUnder || []).includes(top.code));
    const siblingTops = tops
      .filter((other) => other.code !== top.code && (other.alsoUnder || []).includes(top.code));
    const merged = [...children, ...siblingTops]
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => Object.freeze({ ...c }));
    return { ...top, children: Object.freeze(merged) };
  });
}

// §2 "Browse all": 13 groups of tiles (top-level specialties), each tile
// carrying its merged children (§5 chips preview).
export function buildSpecialtyGroups() {
  const tree = new Map(buildSpecialtyTree().map((t) => [t.code, t.children]));
  const groups = SPECIALTY_GROUPS.map((g) => ({ ...g, tiles: [] }));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const tops = SPECIALTIES.filter(isTopLevelSpecialty);
  for (const top of tops) {
    const group = groupById.get(top.meta?.group) || groupById.get('primary-emergency');
    group.tiles.push({ ...top, children: tree.get(top.code) || [] });
  }
  return groups.map((g) => ({ ...g, tiles: Object.freeze(g.tiles) }));
}

const REGEX_META = /[.*+?^${}()|[\]\\]/g;

export function specialtyPattern(value) {
  const hit = resolveSpecialty(value);
  if (!hit) return null;
  const terms = [hit.name, ...hit.aliases].map((term) => term.replace(REGEX_META, '\\$&'));
  return new RegExp(`(?<![A-Za-z])(?:${terms.join('|')})(?![A-Za-z])`, 'i');
}

export function specialtyCondition(value) {
  if (!capSearch(value)) return null;
  const code = resolveSpecialtyCode(value);
  const pattern = specialtyPattern(value) || new RegExp(escapeRegex(capSearch(value)), 'i');
  if (code) return { $or: [{ specialtyCode: code }, { specialization: pattern }] };
  return { specialization: pattern };
}

export const isValidCategoryCode = (code) => typeof code === 'string' && CATEGORY_CODE_RE.test(code) && code.length <= 64;

export function deriveCategoryCode(type, name) {
  const prefix = String(type ?? '').toUpperCase().replace(/[^A-Z]/g, '') || 'ITEM';
  const slug = String(name ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
  return `${prefix}.${slug || 'ITEM'}`;
}

// ─── Reference Lists (§26) ──────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = Object.freeze([
  'Hindi', 'English', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati',
  'Punjabi', 'Urdu', 'Kannada', 'Malayalam', 'Odia', 'Assamese', 'Bhojpuri',
  'Rajasthani', 'Maithili', 'Konkani', 'Kashmiri', 'Sindhi', 'Nepali',
  'Bundeli', 'Malvi', 'Chhattisgarhi', 'Sanskrit', 'Indian Sign Language',
]);

export const CONSULTATION_MODES = Object.freeze([
  'in_person', 'video', 'audio', 'chat', 'home_visit',
]);

export const ACCESSIBILITY_AMENITIES = Object.freeze([
  'wheelchair_access', 'ramp_lift', 'braille_audio', 'sign_language_support',
  'large_font_ui', 'voice_navigation',
]);

export const VERIFICATION_BADGES = Object.freeze([
  'licence_verified', 'registration_verified', 'nabh_nabl', 'background_checked',
  'police_verified', 'doctor_reviewed_content',
]);
