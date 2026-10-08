import mongoose from 'mongoose';

/**
 * File 25 §10: named resource scopes (departments, wards, locations) that
 * assignment scopes reference. Seeds from Facility departments/wards.
 */
const resourceScopeSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
  type: { type: String, enum: ['department', 'ward', 'location'], required: true, index: true },
  name: { type: String, required: true, maxlength: 120 },
  key: { type: String, required: true, maxlength: 80 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResourceScope', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

resourceScopeSchema.index({ tenantId: 1, type: 1, key: 1 }, { unique: true });

export default mongoose.models.ResourceScope || mongoose.model('ResourceScope', resourceScopeSchema);
