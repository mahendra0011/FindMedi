// subcatogary.md Part B — Single frontend source for canonical specialties
// Mirrors backend/src/lib/taxonomy.js SPECIALTIES (44 canonical specialties)

export interface SpecialtyItem {
  code: string;
  name: string;
  aliases: readonly string[];
}

export const CANONICAL_SPECIALTIES: readonly SpecialtyItem[] = Object.freeze([
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
]);

export const SPECIALTY_NAMES: readonly string[] = Object.freeze(
  CANONICAL_SPECIALTIES.map((s) => s.name)
);

// Map of canonical code or name or alias to canonical SpecialtyItem
const normalise = (v: string) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const LOOKUP = new Map<string, SpecialtyItem>();
for (const s of CANONICAL_SPECIALTIES) {
  LOOKUP.set(s.code.toLowerCase(), s);
  LOOKUP.set(normalise(s.code), s);
  LOOKUP.set(normalise(s.name), s);
  for (const alias of s.aliases) {
    LOOKUP.set(normalise(alias), s);
  }
}

export function resolveSpecialty(value: string): SpecialtyItem | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return LOOKUP.get(raw.toLowerCase()) || LOOKUP.get(normalise(raw)) || null;
}

export function resolveSpecialtyCode(value: string): string | null {
  return resolveSpecialty(value)?.code || null;
}

export function resolveSpecialtyName(value: string): string {
  return resolveSpecialty(value)?.name || value;
}
