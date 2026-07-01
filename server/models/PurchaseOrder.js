import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: { type: String, required: true },
  items: [{
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    itemName: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
  }],
  subTotal: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Ordered', 'Partially Received', 'Received', 'Cancelled'], default: 'Draft' },
  expectedDelivery: { type: Date },
  receivedDate: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

purchaseOrderSchema.pre('save', async function (next) {
  this.updatedAt = new Date();
  if (!this.poNumber) {
    const count = await mongoose.models.PurchaseOrder?.countDocuments({}) || 0;
    this.poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);