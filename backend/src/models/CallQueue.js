import mongoose from 'mongoose';

/** File 18 §18.1: telephony queue (waiting → assigned → done/missed). */
const callQueueSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  phone: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  priority: { type: String, enum: ['normal', 'vip', 'callback'], default: 'normal' },
  status: { type: String, enum: ['waiting', 'assigned', 'done', 'missed'], default: 'waiting', index: true },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  externalId: { type: String, default: '' },
  // File 22 P1-27: DND-scrubbed callers never auto-dial; after-hours rings
  // wait as callbacks.
  dndHit: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.CallQueue || mongoose.model('CallQueue', callQueueSchema);
