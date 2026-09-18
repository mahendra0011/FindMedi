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
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Review', reviewSchema);
