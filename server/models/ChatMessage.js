import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  attachments: [{
    url: { type: String },
    type: { type: String },
    name: { type: String }
  }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
}, { timestamps: true });

export default mongoose.model('ChatMessage', chatMessageSchema);
