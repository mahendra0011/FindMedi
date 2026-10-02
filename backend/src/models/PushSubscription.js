import mongoose from 'mongoose';

// CHAT-M-04: Web Push (VAPID) subscription — one row per browser/device.
// This is the offline fallback for chat: socket delivery only reaches an open
// tab, so a closed app needs a standards-based push channel. Native FCM/APNs
// device tokens remain NOTIF-M-01 (needs Firebase/APNs credentials); this
// model stores web endpoints whose VAPID keys are generated locally.
const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: { type: String, default: '', maxlength: 300 },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

// A browser may re-subscribe with the same endpoint (key rotation); upsert on
// the pair so one device holds exactly one row.
pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
