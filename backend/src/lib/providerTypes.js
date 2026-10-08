// Vocabulary for the generic provider row (10.md 2.1 / 2.2).
//
// Kept OUT of the model files on purpose: request validation (`utils/validate.js`)
// and the join-wizard config all need the same enums, and pulling them from a
// lib module means importing a schema never registers a mongoose model as a
// side effect. Provider.js, ProviderTypeConfig.js and validate.js all import
// from here, so there is exactly one definition.
export const PROVIDER_KINDS = ['facility', 'practitioner', 'vendor', 'organizer'];

export const PROVIDER_GROUPS = ['clinical', 'wellness', 'commerce', 'home_service', 'transport', 'community', 'professional'];

export const PROVIDER_STATUS = ['draft', 'submitted', 'under_review', 'needs_info', 'approved', 'live', 'suspended', 'expired', 'rejected', 'archived'];

export const VERIFICATION_STATUS = ['unverified', 'in_review', 'verified', 'rejected', 'expired'];

export const PROVIDER_PLANS = ['free', 'basic', 'premium'];

export const APPROVAL_LEVELS = ['auto', 'single', 'dual'];

// How a Service can be delivered (10.md 2.6). Kept with the rest of the
// provider vocabulary so request validation and the schema share one list.
export const SERVICE_MODES = ['in_person', 'video', 'audio', 'chat', 'home_visit', 'delivery', 'class'];

// 10.md 2.3 - the join application state machine (2.md 6):
//   Draft -> Submitted -> Under review -> (Needs info <-> Resubmitted) -> Approved / Rejected
// `expired` exists so a draft that aged out of the 30-day window (2.md 14) has
// a real state instead of being deleted from under the applicant.
export const APPLICATION_STATUSES = [
  'draft', 'submitted', 'under_review', 'needs_info', 'resubmitted',
  'approved', 'rejected', 'expired',
];

// 8.md 2: the reviewer's four buttons.
export const APPLICATION_DECISIONS = ['approve', 'reject', 'needs_info', 'escalate'];

export const CHECKLIST_STATUSES = ['pass', 'fail', 'pending'];

// 2.md 5 - the document vocabulary. Configs choose which of these a type asks
// for; the enum is what keeps `docType` from becoming free text in an audit log.
// The tail of the list is the per-type vocabulary 2.md 4 asks for (councils,
// establishments, vehicle papers, licences) - it grew with the type catalogue
// in `lib/providerTypeCatalog.js`, which is the only place that assigns them.
export const DOCUMENT_TYPES = [
  'clinical_establishment_reg', 'medical_council_reg', 'drug_licence', 'pharmacist_reg',
  'aerb', 'pcpndt', 'nabl', 'nabh', 'bmw_authorization', 'fire_noc', 'fssai',
  'cdsco_licence', 'gst', 'pan', 'owner_id', 'address_proof', 'bank_proof',
  'vehicle_rc', 'driver_licence', 'police_verification', 'degree', 'training_cert',
  'agreement_signed',
  // 2.md 4.1/4.2 - per-council registrations
  'dental_council_reg', 'ayush_council_reg', 'nursing_council_reg', 'allied_health_reg',
  'rci_reg', 'bar_council_reg',
  // 2.md 4.1 - regulated facility licences
  'art_act_registration', 'blood_bank_licence', 'irdai_tpa_licence', 'water_ro_report',
  'shop_establishment', 'registration_certificate', 'ngo_registration', 'tax_exemption_12a_80g',
  'partner_loa', 'insurance_certificate',
  // 2.md 4.6 - vehicle & driver papers
  'vehicle_insurance', 'vehicle_permit', 'vehicle_fitness', 'emt_cert',
  // 2.md 4.2 - identity artefacts
  'photo',
];

// 10.md 3 - Doc.status.
export const DOCUMENT_STATUSES = ['uploaded', 'under_review', 'verified', 'rejected', 'expired'];
