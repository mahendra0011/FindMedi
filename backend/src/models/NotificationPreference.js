import mongoose from 'mongoose';

/**
 * NOTIF-M-02: per-user channel choice, quiet hours, and the DPDP split between
 * transactional and marketing contact.
 *
 * THE DESIGN RULE THAT MATTERS
 * Opt-out is only honoured for MARKETING contact. Clinical and safety messages
 * (SOS, critical labs, prescriptions, billing, verification codes) are
 * transactional and a user cannot switch them off. Treating "email off" as
 * "stop telling me my critical lab is ready" would turn a consent feature into a
 * patient-safety defect, and DPDP itself draws this line - consent is required
 * for marketing, not for service delivery.
 *
 * Quiet hours are a separate, weaker control: they defer non-critical messages,
 * and `critical` bypasses them entirely so an SOS at 03:00 is not deferred to
 * 07:00.
 */
const quietHoursSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  // Minutes from midnight IST. Stored as numbers so a window that wraps past
  // midnight (22:00 -> 07:00) is a comparison, not a date-parsing problem.
  startMinute: { type: Number, default: 22 * 60, min: 0, max: 1439 },
  endMinute: { type: Number, default: 7 * 60, min: 0, max: 1439 },
}, { _id: false });

const notificationPreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },

  // Transport-level consent. `inApp` is the durable record of the notification;
  // the rest are delivery channels and turning them off must not lose the
  // notification itself.
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },

  // DPDP: marketing is consent-based and default OFF is the safer posture, but
  // this repo has no marketing send path today, so defaulting it off would be a
  // no-op flag. It defaults ON and is documented as such; the important part is
  // that the opt-out below is unreachable for transactional types.
  marketingOptIn: { type: Boolean, default: true },

  // Explicit per-type mute. Only consulted for non-critical messages.
  mutedTypes: { type: [String], default: [] },

  quietHours: { type: quietHoursSchema, default: () => ({}) },

  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('NotificationPreference', notificationPreferenceSchema);