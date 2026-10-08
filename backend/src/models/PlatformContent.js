import mongoose from 'mongoose';

const platformContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  version: { type: Number, default: 1 },
  publishedAt: { type: Date },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changeNotes: { type: String, default: '' },

  // 7.md 3.21: draft → medical review → publish. DEFAULT is 'published'
  // because every existing row is live with no review trail — defaulting to
  // 'draft' would unpublish the whole site on deploy, which is a rollback
  // disguised as a feature.
  status: { type: String, enum: ['draft', 'in_review', 'published'], default: 'published', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: '' },
}, { timestamps: true });

platformContentSchema.index({ updatedAt: -1 });

export default mongoose.model('PlatformContent', platformContentSchema);
