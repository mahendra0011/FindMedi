import mongoose from 'mongoose';

/**
 * Per-user chat privacy & behaviour preferences (WhatsApp-style settings hub).
 * lastSeen/online/profilePhoto/about/calls: 'everyone' | 'contacts' | 'nobody'
 */
const chatPrivacySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

  // ── Privacy: who can see what ─────────────────────────────────────────────
  lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  online: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  about: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  readReceipts: { type: Boolean, default: true },
  typingIndicator: { type: Boolean, default: true },
  recordingIndicator: { type: Boolean, default: true },
  screenshotProtection: { type: Boolean, default: false },

  // ── Calls ─────────────────────────────────────────────────────────────────
  callsPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  silenceUnknownCallers: { type: Boolean, default: false },

  // ── Notifications ─────────────────────────────────────────────────────────
  notificationsEnabled: { type: Boolean, default: true },
  messageNotifications: { type: Boolean, default: true },
  callNotifications: { type: Boolean, default: true },
  reactionNotifications: { type: Boolean, default: false },
  notificationPreview: { type: Boolean, default: true },
  notificationSound: { type: Boolean, default: true },
  notificationVibration: { type: Boolean, default: true },
  notificationBadge: { type: Boolean, default: true },
  desktopNotifications: { type: Boolean, default: true },

  // ── Chats behaviour ───────────────────────────────────────────────────────
  enterKeyBehaviour: { type: String, enum: ['send', 'newline'], default: 'send' },
  mediaVisibilityInGallery: { type: Boolean, default: true },
  keepArchivedUnmuted: { type: Boolean, default: false },
  autoArchiveInactive: { type: Boolean, default: false },
  fontScale: { type: Number, default: 100, min: 80, max: 150 },

  // ── Chat lock / app lock ──────────────────────────────────────────────────
  appLockEnabled: { type: Boolean, default: false },
  appLockScope: { type: String, enum: ['always', '1min', '30min', 'never'], default: 'always' },
  appLockPinHash: { type: String, default: '' },
  appLockBiometric: { type: Boolean, default: false },
  hideLockedNotifications: { type: Boolean, default: true },

  // ── Message requests (unknown senders) ────────────────────────────────────
  messageRequestsEnabled: { type: Boolean, default: true },
  requestPolicy: { type: String, enum: ['accept', 'ask', 'block'], default: 'ask' },

  // ── Appearance ────────────────────────────────────────────────────────────
  appearance: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    accent: { type: String, default: 'emerald' },
    wallpaper: { type: String, default: 'default' },
    bubbleStyle: { type: String, enum: ['rounded', 'classic', 'compact'], default: 'rounded' },
    density: { type: String, enum: ['comfortable', 'compact'], default: 'comfortable' },
    animations: { type: Boolean, default: true },
    reduceMotion: { type: Boolean, default: false },
  },

  // ─ Storage & data ────────────────────────────────────────────────────────
  mediaQuality: { type: String, enum: ['standard', 'hd', 'original'], default: 'standard' },
  autoDownload: {
    mobileData: { photos: { type: Boolean, default: true }, videos: { type: Boolean, default: false }, documents: { type: Boolean, default: false }, audio: { type: Boolean, default: true } },
    wifi: { photos: { type: Boolean, default: true }, videos: { type: Boolean, default: true }, documents: { type: Boolean, default: true }, audio: { type: Boolean, default: true } },
    roaming: { photos: { type: Boolean, default: false }, videos: { type: Boolean, default: false }, documents: { type: Boolean, default: false }, audio: { type: Boolean, default: false } },
  },
  autoDeleteDownloaded: { type: Boolean, default: false },

  // ─ Backup ────────────────────────────────────────────────────────────────
  backup: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'off'], default: 'off' },
    includeVideos: { type: Boolean, default: false },
    encrypted: { type: Boolean, default: true },
    lastBackupAt: { type: Date, default: null },
  },
}, { timestamps: true });

export default mongoose.model('ChatPrivacy', chatPrivacySchema);
