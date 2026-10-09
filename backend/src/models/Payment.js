import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';

const paymentSchema = new mongoose.Schema({
  transaction_id: { alias: 'transactionId', type: String, required: true },
  patient_id: { alias: 'patientId', type: String, required: true },
  patient_name: { alias: 'patientName', type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['card', 'upi', 'netbanking', 'cash', 'wallet'], default: 'card' },
  status: { type: String, enum: ['completed', 'pending', 'failed', 'refunded', 'partially_refunded'], default: 'pending' },
  invoice_id: { alias: 'invoiceId', type: String, default: '' },
  serviceType: { type: String, enum: ['appointment', 'test', 'medicine'], default: 'appointment' },
  referenceId: { type: String, default: '' },
  description: { type: String, default: '' },
  provider: { type: String, default: '' },
  // File 16 §16.2: gateway abstraction — provider-agnostic attempt ledger.
  gateway: { type: String, default: 'mock' },
  gatewayOrderId: { type: String, default: '', index: true },
  gatewayPaymentId: { type: String, default: '' },
  gatewaySignature: { type: String, default: '' },
  attempts: [{
    at: { type: Date, default: Date.now }, gateway: { type: String, default: '' },
    event: { type: String, default: '' }, payload: { type: mongoose.Schema.Types.Mixed },
  }],
  refundedAt: { type: Date, default: null },
  settledAt: { type: Date, default: null },
  lineItems: [{ name: String, price: Number, qty: Number }],
  refund_amount: { alias: 'refundAmount', type: Number, default: 0 },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
paymentSchema.index({ transaction_id: 1 }, { unique: true, sparse: true });
// Partial index me $ne supported nahi hai ($not me compile hota hai) — $gt: '' use karo.
paymentSchema.index({ referenceId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'completed', referenceId: { $type: 'string', $gt: '' } } });

// PAY-M-06: round at write time. `createPaymentSchema` only checks the number
// is positive, so without this a client-supplied 19.999999999 is stored as-is
// and only shows up as a reconciliation gap later. Applied to query updates as
// well as saves - an admin correcting an amount goes through updateOne.
paymentSchema.plugin(moneyRounding(['amount', 'refund_amount', 'lineItems[].price']));

export default mongoose.model('Payment', paymentSchema);
