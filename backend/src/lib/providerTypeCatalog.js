// 2.md 1/4 - the config catalogue behind the "Join FindMedi" wizard.
//
// One row per provider type: steps, fields, the documents that type asks for,
// and the approval policy its onboarding must clear. Nothing here is code the
// app imports at runtime for behaviour - `routes/providerTypes.js` serves these
// rows to the wizard, `routes/join.js` validates against them, and
// `lib/applicationToProvider.js` flattens whatever they collect into a
// Provider row. The file exists so the catalogue is data that can be seeded,
// versioned and tested rather than a switch statement in a route.
//
// Conventions:
//   - typeKey is snake_case (enforced by createProviderTypeConfigSchema).
//   - Every step field key must resolve through the field registry below; the
//     builder throws otherwise, so a typo cannot ship a config the wizard
//     cannot render.
//   - Doc labels are human text per type (e.g. "Drug licence (Form 20/21)"),
//     keys stay inside DOCUMENT_TYPES so an audit log never becomes free text.
//   - approval.level is auto|single|dual (APPROVAL_LEVELS); 2.md 6's
//     "manual_kyc" wording maps to `dual` for T1 clinical (KYC reviewer +
//     clinical-compliance reviewer) and to `twoPerson` for high-risk types.

import { DOCUMENT_TYPES, APPROVAL_LEVELS } from './providerTypes.js';

// Docs that carry a validity period: the config marks them expiryRequired so
// join.js refuses an upload without a date, and the 60/30/7 reminder job has
// something to read (2.md 5).
const EXPIRING_DOCS = new Set([
  'drug_licence', 'nabh', 'nabl', 'aerb', 'pcpndt', 'bmw_authorization', 'fire_noc',
  'fssai', 'cdsco_licence', 'vehicle_rc', 'driver_licence', 'vehicle_insurance',
  'vehicle_permit', 'vehicle_fitness', 'medical_council_reg', 'dental_council_reg',
  'ayush_council_reg', 'nursing_council_reg', 'allied_health_reg', 'rci_reg',
  'bar_council_reg', 'blood_bank_licence', 'irdai_tpa_licence', 'police_verification',
  'art_act_registration', 'shop_establishment',
]);

const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'boolean', 'file', 'phone', 'email', 'geo', 'address'];

const field = (key, label, type, extra = {}) => ({ key, label, type, ...extra });

const LANGUAGE_OPTIONS = [
  'Hindi', 'English', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Punjabi', 'Odia', 'Assamese', 'Urdu', 'Sindhi', 'Konkani', 'Nepali',
];

const SERVICE_OPTIONS = [
  'Consultation', 'Follow-up', 'Procedure', 'Health check-up', 'Lab test', 'Sample collection',
  'Imaging', 'Physiotherapy session', 'Counselling session', 'Home visit', 'Video consult',
  'Vaccination', 'Dental procedure', 'Diet plan', 'Yoga class', 'Gym session', 'Personal training',
  'Massage / therapy', 'Rental', 'Delivery', 'Training / course', 'Camp / screening',
];

const SCHEME_OPTIONS = ['cash', 'card', 'upi', 'wallet', 'insurance', 'pmjay', 'cghs', 'esic', 'state_scheme'];

// Shared field registry. Type-specific fields are passed to the builder and
// merged over this, so a type can add `chairs` without every other type
// carrying it.
const F = {
  referral_code: field('referral_code', 'Referral code', 'text', { help: 'Optional. From someone who already uses FindMedi.' }),
  legal_name: field('legal_name', 'Legal name', 'text', { required: true }),
  display_name: field('display_name', 'Display name', 'text', { required: true, help: 'What patients see on your listing.' }),
  owner_name: field('owner_name', 'Owner / partner name', 'text', { required: true }),
  registration_type: field('registration_type', 'Registration type', 'select', {
    required: true,
    options: ['proprietorship', 'partnership', 'private_limited', 'trust', 'society', 'huf', 'llp', 'individual'],
  }),
  gstin: field('gstin', 'GSTIN', 'text', { help: 'Optional unless you are registered for GST.' }),
  pan: field('pan', 'PAN', 'text', { required: true, help: 'Format checked; matched against the payout account holder name.' }),

  address: field('address', 'Address', 'address', { required: true }),
  landmark: field('landmark', 'Landmark', 'text'),
  geo: field('geo', 'Map pin', 'geo', { required: true, help: 'Pin should match the address above.' }),

  practitioner_roster: field('practitioner_roster', 'Practitioners on team', 'textarea', { help: 'One per line: name, registration number. Each is verified separately.' }),
  registration_number: field('registration_number', 'Registration number', 'text', { required: true }),
  qualification: field('qualification', 'Qualifications', 'text', { required: true }),
  years_experience: field('years_experience', 'Years of experience', 'number'),
  languages: field('languages', 'Languages spoken', 'multiselect', { options: LANGUAGE_OPTIONS }),

  services: field('services', 'Services offered', 'multiselect', { required: true, options: SERVICE_OPTIONS }),
  base_fee: field('base_fee', 'Standard fee (INR)', 'number'),
  modes: field('modes', 'Service modes', 'multiselect', { options: ['in_person', 'home_visit', 'video', 'audio', 'chat', 'delivery'] }),
  schemes_accepted: field('schemes_accepted', 'Schemes / insurance accepted', 'multiselect', { options: SCHEME_OPTIONS }),

  product_lines: field('product_lines', 'Product lines', 'multiselect', { options: SERVICE_OPTIONS }),
  delivery_radius_km: field('delivery_radius_km', 'Delivery radius (km)', 'number'),
  dispatch_sla_hours: field('dispatch_sla_hours', 'Dispatch within (hours)', 'number'),

  event_types: field('event_types', 'Event types', 'multiselect', { options: ['camp', 'screening', 'workshop', 'webinar', 'training', 'blood_donation', 'vaccination_drive'] }),
  past_events_count: field('past_events_count', 'Events organised in the last year', 'number'),

  operating_area: field('operating_area', 'Operating area', 'text', { help: 'City / districts you cover.' }),
  available_days: field('available_days', 'Available days', 'multiselect', { options: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }),
  vehicle_type: field('vehicle_type', 'Vehicle type', 'select', { options: ['bike', 'auto', 'e_rickshaw', 'car', 'van', 'wheelchair_stretcher_van', 'ambulance_bls', 'ambulance_als', 'ambulance_nicu'] }),

  account_holder: field('account_holder', 'Account holder name', 'text', { required: true, help: 'Must match the PAN name.' }),
  bank_name: field('bank_name', 'Bank name', 'text', { required: true }),
  ifsc: field('ifsc', 'IFSC', 'text', { required: true }),
  account_number: field('account_number', 'Account number', 'text', { required: true }),
  upi: field('upi', 'UPI ID', 'text'),

  slots_per_day: field('slots_per_day', 'Slots per day', 'number'),
  max_per_slot: field('max_per_slot', 'Max bookings per slot', 'number'),
  advance_booking_days: field('advance_booking_days', 'Advance booking window (days)', 'number'),

  cancellation_policy_accepted: field('cancellation_policy_accepted', 'Cancellation & refund policy accepted', 'boolean', { required: true }),
  commission_accepted: field('commission_accepted', 'Commission terms accepted', 'boolean', { required: true }),
  data_processing_accepted: field('data_processing_accepted', 'Data processing agreement accepted', 'boolean', { required: true }),
  declaration: field('declaration', 'I confirm the information above is true and current', 'boolean', { required: true }),
};

