import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  supplierId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  email: { type: String },
  phone: { type: String, required: true },
  address: { type: String },
  gstNumber: { type: String },
  category: { type: String, enum: ['Medical Supplies', 'Pharmaceuticals', 'Surgical Instruments', 'Equipment', 'General'], default: 'General' },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }],
  rating: { type: Number, min: 1, max: 5 },
  leadTime: { type: Number, default: 7 }, // days
  paymentTerms: { type: String, default: 'Net 30' },
  isActive: { type: Boolean, default: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

supplierSchema.pre('save', async function (next) {
  if (!this.supplierId) {
    this.supplierId = `SUP-${Date.now().toString(36).slice(-6).toUpperCase()}${Math.floor(Math.random() * 36).toString(36).toUpperCase()}`;
  }
  next();
});

export default mongoose.model('Supplier', supplierSchema);