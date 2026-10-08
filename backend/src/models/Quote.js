import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';
import { SERVICE_MODES } from '../lib/providerTypes.js';
import { QUOTE_STATUS, QUOTE_TRANSITIONS } from '../lib/flowStates.js';

// FLOW-B (5.md 3): one row is the WHOLE conversation — the patient's request
// and, once the provider answers, the quote itself. Splitting it into
// ServiceRequest + Quote would put the only interesting invariant ("this total
// belongs to this request") across a foreign key, and every state move would
// need two writes.
//
// Both principals are stored on the row (`patientId`, `providerOwnerId`) so
// authorizeObject's `ownerFields` can prove EITHER side of the conversation
// with one document read — a two-party row cannot be expressed by ownerLoader,
// which resolves exactly one owner.

const quoteLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 300 },
  quantity: { type: Number, required: true, min: 1, max: 1000, default: 1 },
  unitPrice: { type: Number, required: true, min: 0, max: 10000000 },
  // Written by computeQuoteTotals(), never taken from the body.
  amount: { type: Number, min: 0, max: 100000000, default: 0 },
}, { _id: false });

const quoteRequestSchema = new mongoose.Schema({
  serviceDescription: { type: String, required: true, trim: true, maxlength: 4000 },
  preferredMode: { type: String, enum: SERVICE_MODES, default: 'in_person' },
  location: {
    line1: { type: String, maxlength: 200, default: '' },
    city: { type: String, maxlength: 100, default: '' },
    state: { type: String, maxlength: 100, default: '' },
    pincode: { type: String, maxlength: 10, default: '' },
  },
  budget: {
    min: { type: Number, min: 0, default: 0 },
    max: { type: Number, min: 0, default: 0 },
  },
  notes: { type: String, maxlength: 2000, default: '' },
  attachments: [{ type: String, maxlength: 400 }],
}, { _id: false });

const quoteOfferSchema = new mongoose.Schema({
  lineItems: [quoteLineItemSchema],
  subtotal: { type: Number, min: 0, default: 0 },
  gstRate: { type: Number, min: 0, max: 28, default: 0 },
  gstAmount: { type: Number, min: 0, default: 0 },
  totalAmount: { type: Number, min: 0, default: 0 },
  currency: { type: String, maxlength: 3, default: 'INR' },
  // 5.md 3: validity 48 h. `expiresAt` mirrors it at the top level so the
  // expiry query does not need a nested-path filter.
  validUntil: { type: Date },
  cancellationTerms: { type: String, maxlength: 2000, default: '' },
  notes: { type: String, maxlength: 2000, default: '' },
  sentAt: { type: Date },
}, { _id: false });

const quoteSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  // Denormalized from Provider.ownerUserId at creation (see header).
  providerOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  status: { type: String, enum: Object.values(QUOTE_STATUS), default: QUOTE_STATUS.REQUESTED, index: true },

  request: quoteRequestSchema,
  quote: quoteOfferSchema,
  expiresAt: { type: Date, default: null },

  // Why the conversation stopped: the patient's reason on decline/cancel, the
  // provider's on decline. Kept out of `request` so a later edit cannot rewrite
  // history.
  decision: {
    reason: { type: String, maxlength: 500, default: '' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: null },
  },

  // Immutable trail: every legal move, who made it. The audit log answers
  // "what happened platform-wide"; this answers "what happened to THIS row"
  // without a second collection read.
  history: [{
    from: { type: String, enum: Object.values(QUOTE_STATUS), required: true },
    to: { type: String, enum: Object.values(QUOTE_STATUS), required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, maxlength: 40, default: '' },
    note: { type: String, maxlength: 300, default: '' },
    at: { type: Date, default: Date.now },
  }],

  acceptedAt: { type: Date, default: null },
  // TODO(FLOW-B): the escrow seam. 5.md 3 wants the advance HELD here and
  // released at service start (48 h dispute window). There is no escrow
  // ledger entry to write yet — payments.js owns capture and demoPayment owns
  // holds — so the row records the intent and the amount instead of
  // pretending money moved. Wiring = Payment/Refund row keyed on quoteId.
  advance: {
    amount: { type: Number, min: 0, default: 0 },
    held: { type: Boolean, default: false },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
}, { timestamps: true });

quoteSchema.index({ patientId: 1, status: 1 });
quoteSchema.index({ providerId: 1, status: 1 });
quoteSchema.index({ providerOwnerId: 1, status: 1 });
quoteSchema.index({ status: 1, expiresAt: 1 });

// PAY-M-06: money is rounded at the write boundary, on documents AND on query
// updates, so a 19.999999999 from any path is stored as one paisa wide.
quoteSchema.plugin(moneyRounding([
  'quote.lineItems[].unitPrice',
  'quote.lineItems[].amount',
  'quote.subtotal',
  'quote.gstAmount',
  'quote.totalAmount',
  'request.budget.min',
  'request.budget.max',
  'advance.amount',
]));

export default mongoose.models.Quote || mongoose.model('Quote', quoteSchema);
