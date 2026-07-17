import mongoose from 'mongoose';

const savedFavoriteSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refType: { type: String, enum: ['doctor', 'hospital', 'lab', 'pharmacy'], required: true },
  refId: { type: String, required: true },
  refName: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

savedFavoriteSchema.index({ patientId: 1, refType: 1, refId: 1 }, { unique: true });

export default mongoose.model('SavedFavorite', savedFavoriteSchema);
