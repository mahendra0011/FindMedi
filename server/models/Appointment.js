import mongoose from 'mongoose';

export const LAB_SERVICES = [
  { id: 'bp_check', name: 'Blood Pressure Check', price: 100, category: 'Basic' },
  { id: 'blood_sugar', name: 'Blood Sugar Test', price: 150, category: 'Lab' },
  { id: 'fbc', name: 'Full Blood Count', price: 300, category: 'Lab' },
  { id: 'xray', name: 'X-Ray Scan', price: 500, category: 'Imaging' },
  { id: 'ecg', name: 'ECG Test', price: 400, category: 'Cardiac' },
  { id: 'urine_test', name: 'Urine Test', price: 150, category: 'Lab' },
  { id: 'lipid_profile', name: 'Lipid Profile', price: 450, category: 'Lab' },
  { id: 'thyroid', name: 'Thyroid Panel', price: 500, category: 'Lab' },
];

const appointmentSchema = new mongoose.Schema({
  tokenNumber: { type: String, unique: true, sparse: true, index: true },
  uhid: { type: String, index: true },
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  department: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['Confirmed', 'Pending', 'Cancelled', 'Completed', 'In Queue', 'Serving', 'Missed'], default: 'Pending' },
  priority: { type: String, enum: ['Normal', 'Urgent', 'Emergency'], default: 'Normal' },
  type: { type: String, enum: ['Consultation', 'Follow-up', 'Check-up', 'Emergency'], default: 'Consultation' },
  notes: { type: String, default: '' },
  symptoms: { type: String, default: '' },
  services: [{ type: String }],
  queuePosition: { type: Number, default: 0 },
  estimatedWaitTime: { type: Number, default: 0 }, // minutes
  checkedInAt: { type: Date },
  consultationStartTime: { type: Date },
  consultationEndTime: { type: Date },
  followUpDate: { type: Date },
  reminderSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Appointment', appointmentSchema);
// 15
