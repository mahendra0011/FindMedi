import mongoose from 'mongoose';

/**
 * File 09 §04.9: per-patient chemo cycles. BSA recorded at scheduling so
 * dose math is auditable; cytotoxic handling logged per administration.
 */
const chemoCycleSchema = new mongoose.Schema({
  protocolId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChemoProtocol', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  cycleNo: { type: Number, required: true, min: 1 },
  scheduledAt: { type: Date, default: null },
  bsa: { type: Number, default: 0 },
  doses: [{ name: { type: String }, plannedMg: { type: Number, default: 0 }, givenMg: { type: Number, default: 0 } }],
  cytotoxicLog: { type: String, maxlength: 2000, default: '' },
  status: { type: String, enum: ['Scheduled', 'Administered', 'Delayed', 'Cancelled'], default: 'Scheduled', index: true },
  administeredAt: { type: Date, default: null },
  administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

chemoCycleSchema.index({ protocolId: 1, patientId: 1, cycleNo: 1 }, { unique: true });

export default mongoose.models.ChemoCycle || mongoose.model('ChemoCycle', chemoCycleSchema);
