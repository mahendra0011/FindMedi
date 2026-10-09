import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  // File 22 P1-24: prescriber registration snapshot + tele flags.
  doctorRmp: { type: String, default: '', maxlength: 60 },
  teleConsult: { type: Boolean, default: false },
  teleConsentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeleConsent', default: null },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  medicines: [{
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true }, // e.g. "500mg"
    frequency: { type: String, required: true }, // e.g. "1-0-1", "1-1-1"
    duration: { type: String, required: true }, // e.g. "7 days", "14 days"
    route: { type: String, enum: ['Oral', 'IV', 'IM', 'Topical', 'Sublingual', 'Inhalation', 'Other'], default: 'Oral' },
    instructions: { type: String, default: '' }, // e.g. "After food", "Empty stomach"
    quantity: { type: Number, required: true },
    isDispensed: { type: Boolean, default: false },
    dispensedAt: { type: Date },
    dispensedBy: { type: String },
  }],
  diagnosis: { type: String },
  // Doc 11 §5 P0: structured diagnosis code, follow-up plan, generic
  // preference, and hard-stop override (CDSS critical + reason recorded).
  diagnosisIcd: { type: String, maxlength: 20, default: '' },
  followUpDate: { type: Date, default: null },
  genericPreferred: { type: Boolean, default: false },
  cdsOverride: {
    reason: { type: String, maxlength: 1000, default: '' },
    at: { type: Date, default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  clinicalNotes: { type: String },
   status: { type: String, enum: ['Active', 'Dispensed', 'Partially Dispensed', 'Cancelled'], default: 'Active' },
   verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
   verificationNotes: { type: String, default: '' },
   verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
   verifiedAt: { type: Date },
   isEmergency: { type: Boolean, default: false },
  prescriptionFile: { type: String, default: '' }, // Patient-uploaded prescription scan/photo
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  // REC-M-05: tamper-evident seal over the clinical content.
  integrity: {
    version: String,
    algorithm: String,
    digest: String,
    signature: String,
    issuedAt: Date,
    // Only a hash of the scan nonce is kept, so a database leak does not yield
    // usable verification tokens for every live prescription.
    nonceHash: String,
  },
  // Set when the prescription is cancelled or revoked. Verification consults
  // this: a perfectly-signed prescription that was cancelled last week is not a
  // valid prescription today, and integrity alone would say otherwise.
  revokedAt: Date,
  cancelledAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // File 09 §9.1: episode-of-care links (migration-safe, optional).
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

prescriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  const allDispensed = this.medicines.every(m => m.isDispensed);
  const someDispensed = this.medicines.some(m => m.isDispensed);
  if (allDispensed) this.status = 'Dispensed';
  else if (someDispensed) this.status = 'Partially Dispensed';
  next();
});

export default mongoose.model('Prescription', prescriptionSchema);