import mongoose from 'mongoose';

/** File 13 §13.6: ward-type master (Bed.wardTypeId points here). */
const wardTypeSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true, maxlength: 120 },
  code: { type: String, default: '', maxlength: 40 },
  defaultRate: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.WardType || mongoose.model('WardType', wardTypeSchema);
