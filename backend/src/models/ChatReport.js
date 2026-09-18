import mongoose from 'mongoose';

/**
 * Chat safety: user/message report. Superadmin moderation queue isse padhta hai.
 * reason: WhatsApp jaise standard reasons + free text details.
 */
const chatReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportedMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation' },
  reason: {
    type: String,
    enum: ['spam', 'abuse', 'fake_profile', 'inappropriate', 'medical_misinformation', 'scam', 'other'],
    default: 'other',
  },
  details: { type: String, default: '', maxlength: 1000 },
  messageSnapshot: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'reviewed', 'action_taken', 'dismissed'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
});

chatReportSchema.index({ reportedUserId: 1, createdAt: -1 });
chatReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ChatReport', chatReportSchema);
