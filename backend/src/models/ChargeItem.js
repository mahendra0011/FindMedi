import mongoose from 'mongoose';

/**
 * File 09 §9.1: patient-account ledger line. Every order/procedure/bed-day
 * posts here (service layer, outbox `order.created`); final bills roll these
 * up. Reconciliation invariant: Σ ChargeItems == Σ Bill lines.
 */
const chargeItemSchema = new mongoose.Schema({
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  source: {
    type: String,
    enum: ['consult', 'lab', 'radiology', 'pharmacy', 'ot', 'bed', 'nursing', 'procedure', 'consumable', 'package', 'other'],
    required: true, index: true,
  },
  sourceRef: {
    model: { type: String, default: '' },
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  serviceCode: { type: String, default: '' },
  description: { type: String, required: true, maxlength: 300 },
  qty: { type: Number, default: 1, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 28 },
  taxAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Billed', 'Cancelled', 'Waived'], default: 'Pending', index: true },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', default: null },
  postedAt: { type: Date, default: Date.now },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedBy: { type: String, default: '' },
}, { timestamps: true });

chargeItemSchema.index({ hospitalId: 1, status: 1, createdAt: -1 });
chargeItemSchema.index({ billId: 1 });

export const chargeTotal = (qty, unitPrice, discount = 0, taxRate = 0) => {
  const base = Math.max(0, qty * unitPrice - discount);
  return { base, taxAmount: +(base * taxRate / 100).toFixed(2), amount: +(base * (1 + taxRate / 100)).toFixed(2) };
};

export default mongoose.models.ChargeItem || mongoose.model('ChargeItem', chargeItemSchema);
