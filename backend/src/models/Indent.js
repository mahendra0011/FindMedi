import mongoose from 'mongoose';

/**
 * File 09 §9.7: indent/requisition (fromStore → toStore) → issue → receive.
 * Issue decrements source + increments destination via StockLedger lines.
 */
const indentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  fromStoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  toStoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  items: [{
    itemId: { type: String, maxlength: 120 },
    name: { type: String, maxlength: 200 },
    batch: { type: String, default: '' },
    qty: { type: Number, required: true, min: 0 },
    issuedQty: { type: Number, default: 0, min: 0 },
  }],
  status: { type: String, enum: ['Draft', 'Requested', 'Issued', 'Received', 'Cancelled'], default: 'Draft', index: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

indentSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.Indent || mongoose.model('Indent', indentSchema);
