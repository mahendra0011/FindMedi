import mongoose from 'mongoose';

// File 22 P1-22: procedure-suite extras - NICU observations, cath-lab
// interventions and endoscopy procedures.

const nicuRecordSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  gestationalAgeWeeks: { type: Number, min: 22, max: 44 },
  birthWeightG: Number,
  admissionWeightG: Number,
  currentWeightG: Number,
  temperatureC: Number,
  heartRate: Number,
  respiratoryRate: Number,
  spo2: Number,
  fio2: Number,
  bloodGlucoseMgDl: Number,
  feedingType: { type: String, enum: ['breast', 'formula', 'tpn', 'nil'], default: 'breast' },
  apneaEpisodes: { type: Number, default: 0 },
  jaundice: { type: Boolean, default: false },
  sepsisScreen: { type: String, enum: ['pending', 'negative', 'positive'], default: 'pending' },
  antibioticsStarted: { type: Boolean, default: false },
  isolation: { type: Boolean, default: false },
  observedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  observedAt: { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true });

nicuRecordSchema.index({ hospitalId: 1, observedAt: -1 });

const cathLabRecordSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' },
  procedureType: { type: String, required: true }, // coronary angiogram, PCI, PTCA etc.
  accessSite: { type: String, enum: ['radial', 'femoral', 'brachial'], default: 'radial' },
  vessel: { type: String, default: '' },
  contrastUsedMl: Number,
  radiationDoseDap: Number,
  fluoroscopyTimeMin: Number,
  complications: { type: String, default: '' },
  kirsIncluded: { type: Boolean, default: false },
  procedureStatus: { type: String, enum: ['planned', 'in-progress', 'completed', 'aborted'], default: 'planned' },
  scheduledAt: Date,
  completedAt: Date,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

cathLabRecordSchema.index({ hospitalId: 1, procedureStatus: 1 });

const endoscopyRecordSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' },
  procedureType: { type: String, required: true }, // gastroscopy, colonoscopy, ERCP, bronchoscopy
  indication: String,
  sedation: { type: String, enum: ['none', 'conscious', 'general'], default: 'conscious' },
  findings: String,
  biopsiesTaken: { type: Boolean, default: false },
  polypsRemoved: { type: Boolean, default: false },
  therapeuticIntervention: String,
  adverseEvent: String,
  procedureStatus: { type: String, enum: ['planned', 'in-progress', 'completed', 'aborted'], default: 'planned' },
  scheduledAt: Date,
  completedAt: Date,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

endoscopyRecordSchema.index({ hospitalId: 1, procedureStatus: 1 });

export default mongoose.models.NicuRecord || mongoose.model('NicuRecord', nicuRecordSchema);
export const CathLabRecord = mongoose.models.CathLabRecord || mongoose.model('CathLabRecord', cathLabRecordSchema);
export const EndoscopyRecord = mongoose.models.EndoscopyRecord || mongoose.model('EndoscopyRecord', endoscopyRecordSchema);
