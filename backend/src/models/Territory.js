import mongoose from 'mongoose';

/**
 * Field territories (file 24 §4.5/§8): area/pincode ownership for
 * assignment + coverage/white-space maps.
 */
const territorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true, index: true },
  pincodes: [{ type: String }],
  ownerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  targets: {
    visitsPerDay: { type: Number, default: 0 },
    leadsPerWeek: { type: Number, default: 0 },
    activationsPerMonth: { type: Number, default: 0 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

territorySchema.index({ city: 1, isActive: 1 });

export default mongoose.models.Territory || mongoose.model('Territory', territorySchema);
