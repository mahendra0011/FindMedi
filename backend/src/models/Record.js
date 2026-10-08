import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  date: { type: String, required: true },
  diagnosis: { type: String, default: '' },
  prescription: { type: String, default: '' },
  // subcatogary.md C19 — the 7 originals plus the record types §19 asks for.
  // `set` below normalises display spellings ("Lab Report") to snake_case, so
  // every enum token is already lowercase.
  type: {
    type: String,
    enum: [
      // originals
      'diagnosis', 'prescription', 'lab_report', 'imaging', 'discharge_summary',
      'bill_invoice', 'payment_invoice',
      // §19 additions
      'vaccination_record', 'consent_form', 'referral_letter', 'operative_note',
      'histopathology_report', 'ecg_echo_report', 'mlc_report',
      'medical_certificate', 'allergy_list', 'growth_chart',
      'insurance_claim_docs', 'pre_auth', 'death_birth_intimation',
      'abha_linked_document', 'patient_external_report', 'wearable_export',
    ],
    default: 'diagnosis',
    set: v => typeof v === 'string' ? v.toLowerCase().replace(/\s+/g, '_') : v,
  },
  notes: { type: String, default: '' },

  // Vitals
  vitals: {
    bp: { type: String }, // "120/80"
    temp: { type: Number }, // Celsius
    weight: { type: Number }, // kg
    spo2: { type: Number }, // percentage
    pulse: { type: Number },
    respiration: { type: Number },
    height: { type: Number }, // cm
  },

  // ICD-10 Codes
  icdCodes: [{
    code: { type: String, required: true },
    description: { type: String },
    diagnosis: { type: String, default: '' },
  }],

  // Examination fields
  examination: {
    general: { type: String },
    systemic: { type: String },
    local: { type: String },
    cardiovascular: { type: String },
    respiratory: { type: String },
    abdominal: { type: String },
    neurological: { type: String },
    musculoskeletal: { type: String },
  },

  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  data: { type: Object, default: {} },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Record', recordSchema);
