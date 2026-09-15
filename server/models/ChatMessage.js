import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  url: { type: String, default: '' },
  type: { type: String, default: 'file' }, // image | video | audio | voice | file
  name: { type: String, default: '' },
  size: { type: Number, default: 0 },
  mimeType: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // seconds (voice/audio)
  caption: { type: String, default: '' },
}, { _id: false });

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const receiptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image', 'video', 'audio', 'voice', 'file'], default: 'text' },
  content: { type: String, default: '' },
  attachments: [attachmentSchema],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  forwarded: { type: Boolean, default: false },
  reactions: [reactionSchema],
  edited: { type: Boolean, default: false },
  deletedForEveryone: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deliveredTo: [receiptSchema],
  readBy: [receiptSchema],
  // Offline queue dedupe — client ek hi message dobara bhejta hai (network flap)
  // to server isi id se pehle wala return kar deta hai.
  clientGeneratedId: { type: String, default: '', index: true },
  expiresAt: { type: Date, default: null }, // disappearing messages (Mongo TTL)
}, { timestamps: true });

// Disappearing messages — document auto-deletes once expiresAt passes
chatMessageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } }
);
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model('ChatMessage', chatMessageSchema);

