import mongoose from 'mongoose';

const documentVerificationSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderDocument', required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reviewerName: { type: String, default: '' },
  docType: { type: String, required: true, index: true },
  decision: { type: String, enum: ['verified', 'rejected', 'needs_info'], required: true, index: true },
  verificationMethod: {
    type: String,
    enum: ['manual_portal', 'api_registry', 'ocr_assisted', 'digilocker'],
    default: 'manual_portal',
  },
  registrySource: { type: String, default: '' }, // e.g., 'NMC', 'STATE_COUNCIL', 'AERB', 'DRUG_CONTROLLER', 'FSSAI'
  registryRegistrationNumber: { type: String, default: '' },
  registryCheckResult: {
    matched: { type: Boolean, default: null },
    practitionerName: { type: String, default: '' },
    registrationValid: { type: Boolean, default: null },
    details: { type: mongoose.Schema.Types.Mixed },
    checkedAt: { type: Date, default: Date.now },
  },
  rejectionReason: { type: String, default: '' },
  reviewerNotes: { type: String, default: '' },
  documentHash: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  verifiedAt: { type: Date, default: Date.now },
}, { timestamps: true });

documentVerificationSchema.index({ applicationId: 1, docType: 1 });
documentVerificationSchema.index({ reviewerId: 1, verifiedAt: -1 });

/**
 * Records an immutable audit log entry for a document review and updates the document status.
 */
documentVerificationSchema.statics.recordVerification = async function ({
  documentId,
  applicationId,
  reviewerId,
  reviewerName = '',
  docType,
  decision,
  verificationMethod = 'manual_portal',
  registrySource = '',
  registryRegistrationNumber = '',
  registryCheckResult = null,
  rejectionReason = '',
  reviewerNotes = '',
  documentHash = '',
  ip = '',
  userAgent = '',
}) {
  const audit = await this.create({
    documentId,
    applicationId,
    reviewerId,
    reviewerName,
    docType,
    decision,
    verificationMethod,
    registrySource,
    registryRegistrationNumber,
    registryCheckResult,
    rejectionReason,
    reviewerNotes,
    documentHash,
    ip,
    userAgent,
    verifiedAt: new Date(),
  });

  const { default: ProviderDocument } = await import('./ProviderDocument.js');
  const update = {
    status: decision,
    verifiedBy: reviewerId,
    verifiedAt: new Date(),
  };
  if (decision === 'rejected') {
    update.rejectionReason = rejectionReason || reviewerNotes || 'Rejected during verification';
  } else if (decision === 'verified') {
    update.rejectionReason = '';
  }

  await ProviderDocument.findByIdAndUpdate(documentId, { $set: update });

  return audit;
};

export default mongoose.model('DocumentVerification', documentVerificationSchema);
