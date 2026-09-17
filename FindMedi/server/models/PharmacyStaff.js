import mongoose from 'mongoose';

const pharmacyStaffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['Pharmacist', 'Senior Pharmacist', 'Pharmacy Technician', 'Store Manager'], required: true },
  email: { type: String },
  phone: { type: String },
  licenseNumber: { type: String },
  experience: { type: String },
  shift: { type: String, enum: ['Morning', 'Evening', 'Night', 'Rotating'], default: 'Morning' },
  isActive: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
});

export default mongoose.model('PharmacyStaff', pharmacyStaffSchema);
