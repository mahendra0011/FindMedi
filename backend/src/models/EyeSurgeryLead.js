import mongoose from 'mongoose';

// 7.md §3.2 surgery pipeline: cataract/LASIK lead → pre-op → OT → follow-ups.
// A LEAD tracker, not a surgical record — the OT itself lives in
// OperationTheatre, the clinical notes in Record. Stages move forward only;
// a cancelled lead that returns starts a new row (recurrence history matters
// for the second eye).
export const EYE_SURGERY_PROCEDURES = ['cataract', 'lasik', 'other'];
export const EYE_SIDES = ['od', 'os', 'both'];
export const EYE_SURGERY_STAGES = ['lead', 'pre_op', 'scheduled', 'completed', 'follow_up', 'cancelled'];

const eyeSurgeryLeadSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  procedure: { type: String, enum: EYE_SURGERY_PROCEDURES, required: true, index: true },
  eye: { type: String, enum: EYE_SIDES, required: true },
  stage: { type: String, enum: EYE_SURGERY_STAGES, default: 'lead', index: true },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

eyeSurgeryLeadSchema.index({ patientId: 1, createdAt: -1 });
eyeSurgeryLeadSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('EyeSurgeryLead', eyeSurgeryLeadSchema);
