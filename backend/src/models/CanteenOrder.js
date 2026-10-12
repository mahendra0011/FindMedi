import mongoose from 'mongoose';

const canteenOrderSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  orderNumber: { type: String, required: true, unique: true, index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CanteenItem', required: true },
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  paymentMethod: {
    type: String,
    enum: ['Staff Wallet', 'Cash', 'Card', 'UPI', 'Salary Deduction', 'Patient Billing'],
    default: 'Staff Wallet',
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Refunded', 'Cancelled'],
    default: 'Pending',
    index: true,
  },
  status: {
    type: String,
    enum: ['Placed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
    default: 'Placed',
    index: true,
  },
  mealTime: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
    required: true,
  },
  deliveryLocation: { type: String, maxlength: 200 },
  specialInstructions: { type: String, maxlength: 500 },
  placedAt: { type: Date, default: Date.now },
  readyAt: { type: Date },
  deliveredAt: { type: Date },
  preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

canteenOrderSchema.index({ hospitalId: 1, status: 1 });
canteenOrderSchema.index({ hospitalId: 1, placedAt: -1 });

export default mongoose.models.CanteenOrder || mongoose.model('CanteenOrder', canteenOrderSchema);
