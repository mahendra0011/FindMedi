import mongoose from 'mongoose';

/**
 * Community forums / patient groups (T2): peer discussion threads that are
 * NOT medical advice. Controllers run a keyword screen (crisis, danger,
 * medication instructions) before accepting a post; moderators can hide a
 * post and the hide is audited. No clinical records are stored here.
 */
export const COMMUNITY_POST_CATEGORIES = Object.freeze([
  'general', 'diabetes', 'bp', 'mental_health', 'parenting', 'elder_care', 'nutrition', 'fitness', 'recovery', 'other',
]);

const communityPostCommentSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const communityPostSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: COMMUNITY_POST_CATEGORIES, default: 'general', index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  body: { type: String, required: true, trim: true, maxlength: 8000 },
  status: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible', index: true },
  hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  comments: [communityPostCommentSchema],
}, { timestamps: true });

communityPostSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.CommunityPost || mongoose.model('CommunityPost', communityPostSchema);
