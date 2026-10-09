import mongoose from 'mongoose';

/**
 * File 22 P1-16: AP vendor bill (3-way match: PO qty × GRN qty × bill).
 * Only matched lines accrue to Vendor payables + ledger.
 */
const vendorBillSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  billNo: { type: String, required: true, maxlength: 60 },
  billDate: { type: Date, default: Date.now },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  lines: [{
    item: { type: String, default: '' },
    poQty: { type: Number, default: 0 },
    grnQty: { type: Number, default: 0 },
    billQty: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0, min: 0, max: 28 },
  }],
  subTotal: { type: Number, default: 0 },
  gstTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  matchStatus: { type: String, enum: ['Matched', 'Short', 'Excess', 'Unmatched'], default: 'Unmatched', index: true },
  status: { type: String, enum: ['Draft', 'Posted', 'Paid', 'Cancelled'], default: 'Draft', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

vendorBillSchema.index({ hospitalId: 1, supplierId: 1, billNo: 1 }, { unique: true });

export default mongoose.models.VendorBill || mongoose.model('VendorBill', vendorBillSchema);
