import mongoose from 'mongoose';

const vaccinationAlertSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  vaccineName: { type: String, required: true },
  doseNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  administeredDate: Date,
  administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'administered', 'overdue', 'skipped'], default: 'pending' },
  notes: String,
}, { timestamps: true });

vaccinationAlertSchema.index({ patientId: 1, status: 1, dueDate: 1 });

export default mongoose.model('VaccinationAlert', vaccinationAlertSchema);
