import mongoose from 'mongoose';

const bloodUnitSchema = new mongoose.Schema({
  unitId: { type: String, required: true, unique: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  donorName: { type: String },
  donorId: { type: String },
  donationDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  volume: { type: Number, default: 450 }, // ml
  status: { type: String, enum: ['Available', 'Reserved', 'Issued', 'Expired', 'Discarded'], default: 'Available' },
  components: [{ type: String, enum: ['Whole Blood', 'PRBC', 'Platelets', 'FFP', 'Cryoprecipitate'] }],
  hiv: { type: String, enum: ['Negative', 'Positive'], default: 'Negative' },
  hbsag: { type: String, enum: ['Negative', 'Positive'], default: 'Negative' },
  hcv: { type: String, enum: ['Negative', 'Positive'], default: 'Negative' },
  malaria: { type: String, enum: ['Negative', 'Positive'], default: 'Negative' },
  vdrl: { type: String, enum: ['Negative', 'Positive'], default: 'Negative' },
  crossMatchPatient: { type: String },
  crossMatchResult: { type: String, enum: ['Compatible', 'Incompatible', 'Not Done'], default: 'Not Done' },
  issuedTo: { type: String },
  issuedAt: { type: Date },
  issuedBy: { type: String },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});

const bloodRequestSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  requestId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  unitsRequired: { type: Number, default: 1 },
  reason: { type: String },
  priority: { type: String, enum: ['Routine', 'Urgent', 'Emergency'], default: 'Routine' },
  status: { type: String, enum: ['Pending', 'Crossmatching', 'Issued', 'Transfusing', 'Reaction', 'Completed', 'Cancelled'], default: 'Pending' },
  issuedUnits: [{ type: String }],
  crossMatchResult: { type: String, enum: ['Compatible', 'Incompatible', 'Not Done'], default: 'Not Done' },
  crossMatchTechnician: { type: String },
  patientBloodGroup: { type: String },
  donorBloodGroup: { type: String },
  transfusionStartedAt: { type: Date },
  transfusionEndedAt: { type: Date },
  transfusionCompleteTime: { type: Date },
  transfusionNurse: { type: String },
  preTransfusionVitals: { bp: String, hr: Number, temp: Number },
  reaction: { type: Boolean, default: false },
  reactionReported: { type: Boolean, default: false },
  reactionType: { type: String, enum: ['Fever', 'Allergic', 'Hemolytic', 'Bacterial', 'Anaphylactic', 'Other'] },
  reactionSeverity: { type: String, enum: ['Mild', 'Moderate', 'Severe'] },
  reactionSymptoms: { type: String },
  reactionActionTaken: { type: String },
  reactionStopped: { type: Boolean, default: false },
  reactionNotes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

bloodUnitSchema.pre('save', function (next) {
  if (this.expiryDate && this.expiryDate < new Date() && this.status === 'Available') {
    this.status = 'Expired';
  }
  next();
});

export const BloodUnit = mongoose.model('BloodUnit', bloodUnitSchema);
export const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);