// 2.md 3 - the common steps, by shape of the provider. A facility lists a
// team, a practitioner IS the team, a vendor ships goods, an organiser runs
// events, a transport provider covers an area.
const STEP_SETS = {
  facility: [
    { key: 'account', label: 'Account', fields: ['referral_code'] },
    { key: 'business', label: 'Business & identity', fields: ['legal_name', 'display_name', 'owner_name', 'registration_type', 'gstin', 'pan'] },
    { key: 'location', label: 'Location', fields: ['address', 'landmark', 'geo'] },
    { key: 'practitioners', label: 'Practitioners & staff', fields: ['practitioner_roster'] },
    { key: 'services', label: 'Services & pricing', fields: ['services', 'base_fee', 'modes', 'schemes_accepted'] },
    { key: 'documents', label: 'Documents', fields: [] },
    { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'bank_name', 'ifsc', 'account_number', 'upi'] },
    { key: 'availability', label: 'Availability & capacity', fields: ['slots_per_day', 'max_per_slot', 'advance_booking_days'] },
    { key: 'agreement', label: 'Policies & agreement', fields: ['cancellation_policy_accepted', 'commission_accepted', 'data_processing_accepted'] },
    { key: 'review', label: 'Review & submit', fields: ['declaration'] },
  ],
  practitioner: [
    { key: 'account', label: 'Account', fields: ['referral_code'] },
    { key: 'identity', label: 'Profile & registration', fields: ['display_name', 'owner_name', 'registration_number', 'qualification', 'years_experience', 'languages'] },
    { key: 'location', label: 'Practice location', fields: ['address', 'landmark', 'geo'] },
    { key: 'services', label: 'Services & fee', fields: ['services', 'base_fee', 'modes', 'schemes_accepted'] },
    { key: 'documents', label: 'Documents', fields: [] },
    { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'bank_name', 'ifsc', 'account_number', 'upi'] },
    { key: 'availability', label: 'Availability', fields: ['slots_per_day', 'max_per_slot', 'advance_booking_days'] },
    { key: 'agreement', label: 'Policies & agreement', fields: ['cancellation_policy_accepted', 'commission_accepted', 'data_processing_accepted'] },
    { key: 'review', label: 'Review & submit', fields: ['declaration'] },
  ],
  vendor: [
    { key: 'account', label: 'Account', fields: ['referral_code'] },
    { key: 'business', label: 'Business & identity', fields: ['legal_name', 'display_name', 'owner_name', 'registration_type', 'gstin', 'pan'] },
    { key: 'location', label: 'Location', fields: ['address', 'landmark', 'geo'] },
    { key: 'catalogue', label: 'Catalogue & pricing', fields: ['product_lines', 'base_fee', 'delivery_radius_km', 'dispatch_sla_hours'] },
    { key: 'documents', label: 'Documents', fields: [] },
    { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'bank_name', 'ifsc', 'account_number', 'upi'] },
    { key: 'agreement', label: 'Policies & agreement', fields: ['cancellation_policy_accepted', 'commission_accepted', 'data_processing_accepted'] },
    { key: 'review', label: 'Review & submit', fields: ['declaration'] },
  ],
  organizer: [
    { key: 'account', label: 'Account', fields: ['referral_code'] },
    { key: 'business', label: 'Organisation & identity', fields: ['legal_name', 'display_name', 'owner_name', 'registration_type', 'gstin', 'pan'] },
    { key: 'location', label: 'Base location', fields: ['address', 'landmark', 'geo'] },
    { key: 'events', label: 'Events & partners', fields: ['event_types', 'past_events_count'] },
    { key: 'documents', label: 'Documents', fields: [] },
    { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'bank_name', 'ifsc', 'account_number', 'upi'] },
    { key: 'agreement', label: 'Policies & agreement', fields: ['cancellation_policy_accepted', 'commission_accepted', 'data_processing_accepted'] },
    { key: 'review', label: 'Review & submit', fields: ['declaration'] },
  ],
  transport: [
    { key: 'account', label: 'Account', fields: ['referral_code'] },
    { key: 'identity', label: 'Driver & vehicle', fields: ['display_name', 'owner_name', 'vehicle_type', 'years_experience'] },
    { key: 'location', label: 'Coverage', fields: ['address', 'landmark', 'geo', 'operating_area'] },
    { key: 'availability', label: 'Availability', fields: ['available_days', 'slots_per_day', 'max_per_slot'] },
    { key: 'documents', label: 'Documents', fields: [] },
    { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'bank_name', 'ifsc', 'account_number', 'upi'] },
    { key: 'agreement', label: 'Policies & agreement', fields: ['cancellation_policy_accepted', 'commission_accepted', 'data_processing_accepted'] },
    { key: 'review', label: 'Review & submit', fields: ['declaration'] },
  ],
};

// 2.md 6 - approval policy presets.
const APPROVAL = {
  // T3 / low-risk: one reviewer, 24h target.
  single: { level: 'single', slaHours: 24, twoPerson: false },
  // T1 clinical: KYC reviewer + clinical-compliance reviewer (dual lane).
  clinical: { level: 'dual', slaHours: 48, twoPerson: false },
  // 2.md 6 high-risk (de-addiction, IVF, mental-health peer support, ambulance):
  // two DIFFERENT reviewers must both approve (8.md 2).
  highRisk: { level: 'dual', slaHours: 120, twoPerson: true },
};

const COMMISSION_BY_GROUP = {
  clinical: 10, wellness: 12, commerce: 15, home_service: 12,
  transport: 10, community: 5, professional: 10,
};

const build = ({
  typeKey, kind, group, tier = 'T3', label, icon = '', description = '',
  template, extraFields = [], extraStepFields = {}, requiredDocs = [], optionalDocs = [],
  approval = APPROVAL.single,
}) => {
  if (!STEP_SETS[template]) throw new Error(`${typeKey}: unknown template "${template}"`);
  if (!APPROVAL_LEVELS.includes(approval.level)) throw new Error(`${typeKey}: bad approval level`);

  const registry = { ...F };
  for (const def of extraFields) {
    if (registry[def.key]) throw new Error(`${typeKey}: field "${def.key}" redefines a shared field`);
    if (!FIELD_TYPES.includes(def.type)) throw new Error(`${typeKey}: field "${def.key}" has bad type`);
    registry[def.key] = def;
  }

  const steps = STEP_SETS[template].map((step) => ({
    ...step,
    fields: [...(step.fields ?? []), ...(extraStepFields[step.key] ?? [])],
  }));
  for (const stepKey of Object.keys(extraStepFields)) {
    if (!steps.some((step) => step.key === stepKey)) {
      throw new Error(`${typeKey}: extraStepFields targets unknown step "${stepKey}"`);
    }
  }

  const used = steps.flatMap((step) => step.fields);
  const duplicate = used.find((key, index) => used.indexOf(key) !== index);
  if (duplicate) throw new Error(`${typeKey}: field "${duplicate}" appears in more than one step`);

  const fields = used.map((key) => {
    const def = registry[key];
    if (!def) throw new Error(`${typeKey}: step references unknown field "${key}"`);
    return def;
  });

  const docKeys = [...requiredDocs, ...optionalDocs].map((doc) => doc.key);
  const duplicateDoc = docKeys.find((key, index) => docKeys.indexOf(key) !== index);
  if (duplicateDoc) throw new Error(`${typeKey}: document "${duplicateDoc}" listed twice`);
  if (requiredDocs.length > 30 || optionalDocs.length > 30) throw new Error(`${typeKey}: too many documents`);

  return {
    typeKey,
    kind,
    group,
    tier,
    label,
    icon,
    description,
    steps,
    fields,
    requiredDocs,
    optionalDocs,
    agreementTemplateId: `tmpl_${group}`,
    approvalPolicy: { level: 'single', slaHours: 24, twoPerson: false, ...approval },
    commissionDefaults: { percent: COMMISSION_BY_GROUP[group] ?? 10, fixed: 0, currency: 'INR' },
    version: 1,
    isActive: true,
  };
};

