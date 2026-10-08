/** Section registry per rolesmd/4.md §3.
 *  Each type picks its sections; unknown/empty sections auto-hide in FacilityDetailLayout.
 *  Sections are fed by the public DTO only (never licence numbers, owner phone/email).
 */

export type SectionKey =
  | 'hero'
  | 'actionbar'
  | 'overview'
  | 'departments'
  | 'doctors'
  | 'dentists'
  | 'practitioners'
  | 'trainers'
  | 'emergency'
  | 'beds'
  | 'services'
  | 'services_prices'
  | 'facilities'
  | 'plans'
  | 'timetable'
  | 'crowd'
  | 'packages'
  | 'pricing'
  | 'insurance'
  | 'amenities'
  | 'accreditations'
  | 'reviews'
  | 'gallery'
  | 'gallery_consented'
  | 'infection_control'
  | 'timings'
  | 'location'
  | 'faq'
  | 'policies'
  | 'similar'
  | 'report'
  | 'claim'
  | 'free_services'
  | 'medicines'
  | 'contacts'
  | 'schemes'
  | 'source_note'
  | 'banner'
  | 'details'
  | 'organiser'
  | 'agenda'
  | 'speakers'
  | 'eligibility'
  | 'seats'
  | 'consent'
  | 'after_report';

export type FacilityTypeKey =
  | 'hospital'
  | 'clinic'
  | 'diagnostic'
  | 'pharmacy'
  | 'dental'
  | 'eye'
  | 'ayush'
  | 'gym'
  | 'yoga'
  | 'wellness'
  | 'equipment'
  | 'govt'
  | 'event'
  | 'bloodbank'
  | 'ambulance';

export const sectionsByType: Record<FacilityTypeKey, SectionKey[]> = {
  hospital: ['hero', 'actionbar', 'overview', 'departments', 'doctors', 'emergency', 'beds', 'packages', 'insurance', 'amenities', 'accreditations', 'reviews', 'gallery', 'location', 'faq', 'policies', 'similar', 'report'],
  clinic: ['hero', 'actionbar', 'overview', 'doctors', 'services', 'pricing', 'insurance', 'timings', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  diagnostic: ['hero', 'actionbar', 'overview', 'services', 'pricing', 'packages', 'timings', 'accreditations', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  pharmacy: ['hero', 'actionbar', 'overview', 'services', 'pricing', 'timings', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  dental: ['hero', 'actionbar', 'overview', 'services_prices', 'dentists', 'gallery_consented', 'infection_control', 'insurance', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  eye: ['hero', 'actionbar', 'overview', 'services_prices', 'practitioners', 'packages', 'insurance', 'reviews', 'gallery', 'location', 'faq', 'policies', 'similar', 'report'],
  ayush: ['hero', 'actionbar', 'overview', 'services_prices', 'practitioners', 'pricing', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  gym: ['hero', 'actionbar', 'overview', 'facilities', 'plans', 'trainers', 'timetable', 'crowd', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  yoga: ['hero', 'actionbar', 'overview', 'services', 'trainers', 'timetable', 'plans', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  wellness: ['hero', 'actionbar', 'overview', 'services_prices', 'practitioners', 'plans', 'reviews', 'location', 'faq', 'policies', 'similar', 'report'],
  equipment: ['hero', 'actionbar', 'overview', 'services', 'pricing', 'policies', 'reviews', 'location', 'faq', 'similar', 'report'],
  govt: ['hero', 'overview', 'free_services', 'timings', 'medicines', 'contacts', 'schemes', 'location', 'source_note', 'claim', 'report'],
  event: ['banner', 'details', 'organiser', 'agenda', 'speakers', 'eligibility', 'seats', 'consent', 'location', 'after_report', 'report'],
  bloodbank: ['hero', 'actionbar', 'overview', 'details', 'contacts', 'timings', 'location', 'faq', 'report'],
  ambulance: ['hero', 'actionbar', 'overview', 'services_prices', 'contacts', 'location', 'faq', 'report'],
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Overview',
  actionbar: 'Actions',
  overview: 'About',
  departments: 'Departments & Specialties',
  doctors: 'Doctors',
  dentists: 'Dentists',
  practitioners: 'Practitioners',
  trainers: 'Trainers',
  emergency: 'Emergency & Trauma',
  beds: 'Beds & Tariffs',
  services: 'Services',
  services_prices: 'Services & Prices',
  facilities: 'Facilities & Equipment',
  plans: 'Plans & Pricing',
  timetable: 'Batch Timetable',
  crowd: 'Peak Hours',
  packages: 'Health Packages',
  pricing: 'Pricing',
  insurance: 'Insurance & Schemes',
  amenities: 'Amenities',
  accreditations: 'Accreditations & Licences',
  reviews: 'Reviews',
  gallery: 'Photos',
  gallery_consented: 'Smile Gallery (consented)',
  infection_control: 'Sterilisation & Safety',
  timings: 'Timings',
  location: 'Location',
  faq: 'FAQs',
  policies: 'Policies',
  similar: 'Similar Nearby',
  report: 'Report / Claim',
  claim: 'Claim Listing',
  free_services: 'Free Services',
  medicines: 'Medicines Available',
  contacts: 'Contact',
  schemes: 'Government Schemes',
  source_note: 'Information Source',
  banner: 'Event',
  details: 'Details',
  organiser: 'Organiser',
  agenda: 'Agenda',
  speakers: 'Speakers',
  eligibility: 'Eligibility',
  seats: 'Seats & Registration',
  consent: 'Consent & Data Use',
  after_report: 'Outcome Report',
};
