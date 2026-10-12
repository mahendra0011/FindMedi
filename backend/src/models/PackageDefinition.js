import mongoose from 'mongoose';

/**
 * Module #62: package inclusions/exclusions definition used by the
 * auto-billing engine (POST /api/finance/packages/evaluate-exclusions).
 * includedCodes → bundled at package price; everything else bills extra.
 */
const packageDefinitionSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  code: { type: String, required: true, maxlength: 60 },
  name: { type: String, required: true, maxlength: 200 },
  bundledPrice: { type: Number, required: true, min: 0 },
  includedCodes: [{ type: String, maxlength: 80 }],
  excludedCodes: [{ type: String, maxlength: 80 }],
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

packageDefinitionSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export default mongoose.models.PackageDefinition || mongoose.model('PackageDefinition', packageDefinitionSchema);
