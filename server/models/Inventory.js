import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: { type: String, enum: ['Medical Supplies', 'Surgical Instruments', 'Disposables', 'Stationery', 'Cleaning', 'Electrical', 'Others'], required: true },
  itemCode: { type: String, unique: true },
  unit: { type: String, enum: ['Pcs', 'Box', 'Pair', 'Set', 'Litre', 'Kg', 'Meter', 'Roll'], default: 'Pcs' },
  currentStock: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 10 },
  maxStockLevel: { type: Number, default: 500 },
  unitPrice: { type: Number, default: 0 },
  supplier: { type: String },
  location: { type: String }, // store location/rack
  expiryDate: { type: Date },
  batchNumber: { type: String },
  transactionHistory: [{
    type: { type: String, enum: ['Purchase', 'Issue', 'Return', 'Adjustment'] },
    quantity: Number,
    date: { type: Date, default: Date.now },
    reference: String,
    doneBy: String,
  }],
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Inventory', inventorySchema);