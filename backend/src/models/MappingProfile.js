import mongoose from 'mongoose';

/** File 18 §18.2: mapping profile (external code → internal master). */
const mappingProfileSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  integrationKey: { type: String, required: true },
  domain: { type: String, required: true }, // test-code, department…
  mappings: { type: mongoose.Schema.Types.Mixed, default: {} }, // external → internal
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

mappingProfileSchema.index({ hospitalId: 1, integrationKey: 1, domain: 1 }, { unique: true });

export default mongoose.models.MappingProfile || mongoose.model('MappingProfile', mappingProfileSchema);
