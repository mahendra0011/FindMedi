import mongoose from 'mongoose';

const triageSchema = new mongoose.Schema({
  emergencyId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  phone: { type: String },
  arrivalMode: { type: String, enum: ['Walk-in', 'Ambulance', 'Police', 'Referral'], default: 'Walk-in' },
  broughtBy: { type: String },
  chiefComplaint: { type: String, required: true },
  triageLevel: {
    type: String,
    enum: ['P1-Immediate', 'P2-Urgent', 'P3-Less Urgent', 'P4-Non Urgent', 'P5-Deceased'],
    required: true,
  },
  triageNotes: { type: String },
  triagedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triagedAt: { type: Date },
  vitals: {
    bpSystolic: { type: Number },
    bpDiastolic: { type: Number },
    heartRate: { type: Number },
    respRate: { type: Number },
    temperature: { type: Number },
    spO2: { type: Number },
    bloodSugar: { type: Number },
    painScale: { type: Number, min: 0, max: 10 },
  },
  isMLCO: { type: Boolean, default: false },
  mlcNumber: { type: String },
  mlc: {
    type: {
      caseType: { type: String, enum: ['Road Accident', 'Assault', 'Poisoning', 'Burns', 'Fall', 'Others'] },
      policeStation: { type: String },
      policeOfficer: { type: String },
      officerPhone: { type: String },
      firNumber: { type: String },
      notes: { type: String },
      reportedAt: { type: Date },
    },
  },
  status: { type: String, enum: ['In Treatment', 'Admitted', 'Referred', 'Discharged', 'DOD'], default: 'In Treatment' },
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedDoctorName: { type: String },
  treatmentNotes: [{ text: String, doctorName: String, timestamp: { type: Date, default: Date.now } }],
  referredTo: { type: String },
  referredReason: { type: String },
  dischargedAt: { type: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

triageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Triage', triageSchema);