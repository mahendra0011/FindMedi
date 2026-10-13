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
