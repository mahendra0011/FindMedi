import mongoose from 'mongoose';

const platformContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  version: { type: Number, default: 1 },
  publishedAt: { type: Date },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changeNotes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('PlatformContent', platformContentSchema);
