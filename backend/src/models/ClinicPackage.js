import mongoose from 'mongoose';

const clinicPackageSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  branchId: String,
  name: { type: String, required: true },
  category: String,
  description: String,
  price: { type: Number, required: true },
  mrp: Number,
  includedServices: [String],
  validDays: Number,
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('ClinicPackage', clinicPackageSchema);
