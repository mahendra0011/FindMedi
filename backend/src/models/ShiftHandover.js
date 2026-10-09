import mongoose from 'mongoose';

/**
 * File 09 §9.2: nursing shift handover (SBAR per admission) with receiver ack.
 */
const shiftHandoverSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  wardId: { type: String, default: '', index: true },
  shift: { type: String, enum: ['Morning', 'Evening', 'Night'], required: true },
  fromNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sbar: [{
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    s: { type: String, default: '' },
    b: { type: String, default: '' },
    a: { type: String, default: '' },
    r: { type: String, default: '' },
  }],
  ackAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

shiftHandoverSchema.index({ hospitalId: 1, wardId: 1, createdAt: -1 });

export default mongoose.models.ShiftHandover || mongoose.model('ShiftHandover', shiftHandoverSchema);
