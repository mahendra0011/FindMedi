import mongoose from 'mongoose';

/** File 17 §17.1: saved report views (filters + columns per user). */
const savedViewSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  reportKey: { type: String, required: true },
  name: { type: String, required: true },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  columns: [{ type: String }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.SavedView || mongoose.model('SavedView', savedViewSchema);
