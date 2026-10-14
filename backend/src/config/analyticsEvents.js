/**
 * Document 17 — Analytics Event Taxonomy (PHI-free)
 * Strict event allowlist, global properties, sensitive category masking,
 * PII detector, and funnels. Zero Protected Health Information in telemetry.
 */

import crypto from 'crypto';

// Salt for HMAC pseudonymization (can be overridden via env var)
const ANALYTICS_SALT = process.env.ANALYTICS_SALT || 'findmedi-analytics-hmac-salt-v1';

// PII Detector Regular Expressions
export const PII_PATTERNS = {
  phone: /(?:^|[\s,;])(?:\+?91[\s-]?)?[6-9]\d{9}(?:$|[\s,;])/,
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  aadhaar: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/,
  pan: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/,
  creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b/,
};

// Sensitive medical categories masked to count-only in third-party telemetry
export const SENSITIVE_CATEGORIES_MASK = [
  'mental_health',
  'psychiatry',
  'psychology',
  'sexual_health',
  'de_addiction',
  'rehabilitation',
  'oncology',
  'fertility',
  'ivf',
  'hiv_std',
  'palliative',
  'maternity_termination',
];

export const GLOBAL_ANALYTICS_PROPERTIES = [
  'schema_version',
  'event_id',
  'ts',
  'distinct_id',
  'session_id',
  'platform',
  'app_version',
  'locale',
  'city_code',
  'user_role',
  'consent_analytics',
];

export const ANALYTICS_FUNNELS = [
  {
    name: 'Discovery to Booking',
    steps: [
      'search_performed',
      'provider_card_clicked',
      'provider_viewed',
      'booking_started',
      'slot_selected',
      'payment_succeeded',
      'booking_completed',
    ],
  },
  {
    name: 'Join to Live Provider',
    steps: [
      'join_landing_viewed',
      'join_type_selected',
      'join_step_completed',
      'join_document_uploaded',
      'join_submitted',
      'provider_activated',
      'provider_first_booking',
    ],
  },
  {
    name: 'Pharmacy and Lab Orders',
    steps: [
      'cart_updated',
      'rx_uploaded',
      'order_placed',
      'delivery_assigned',
      'delivery_completed',
    ],
  },
  {
    name: 'Recurring Memberships',
    steps: [
      'plan_viewed',
      'trial_started',
      'membership_started',
      'membership_renewed',
    ],
  },
  {
    name: 'Health Camps & Events',
    steps: [
      'event_viewed',
      'event_registered',
      'event_checked_in',
      'event_attended',
    ],
  },
];

export const ANALYTICS_EVENT_CATALOG = {
  acquisition: ['session_started', 'app_opened', 'page_viewed', 'city_selected', 'language_changed'],
  search: ['search_performed', 'search_zero_results', 'provider_card_clicked'],
  provider: ['provider_viewed', 'provider_profile_shared'],
  booking: [
    'booking_started',
    'slot_selected',
    'payment_started',
    'payment_succeeded',
    'payment_failed',
    'booking_completed',
    'booking_cancelled',
  ],
  home_and_instant: [
    'instant_request_started',
    'instant_responded',
    'home_visit_dispatched',
    'home_visit_arrived',
    'home_visit_completed',
  ],
  orders: ['cart_updated', 'rx_uploaded', 'order_placed', 'delivery_assigned', 'delivery_completed'],
  memberships: ['plan_viewed', 'trial_started', 'membership_started', 'membership_renewed', 'class_booked', 'check_in_recorded'],
  events: ['event_viewed', 'event_registered', 'event_checked_in', 'event_attended'],
  records: ['record_uploaded', 'record_shared', 'consent_granted', 'consent_revoked', 'access_log_viewed'],
  join_wizard: ['join_landing_viewed', 'join_type_selected', 'join_step_completed', 'join_document_uploaded', 'join_submitted', 'provider_activated', 'provider_first_booking'],
  provider_dashboard: ['pd_booking_accepted', 'pd_availability_updated', 'pd_payout_viewed', 'pd_review_replied'],
  trust_and_safety: ['review_submitted', 'support_ticket_created', 'dispute_opened', 'sos_triggered'],
  notifications: ['notification_sent', 'notification_delivered', 'notification_opened'],
  payments_wallet: ['wallet_topup_started', 'coupon_applied'],
  ai_features: ['ai_chat_started', 'ai_message_sent', 'ai_escalated_to_emergency'],
  errors_technical: ['api_error', 'web_vital'],
};

/**
 * Scans a value or object for PII patterns.
 */
export function containsPii(value) {
  if (!value) return false;
  if (typeof value === 'string') {
    if (value.length > 250) return true; // arbitrary long strings rejected
    return (
      PII_PATTERNS.phone.test(value) ||
      PII_PATTERNS.email.test(value) ||
      PII_PATTERNS.aadhaar.test(value.replace(/[\s-]/g, '')) ||
      PII_PATTERNS.pan.test(value) ||
      PII_PATTERNS.creditCard.test(value)
    );
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value).some((v) => containsPii(v));
  }
  if (Array.isArray(value)) {
    return value.some((v) => containsPii(v));
  }
  return false;
}

/**
 * Generates a deterministic pseudonymous distinct_id using HMAC-SHA256.
 * Raw user IDs, emails, and phone numbers are never transmitted.
 */
export function generatePseudonymousId(rawUserId, customSalt = ANALYTICS_SALT) {
  if (!rawUserId) return null;
  return `fm-${crypto
    .createHmac('sha256', customSalt)
    .update(String(rawUserId))
    .digest('hex')
    .slice(0, 16)}`;
}

/**
 * Validates an event, scrubs PII, masks sensitive categories, and attaches metadata.
 */
export function scrubAndValidateEvent(eventName, properties = {}, options = {}) {
  const { userId, isMinor = false } = options;

  // Block minors from behavioural tracking
  if (isMinor) {
    return { ok: false, reason: 'minors_excluded' };
  }

  // Check if event is in catalog
  const allEvents = Object.values(ANALYTICS_EVENT_CATALOG).flat();
  if (!allEvents.includes(eventName)) {
    return { ok: false, reason: 'unknown_event' };
  }

  // Reject if any property contains PII
  if (containsPii(properties)) {
    return { ok: false, reason: 'pii_detected' };
  }

  // Mask sensitive medical categories to count-only
  const scrubbedProps = { ...properties };
  if (scrubbedProps.category_code && SENSITIVE_CATEGORIES_MASK.includes(scrubbedProps.category_code)) {
    scrubbedProps.category_code = 'sensitive_masked';
  }

  // Attach global schema properties
  const finalEvent = {
    schema_version: '1.0',
    event_id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    distinct_id: generatePseudonymousId(userId),
    consent_analytics: true,
    ...scrubbedProps,
  };

  return { ok: true, event: finalEvent };
}
