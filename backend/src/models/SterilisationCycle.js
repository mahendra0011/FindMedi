import mongoose from 'mongoose';

/**
 * File 09 §9.7/06.4: CSSD cycle — collection → wash → pack → sterilise
 * (autoclave/ETO/plasma, BI/CI indicators) → store → issue → return.
 * BI fail triggers recall by load number (route layer flags linked issues).
 */
const sterilisationCycleSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  machineId: { type: String, default: '' },
  cycleNo: { type: String, required: true, index: true },
  method: { type: String, enum: ['Autoclave', 'ETO', 'Plasma', 'DryHeat'], default: 'Autoclave' },
  loadItems: [{ setId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstrumentSet' }, qty: { type: Number, default: 1 } }],
  parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
  biologicalIndicator: { type: String, enum: ['', 'Pass', 'Fail'], default: '' },
  chemicalIndicator: { type: String, enum: ['', 'Pass', 'Fail'], default: '' },
  result: { type: String, enum: ['Pending', 'Released', 'Recalled'], default: 'Pending', index: true },
  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

sterilisationCycleSchema.index({ hospitalId: 1, result: 1 });

export default mongoose.models.SterilisationCycle || mongoose.model('SterilisationCycle', sterilisationCycleSchema);
