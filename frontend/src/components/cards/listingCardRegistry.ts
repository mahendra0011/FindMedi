/**
 * Listing card registry (Spec 02).
 *
 * Every provider type in the catalogue (103 typeKeys) resolves to ONE card
 * component here, so a listing never falls back to an unstyled block and the
 * UI stays consistent across 25+ entity types. The map is exhaustive on
 * purpose: a type that is missing from it would silently render the generic
 * fallback, which is exactly the inconsistency the spec is written against.
 */

export type ListingCardVariant =
  // legacy entities that already own a card
  | 'hospital'
  | 'clinic'
  | 'diagnostic'
  | 'pharmacy'
  | 'doctor'
  | 'assistant'
  | 'lawyer'
  // the base-card system (components/cards)
  | 'dental'
  | 'eye'
  | 'ayush'
  | 'physio'
  | 'dietitian'
  | 'nurse'
  | 'yoga'
  | 'gym'
  | 'wellness'
  | 'equipment'
  | 'product'
  | 'medicine'
  | 'health_package'
  | 'program'
  | 'support_group'
  | 'content'
  | 'counsellor'
  | 'blood_bank'
  | 'ambulance'
  | 'govt'
  | 'dialysis'
  | 'ivf'
  | 'eldercare'
  | 'child_dev'
  | 'vaccination'
  | 'diet_kitchen'
  | 'corporate'
  | 'home_service'
  | 'allied_therapist'
  | 'specialty'
  | 'event'
  | 'default';

const VARIANT_BY_TYPE: Record<string, ListingCardVariant> = {
  // §1 facilities
  hospital: 'hospital',
  clinic: 'clinic',
  dental_clinic: 'dental',
  eye_hospital: 'eye',
  eye_clinic: 'eye',
  optical_shop: 'eye',
  diagnostic: 'diagnostic',
  imaging_centre: 'diagnostic',
  pathology_lab: 'diagnostic',
  collection_centre: 'diagnostic',
  mobile_diagnostic_van: 'diagnostic',
  cardiac_diagnostic_centre: 'diagnostic',
  genetic_molecular_lab: 'diagnostic',
  sleep_lab: 'specialty',
  ayush_clinic: 'ayush',
  acupuncture_clinic: 'ayush',
  dialysis_centre: 'dialysis',
  maternity_ivf: 'ivf',
  rehab_centre: 'child_dev',
  deaddiction_centre: 'child_dev',
  child_development_centre: 'child_dev',
  blood_bank: 'blood_bank',
  ambulance_operator: 'ambulance',
  patient_transport: 'ambulance',

  // §2 practitioners
  doctor: 'doctor',
  home_doctor: 'doctor',
  dentist: 'dental',
  physiotherapist: 'physio',
  physiotherapy_clinic: 'physio',
  home_physio: 'physio',
  dietitian: 'dietitian',
  home_nurse: 'nurse',
  counsellor: 'counsellor',
  psychologist: 'counsellor',
  psychiatrist: 'counsellor',
  ayush_practitioner: 'ayush',
  occupational_therapist: 'allied_therapist',
  speech_therapist: 'allied_therapist',
  audiologist: 'allied_therapist',
  optometrist: 'allied_therapist',
  phlebotomist: 'default',
  lab_technician: 'default',
  radiographer: 'default',
  sonographer: 'default',
  pharmacist: 'pharmacy',

  // §4 pharmacy
  pharmacy: 'pharmacy',
  hospital_pharmacy: 'pharmacy',
  jan_aushadhi_kendra: 'pharmacy',
  generic_medicine_store: 'pharmacy',
  '24x7_pharmacy': 'pharmacy',
  online_pharmacy: 'pharmacy',
  ayush_medicine_store: 'pharmacy',
  wholesale_pharmacy: 'pharmacy',

  // §8-11 rehab, child development, wellness, elder care
  yoga_studio: 'yoga',
  gym: 'gym',
  sports_academy: 'gym',
  personal_trainer: 'gym',
  wellness_centre: 'wellness',
  home_nursing_agency: 'home_service',
  assistant: 'assistant',
  elder_care_home: 'eldercare',
  hospice_palliative: 'eldercare',
  dementia_care_centre: 'eldercare',
  geriatric_day_care: 'eldercare',
  home_sample_collection: 'home_service',
  home_vaccination: 'home_service',
  home_icu: 'home_service',

  // §13-16 commerce
  equipment_rental: 'equipment',
  medical_device_seller: 'equipment',
  surgical_orthopaedic_store: 'equipment',
  hearing_aid_centre: 'equipment',
  prosthetics_orthotics_centre: 'equipment',
  fall_detection_provider: 'equipment',
  health_food_store: 'product',
  supplement_store: 'product',
  skincare_brand: 'product',
  baby_food_vendor: 'product',
  diet_kitchen: 'diet_kitchen',

  // §17-19 events, community, professional
  event_organizer: 'event',
  ngo: 'support_group',
  support_group_host: 'support_group',
  first_responder: 'default',
  school_health_program: 'program',
  institution_health_contract: 'program',
  training_provider: 'program',
  corporate_wellness_provider: 'corporate',
  lawyer: 'lawyer',
  insurance_tpa_desk: 'default',

  // transport
  delivery: 'default',
  rider: 'default',

  // specialty centres
  pain_clinic: 'specialty',
  cosmetic_surgery_centre: 'specialty',
  sexual_health_clinic: 'specialty',
  transplant_centre: 'specialty',
  transplant_unit: 'specialty',
  ent_centre: 'specialty',
  urology_centre: 'specialty',
  lactation_doula_centre: 'default',

  // §18 government facilities
  phc: 'govt',
  chc: 'govt',
  uphc: 'govt',
  sub_centre: 'govt',
  arogyya_mandir: 'govt',
};

