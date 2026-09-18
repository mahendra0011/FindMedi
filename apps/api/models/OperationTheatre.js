import mongoose from 'mongoose';

const operationSchema = new mongoose.Schema({
  otId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  surgeryName: { type: String, required: true },
  surgeryType: { type: String, enum: ['Elective', 'Emergency', 'Urgent'], default: 'Elective' },
  anaesthesiaType: { type: String, enum: ['General', 'Spinal', 'Epidural', 'Local', 'Sedation', 'Not Required'], default: 'General' },
  assistants: [{ type: String }],
  preOpChecklist: {
    consentSigned: { type: Boolean, default: false },
    bloodGroupConfirmed: { type: Boolean, default: false },
    anaesthesiaFitness: { type: Boolean, default: false },
    npoStatus: { type: Boolean, default: false },
    allergiesChecked: { type: Boolean, default: false },
    implantsReady: { type: Boolean, default: false },
    siteMarked: { type: Boolean, default: false },
    investigationsReviewed: { type: Boolean, default: false },
  },
  preOpVitals: {
    bp: String,
    hr: Number,
    temp: Number,
    spO2: Number,
    weight: Number,
  },
  surgeonSignature: { type: String },
  anesthetistSignature: { type: String },
  otNumber: { type: String },
  scheduledDate: { type: Date },
  startTime: { type: Date },
  endTime: { type: Date },
  totalDuration: { type: Number }, // minutes
  instrumentsCount: {
    before: { type: Number, default: 0 },
    after: { type: Number, default: 0 },
    correct: { type: Boolean },
  },
  spongeCount: {
    before: { type: Number, default: 0 },
    after: { type: Number, default: 0 },
    correct: { type: Boolean },
  },
  findings: { type: String },
  procedure: { type: String },
  complications: { type: String },
  postOpInstructions: { type: String },
  status: {
    type: String,
    enum: ['Scheduled', 'Pre-Op', 'In Progress', 'Recovery', 'Completed', 'Cancelled'],
    default: 'Scheduled',
  },
  recoveryNotes: { type: String },
  recoveryVitals: [{ time: Date, bp: String, hr: Number, spO2: Number, consciousness: String }],
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

operationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.startTime && this.endTime) {
    this.totalDuration = Math.round((this.endTime - this.startTime) / 60000);
  }
  next();
});

export default mongoose.model('OperationTheatre', operationSchema);