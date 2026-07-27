import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  transaction_id: { type: String, required: true },
  patient_id: { type: String, required: true },
  patient_name: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['card', 'upi', 'netbanking', 'cash', 'wallet'], default: 'card' },
  status: { type: String, enum: ['completed', 'pending', 'failed', 'refunded'], default: 'completed' },
  invoice_id: { type: String, default: '' },
  serviceType: { type: String, enum: ['appointment', 'test', 'medicine'], default: 'appointment' },
  referenceId: { type: String, default: '' },
  description: { type: String, default: '' },
  provider: { type: String, default: '' },
  lineItems: [{ name: String, price: Number, qty: Number }],
  refund_amount: { type: Number, default: 0 },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});
paymentSchema.index({ transaction_id: 1 }, { unique: true, sparse: true });
paymentSchema.index({ referenceId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'completed', referenceId: { $type: "string", $ne: "" } } });

export default mongoose.model('Payment', paymentSchema);
