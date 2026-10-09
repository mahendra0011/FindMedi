import mongoose from 'mongoose';

/**
 * File 09 §9.7: goods receipt against a PO with QC gate + vendor returns.
 */
const grnSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
  invoiceNo: { type: String, default: '' },
  items: [{
    itemId: { type: String, maxlength: 120 },
    name: { type: String, maxlength: 200 },
    batch: { type: String, default: '' },
    expiry: { type: Date, default: null },
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
  }],
  qcStatus: { type: String, enum: ['Pending', 'Passed', 'Rejected'], default: 'Pending', index: true },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

grnSchema.index({ hospitalId: 1, qcStatus: 1 });

export default mongoose.models.GRN || mongoose.model('GRN', grnSchema);
