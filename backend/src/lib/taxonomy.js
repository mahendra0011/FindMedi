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
  { code: 'SPEC.VASC', name: 'Vascular Surgery', aliases: ['Vascular', 'Angio Surgery'] },
  { code: 'SPEC.ORTHO', name: 'Orthopaedics', aliases: ['Orthopedics', 'Ortho', 'Orthopaedic Surgery', 'Bone & Joint'] },
  { code: 'SPEC.OBGY', name: 'Obstetrics & Gynaecology', aliases: ['Gynaecology', 'Gynecology', 'Obstetrics', 'Obs & Gynae', 'OB/GYN', 'Gynecologist', 'Gynaecologist'] },
  { code: 'SPEC.PAED', name: 'Paediatrics', aliases: ['Pediatrics', 'Child Specialist', 'Paediatrician', 'Pediatrician'] },
  { code: 'SPEC.PAEDSURG', name: 'Paediatric Surgery', aliases: ['Pediatric Surgery', 'Pediatric Surgeon'] },
  { code: 'SPEC.NEONATO', name: 'Neonatology', aliases: ['Neonatal', 'Newborn Care'] },
  { code: 'SPEC.DERM', name: 'Dermatology', aliases: ['Dermatologist', 'Skin Specialist', 'Dermato Venereology'] },
  { code: 'SPEC.ENT', name: 'ENT', aliases: ['Otorhinolaryngology', 'Ear Nose Throat', 'ENT Specialist'] },
  { code: 'SPEC.OPHTH', name: 'Ophthalmology', aliases: ['Ophthalmologist', 'Eye Specialist'] },
  { code: 'SPEC.DENTAL', name: 'Dental & Oral Medicine', aliases: ['Dentistry', 'Dentist', 'Dental', 'Oral Medicine'] },
  { code: 'SPEC.NEURO', name: 'Neurology', aliases: ['Neurologist'] },
  { code: 'SPEC.NEUROSURG', name: 'Neurosurgery', aliases: ['Neuro Surgeon'] },
  { code: 'SPEC.PSYCH', name: 'Psychiatry', aliases: ['Psychiatrist', 'Mental Health'] },
  { code: 'SPEC.GASTRO', name: 'Gastroenterology', aliases: ['Gastroenterologist', 'Gastro', 'GI'] },
  { code: 'SPEC.HEPAT', name: 'Hepatology', aliases: ['Liver Specialist'] },
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
  { code: 'SPEC.SPORTS', name: 'Sports Medicine', aliases: ['Sports Injury'] },
  { code: 'SPEC.SEXO', name: 'Sexology & Andrology', aliases: ['Sexology', 'Andrology', 'Sex Medicine'] },
  { code: 'SPEC.INFERT', name: 'Infertility', aliases: ['Fertility', 'IVF'] },
  { code: 'SPEC.NUCMED', name: 'Nuclear Medicine', aliases: ['Nuclear Medicine Specialist'] },
  { code: 'SPEC.PMR', name: 'Physical Medicine & Rehabilitation', aliases: ['Physical Medicine', 'PMR', 'Rehabilitation'] },
  { code: 'SPEC.OCCMED', name: 'Occupational Medicine', aliases: ['Occupational Health', 'Occ Med'] },
  { code: 'SPEC.PALLI', name: 'Palliative Medicine', aliases: ['Palliative Care'] },
  { code: 'SPEC.SLEEP', name: 'Sleep Medicine', aliases: ['Sleep Study', 'Sleep Disorder'] },
  { code: 'SPEC.ALLERGY', name: 'Allergy & Immunology', aliases: ['Allergy', 'Immunology', 'Immunology & Allergy'] },
  { code: 'SPEC.INFECT', name: 'Infectious Disease', aliases: ['Infectious Diseases', 'Infection Specialist'] },
  { code: 'SPEC.GENETICS', name: 'Clinical Genetics', aliases: ['Genetics', 'Genetic Counselling'] },

  // Canonical sub-specialties (pruned catalogue SPEC.*)
  { code: 'SPEC.CARDIO.INTERVENTIONAL', name: 'Interventional Cardiology', aliases: ['Interventional Cardiologist', 'Coronary Angioplasty', 'Angioplasty Specialist'] },
  { code: 'SPEC.CARDIO.EP', name: 'Electrophysiology', aliases: ['Cardiac Electrophysiology', 'Arrhythmia Specialist', 'Pacemaker Specialist'] },
  { code: 'SPEC.CARDIO.PAED', name: 'Paediatric Cardiology', aliases: ['Pediatric Cardiology', 'Pediatric Cardiologist', 'Child Heart Specialist'] },
  { code: 'SPEC.CARDIO.HEART_FAILURE', name: 'Heart Failure & Transplant', aliases: ['Heart Failure Specialist'] },
  { code: 'SPEC.CTVS.CARDIAC', name: 'Adult Cardiac Surgery', aliases: ['Bypass Surgery', 'Open Heart Surgery'] },
  { code: 'SPEC.CTVS.THORACIC', name: 'Thoracic Surgery', aliases: ['Chest Surgery', 'Lung Surgery'] },
  { code: 'SPEC.CTVS.VASCULAR', name: 'Vascular & Endovascular Surgery', aliases: ['Endovascular Surgery', 'Vein Specialist'] },
  { code: 'SPEC.ORTHO.JOINT', name: 'Joint Replacement', aliases: ['Knee Replacement', 'Hip Replacement', 'Arthroplasty'] },
  { code: 'SPEC.ORTHO.SPORTS', name: 'Sports Medicine & Arthroscopy', aliases: ['Sports Arthroscopy', 'Ligament Surgery', 'ACL Specialist'] },
  { code: 'SPEC.ORTHO.SPINE', name: 'Spine Surgery', aliases: ['Spine Specialist', 'Back Pain Surgery'] },
  { code: 'SPEC.ORTHO.TRAUMA', name: 'Orthopaedic Trauma', aliases: ['Fracture Specialist', 'Bone Trauma'] },
  { code: 'SPEC.ORTHO.PAED', name: 'Paediatric Orthopaedics', aliases: ['Pediatric Orthopedics', 'Child Bone Specialist'] },
  { code: 'SPEC.OBGY.HIGH_RISK', name: 'High-Risk Obstetrics & Maternal Fetal Medicine', aliases: ['High Risk Pregnancy', 'Fetal Medicine'] },
  { code: 'SPEC.OBGY.INFERT_IVF', name: 'Infertility & Reproductive Medicine', aliases: ['IVF Specialist', 'Fertility Specialist'] },
  { code: 'SPEC.OBGY.LAPAROSCOPY', name: 'Gynaecological Laparoscopy & Endoscopy', aliases: ['Gynae Laparoscopic Surgeon'] },
  { code: 'SPEC.OBGY.ONCO', name: 'Gynaecological Oncology', aliases: ['Gynae Onco', 'Cervical Cancer Specialist'] },
  { code: 'SPEC.PAED.NEONATO', name: 'Neonatology & Newborn Care', aliases: ['Neonatal Intensive Care', 'NICU Specialist'] },
  { code: 'SPEC.PAED.CARDIOLOGY', name: 'Paediatric Cardiology Specialist', aliases: ['Child Heart Disease'] },
  { code: 'SPEC.PAED.SURGERY', name: 'Paediatric Surgery Specialist', aliases: ['Pediatric Surgeon Care'] },
  { code: 'SPEC.DERM.COSMETIC', name: 'Cosmetic Dermatology & Aesthetics', aliases: ['Aesthetic Dermatologist', 'Laser Skin Specialist'] },
  { code: 'SPEC.DERM.TRICHOLOGY', name: 'Trichology & Hair Transplant', aliases: ['Hair Specialist', 'Hair Transplant Surgeon'] },
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
  { code: 'SPEC.GASTRO.HEPATOLOGY', name: 'Hepatology & Liver Medicine', aliases: ['Hepatologist Specialist', 'Liver Disease'] },
  { code: 'SPEC.GASTRO.ENDOSCOPY', name: 'Therapeutic GI Endoscopy', aliases: ['Endoscopy Specialist', 'ERCP Specialist'] },
  { code: 'SPEC.GASTRO.IBD', name: 'Inflammatory Bowel Disease (IBD)', aliases: ['Crohns Colitis Specialist'] },
  { code: 'SPEC.PULMO.CRITICAL_CARE', name: 'Pulmonary Critical Care', aliases: ['ICU Pulmonologist'] },
  { code: 'SPEC.PULMO.SLEEP', name: 'Sleep Pulmonology', aliases: ['Sleep Apnea Specialist'] },
  { code: 'SPEC.PULMO.ASTHMA', name: 'Asthma & Allergy Respiratory', aliases: ['Chest Allergy Specialist'] },
  { code: 'SPEC.ENDO.DIABETES', name: 'Diabetology & Metabolic Disorders', aliases: ['Advanced Diabetes Specialist'] },
  { code: 'SPEC.ENDO.THYROID', name: 'Thyroid Disorders & Endocrine Oncology', aliases: ['Thyroid Specialist'] },
  { code: 'SPEC.ENDO.OBESITY', name: 'Obesity & Metabolic Medicine', aliases: ['Weight Management Specialist'] },
  { code: 'SPEC.NEPHRO.DIALYSIS', name: 'Clinical Nephrology & Dialysis', aliases: ['Dialysis Specialist'] },
  { code: 'SPEC.NEPHRO.TRANSPLANT', name: 'Kidney Transplant Medicine', aliases: ['Renal Transplant Specialist'] },
  { code: 'SPEC.URO.ANDROLOGY', name: 'Andrology & Men\'s Health', aliases: ['Male Fertility Specialist', 'Andrologist Specialist'] },
  { code: 'SPEC.URO.LITHOTRIPSY', name: 'Endourology & Lithotripsy (Stone Surgery)', aliases: ['Kidney Stone Specialist', 'Lithotripsy Specialist'] },
  { code: 'SPEC.URO.SEXUAL_HEALTH', name: 'Urological Sexual Medicine', aliases: ['Men Sexual Health Specialist'] },
  { code: 'SPEC.ONCO.MEDICAL', name: 'Medical Oncology & Chemotherapy', aliases: ['Chemotherapy Specialist', 'Medical Oncologist Specialist'] },
  { code: 'SPEC.ONCO.SURGICAL', name: 'Surgical Oncology', aliases: ['Cancer Surgeon', 'Surgical Oncologist Specialist'] },
  { code: 'SPEC.ONCO.RADIATION', name: 'Radiation Oncology', aliases: ['Radiotherapy Specialist', 'Radiation Oncologist Specialist'] },
  { code: 'SPEC.HAEM.BMT', name: 'Bone Marrow Transplant & Stem Cell', aliases: ['BMT Specialist', 'Stem Cell Transplant'] },
  { code: 'SPEC.HAEM.CLINICAL', name: 'Clinical Haematology & Bleeding Disorders', aliases: ['Thalassemia Specialist', 'Coagulation Specialist'] },
  { code: 'SPEC.GENSURG.LAPAROSCOPIC', name: 'Minimal Access & Laparoscopic Surgery', aliases: ['Laparoscopic Surgeon Specialist'] },
  { code: 'SPEC.GENSURG.BARIATRIC', name: 'Bariatric & Metabolic Surgery', aliases: ['Weight Loss Surgeon', 'Bariatric Surgeon'] },
  { code: 'SPEC.GENSURG.COLORECTAL', name: 'Colorectal Surgery & Proctology', aliases: ['Proctologist', 'Piles Fissure Surgeon'] },
  { code: 'SPEC.PLASTSURG.COSMETIC', name: 'Aesthetic & Cosmetic Surgery', aliases: ['Cosmetic Surgeon', 'Rhinoplasty Specialist'] },
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
  // Paediatric Surgery
  { code: 'SPEC.PSURG.NEONATAL', name: 'Neonatal Surgery', aliases: ['Newborn Surgery'] },
  { code: 'SPEC.PSURG.UROLOGY', name: 'Paediatric Urologic Surgery', aliases: ['Child Urinary Surgery'] },
  { code: 'SPEC.PSURG.ONCOLOGY', name: 'Paediatric Surgical Oncology', aliases: ['Child Cancer Surgery'] },
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
  { code: 'SPEC.DENTAL.COSMETIC', name: 'Cosmetic Dentistry', aliases: ['Smile Design', 'Teeth Aesthetics'] },
  // Psychiatry
  { code: 'SPEC.PSYCH.NEUROPSYCH', name: 'Neuropsychiatry', aliases: ['Brain Behaviour Specialist'] },
  { code: 'SPEC.PSYCH.PERINATAL', name: 'Perinatal Psychiatry', aliases: ['Postpartum Depression Specialist'] },
  { code: 'SPEC.PSYCH.SLEEP', name: 'Sleep Psychiatry', aliases: ['Insomnia Psychiatry'] },
  // Gastroenterology
  { code: 'SPEC.GASTRO.PAED', name: 'Paediatric Gastroenterology', aliases: ['Child Digestive Specialist'] },
  { code: 'SPEC.GASTRO.SURGERY', name: 'Gastrointestinal Surgery', aliases: ['GI Surgeon', 'Hepatobiliary Surgery'] },
  { code: 'SPEC.GASTRO.BARIATRIC', name: 'Bariatric & Metabolic Medicine', aliases: ['Obesity Medicine'] },
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
];

export const SPECIALTIES = Object.freeze(SPECIALTIES_LIST.map((s) => Object.freeze({ ...s, aliases: Object.freeze([...s.aliases]) })));

const normalise = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SPEC_BY_KEY = new Map();
for (const specialty of SPECIALTIES) {
  SPEC_BY_KEY.set(specialty.code.toLowerCase(), specialty);
  SPEC_BY_KEY.set(normalise(specialty.code), specialty);
  SPEC_BY_KEY.set(normalise(specialty.name), specialty);
  for (const alias of specialty.aliases) SPEC_BY_KEY.set(normalise(alias), specialty);
}

export function resolveSpecialty(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return SPEC_BY_KEY.get(raw.toLowerCase()) || SPEC_BY_KEY.get(normalise(raw)) || null;
}

export const resolveSpecialtyCode = (value) => resolveSpecialty(value)?.code || null;

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