/** Resolve the card variant for a provider typeKey (or a search vertical). */
export function variantForType(typeKey: string): ListingCardVariant {
  const raw = String(typeKey || '').toLowerCase().trim();
  if (!raw) return 'default';
  if (VARIANT_BY_TYPE[raw]) return VARIANT_BY_TYPE[raw];
  // tolerate the plural / alias spellings the directory uses
  const singular = raw.endsWith('s') ? raw.slice(0, -1) : raw;
  return VARIANT_BY_TYPE[singular] || 'default';
}

/**
 * Convert the public card contract (Spec 02 §5) into the item shape the card
 * components read. The card contract is deliberately flat; the cards expect a
 * slightly richer object, and this is the only place that knows how.
 */
export function toCardItem(card: any): any {
  if (!card) return card;
  const gallery: string[] = Array.isArray(card.gallery) ? card.gallery.filter(Boolean) : [];
  const imageUrl = card.imageUrl || gallery[0] || '';
  const priceFrom = card.priceFrom ?? null;

  // Key facts (2-4 chips, never more) are drawn from what the contract
  // actually carries: the category, the delivery modes, the language and the
  // accepted schemes. Nothing here is invented.
  const chips: string[] = Array.isArray(card.chips) ? [...card.chips] : [];
  if (!chips.length) {
    const label = card.category?.label ? String(card.category.label).replace(/_/g, ' ') : '';
    if (label) chips.push(label);
    (card.modes || []).slice(0, 2).forEach((mode: string) => chips.push(String(mode).replace(/_/g, ' ')));
    if (card.schemes?.length) chips.push(String(card.schemes[0]));
    if (card.languages?.length) chips.push(String(card.languages[0]));
    if ((card.amenities || []).length) chips.push(String(card.amenities[0]));
  }

  const trustBadges: string[] = Array.isArray(card.trustBadges) && card.trustBadges.length
    ? [...card.trustBadges]
    : (card.verified ? ['Verified'] : []);
  for (const accreditation of card.accreditations || []) {
    if (trustBadges.length >= 3) break;
    if (/nabh|nabl|iso|fssai|cdsco/i.test(accreditation)) trustBadges.push(String(accreditation));
  }

  return {
    ...card,
    _id: card.id || card._id,
    photos: gallery.length ? gallery : imageUrl ? [imageUrl] : [],
    photo: imageUrl,
    logo: imageUrl,
    imageUrl,
    subtitle: card.tagline || card.subtitle || '',
    overlayBadge: card.overlayBadge || (Array.isArray(card.badges) ? card.badges[0] : undefined),
    rating: card.ratingAvg ?? 0,
    ratingAvg: card.ratingAvg ?? 0,
    reviewsCount: card.ratingCount ?? 0,
    // cards that speak in "consult fee" read `fee`; the contract's cheapest
    // price is the same number.
    fee: priceFrom ?? undefined,
    consultFee: priceFrom ?? undefined,
    priceFrom: priceFrom ?? undefined,
    chips: chips.slice(0, 4),
    trustBadges: trustBadges.slice(0, 3),
    nextSlotAt: card.nextSlotAt || undefined,
    nextSlotLabel: card.nextSlotAt || undefined,
    isSponsored: !!card.isSponsored,
    verified: !!card.verified,
    // legacy cards read a city/address pair
    city: card.city || '',
    address: card.address || '',
  };
}
