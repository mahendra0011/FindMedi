import mongoose from 'mongoose';

/** File 22 P0-5: CAPA ledger (finding → action → effectiveness review). */
const capaSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  source: { type: String, enum: ['audit', 'incident', 'assessment', 'complaint', 'other'], default: 'audit' },
  sourceRef: { type: String, default: '' },
  finding: { type: String, required: true, maxlength: 2000 },
  rootCause: { type: String, default: '', maxlength: 2000 },
  corrective: { type: String, default: '', maxlength: 2000 },
  preventive: { type: String, default: '', maxlength: 2000 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: ['Open', 'InProgress', 'Verification', 'Closed'], default: 'Open', index: true },
  effectiveness: { type: String, default: '', maxlength: 1000 },
  closedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

capaSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.Capa || mongoose.model('Capa', capaSchema);
