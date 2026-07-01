import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  transaction_id: { type: String, required: true, unique: true },
  patient_id: { type: String, required: true },
  patient_name: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['card', 'upi', 'netbanking', 'cash'], default: 'card' },
  status: { type: String, enum: ['completed', 'pending', 'failed', 'refunded'], default: 'completed' },
  invoice_id: { type: String, default: '' },
  refund_amount: { type: Number, default: 0 },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Payment', paymentSchema);
