import mongoose from 'mongoose';

/**
 * Checklist §2: linen & laundry request. Lifecycle mirrors housekeeping
 * tasks (requested → collected → washed → processed → delivered) so the
 * ward board can show "clean linen pending" the same way it shows a dirty
 * bed. `isolationCase` mirrors the terminal-cleaning flag: an isolation
 * load is washed separately and that must be visible, not implied.
 */
export const LINEN_STATUSES = ['requested', 'collected', 'washed', 'processed', 'delivered', 'cancelled'];

const linenRequestSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  requestId: { type: String, required: true, unique: true },
  ward: { type: String, trim: true, maxlength: 120, default: '' },
  bedNumber: { type: String, trim: true, maxlength: 60, default: '' },
  items: [{
    name: { type: String, required: true, maxlength: 120 },
    qty: { type: Number, required: true, min: 1 },
  }],
  isolationCase: { type: Boolean, default: false, index: true },
  status: { type: String, enum: LINEN_STATUSES, default: 'requested', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: { type: Date },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true });

linenRequestSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.LinenRequest || mongoose.model('LinenRequest', linenRequestSchema);
