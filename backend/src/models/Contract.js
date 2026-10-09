import mongoose from 'mongoose';

/** File 16 §16.5: rate/AMC/service/lease contracts with expiry sweep. */
const contractSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  kind: { type: String, enum: ['rate', 'amc', 'service', 'lease'], required: true, index: true },
  counterparty: { type: String, default: '' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  value: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true, index: true },
  terms: { type: String, default: '', maxlength: 2000 },
  documentUrl: { type: String, default: '' },
  status: { type: String, enum: ['active', 'expired', 'terminated'], default: 'active', index: true },
  // File 22 P1-18/19: rate lines + hard enforcement + asset linkage.
  lines: [{ item: { type: String, default: '' }, rate: { type: Number, default: 0, min: 0 } }],
  enforceMax: { type: Boolean, default: false },
  assetUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetUnit', default: null },
  equipmentName: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Contract || mongoose.model('Contract', contractSchema);
