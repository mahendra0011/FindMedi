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
}, { timestamps: true });

export default mongoose.models.CallQueue || mongoose.model('CallQueue', callQueueSchema);
