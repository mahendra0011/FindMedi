import mongoose from 'mongoose';

const nursingChartSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  shift: { type: String, enum: ['Morning', 'Evening', 'Night'], required: true },
  date: { type: Date, default: Date.now },
  chartType: { type: String, enum: ['Vitals', 'MAR', 'InputOutput', 'WoundDressing', 'General'], default: 'Vitals' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recordedByName: { type: String, required: true },
  // Vitals fields
  vitals: {
    bpSystolic: { type: Number },
    bpDiastolic: { type: Number },
    heartRate: { type: Number },
    respRate: { type: Number },
    temperature: { type: Number },
    spO2: { type: Number },
    bloodSugar: { type: Number },
    painScale: { type: Number, min: 0, max: 10 },
    urineOutput: { type: Number },
    stool: { type: String },
  },
  // MAR - Medication Administration Record
  medicationAdmin: {
    medicineName: { type: String },
    dosage: { type: String },
    route: { type: String },
    time: { type: String },
    status: { type: String, enum: ['Given', 'Refused', 'Missed', 'Held'], default: 'Given' },
    reason: { type: String },
  },
  // Wound dressing fields
  woundDressing: {
    woundSite: { type: String },
    appearance: { type: String },
    size: { type: String },
    dressingType: { type: String },
    notes: { type: String },
  },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  // General notes
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('NursingChart', nursingChartSchema);