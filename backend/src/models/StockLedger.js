import mongoose from 'mongoose';

/**
 * File 09 §9.7: append-only stock movements. Balance per (store, item,
 * batch) is derived (sum in − sum out); no stored balance to drift.
 */
const stockLedgerSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  itemId: { type: String, required: true, maxlength: 120, index: true },
  batch: { type: String, default: '' },
  qtyIn: { type: Number, default: 0, min: 0 },
  qtyOut: { type: Number, default: 0, min: 0 },
  refModel: { type: String, default: '' },
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockLedgerSchema.index({ storeId: 1, itemId: 1, batch: 1 });

export default mongoose.models.StockLedger || mongoose.model('StockLedger', stockLedgerSchema);
