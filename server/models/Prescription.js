import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
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
  clinicalNotes: { type: String },
  status: { type: String, enum: ['Active', 'Dispensed', 'Partially Dispensed', 'Cancelled'], default: 'Active' },
  isEmergency: { type: Boolean, default: false },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

prescriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  const allDispensed = this.medicines.every(m => m.isDispensed);
  const someDispensed = this.medicines.some(m => m.isDispensed);
  if (allDispensed) this.status = 'Dispensed';
  else if (someDispensed) this.status = 'Partially Dispensed';
  next();
});

export default mongoose.model('Prescription', prescriptionSchema);