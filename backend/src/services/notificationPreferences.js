import NotificationPreference from '../models/NotificationPreference.js';
import NotificationAudit from '../models/NotificationAudit.js';
import { NEUTRAL_COPY } from '../lib/neutralCopy.js';
import logger from '../config/logger.js';

/**
 * NOTIF-M-02 / NOTIF-M-06: the decision layer.
 *
 * `decide()` answers "should this notification be delivered?" and returns the
 * reason either way. `record()` writes that decision to the audit trail.
 *
 * FAIL-OPEN ON ERROR, ON PURPOSE, AND ONLY WHERE IT IS SAFE
 * A preference lookup that throws must NOT drop a critical lab result or an SOS.
 * So every read failure degrades to "deliver using defaults" and is logged. The
 * asymmetry is deliberate and is the whole reason this file exists: losing a
 * preference means one extra marketing email, losing a lab alert means a patient
 * does not know to come in.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Types a user is NOT allowed to opt out of.
 *
 * SOS and emergency first, then the clinical and financial records a patient
 * must be able to see, then `token` (verification codes - suppressing those
 * locks the user out of their own account). `reminder` is here too: a medicine
 * reminder is a health intervention, not marketing.
 */
export const TRANSACTIONAL_TYPES = new Set([
  'sos', 'emergency', 'lab', 'prescription', 'appointment', 'billing',
  'payment', 'records', 'token', 'reminder', 'radiology',
]);

export const isTransactional = (type) => TRANSACTIONAL_TYPES.has(type);

/** Marketing is opt-out-able. Nothing else is. */
export const MARKETING_TYPES = new Set(['promotion', 'marketing', 'newsletter', 'campaign']);

const istMinuteOfDay = (now = new Date()) => {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
};

/**
 * Quiet-hours check that handles the window wrapping past midnight, which
 * `22:00 -> 07:00` does. A naive `start <= now <= end` is always false for a
 * night-time window, so quiet hours would silently never apply.
 */
export const inQuietHours = (quietHours, now = new Date()) => {
  if (!quietHours?.enabled) return false;
  const nowMinute = istMinuteOfDay(now);
  const { startMinute, endMinute } = quietHours;

  if (startMinute === endMinute) return false;
  if (startMinute < endMinute) return nowMinute >= startMinute && nowMinute < endMinute;
  // Wraps midnight, e.g. 22:00 -> 07:00.
  return nowMinute >= startMinute || nowMinute < endMinute;
};

export const DEFAULT_PREFERENCE = {
  channels: { inApp: true, email: true, sms: true, push: true },
  marketingOptIn: true,
  mutedTypes: [],
  quietHours: { enabled: false, startMinute: 22 * 60, endMinute: 7 * 60 },
  // 6.md §2.15 / 9.md §3: the flag itself existed on the model but was
  // unreachable - no reader returned it and no writer accepted it. Defaulted
  // here so loadPreference answers with a complete shape even before the
  // first row exists.
  discreetMode: false,
};

/** Load a user's preference, falling back to defaults on any failure. */
export const loadPreference = async (userId) => {
  try {
    const pref = await NotificationPreference.findOne({ userId: String(userId) }).lean();
    if (!pref) return { ...DEFAULT_PREFERENCE };
    return {
      channels: { ...DEFAULT_PREFERENCE.channels, ...(pref.channels || {}) },
      marketingOptIn: pref.marketingOptIn !== false,
      mutedTypes: Array.isArray(pref.mutedTypes) ? pref.mutedTypes : [],
      quietHours: { ...DEFAULT_PREFERENCE.quietHours, ...(pref.quietHours || {}) },
      discreetMode: pref.discreetMode === true,
    };
  } catch (err) {
    logger.error(`[notif] preference lookup failed for ${userId}, using defaults: ${err.message}`);
    return { ...DEFAULT_PREFERENCE };
  }
};

/**
 * 6.md §2.15 / 9.md §3: discreet mode hides WHAT, not THAT.
 *
 * The neutral wording is the model's own NEUTRAL_COPY table (the same one the
 * push hook already uses for every user), so a discreet preview reads exactly
 * like a non-discreet push payload. Two rules shape it:
 *  - `critical` is never redacted: an SOS preview that has been neutralised is
 *    an SOS somebody does not react to - same carve-out quiet hours have;
 *  - a preference read failure (null) returns the notification untouched,
 *    matching loadPreference's documented fail-open-to-defaults behaviour.
 *
 * Documents are converted before the swap: mongoose path getters are not own
 * properties, so spreading a Document would drop every field.
 */
export const applyDiscreetCopy = (notification, preference) => {
  if (!preference?.discreetMode || notification?.priority === 'critical') return notification;
  const base = typeof notification?.toObject === 'function' ? notification.toObject() : { ...notification };
  const copy = NEUTRAL_COPY[base.type] || NEUTRAL_COPY.system;
  return { ...base, title: copy.title, message: copy.body, discreet: true };
};

/**
 * Decide whether to deliver.
 * @returns {{ allow: boolean, reason: string|null }}
 */
export const decide = ({ type = 'system', priority = 'normal', channel = 'inApp', preference, now = new Date() }) => {
  const pref = preference || DEFAULT_PREFERENCE;

  // Critical bypasses every control below. An SOS that a quiet-hours rule
  // deferred to 07:00 has defeated the point of the SOS.
  if (priority === 'critical') return { allow: true, reason: null };

  if (MARKETING_TYPES.has(type) && !pref.marketingOptIn) {
    return { allow: false, reason: 'marketing-opted-out' };
  }

  if (!isTransactional(type)) {
    if (pref.mutedTypes?.includes(type)) return { allow: false, reason: 'type-muted' };
    if (inQuietHours(pref.quietHours, now)) return { allow: false, reason: 'quiet-hours' };
  }

  // `inApp` is the durable record. Blocking it would lose the notification
  // entirely, so it is only ever disabled by the user deleting it, never here.
  if (channel !== 'inApp' && pref.channels?.[channel] === false) {
    return { allow: false, reason: 'channel-disabled' };
  }

  return { allow: true, reason: null };
};

/**
 * Append one decision to the audit trail.
 *
 * Never throws: an audit write failing must not take down the delivery path it
 * is describing. The failure is logged loudly instead - an audit trail with
 * silent holes is worse than no trail, so this is a monitored gap, not a
 * safe-by-design one.
 */
export const record = async ({ userId, type, priority = 'normal', outcome, reason = null, notificationId = null, dedupKey = null, metadata = null, actor = 'system' }) => {
  try {
    await NotificationAudit.create({
      userId: String(userId),
      type,
      priority,
      outcome,
      reason,
      notificationId: notificationId ? String(notificationId) : null,
      dedupKey: dedupKey || null,
      metadata: metadata || null,
      actor,
    });
  } catch (err) {
    logger.error(`[notif] AUDIT WRITE FAILED user=${userId} type=${type} outcome=${outcome} reason=${reason}: ${err.message}`);
  }
};