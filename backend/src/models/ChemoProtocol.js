import mongoose from 'mongoose';

/**
 * File 09 §04.9: chemo protocol master (regimen, BSA-based dosing rules,
 * cycle count, day-wise drugs). Cycles reference this for planned-vs-given.
 */
const chemoProtocolSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true, maxlength: 200 },
  cancerType: { type: String, default: '' },
  totalCycles: { type: Number, default: 1, min: 1 },
  cycleDays: { type: Number, default: 21, min: 1 },
  drugs: [{
    name: { type: String },
    dosePerM2: { type: Number, default: 0 },
    unit: { type: String, default: 'mg' },
    day: { type: Number, default: 1 },
    route: { type: String, default: 'IV' },
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

chemoProtocolSchema.index({ hospitalId: 1, name: 1 });

export default mongoose.models.ChemoProtocol || mongoose.model('ChemoProtocol', chemoProtocolSchema);
