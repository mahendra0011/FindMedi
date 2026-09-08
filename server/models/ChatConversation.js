import mongoose from 'mongoose';

const chatConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  lastMessageAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export default mongoose.model('ChatConversation', chatConversationSchema);
