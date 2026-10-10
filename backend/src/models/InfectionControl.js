import mongoose from 'mongoose';

/** File 22 P1-23: HAI (hospital-acquired infection) surveillance event. */
const haiEventSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' },
  infectionType: { type: String, required: true }, // CLABSI, CAUTI, SSI, VAP, C.diff etc.
  site: { type: String, default: '' },
  suspectedSource: { type: String, default: '' },
  onsetDate: { type: Date, required: true },
  detectedVia: { type: String, enum: ['culture', 'clinical', 'surveillance', 'report'], default: 'clinical' },
  status: { type: String, enum: ['suspected', 'confirmed', 'ruled-out', 'reported'], default: 'suspected' },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'fatal'], default: 'moderate' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

haiEventSchema.index({ hospitalId: 1, status: 1, onsetDate: -1 });

/** File 22 P1-23: antibiotic stewardship review. */
const antibioticReviewSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' },
  drug: { type: String, required: true },
  indication: { type: String, default: '' },
  route: { type: String, enum: ['iv', 'im', 'po', 'topical', 'other'], default: 'iv' },
  startDate: { type: Date, required: true },
  plannedDays: { type: Number, default: 7 },
  actualEndDate: Date,
  restricted: { type: Boolean, default: false },
  approvalStatus: { type: String, enum: ['auto', 'pending', 'approved', 'restricted-denied'], default: 'auto' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deescalated: { type: Boolean, default: false },
  cultureSensitive: Boolean,
  notes: String,
}, { timestamps: true });

antibioticReviewSchema.index({ hospitalId: 1, approvalStatus: 1 });

/** File 22 P1-23: needle-stick injury + PEP tracking. */
const needleStickSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  injuryDate: { type: Date, required: true },
  deviceType: { type: String, default: '' }, // needle, scalpel, ampoule etc.
  bodySite: { type: String, default: '' },
  sourcePatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  sourceHivPositive: { type: Boolean, default: false },
  sourceHcvPositive: { type: Boolean, default: false },
  sourceHbsagPositive: { type: Boolean, default: false },
  pepStarted: { type: Boolean, default: false },
  pepStartDate: Date,
  pepRegimen: { type: String, default: '' },
  baselineSerology: { type: String, default: '' },
  followUpSerology: { type: String, default: '' },
  outcome: { type: String, enum: ['pending', 'recovered', 'seroconverted', 'lost-to-followup'], default: 'pending' },
  reportedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

needleStickSchema.index({ hospitalId: 1, outcome: 1 });

export default mongoose.models.HaiEvent || mongoose.model('HaiEvent', haiEventSchema);
export const AntibioticReview = mongoose.models.AntibioticReview || mongoose.model('AntibioticReview', antibioticReviewSchema);
export const NeedleStick = mongoose.models.NeedleStick || mongoose.model('NeedleStick', needleStickSchema);
