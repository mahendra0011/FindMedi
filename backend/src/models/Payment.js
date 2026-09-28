import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  transaction_id: { alias: 'transactionId', type: String, required: true },
  patient_id: { alias: 'patientId', type: String, required: true },
  patient_name: { alias: 'patientName', type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['card', 'upi', 'netbanking', 'cash', 'wallet'], default: 'card' },
  status: { type: String, enum: ['completed', 'pending', 'failed', 'refunded'], default: 'completed' },
  invoice_id: { alias: 'invoiceId', type: String, default: '' },
  serviceType: { type: String, enum: ['appointment', 'test', 'medicine'], default: 'appointment' },
  referenceId: { type: String, default: '' },
  description: { type: String, default: '' },
  provider: { type: String, default: '' },
  lineItems: [{ name: String, price: Number, qty: Number }],
  refund_amount: { alias: 'refundAmount', type: Number, default: 0 },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
paymentSchema.index({ transaction_id: 1 }, { unique: true, sparse: true });
// Partial index me $ne supported nahi hai ($not me compile hota hai) — $gt: '' use karo.
paymentSchema.index({ referenceId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'completed', referenceId: { $type: 'string', $gt: '' } } });

export default mongoose.model('Payment', paymentSchema);
