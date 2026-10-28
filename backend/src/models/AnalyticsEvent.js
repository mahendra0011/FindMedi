import mongoose from 'mongoose';

/**
 * SITE-ANT 3.3: the storage side of the analytics event registry
 * (analytics/events.yaml + config/analyticsEvents.js).
 *
 * The scrubber decides WHAT may be stored; this model only says WHERE and for
 * HOW LONG: pseudonymous ids only (never raw userId/phone/email — the scrubber
 * already rejects PII before a row exists), and a TTL index that guarantees the
 * 13-month retention promise even if nobody ever runs the sweep job.
 */
const analyticsEventSchema = new mongoose.Schema({
  event_id: { type: String, required: true },
  name: {
    type: String,
    required: true,
    index: true, //Analytics: allowlisted registry names only (scrubber enforces).
  },
  ts: { type: Date, required: true },
  distinct_id: { type: String, default: '', index: true },
  session_id: { type: String, default: '' },
  platform: { type: String, default: '' },
  app_version: { type: String, default: '' },
  locale: { type: String, default: '' },
  city_code: { type: String, default: '' },
  user_role: { type: String, default: '' },
  consent: { analytics: { type: Boolean, default: true } },
  props: { type: Object, default: {} },
}, { versionKey: false });

// Registry retention (events.yaml retention_months_raw: 13). The odd extra
// day stops a same-second race from "expiring" rows an analyst is reading.
analyticsEventSchema.index({ ts: 1 }, { expireAfterSeconds: 13 * 30 * 24 * 60 * 60 + 86400 });

export default mongoose.models.AnalyticsEvent
  || mongoose.model('AnalyticsEvent', analyticsEventSchema, 'analyticsevents');
