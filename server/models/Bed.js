import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  bedNumber: { type: String, required: true, unique: true },
  ward: { type: String, enum: ['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU', 'Emergency'], required: true },
  bedType: { type: String, enum: ['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU'], required: true },
  status: { type: String, enum: ['Available', 'Occupied', 'Under Cleaning', 'Maintenance'], default: 'Available' },
  currentPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentPatientName: { type: String },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  occupiedSince: { type: Date },
  dailyRate: { type: Number, required: true },
  floor: { type: String },
  isAC: { type: Boolean, default: false },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Bed', bedSchema);