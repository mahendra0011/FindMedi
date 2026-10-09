import mongoose from 'mongoose';

/**
 * File 09 §9.6: cashless pre-authorization with query/response thread and
 * enhancement requests against an approved amount.
 */
const preAuthSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  insurerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurer', required: true },
  policyId: { type: String, default: '' },
  estimate: { type: Number, default: 0, min: 0 },
  diagnosis: { type: String, default: '' },
  plannedProcedure: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'QueryRaised', 'Approved', 'PartiallyApproved', 'Rejected', 'Expired'],
    default: 'Draft', index: true,
  },
  queries: [{
    by: { type: String, default: '' },
    text: { type: String, maxlength: 2000 },
    at: { type: Date, default: Date.now },
    attachments: [{ type: String }],
  }],
  approvedAmount: { type: Number, default: 0 },
  validTill: { type: Date, default: null },
  enhancements: [{ amount: { type: Number }, reason: { type: String }, at: { type: Date, default: Date.now }, status: { type: String, default: 'Pending' } }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

preAuthSchema.index({ admissionId: 1, status: 1 });

export default mongoose.models.PreAuthRequest || mongoose.model('PreAuthRequest', preAuthSchema);
