import mongoose from 'mongoose';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function getISTDateString() {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${M}-${D}`;
}

const reviewSchema = new mongoose.Schema({
  doctorId: { type: String, required: true },
  doctorName: { type: String, required: true },
  patientName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  date: { type: String, default: () => getISTDateString() },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, default: '' },
  flaggedBy: { type: String, default: '' },
  reply: { type: String, default: '' },
  repliedAt: { type: Date },
  // REV-B-01: attribution. The review stored `{...req.body}` with no author, so a
  // review was unattributable and therefore un-actionable — which is exactly the
  // shape of reputation manipulation: post 500 five-star reviews as anyone.
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // REV-B-01: one review per patient per doctor. Without it the same account can
  // post repeatedly and a doctor's average is whatever the loudest poster chose.
  isVerifiedVisit: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// REV-B-01: one review per (patient, doctor) — the duplicate that makes reputation
// manipulation cheap is now impossible rather than merely discouraged.
reviewSchema.index(
  { doctorId: 1, patientId: 1 },
  { unique: true, partialFilterExpression: { patientId: { $type: 'objectId' } } }
);
// The public list is sorted newest-first and always paginated, so this index
// serves it directly.
reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
