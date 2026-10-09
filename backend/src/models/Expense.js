import mongoose from 'mongoose';

/**
 * File 09 §9.5: expense management (petty cash, utilities, AMC) with
 * approval + cost-center tracking for budget-vs-actual.
 */
const expenseSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  date: { type: Date, default: Date.now, index: true },
  category: { type: String, required: true, maxlength: 120 },
  costCenter: { type: String, default: '' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  amount: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  mode: { type: String, enum: ['Cash', 'Card', 'UPI', 'Bank', 'Other'], default: 'Cash' },
  attachments: [{ type: String }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Paid'], default: 'Pending', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

expenseSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
