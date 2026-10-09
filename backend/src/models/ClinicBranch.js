import mongoose from 'mongoose';

const clinicBranchSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  name: { type: String, required: true },
  address: String,
  city: String,
  phone: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('ClinicBranch', clinicBranchSchema);
