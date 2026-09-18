import mongoose from 'mongoose';

const chatConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // "Clear chat" — messages older than this timestamp are hidden for this user
  clearedFor: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date }],
  // "Delete chat" — removes the conversation from this user's list only
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Per-user typing drafts (saved on server + client localStorage)
  drafts: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String }],
  // Per-user unread counters
  unreadCounts: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, count: { type: Number, default: 0 } }],
  // Message requests — unknown sender ko pehle accept karna padta hai
  requestStatus: { type: String, enum: ['accepted', 'pending', 'declined'], default: 'accepted', index: true },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Disappearing messages timer for the whole conversation
  disappearing: {
    enabled: { type: Boolean, default: false },
    durationHours: { type: Number, default: 24 }, // 24 | 168 (7d) | 2160 (90d) | custom
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  pinnedMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  // Chat lock — per-user PIN (bcrypt hash) to hide this specific chat
  lockedBy: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, pinHash: String, hidePreview: { type: Boolean, default: true }, at: Date }],
  // Per-user chat wallpaper override
  wallpapers: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, value: String }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  lastMessageAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export default mongoose.model('ChatConversation', chatConversationSchema);

