/**
 * Practitioner Section Registry (File 04 Spec)
 *
 * Configures which sections are rendered for each practitioner role type.
 * Adapts modularly from medical doctors to yoga trainers and lawyers.
 * Unknown or empty sections automatically hide.
 */

export type PractitionerSectionKey =
  | 'header'
  | 'quick_facts'
  | 'about'
  | 'services_fees'
  | 'education_experience'
  | 'locations'
  | 'availability'
  | 'type_specific'
  | 'reviews'
  | 'faq'
  | 'related'
  | 'disclaimer';

export const PRACTITIONER_SECTIONS_BY_ROLE: Record<string, PractitionerSectionKey[]> = {
  doctor: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'locations',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  dentist: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'locations',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  ayush: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'locations',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  physiotherapist: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'locations',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  dietitian: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  counsellor: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  psychologist: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  psychiatrist: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'locations',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  speech_occupational: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  nurse: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  attendant: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  phlebotomist: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  yoga_teacher: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  trainer: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  lawyer: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  tpa_executive: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'availability',
    'faq',
    'disclaimer',
  ],
  optometrist_audiologist: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'locations',
    'education_experience',
    'availability',
    'reviews',
    'faq',
    'related',
    'disclaimer',
  ],
  event_host: [
    'header',
    'quick_facts',
    'about',
    'type_specific',
    'services_fees',
    'availability',
    'faq',
    'disclaimer',
  ],
};

const DEFAULT_SECTIONS: PractitionerSectionKey[] = [
  'header',
  'quick_facts',
  'about',
  'services_fees',
  'education_experience',
  'locations',
  'availability',
  'reviews',
  'faq',
  'related',
  'disclaimer',
];

/**
 * Normalizes role string to canonical key
 */
export function normalizePractitionerRole(role?: string): string {
  if (!role) return 'doctor';
  const r = role.toLowerCase().trim().replace(/[-\s]/g, '_');
  if (r.includes('dentist')) return 'dentist';
  if (r.includes('ayush') || r.includes('ayurved') || r.includes('homeopath')) return 'ayush';
  if (r.includes('physio')) return 'physiotherapist';
  if (r.includes('diet') || r.includes('nutri')) return 'dietitian';
  if (r.includes('psychiatri')) return 'psychiatrist';
  if (r.includes('psycholog')) return 'psychologist';
  if (r.includes('counsel') || r.includes('therapy')) return 'counsellor';
  if (r.includes('nurse')) return 'nurse';
  if (r.includes('assistant') || r.includes('caregiver') || r.includes('attendant')) return 'attendant';
  if (r.includes('phlebo') || r.includes('technician') || r.includes('lab_tech')) return 'phlebotomist';
  if (r.includes('optomet') || r.includes('audiolog')) return 'optometrist_audiologist';
  if (r.includes('yoga')) return 'yoga_teacher';
  if (r.includes('trainer') || r.includes('coach') || r.includes('fitness')) return 'trainer';
  if (r.includes('lawyer') || r.includes('advocate') || r.includes('legal')) return 'lawyer';
  if (r.includes('tpa') || r.includes('cashless') || r.includes('insurance')) return 'tpa_executive';
  if (r.includes('speech') || r.includes('occupational')) return 'speech_occupational';
  if (r.includes('doctor') || r.includes('surgeon') || r.includes('physician')) return 'doctor';
  return r;
}

/**
 * Returns sections to render for a practitioner role
 */
export function getSectionsForPractitionerRole(role?: string): PractitionerSectionKey[] {
  const normalized = normalizePractitionerRole(role);
  return PRACTITIONER_SECTIONS_BY_ROLE[normalized] || DEFAULT_SECTIONS;
}
