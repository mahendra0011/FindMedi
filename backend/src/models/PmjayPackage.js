import mongoose from 'mongoose';

/** File 22 P1-15: PM-JAY package rate map (procedure code → package rate). */
const pmjayPackageSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, maxlength: 40 },
  name: { type: String, required: true, maxlength: 300 },
  rate: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.PmjayPackage || mongoose.model('PmjayPackage', pmjayPackageSchema);
