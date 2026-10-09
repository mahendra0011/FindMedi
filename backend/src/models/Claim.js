import mongoose from 'mongoose';

/**
 * File 09 §9.6: claim file lifecycle — documents bundle, submission,
 * settlement reconciliation (UTR/TDS/short-settlement), appeal chain.
 */
const claimSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  preAuthId: { type: mongoose.Schema.Types.ObjectId, ref: 'PreAuthRequest', default: null },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  insurerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurer' },
  // File 16 §16.4: corporate billing link (additive; older claims stay null).
  corporateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', default: null, index: true },
  documents: [{ type: String }],
  submittedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['NotSubmitted', 'Submitted', 'Approved', 'Partial', 'Rejected', 'Settled', 'Appealed'],
    default: 'NotSubmitted', index: true,
  },
  queries: [{ by: { type: String, default: '' }, text: { type: String }, at: { type: Date, default: Date.now } }],
  settledAmount: { type: Number, default: 0 },
  utr: { type: String, default: '' },
  tds: { type: Number, default: 0 },
  shortSettlement: [{ reason: { type: String }, amount: { type: Number } }],
  // File 22 P1-15: proportionate deductions (room-rent cap etc.).
  deductions: [{
    kind: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    notes: { type: String, default: '', maxlength: 500 },
    at: { type: Date, default: Date.now },
  }],
  appealOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

claimSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.Claim || mongoose.model('Claim', claimSchema);
