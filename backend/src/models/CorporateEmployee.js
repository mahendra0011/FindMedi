import mongoose from 'mongoose';

/** File 16 §16.4: corporate employee roster (eligibility source). */
const corporateEmployeeSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  corporateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', required: true, index: true },
  name: { type: String, required: true },
  employeeId: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.CorporateEmployee || mongoose.model('CorporateEmployee', corporateEmployeeSchema);
