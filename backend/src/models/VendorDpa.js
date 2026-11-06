import mongoose from 'mongoose';

const vendorDpaSchema = new mongoose.Schema({
  vendorName: { type: String, required: true, trim: true, maxlength: 160 },
  serviceDescription: { type: String, required: true, maxlength: 1000 },
  dataCategories: [{ type: String, maxlength: 120 }],
  processingRegions: [{ type: String, maxlength: 120 }],
  subprocessors: [{ type: String, maxlength: 160 }],
  dpaStatus: { type: String, enum: ['not_started', 'in_review', 'signed', 'not_required', 'expired'], default: 'not_started', index: true },
  signedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null, index: true },
  nextReviewAt: { type: Date, default: null, index: true },
  dpoOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote: { type: String, default: '', maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

vendorDpaSchema.index({ vendorName: 1 }, { unique: true });
vendorDpaSchema.index({ dpaStatus: 1, nextReviewAt: 1 });

export default mongoose.models.VendorDpa || mongoose.model('VendorDpa', vendorDpaSchema);
