/**
 * File 22 P2-28: clinical code validation (LOINC/SNOMED/ICD-10). Curated
 * high-frequency sets — NOT the full releases (those are terminology-server
 * territory). Unknown codes are reported, never silently accepted, and
 * mappers fall back to text when validation fails.
 */
const LOINC = new Set([
  '4548-4', // HbA1c
  '6690-2', // WBC
  '789-8', // RBC
  '718-7', // Hemoglobin
  '777-3', // Platelets
  '6690-2', // Leukocytes
  '3094-0', // BUN
  '2160-0', // Creatinine
  '3097-3', // Urea nitrogen
  '2085-9', // HDL
  '2089-1', // LDL
  '2571-8', // Triglycerides
  '2345-7', // Glucose
  '6299-2', // Glucose fasting
  '1558-6', // Glucose post-prandial
  '5803-2', // ESR
  '1988-5', // CRP
  '2885-2', // Protein total
  '1751-7', // Albumin
  '1975-2', // Bilirubin total
  '6768-6', // Alkaline phosphatase
  '1742-6', // ALT
  '1920-8', // AST
  '6690-2', // placeholder guard (dupes ignored by Set)
  '58410-2', // Chest X-ray
  '24627-2', // CT head
  '30746-8', // ECG 12-lead
]);

const SNOMED = new Set([
  '38341003', // Hypertension
  '44054006', // Diabetes type 2
  '59621000', // Essential hypertension
  '46635009', // Diabetes type 1
  '195967001', // Asthma
  '13644009', // COPD
  '22298006', // MI
  '414545008', // Ischemic heart disease
  '73211009', // Diabetes mellitus
  '38341003', // dup guard
  '233604007', // Pneumonia
  '118234003', // TB
  '40733004', // Appendicitis
  '74400008', // Appendectomy
  '80146002', // Cholecystectomy
  '265714001', // Cataract extraction
  '387713003', // Paracetamol
  '764676008', // Amoxicillin
  '764006008', // Azithromycin
  '764682008', // Metformin
  '764683003', // Atorvastatin
]);

const ICD10 = new Set([
  'I10', 'I11', 'I20', 'I21', 'I25', 'I50', 'E10', 'E11', 'E78', 'J18', 'J44',
  'J45', 'A15', 'A16', 'K35', 'K80', 'K81', 'N18', 'N39', 'O80', 'O82', 'Z00',
  'Z01', 'Z11', 'Z13', 'Z30', 'Z34', 'Z71', 'R50', 'R51', 'R10', 'G43', 'M54',
]);

const SYSTEMS = {
  'http://loinc.org': LOINC,
  LOINC,
  'http://snomed.info/sct': SNOMED,
  SNOMED,
  'http://hl7.org/fhir/sid/icd-10': ICD10,
  ICD10,
};

export function validateCode(system, code) {
  const set = SYSTEMS[String(system || '')];
  if (!set) return { known: false, reason: 'unsupported-system' };
  return set.has(String(code || '')) ? { known: true } : { known: false, reason: 'unknown-code' };
}

export function codeStats() {
  return { loinc: LOINC.size, snomed: SNOMED.size, icd10: ICD10.size };
}
