import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';

// Normalize any Date/string input to YYYY-MM-DD so stored strings stay
// lexically sortable and range-queryable.
function normalizeIsoDate(v) {
  if (v == null || v === '') return v;
  if (v instanceof Date) return isNaN(v.getTime()) ? v : v.toISOString().slice(0, 10);
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toISOString().slice(0, 10);
}

const billingSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: String },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  service: { type: String, required: true },
  services: [{
    id: { type: String, default: '' },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    category: { type: String, default: 'General' },
    discount: { type: Number, default: 0 },
    // File 22 P1-14: GST line data (HSN + rate snapshot at billing time).
    hsn: { type: String, default: '' },
    gstRate: { type: Number, default: 0, min: 0, max: 28 },
  }],
  source: { type: String, enum: ['manual', 'appointment', 'lab', 'pharmacy', 'ipd', 'ot', 'radiology', 'physio', 'diet'], default: 'manual' },
  amount: { type: Number, required: true },
  subTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Partial', 'Cancelled', 'Refunded'], default: 'Pending' },
  // NOTE: kept as String (not Date) deliberately — frontend writes/reads
  // YYYY-MM-DD strings and renders them directly. The setter below enforces
  // that invariant so lexical sort/range still works. Real DateTime typing
  // lands with the Postgres migration (Prisma DateTime).
  date: { type: String, required: true, set: normalizeIsoDate },
  dueDate: { type: String, set: normalizeIsoDate },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI', 'Cheque', 'Insurance', 'Online', 'Other'] },
  transactionId: { type: String },
  insuranceClaimId: { type: String },
  insuranceApprovedAmount: { type: Number, default: 0 },
  insuranceStatus: { type: String, enum: ['Not Submitted', 'Submitted', 'Approved', 'Rejected', 'Partial'], default: 'Not Submitted' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  // File 09 §9.1: episode billing (optional). billType + payerSplit + deposits
  // power interim/final bills, TPA splits and counter settlement.
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
  billType: { type: String, enum: ['Interim', 'Final', 'Pharmacy', 'Package', 'Other'], default: 'Other' },
  payerSplit: {
    patient: { type: Number, default: 0 },
    insurer: { type: Number, default: 0 },
    corporate: { type: Number, default: 0 },
  },
  counterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashCounter', default: null },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashShift', default: null },
  // File 22 P0-1: consumed discount approval (ApprovalRequest id, one-time).
  approvalRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest', default: null },
  // File 22 P1-14: split payments, GST identity, series, package, cancel audit.
  payments: [{
    mode: { type: String, enum: ['Cash', 'Card', 'UPI', 'Cheque', 'Insurance', 'Online', 'Other'], default: 'Cash' },
    amount: { type: Number, required: true, min: 0 },
    txnRef: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  }],
  gstin: { type: String, default: '' },
  invoiceSeries: { type: String, default: '' },
  packageId: { type: String, default: '' },
  packageCap: { type: Number, default: 0 },
  overage: { type: Number, default: 0 },
  cancelReason: { type: String, default: '' },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  cancelApprovalRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

billingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  this.balance = this.amount - this.paid;
  next();
});

billingSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  const update = this.getUpdate();
  if (update.amount !== undefined || update.paid !== undefined) {
    const self = this;
    this.model.findOne(this.getQuery()).then(currentDoc => {
      const amount = update.amount !== undefined ? update.amount : (currentDoc?.amount || 0);
      const paid = update.paid !== undefined ? update.paid : (currentDoc?.paid || 0);
      self.set({ balance: amount - paid });
      next();
    }).catch(() => {
      const amount = update.amount || 0;
      const paid = update.paid || 0;
      self.set({ balance: amount - paid });
      next();
    });
  } else {
    next();
  }
});

// PAY-M-06: an invoice is the figure a patient is asked to pay, so it is the
// worst place for a float artifact to survive. `quantity` is deliberately NOT
// in this list - it is a count, and rounding counts is a different bug.
//
// `price` is NOT top-level in this schema (it lives inside services[]), so
// listing it here would have been a dead entry that silently did nothing; the
// array form is what actually reaches the line items.
billingSchema.plugin(
  moneyRounding([
    'amount',
    'subTotal',
    'discount',
    'tax',
    'taxRate',
    'taxableAmount',
    'paid',
    'balance',
    'insuranceApprovedAmount',
    'services[].price',
    'services[].discount',
  ]),
);

export default mongoose.model('Billing', billingSchema);