const rq = (key, label) => {
  if (!DOCUMENT_TYPES.includes(key)) throw new Error(`unknown document type "${key}"`);
  return { key, label, mandatory: true, expiryRequired: EXPIRING_DOCS.has(key), maxMb: 10 };
};
const opt = (key, label) => {
  if (!DOCUMENT_TYPES.includes(key)) throw new Error(`unknown document type "${key}"`);
  return { key, label, mandatory: false, expiryRequired: EXPIRING_DOCS.has(key), maxMb: 10 };
};

// 2.md 4.2 - every licensed practitioner owes a council registration, proof of
// qualification and a government ID before a listing can go live.
const licenseDocs = (councilKey, councilLabel) => [
  rq(councilKey, councilLabel),
  rq('degree', 'Degree / diploma'),
  rq('owner_id', 'Government photo ID'),
];

const CATALOG = [
  // ── 2.md 4.1 Healthcare facilities (T1) ─────────────────────────────────
  {
    typeKey: 'hospital', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Hospital', icon: 'Building2', template: 'facility',
    description: 'Multi-speciality hospital with inpatient beds, OT and emergency services.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'Clinical establishment registration'),
      rq('bmw_authorization', 'Biomedical waste (BMW) authorisation'),
      rq('fire_noc', 'Fire NOC'),
      rq('owner_id', 'Owner photo ID'),
    ],
    optionalDocs: [opt('nabh', 'NABH accreditation'), opt('drug_licence', 'In-house pharmacy drug licence')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('bed_general', 'General beds', 'number'),
      field('bed_icu', 'ICU beds', 'number'),
      field('bed_nicu', 'NICU beds', 'number'),
      field('ot_count', 'Operation theatres', 'number'),
      field('departments', 'Departments', 'multiselect', { options: ['cardiology', 'orthopaedics', 'neurology', 'oncology', 'paediatrics', 'obgyn', 'ent', 'ophthalmology', 'dermatology', 'psychiatry', 'emergency', 'icu'] }),
      field('emergency_24x7', '24x7 emergency', 'boolean'),
      field('ambulance_available', 'Own ambulance', 'boolean'),
      field('blood_bank_inhouse', 'In-house blood bank', 'boolean'),
      field('schemes_hospital', 'Accreditations', 'multiselect', { options: ['nabh', 'jci', 'iso', 'nabl'] }),
    ],
    extraStepFields: { services: ['bed_general', 'bed_icu', 'bed_nicu', 'ot_count', 'departments', 'emergency_24x7', 'ambulance_available', 'blood_bank_inhouse', 'schemes_hospital'] },
  },
  {
    typeKey: 'clinic', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Clinic', icon: 'Stethoscope', template: 'facility',
    description: 'Outpatient clinic with consulting doctors.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'Clinic registration'),
      rq('medical_council_reg', 'Lead doctor council registration'),
      rq('bmw_authorization', 'Biomedical waste (BMW) authorisation'),
    ],
    optionalDocs: [opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('clinic_type', 'Clinic type', 'select', { options: ['single_specialty', 'poly_clinic', 'specialty'] }),
      field('consult_fee', 'Consultation fee (INR)', 'number'),
    ],
    extraStepFields: { business: ['clinic_type'], services: ['consult_fee'] },
  },
  {
    typeKey: 'dental_clinic', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Dental Clinic', icon: 'Smile', template: 'facility',
    description: 'Dental clinic offering consultations, RCT, implants and orthodontics.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'Clinic registration'),
      rq('dental_council_reg', 'Dentist council registration (DCI / state)'),
      rq('aerb', 'AERB registration (if X-ray / OPG in-house)'),
      rq('bmw_authorization', 'Biomedical waste (BMW) authorisation'),
    ],
    optionalDocs: [opt('nabh', 'NABH accreditation'), opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('chairs', 'Dental chairs', 'number'),
      field('dental_services', 'Dental services', 'multiselect', { options: ['scaling', 'filling', 'root_canal', 'extraction', 'implants', 'orthodontics', 'whitening', 'dentures', 'opg'] }),
      field('opg_xray_inhouse', 'OPG / X-ray in-house', 'boolean'),
      field('sterilisation_protocol', 'Documented sterilisation protocol', 'boolean'),
    ],
    extraStepFields: { business: ['chairs'], services: ['dental_services', 'opg_xray_inhouse', 'sterilisation_protocol'] },
  },
  {
    typeKey: 'eye_hospital', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Eye Hospital / Optical', icon: 'Eye', template: 'facility',
    description: 'Eye care hospital or optical with cataract, LASIK and retina services.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'Clinic / establishment registration'),
      rq('medical_council_reg', 'Ophthalmologist council registration'),
      rq('shop_establishment', 'Optical shop licence'),
    ],
    optionalDocs: [opt('allied_health_reg', 'Optometrist registration'), opt('nabh', 'NABH accreditation'), opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('eye_services', 'Eye services', 'multiselect', { options: ['cataract', 'lasik', 'retina', 'glaucoma', 'squint', 'oculoplasty', 'low_vision', 'contact_lens'] }),
      field('optical_shop', 'Optical shop on premises', 'boolean'),
      field('contact_lens', 'Contact lens fitting', 'boolean'),
    ],
    extraStepFields: { business: ['optical_shop', 'contact_lens'], services: ['eye_services'] },
  },
  {
    typeKey: 'diagnostic', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Diagnostic Lab / Centre', icon: 'FlaskConical', template: 'facility',
    description: 'Pathology and diagnostics laboratory with sample testing.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'Laboratory registration'),
      rq('medical_council_reg', 'Pathologist council registration'),
      rq('bmw_authorization', 'Biomedical waste (BMW) authorisation'),
    ],
    optionalDocs: [opt('nabl', 'NABL accreditation'), opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('home_collection', 'Home sample collection', 'boolean'),
      field('home_collection_fee', 'Home collection fee (INR)', 'number'),
      field('home_collection_radius_km', 'Collection radius (km)', 'number'),
      field('tat_hours', 'Report TAT (hours)', 'number'),
      field('sample_types', 'Sample types handled', 'multiselect', { options: ['blood', 'urine', 'stool', 'swab', 'saliva', 'tissue', 'semen'] }),
    ],
    extraStepFields: { services: ['home_collection', 'home_collection_fee', 'home_collection_radius_km', 'tat_hours', 'sample_types'] },
  },
  {
    typeKey: 'imaging_centre', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Imaging Centre', icon: 'ScanLine', template: 'facility',
    description: 'Radiology and imaging centre (X-ray, USG, CT, MRI).',
    requiredDocs: [
      rq('aerb', 'AERB registration'),
      rq('pcpndt', 'PCPNDT registration (if ultrasound)'),
      rq('medical_council_reg', 'Radiologist council registration'),
    ],
    optionalDocs: [opt('nabl', 'NABL accreditation'), opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('modalities', 'Modalities', 'multiselect', { options: ['x_ray', 'ultrasound', 'ct', 'mri', 'mammography', 'dexa', 'fluoroscopy'] }),
      field('machine_list', 'Machine make / model', 'textarea'),
      field('radiologist_on_site', 'Radiologist on site', 'boolean'),
    ],
    extraStepFields: { services: ['modalities', 'machine_list', 'radiologist_on_site'] },
  },
  {
    typeKey: 'pharmacy', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Pharmacy', icon: 'Pill', template: 'facility',
    description: 'Retail, hospital or Jan Aushadhi pharmacy dispensing medicines.',
    requiredDocs: [
      rq('drug_licence', 'Drug licence (Form 20/21)'),
      rq('pharmacist_reg', 'Pharmacist registration'),
      rq('gst', 'GST registration'),
    ],
    optionalDocs: [opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('pharmacy_type', 'Pharmacy type', 'select', { options: ['retail', 'hospital', 'jan_aushadhi', '24x7'] }),
      field('cold_chain', 'Cold-chain storage available', 'boolean'),
      field('rx_handling', 'Prescription handling', 'select', { options: ['upload', 'whatsapp', 'in_store'] }),
    ],
    extraStepFields: { business: ['pharmacy_type'], services: ['cold_chain', 'rx_handling', 'delivery_radius_km'] },
  },
  {
    typeKey: 'ayush_clinic', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'AYUSH Clinic', icon: 'Leaf', template: 'facility',
    description: 'Ayurveda, Homeopathy, Unani, Siddha or Naturopathy clinic.',
    requiredDocs: [
      rq('ayush_council_reg', 'AYUSH council registration'),
      rq('clinical_establishment_reg', 'Clinic registration'),
    ],
    optionalDocs: [opt('drug_licence', 'Drug licence (if dispensing)'), opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('ayush_system', 'System of medicine', 'select', { options: ['ayurveda', 'homeopathy', 'unani', 'siddha', 'naturopathy', 'yoga'] }),
      field('panchakarma', 'Panchakarma facility', 'boolean'),
      field('inhouse_medicines', 'In-house medicines', 'boolean'),
    ],
    extraStepFields: { business: ['ayush_system'], services: ['panchakarma', 'inhouse_medicines'] },
  },
  {
    typeKey: 'dialysis_centre', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Dialysis Centre', icon: 'Droplets', template: 'facility',
    description: 'Haemodialysis unit with isolation and nephrologist oversight.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'Clinic / establishment registration'),
      rq('medical_council_reg', 'Nephrologist council registration'),
    ],
    optionalDocs: [opt('water_ro_report', 'Water RO test report'), opt('nabh', 'NABH accreditation')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('machine_count', 'Dialysis machines', 'number'),
      field('shifts_per_day', 'Shifts per day', 'number'),
      field('hbv_hcv_isolation', 'HBV / HCV isolation available', 'boolean'),
    ],
    extraStepFields: { services: ['machine_count', 'shifts_per_day', 'hbv_hcv_isolation'] },
  },
  {
    typeKey: 'maternity_ivf', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Maternity / IVF Centre', icon: 'Baby', template: 'facility',
    description: 'Maternity, IVF and ART services under the ART Act.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'Clinic / hospital registration'),
      rq('art_act_registration', 'ART Act registration (IVF)'),
      rq('medical_council_reg', 'Gynaecologist / obstetrician registration'),
    ],
    optionalDocs: [opt('nabh', 'NABH accreditation'), opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.highRisk, // 2.md 6: IVF is on the high-risk list.
    extraFields: [
      field('ivf_lab', 'IVF lab on premises', 'boolean'),
      field('delivery_rooms', 'Delivery rooms', 'number'),
      field('nicu_tieup', 'NICU tie-up', 'boolean'),
    ],
    extraStepFields: { services: ['ivf_lab', 'delivery_rooms', 'nicu_tieup'] },
  },
  {
    typeKey: 'rehab_centre', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Rehab / De-addiction Centre', icon: 'HeartHandshake', template: 'facility',
    description: 'Residential rehabilitation and de-addiction programme.',
    requiredDocs: [
      rq('clinical_establishment_reg', 'State registration (Mental Healthcare Act)'),
      rq('rci_reg', 'Psychiatrist / psychologist (RCI) registration'),
    ],
    optionalDocs: [opt('fire_noc', 'Fire NOC'), opt('nabh', 'NABH accreditation')],
    approval: APPROVAL.highRisk, // 2.md 6: de-addiction is on the high-risk list.
    extraFields: [
      field('residential_beds', 'Residential beds', 'number'),
      field('staff_ratio', 'Staff : resident ratio', 'text'),
      field('programs', 'Programmes offered', 'multiselect', { options: ['detox', 'counselling', 'family_therapy', 'aftercare', '12_step'] }),
    ],
    extraStepFields: { services: ['residential_beds', 'staff_ratio', 'programs'] },
  },
  {
    typeKey: 'blood_bank', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Blood Bank', icon: 'Droplet', template: 'facility',
    description: 'Blood collection, storage and component separation.',
    requiredDocs: [
      rq('blood_bank_licence', 'Blood bank licence'),
      rq('medical_council_reg', 'Medical officer registration'),
    ],
    optionalDocs: [opt('nabl', 'NABL accreditation'), opt('fire_noc', 'Fire NOC')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('components', 'Components stored', 'multiselect', { options: ['prbc', 'ffp', 'platelets', 'cryoprecipitate', 'whole_blood'] }),
      field('donor_registration', 'Voluntary donor registration', 'boolean'),
    ],
    extraStepFields: { services: ['components', 'donor_registration'] },
  },
  {
    typeKey: 'ambulance_operator', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Ambulance Operator', icon: 'Truck', template: 'facility',
    description: 'BLS / ALS / NICU ambulance fleet with trained crew.',
    requiredDocs: [
      rq('vehicle_rc', 'Vehicle RC (fleet)'),
      rq('vehicle_insurance', 'Vehicle insurance'),
      rq('vehicle_permit', 'Commercial permit'),
      rq('driver_licence', 'Driver licences'),
    ],
    optionalDocs: [opt('emt_cert', 'EMT certification (ALS)'), opt('police_verification', 'Crew police verification')],
    approval: APPROVAL.highRisk, // 2.md 6: ambulance is on the high-risk list.
    extraFields: [
      field('fleet_types', 'Fleet types', 'multiselect', { options: ['bls', 'als', 'nicu', 'mortuary'] }),
      field('gps_enabled', 'GPS tracking', 'boolean'),
      field('attendant_available', 'Paramedic / attendant on board', 'boolean'),
    ],
    extraStepFields: { services: ['fleet_types', 'gps_enabled', 'attendant_available'] },
  },

  // ── 2.md 4.2 Practitioners ──────────────────────────────────────────────
  {
    typeKey: 'doctor', kind: 'practitioner', group: 'clinical', tier: 'T1',
    label: 'Doctor', icon: 'Stethoscope', template: 'practitioner',
    description: 'MBBS and above, registered with a medical council.',
    requiredDocs: [...licenseDocs('medical_council_reg', 'Medical council registration (NMC / state)'), rq('photo', 'Profile photo')],
    optionalDocs: [opt('training_cert', 'Additional fellowship / training certificate')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('specialty', 'Specialty', 'text', { required: true }),
      field('sub_specialty', 'Sub-specialty', 'text'),
      field('council_state', 'Council & state of registration', 'text'),
      field('clinic_affiliations', 'Clinic / hospital affiliations', 'textarea'),
    ],
    extraStepFields: { identity: ['specialty', 'sub_specialty', 'council_state', 'clinic_affiliations'] },
  },
  {
    typeKey: 'dentist', kind: 'practitioner', group: 'clinical', tier: 'T1',
    label: 'Dentist', icon: 'Smile', template: 'practitioner',
    description: 'BDS / MDS dentist registered with DCI or a state dental council.',
    requiredDocs: licenseDocs('dental_council_reg', 'Dental council registration (DCI / state)'),
    optionalDocs: [opt('photo', 'Profile photo')],
    approval: APPROVAL.clinical,
    extraFields: [field('degree_level', 'Degree', 'select', { options: ['bds', 'mds'] })],
    extraStepFields: { identity: ['degree_level'] },
  },
  {
    typeKey: 'physiotherapist', kind: 'practitioner', group: 'clinical', tier: 'T2',
    label: 'Physiotherapist', icon: 'Activity', template: 'practitioner',
    description: 'Physiotherapist with allied-health registration, clinic or home visits.',
    requiredDocs: licenseDocs('allied_health_reg', 'Allied-health council registration'),
    optionalDocs: [opt('training_cert', 'Post-graduate certification')],
    approval: APPROVAL.single,
    extraFields: [
      field('focus', 'Focus areas', 'multiselect', { options: ['neuro', 'ortho', 'sports', 'paediatric', 'geriatric', 'cardio', 'respiratory'] }),
      field('home_visit_radius_km', 'Home visit radius (km)', 'number'),
      field('equipment', 'Equipment used', 'multiselect', { options: ['tens', 'ultrasound', 'ike', 'exercise_bands', 'gait_training', 'traction'] }),
    ],
    extraStepFields: { identity: ['focus', 'home_visit_radius_km', 'equipment'] },
  },
  {
    typeKey: 'dietitian', kind: 'practitioner', group: 'clinical', tier: 'T2',
    label: 'Dietitian / Nutritionist', icon: 'Apple', template: 'practitioner',
    description: 'Registered dietitian offering therapeutic nutrition plans.',
    requiredDocs: [rq('degree', 'Registered Dietitian (RD) degree / certification'), rq('owner_id', 'Government photo ID')],
    optionalDocs: [opt('training_cert', 'IDA membership certificate')],
    approval: APPROVAL.single,
    extraFields: [
      field('focus', 'Focus areas', 'multiselect', { options: ['diabetes', 'renal', 'weight', 'sports', 'paediatric', 'pcos', 'cardiac', 'oncology'] }),
      field('plans_offered', 'Plans offered', 'multiselect', { options: ['consult_only', 'monthly_plan', 'meal_plan', 'recipe_guide', 'follow_up'] }),
    ],
    extraStepFields: { identity: ['focus', 'plans_offered'] },
  },
  {
    typeKey: 'home_nurse', kind: 'practitioner', group: 'clinical', tier: 'T1',
    label: 'Nurse (Home)', icon: 'HeartPulse', template: 'practitioner',
    description: 'Registered nurse offering home care shifts.',
    requiredDocs: [
      rq('nursing_council_reg', 'Nursing council registration'),
      rq('police_verification', 'Police verification'),
      rq('owner_id', 'Government photo ID'),
    ],
    optionalDocs: [opt('degree', 'GNM / B.Sc nursing degree')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('skills', 'Skills', 'multiselect', { options: ['injection', 'iv', 'wound_care', 'catheter', 'icu_at_home', 'palliative', 'geriatric'] }),
      field('shift_types', 'Shift types', 'multiselect', { options: ['day', 'night', 'full_day', 'hourly', 'live_in'] }),
      field('rate_per_hour', 'Rate per hour (INR)', 'number'),
    ],
    extraStepFields: { identity: ['skills', 'shift_types', 'rate_per_hour'] },
  },
  {
    typeKey: 'counsellor', kind: 'practitioner', group: 'clinical', tier: 'T1',
    label: 'Counsellor / Psychologist', icon: 'Brain', template: 'practitioner',
    description: 'Counselling and psychological therapy, RCI-registered where clinical.',
    requiredDocs: [
      rq('degree', 'Psychology degree'),
      rq('rci_reg', 'RCI registration (clinical roles)'),
    ],
    optionalDocs: [opt('training_cert', 'Supervised practice proof')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('concerns', 'Concerns handled', 'multiselect', { options: ['anxiety', 'depression', 'relationship', 'child', 'grief', 'addiction', 'trauma', 'career'] }),
      field('modalities', 'Modalities', 'multiselect', { options: ['cbt', 'dbt', 'art', 'play', 'family', 'mindfulness'] }),
      field('response_time_hours', 'Response time (hours)', 'number'),
    ],
    extraStepFields: { identity: ['concerns', 'modalities', 'response_time_hours'] },
  },
  {
    typeKey: 'psychiatrist', kind: 'practitioner', group: 'clinical', tier: 'T1',
    label: 'Psychiatrist', icon: 'BrainCircuit', template: 'practitioner',
    description: 'MD Psychiatry, medical council registered.',
    requiredDocs: licenseDocs('medical_council_reg', 'Medical council registration (psychiatry)'),
    optionalDocs: [opt('rci_reg', 'RCI registration')],
    approval: APPROVAL.clinical,
    extraFields: [field('sub_specialty', 'Sub-specialty', 'text')],
    extraStepFields: { identity: ['sub_specialty'] },
  },
  {
    typeKey: 'ayush_practitioner', kind: 'practitioner', group: 'clinical', tier: 'T2',
    label: 'AYUSH Practitioner', icon: 'Leaf', template: 'practitioner',
    description: 'Individual Ayurveda / Homeopathy / Unani / Siddha practitioner.',
    requiredDocs: licenseDocs('ayush_council_reg', 'AYUSH council registration'),
    optionalDocs: [opt('photo', 'Profile photo')],
    approval: APPROVAL.single,
    extraFields: [field('ayush_system', 'System of medicine', 'select', { options: ['ayurveda', 'homeopathy', 'unani', 'siddha', 'naturopathy', 'yoga'] })],
    extraStepFields: { identity: ['ayush_system'] },
  },
  {
    typeKey: 'speech_therapist', kind: 'practitioner', group: 'clinical', tier: 'T2',
    label: 'Speech / Occupational Therapist', icon: 'MessageCircle', template: 'practitioner',
    description: 'Speech-language and occupational therapist, RCI registered.',
    requiredDocs: [
      rq('rci_reg', 'RCI registration'),
      rq('degree', 'Therapy degree / diploma'),
      rq('owner_id', 'Government photo ID'),
    ],
    optionalDocs: [opt('training_cert', 'Additional certification')],
    approval: APPROVAL.single,
    extraFields: [
      field('focus', 'Focus areas', 'multiselect', { options: ['speech', 'language', 'fluency', 'occupational', 'sensory', 'feeding'] }),
      field('age_group', 'Age group served', 'select', { options: ['paediatric', 'adult', 'both'] }),
    ],
    extraStepFields: { identity: ['focus', 'age_group'] },
  },
  {
    typeKey: 'phlebotomist', kind: 'practitioner', group: 'clinical', tier: 'T2',
    label: 'Phlebotomist / Lab Technician', icon: 'Syringe', template: 'practitioner',
    description: 'Sample collection technician with coverage area and cold-chain kit.',
    requiredDocs: [
      rq('degree', 'DMLT / lab technician degree'),
      rq('owner_id', 'Government photo ID'),
      rq('police_verification', 'Police verification'),
    ],
    optionalDocs: [],
    approval: APPROVAL.single,
    extraFields: [
      field('coverage_area', 'Coverage area', 'text'),
      field('vehicle_available', 'Own vehicle', 'boolean'),
      field('cold_bag', 'Cold bag for samples', 'boolean'),
    ],
    extraStepFields: { identity: ['coverage_area', 'vehicle_available', 'cold_bag'] },
  },

  // ── 2.md 4.3 Wellness & fitness (T3) ───────────────────────────────────
  {
    typeKey: 'yoga_studio', kind: 'facility', group: 'wellness', tier: 'T3',
    label: 'Yoga Studio / Teacher', icon: 'Flower2', template: 'facility',
    description: 'Yoga classes, therapy batches and camps, online or offline.',
    requiredDocs: [rq('shop_establishment', 'Shop / establishment registration (studio)'), rq('owner_id', 'Owner photo ID')],
    optionalDocs: [opt('training_cert', 'YCB / teaching certificate (therapy claims)')],
    approval: APPROVAL.single,
    extraFields: [
      field('styles', 'Styles taught', 'multiselect', { options: ['hatha', 'ashtanga', 'vinyasa', 'iyengar', 'kundalini', 'prenatal', 'therapeutic'] }),
      field('batch_sizes', 'Batch sizes', 'select', { options: ['one_to_one', 'small_upto_10', 'group_upto_30', 'large'] }),
      field('class_modes', 'Class modes', 'multiselect', { options: ['studio', 'home_visit', 'online'] }),
      field('prenatal_therapy', 'Prenatal / therapy batches', 'boolean'),
    ],
    extraStepFields: { services: ['styles', 'batch_sizes', 'class_modes', 'prenatal_therapy'] },
  },
  {
    typeKey: 'gym', kind: 'facility', group: 'wellness', tier: 'T3',
    label: 'Gym / Fitness Centre', icon: 'Dumbbell', template: 'facility',
    description: 'Gym and fitness centre with trainers and membership plans.',
    requiredDocs: [rq('shop_establishment', 'Shop / establishment registration'), rq('gst', 'GST registration'), rq('fire_noc', 'Fire safety NOC')],
    optionalDocs: [opt('training_cert', 'Trainer certifications'), opt('insurance_certificate', 'Liability insurance')],
    approval: APPROVAL.single,
    extraFields: [
      field('facilities', 'Facilities', 'multiselect', { options: ['cardio', 'weights', 'functional', 'pool', 'crossfit', 'sauna', 'group_classes'] }),
      field('trainers_count', 'Trainers on roll', 'number'),
      field('membership_plans', 'Membership plans', 'multiselect', { options: ['monthly', 'quarterly', 'half_yearly', 'annual', 'day_pass'] }),
      field('women_only_hours', 'Women-only hours', 'boolean'),
      field('crowd_level', 'Typical crowd level', 'select', { options: ['low', 'moderate', 'high'] }),
    ],
    extraStepFields: { services: ['facilities', 'trainers_count', 'membership_plans', 'women_only_hours', 'crowd_level'] },
  },
  {
    typeKey: 'wellness_centre', kind: 'facility', group: 'wellness', tier: 'T3',
    label: 'Wellness Centre / Spa', icon: 'Sparkles', template: 'facility',
    description: 'Spa and wellness therapies with certified therapists.',
    requiredDocs: [rq('shop_establishment', 'Shop / establishment registration'), rq('training_cert', 'Therapist certifications')],
    optionalDocs: [opt('ayush_council_reg', 'AYUSH registration (Ayurvedic clinical therapies)')],
    approval: APPROVAL.single,
    extraFields: [
      field('therapies', 'Therapies offered', 'multiselect', { options: ['abhyanga', 'swedish', 'deep_tissue', 'aroma', 'reflexology', 'steam', 'facial'] }),
      field('therapist_count', 'Therapists on roll', 'number'),
      field('hygiene_standard', 'Hygiene standard', 'select', { options: ['self_declared', 'third_party_audited', 'iso'] }),
    ],
    extraStepFields: { services: ['therapies', 'therapist_count', 'hygiene_standard'] },
  },
  {
    typeKey: 'sports_academy', kind: 'facility', group: 'wellness', tier: 'T3',
    label: 'Sports Academy', icon: 'Trophy', template: 'facility',
    description: 'Coached sport training for age-group and elite athletes.',
    requiredDocs: [rq('registration_certificate', 'Academy registration')],
    optionalDocs: [opt('training_cert', 'Coach certifications'), opt('insurance_certificate', 'Participant insurance')],
    approval: APPROVAL.single,
    extraFields: [
      field('sport', 'Sport', 'text', { required: true }),
      field('age_groups', 'Age groups', 'multiselect', { options: ['kids', 'junior', 'senior', 'masters', 'professional'] }),
      field('coaches_count', 'Coaches', 'number'),
    ],
    extraStepFields: { services: ['sport', 'age_groups', 'coaches_count'] },
  },
  {
    typeKey: 'personal_trainer', kind: 'practitioner', group: 'wellness', tier: 'T3',
    label: 'Personal Trainer', icon: 'BicepsFlexed', template: 'practitioner',
    description: 'Certified personal trainer, studio, home or online sessions.',
    requiredDocs: [rq('owner_id', 'Government photo ID')],
    optionalDocs: [opt('training_cert', 'Personal training certification')],
    approval: APPROVAL.single,
    extraFields: [
      field('specialities', 'Specialities', 'multiselect', { options: ['strength', 'weight_loss', 'post_natal', 'rehab', 'sports', 'senior_fitness'] }),
      field('trainer_modes', 'Session modes', 'multiselect', { options: ['home_visit', 'studio', 'online', 'outdoor'] }),
    ],
    extraStepFields: { identity: ['specialities', 'trainer_modes'] },
  },

  // ── 2.md 4.4 Commerce (T3) ──────────────────────────────────────────────
  {
    typeKey: 'equipment_rental', kind: 'vendor', group: 'commerce', tier: 'T3',
    label: 'Equipment Rental / Sale', icon: 'Package', template: 'vendor',
    description: 'Rental and sale of medical and mobility equipment with delivery.',
    requiredDocs: [rq('gst', 'GST registration')],
    optionalDocs: [opt('cdsco_licence', 'Device sale licence (if selling regulated devices)')],
    approval: APPROVAL.single,
    extraFields: [
      field('rental_catalogue', 'Catalogue', 'multiselect', { options: ['wheelchair', 'hospital_bed', 'o2_concentrator', 'suction_machine', 'walker', 'commode', 'crutches', 'bp_monitor', 'glucometer'] }),
      field('rent_per_day', 'Rent per day (INR)', 'number'),
      field('deposit_amount', 'Security deposit (INR)', 'number'),
      field('sanitisation_included', 'Sanitisation between rentals', 'boolean'),
      field('repair_service', 'Repair service', 'boolean'),
    ],
    extraStepFields: { catalogue: ['rental_catalogue', 'rent_per_day', 'deposit_amount', 'sanitisation_included', 'repair_service'] },
  },
  {
    typeKey: 'health_food_store', kind: 'vendor', group: 'commerce', tier: 'T3',
    label: 'Health Food / Organic Store', icon: 'Salad', template: 'vendor',
    description: 'Organic, millet and health food retail.',
    requiredDocs: [rq('fssai', 'FSSAI licence'), rq('gst', 'GST registration')],
    optionalDocs: [],
    approval: APPROVAL.single,
    extraFields: [
      field('brands', 'Brands stocked', 'textarea'),
      field('certifications', 'Certifications', 'multiselect', { options: ['organic', 'fssai', 'jain', 'sugar_free', 'gluten_free'] }),
    ],
    extraStepFields: { catalogue: ['brands', 'certifications'] },
  },
  {
    typeKey: 'supplement_store', kind: 'vendor', group: 'commerce', tier: 'T3',
    label: 'Supplement Store', icon: 'Egg', template: 'vendor',
    description: 'Protein, vitamin and sports supplement retail.',
    requiredDocs: [rq('fssai', 'FSSAI licence'), rq('gst', 'GST registration')],
    optionalDocs: [opt('cdsco_licence', 'CDSCO import / manufacture licence')],
    approval: APPROVAL.single,
    extraFields: [
      field('supplement_categories', 'Categories', 'multiselect', { options: ['vitamins', 'minerals', 'protein', 'ayurvedic', 'sports', 'infant'] }),
      field('batch_expiry_display', 'Show batch & expiry on listing', 'boolean'),
    ],
    extraStepFields: { catalogue: ['supplement_categories', 'batch_expiry_display'] },
  },
  {
    typeKey: 'skincare_brand', kind: 'vendor', group: 'commerce', tier: 'T3',
    label: 'Skincare / Personal Care Brand', icon: 'Droplet', template: 'vendor',
    description: 'Skin, hair and personal care product brand or distributor.',
    requiredDocs: [rq('cdsco_licence', 'CDSCO cosmetic registration / import licence'), rq('gst', 'GST registration')],
    optionalDocs: [],
    approval: APPROVAL.single,
    extraFields: [
      field('category_lines', 'Product lines', 'multiselect', { options: ['skincare', 'haircare', 'bodycare', 'baby', 'ayurvedic', 'derma'] }),
      field('claims', 'Product claims (no medical claims)', 'textarea'),
      field('import_licence', 'Import licence holder', 'boolean'),
    ],
    extraStepFields: { catalogue: ['category_lines', 'claims', 'import_licence'] },
  },
  {
    typeKey: 'medical_device_seller', kind: 'vendor', group: 'commerce', tier: 'T3',
    label: 'Medical Device Seller', icon: 'Cpu', template: 'vendor',
    description: 'Sale of regulated medical devices under MDR 2017.',
    requiredDocs: [rq('cdsco_licence', 'MDR 2017 device licence'), rq('gst', 'GST registration')],
    optionalDocs: [],
    approval: APPROVAL.single,
    extraFields: [
      field('device_classes', 'Device classes', 'multiselect', { options: ['a', 'a1', 'b', 'c'] }),
      field('device_catalogue', 'Device catalogue', 'multiselect', { options: ['diagnostic', 'monitoring', 'surgical', 'mobility', 'consumables', 'rehab'] }),
    ],
    extraStepFields: { catalogue: ['device_classes', 'device_catalogue'] },
  },

  // ── 2.md 4.5 Home services ──────────────────────────────────────────────
  {
    typeKey: 'home_nursing_agency', kind: 'facility', group: 'home_service', tier: 'T1',
    label: 'Home Nursing Agency', icon: 'House', template: 'facility',
    description: 'Agency supplying trained nurses for home care shifts.',
    requiredDocs: [
      rq('registration_certificate', 'Agency registration'),
      rq('nursing_council_reg', 'Nursing council registrations (team)'),
      rq('police_verification', 'Police verification process'),
    ],
    optionalDocs: [opt('gst', 'GST registration')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('nurses_count', 'Nurses on roll', 'number'),
      field('coverage_area', 'Coverage area', 'text'),
      field('available_24x7', '24x7 availability', 'boolean'),
      field('agency_services', 'Services', 'multiselect', { options: ['post_surgery', 'elderly_care', 'icu_at_home', 'injection', 'wound_care', 'palliative'] }),
    ],
    extraStepFields: { business: ['nurses_count'], services: ['coverage_area', 'available_24x7', 'agency_services'] },
  },
  {
    typeKey: 'assistant', kind: 'practitioner', group: 'home_service', tier: 'T2',
    label: 'Attendant / Caregiver', icon: 'HandHeart', template: 'practitioner',
    description: 'Trained attendant or caregiver for home shifts.',
    requiredDocs: [rq('owner_id', 'Government photo ID'), rq('police_verification', 'Police verification')],
    optionalDocs: [opt('training_cert', 'Caregiver training certificate')],
    approval: APPROVAL.single,
    extraFields: [
      field('care_skills', 'Skills', 'multiselect', { options: ['elderly_care', 'bed_sore', 'injection', 'feeding', 'bathing', 'mobility', 'companion'] }),
      field('shift_types', 'Shift types', 'multiselect', { options: ['day', 'night', 'full_day', 'hourly', 'live_in'] }),
      field('price_per_hour', 'Rate per hour (INR)', 'number'),
    ],
    extraStepFields: { identity: ['care_skills', 'shift_types', 'price_per_hour'] },
  },
  {
    typeKey: 'home_sample_collection', kind: 'facility', group: 'home_service', tier: 'T1',
    label: 'Home Sample Collection', icon: 'TestTubes', template: 'facility',
    description: 'Home phlebotomy service partnered with laboratories.',
    requiredDocs: [
      rq('partner_loa', 'Lab tie-up proof'),
      rq('degree', 'Phlebotomist / lab technician documents'),
    ],
    optionalDocs: [opt('police_verification', 'Field staff police verification'), opt('registration_certificate', 'Service registration')],
    approval: APPROVAL.clinical,
    extraFields: [
      field('coverage_area', 'Coverage area', 'text'),
      field('collection_slots', 'Collection slots per day', 'number'),
      field('report_tat_hours', 'Report TAT (hours)', 'number'),
      field('cold_chain', 'Cold-chain transport', 'boolean'),
    ],
    extraStepFields: { services: ['coverage_area', 'collection_slots', 'report_tat_hours', 'cold_chain'] },
  },
  {
    typeKey: 'home_physio', kind: 'practitioner', group: 'home_service', tier: 'T2',
    label: 'Home Physio', icon: 'PersonStanding', template: 'practitioner',
    description: 'Physiotherapist working only on home visits.',
    requiredDocs: [rq('allied_health_reg', 'Allied-health / physio council registration'), rq('degree', 'Physiotherapy degree')],
    optionalDocs: [opt('owner_id', 'Government photo ID')],
    approval: APPROVAL.single,
    extraFields: [
      field('focus', 'Focus areas', 'multiselect', { options: ['neuro', 'ortho', 'sports', 'paediatric', 'geriatric', 'post_surgery'] }),
      field('home_visit_radius_km', 'Home visit radius (km)', 'number'),
      field('equipment', 'Equipment carried', 'multiselect', { options: ['tens', 'ultrasound', 'exercise_bands', 'gait_training'] }),
    ],
    extraStepFields: { identity: ['focus', 'home_visit_radius_km', 'equipment'] },
  },

  // ── 2.md 4.6 Transport (T2) ─────────────────────────────────────────────
  {
    typeKey: 'delivery', kind: 'practitioner', group: 'transport', tier: 'T2',
    label: 'Delivery Partner', icon: 'Bike', template: 'transport',
    description: 'Medicine and equipment delivery partner.',
    requiredDocs: [
      rq('owner_id', 'Government photo ID'),
      rq('driver_licence', 'Driving licence'),
      rq('vehicle_rc', 'Vehicle RC'),
      rq('vehicle_insurance', 'Vehicle insurance'),
      rq('bank_proof', 'Bank account proof'),
    ],
    optionalDocs: [opt('police_verification', 'Police verification')],
    approval: APPROVAL.single,
    extraFields: [field('max_deliveries_per_day', 'Deliveries per day', 'number')],
    extraStepFields: { availability: ['max_deliveries_per_day'] },
  },
  {
    typeKey: 'rider', kind: 'practitioner', group: 'transport', tier: 'T2',
    label: 'Rider / Driver', icon: 'Bike', template: 'transport',
    description: 'Rider or driver, including wheelchair / stretcher van services.',
    requiredDocs: [
      rq('owner_id', 'Government photo ID'),
      rq('driver_licence', 'Driving licence'),
      rq('vehicle_rc', 'Vehicle RC'),
      rq('vehicle_insurance', 'Vehicle insurance'),
      rq('vehicle_fitness', 'Vehicle fitness certificate'),
      rq('vehicle_permit', 'Vehicle permit'),
    ],
    optionalDocs: [opt('police_verification', 'Police verification')],
    approval: APPROVAL.single,
    extraFields: [field('patients_transport', 'Patient transport (wheelchair / stretcher van)', 'boolean')],
    extraStepFields: { availability: ['patients_transport'] },
  },
  {
    typeKey: 'patient_transport', kind: 'facility', group: 'transport', tier: 'T2',
    label: 'Patient Transport Operator', icon: 'Ambulance', template: 'transport',
    description: 'Non-emergency patient transport fleet with attendants.',
    requiredDocs: [
      rq('vehicle_rc', 'Vehicle RC (fleet)'),
      rq('vehicle_insurance', 'Vehicle insurance'),
      rq('vehicle_permit', 'Commercial permit'),
      rq('driver_licence', 'Driver licences'),
    ],
    optionalDocs: [opt('emt_cert', 'Attendant / EMT certification'), opt('police_verification', 'Crew police verification')],
    approval: APPROVAL.single,
    extraFields: [
      field('fleet_size', 'Fleet size', 'number'),
      field('wheelchair_enabled', 'Wheelchair-enabled vehicles', 'boolean'),
      field('attendant_policy', 'Attendant policy', 'textarea'),
    ],
    extraStepFields: { identity: ['fleet_size', 'wheelchair_enabled', 'attendant_policy'] },
  },

  // ── 2.md 4.7 Community (T3) ─────────────────────────────────────────────
  {
    typeKey: 'event_organizer', kind: 'organizer', group: 'community', tier: 'T3',
    label: 'Event / Camp Organizer', icon: 'CalendarDays', template: 'organizer',
    description: 'Health camps, screening drives, workshops and webinars.',
    requiredDocs: [
      rq('registration_certificate', 'Organisation registration'),
      rq('partner_loa', 'Partner facility letter of authorisation (clinical camps)'),
    ],
    optionalDocs: [opt('tax_exemption_12a_80g', '12A / 80G registration'), opt('insurance_certificate', 'Event insurance')],
    approval: APPROVAL.single,
    extraFields: [
      field('org_type', 'Organisation type', 'select', { options: ['proprietorship', 'ngo', 'company', 'society', 'trust'] }),
      field('partner_facility', 'Partner facility name', 'text'),
      field('insurance_cover', 'Event insurance cover', 'boolean'),
    ],
    extraStepFields: { events: ['org_type', 'partner_facility', 'insurance_cover'] },
  },
  {
    typeKey: 'ngo', kind: 'organizer', group: 'community', tier: 'T3',
    label: 'NGO', icon: 'HeartHandshake', template: 'organizer',
    description: 'Non-profit running health, care or support programmes.',
    requiredDocs: [rq('registration_certificate', 'NGO registration')],
    optionalDocs: [opt('tax_exemption_12a_80g', '12A / 80G registration')],
    approval: APPROVAL.single,
    extraFields: [
      field('causes', 'Causes', 'multiselect', { options: ['health', 'disability', 'elderly', 'child', 'women', 'mental_health', 'environment'] }),
      field('geography', 'Geography served', 'text'),
      field('beneficiaries', 'Beneficiaries served (last year)', 'number'),
    ],
    extraStepFields: { events: ['causes', 'geography', 'beneficiaries'] },
  },
  {
    typeKey: 'support_group_host', kind: 'organizer', group: 'community', tier: 'T3',
    label: 'Support Group Host', icon: 'Users', template: 'organizer',
    description: 'Peer support groups with a documented moderation and safety plan.',
    requiredDocs: [
      rq('owner_id', 'Host photo ID'),
      rq('agreement_signed', 'Group safety agreement'),
    ],
    optionalDocs: [opt('training_cert', 'Facilitation training / qualification')],
    approval: APPROVAL.highRisk, // 2.md 6: mental-health peer support is high-risk.
    extraFields: [
      field('group_topic', 'Topic', 'text', { required: true }),
      field('group_modes', 'Session modes', 'multiselect', { options: ['online', 'in_person', 'hybrid'] }),
      field('moderation_plan', 'Moderation & safety plan', 'textarea', { required: true }),
      field('max_members', 'Max members', 'number'),
    ],
    extraStepFields: { events: ['group_topic', 'group_modes', 'moderation_plan', 'max_members'] },
  },
  {
    typeKey: 'training_provider', kind: 'organizer', group: 'community', tier: 'T3',
    label: 'Training Provider (CPR / First-Aid)', icon: 'GraduationCap', template: 'organizer',
    description: 'CPR, first-aid and clinical skills training with certification.',
    requiredDocs: [rq('training_cert', 'Trainer certifications')],
    optionalDocs: [opt('registration_certificate', 'Accreditation (Red Cross / St John / AHA partner)'), opt('insurance_certificate', 'Course insurance')],
    approval: APPROVAL.single,
    extraFields: [
      field('courses', 'Courses', 'multiselect', { options: ['cpr', 'first_aid', 'aed', 'bls', 'acls', 'paediatric_life_support'] }),
      field('certifications_issued', 'Certifications issued', 'text'),
      field('accreditation', 'Accreditation', 'text'),
    ],
    extraStepFields: { events: ['courses', 'certifications_issued', 'accreditation'] },
  },

  // ── 2.md 4.8 Professional ───────────────────────────────────────────────
  {
    typeKey: 'lawyer', kind: 'practitioner', group: 'professional', tier: 'T2',
    label: 'Lawyer', icon: 'Scale', template: 'practitioner',
    description: 'Advocate registered with a bar council.',
    requiredDocs: [rq('bar_council_reg', 'Bar council registration'), rq('degree', 'Law degree'), rq('owner_id', 'Government photo ID')],
    optionalDocs: [opt('photo', 'Profile photo')],
    approval: APPROVAL.single,
    extraFields: [
      field('practice_areas', 'Practice areas', 'multiselect', { options: ['family', 'consumer', 'cyber', 'criminal', 'civil', 'corporate', 'labour', 'property', 'medical'] }),
      field('courts', 'Courts practised in', 'text'),
      field('consultation_fee', 'Consultation fee (INR)', 'number'),
    ],
    extraStepFields: { identity: ['practice_areas', 'courts', 'consultation_fee'] },
  },
  {
    typeKey: 'insurance_tpa_desk', kind: 'facility', group: 'professional', tier: 'T2',
    label: 'Insurance / TPA Desk', icon: 'ShieldCheck', template: 'facility',
    description: 'Cashless claims and TPA helpdesk at a hospital or standalone.',
    requiredDocs: [
      rq('irdai_tpa_licence', 'IRDAI / TPA licence'),
      rq('partner_loa', 'Authorised signatory letter'),
    ],
    optionalDocs: [opt('gst', 'GST registration')],
    approval: APPROVAL.single,
    extraFields: [
      field('tpa_name', 'TPA / insurer name', 'text', { required: true }),
      field('insurers', 'Insurers served', 'textarea'),
      field('cashless_networks', 'Cashless network hospitals', 'number'),
    ],
    extraStepFields: { business: ['tpa_name'], services: ['insurers', 'cashless_networks'] },
  },
];

// Public shape: a flat list of config rows ready to upsert. Building validates
// every step/field/document cross-reference, so an invalid row throws at import
// time instead of at wizard render time.
export function buildProviderTypeConfigs() {
  return CATALOG.map(build);
}

export const PROVIDER_TYPE_CATALOG = buildProviderTypeConfigs();

// 2.md 2 - the chooser groups, derived from the catalogue so the frontend tabs
// can never drift from what is actually on offer.
export function providerTypeGroups() {
  const groups = new Map();
  for (const config of PROVIDER_TYPE_CATALOG) {
    if (!config.isActive) continue;
    const entry = groups.get(config.group) ?? { group: config.group, count: 0, types: [] };
    entry.count += 1;
    entry.types.push({ typeKey: config.typeKey, label: config.label, kind: config.kind, tier: config.tier, icon: config.icon });
    groups.set(config.group, entry);
  }
  return [...groups.values()].sort((a, b) => a.group.localeCompare(b.group));
}
