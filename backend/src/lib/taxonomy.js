import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const CATEGORY_TYPES_LIST = [
  'test', 'medicine', 'department', 'service',
  'specialty', 'sub_specialty', 'facility_type', 'provider_type', 'imaging',
  'medicine_class', 'medicine_form', 'rx_schedule', 'product_line', 'diet',
  'condition', 'event_type', 'program', 'wellness', 'device', 'language',
  'accreditation', 'scheme', 'insurance_policy', 'legal_practice_area',
  'record_type', 'emergency_type',
];

export const CATEGORY_TYPES = Object.freeze(CATEGORY_TYPES_LIST);
export const CATEGORY_TIERS = Object.freeze(['T1', 'T2', 'T3']);

export const CATEGORY_CODE_RE = /^[A-Z]+(\.[A-Z0-9_]+)+$/;

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
