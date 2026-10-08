import mongoose from 'mongoose';

// 7.md §3.2 eye exams: visual acuity + refraction + the resulting
// prescription (glasses/contacts), saved to the patient. Provider-owned like
// the dental rows; the patient reads their own through GET /mine.
const eyeRefractionSchema = new mongoose.Schema({
  sph: { type: Number, min: -20, max: 20 },
  cyl: { type: Number, min: -10, max: 10 },
  axis: { type: Number, min: 0, max: 180 },
  // Snellen as written ('6/6', '20/200', 'CF', 'HM') — no arithmetic is ever
  // done on it, so a string is honest storage, not laziness.
  va: { type: String, trim: true, maxlength: 12, default: '' },
}, { _id: false });

const eyeExamSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  od: { type: eyeRefractionSchema, default: {} },
  os: { type: eyeRefractionSchema, default: {} },
  iopOd: { type: Number, min: 0, max: 80 },
  iopOs: { type: Number, min: 0, max: 80 },
  diagnosis: { type: String, trim: true, maxlength: 500, default: '' },
  prescriptionIssued: { type: Boolean, default: false },
  prescriptionType: { type: String, enum: ['glasses', 'contacts', 'none'], default: 'none' },
  nextReviewDate: { type: String },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: false });

eyeExamSchema.index({ patientId: 1, recordedAt: -1 });

export default mongoose.model('EyeExam', eyeExamSchema);
