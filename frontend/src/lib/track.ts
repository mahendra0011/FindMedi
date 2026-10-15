// Document 17 (rolesmd/18.md) — the ONLY way to send analytics from the client.
// Repo convention (eslint note, not a plugin rule): NEVER call
// `posthog.capture` / `posthog.identify` directly anywhere else — always go
// through `track()` / `identifyUser()` here so the event allowlist, the PII
// detector and the consent gate apply. Direct SDK calls bypass PHI scrubbing
// and will be rejected in review.
//
// Pipeline: allowlist schema (zod, unknown props stripped) → PII detector
// (phone/email/Aadhaar/PAN/Card patterns rejected) → consent gate (localStorage)
// → posthog with pseudonymous distinct_id (hashed, no raw PII).
/* eslint-disable no-restricted-syntax -- this module is the single sanctioned
   posthog.capture/identify call-site; ban direct SDK use everywhere else. */
import posthog from 'posthog-js';
import { z } from 'zod';

export const CONSENT_KEY = 'fm_analytics_consent';
const SESSION_KEY = 'fm_analytics_session';

// --- Sensitive Categories Mask (Count-only in 3rd-party analytics) -----------
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

export function isSensitiveCategory(categoryCode?: string): boolean {
  if (!categoryCode) return false;
  return SENSITIVE_CATEGORIES_MASK.includes(categoryCode.toLowerCase().trim());
}

// --- PII detector -----------------------------------------------------------
const PHONE_RE = /(?:^|[\s,;])(?:\+?91[\s-]?)?[6-9]\d{9}(?:$|[\s,;])/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Aadhaar: 12 digits starting 2-9, spaced or contiguous. PAN: 5 letters 4 digits 1 letter.
const AADHAAR_RE = /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/;
const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
const CARD_RE = /\b(?:\d{4}[ -]?){3}\d{4}\b/;

export function looksLikePii(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.length > 250) return true; // free text never belongs in analytics
  return (
    PHONE_RE.test(value) ||
    EMAIL_RE.test(value) ||
    AADHAAR_RE.test(value.replace(/[\s-]/g, '')) ||
    PAN_RE.test(value) ||
    CARD_RE.test(value)
  );
}

// --- Pseudonymous identity (HMAC stub) --------------------------------------
// distinct_id = salted hash of the user id. Raw userId/phone/email never
// leaves the browser. cyrb53-style sync hash: unlinkability is what analytics
// needs, not secrecy (mirrors services/featureFlags pseudonymize).
export function hashDistinctId(userId: string): string {
  const raw = `findmedi-analytics|${String(userId || '')}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fm-${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'noscript';
  }
}

// --- Consent gate ------------------------------------------------------------
export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(granted: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
  } catch {
    // storage unavailable — consent stays denied (fail closed)
  }
}

// --- Event allowlist (Document 17 Canonical Catalog) -------------------------
const globalShape = {
  city_code: z.string().max(16).optional(),
  platform: z.enum(['web', 'pwa', 'android', 'ios', 'server']).optional(),
  locale: z.enum(['hi', 'en']).optional(),
  user_role: z.enum(['patient', 'provider', 'ops']).optional(),
} as const;

export const EVENT_SCHEMAS: Record<string, z.ZodObject<any>> = {
  // 1. Acquisition & Session
  app_opened: z.object({
    ...globalShape,
    entry_point: z.enum(['direct', 'push', 'deeplink', 'seo']).optional(),
    is_first_open: z.boolean().optional(),
  }),
  session_started: z.object({ ...globalShape }),
  page_viewed: z.object({ ...globalShape, page_key: z.string().max(64).optional() }),
  city_selected: z.object({
    ...globalShape,
    city_code: z.string().max(16),
    method: z.enum(['manual', 'location']).optional(),
  }),
  language_changed: z.object({
    ...globalShape,
    from: z.enum(['hi', 'en']).optional(),
    to: z.enum(['hi', 'en']),
  }),
  consent_updated: z.object({
    ...globalShape,
    purpose: z.enum(['analytics', 'marketing', 'ai']),
    granted: z.boolean(),
  }),
  install_prompt_accepted: z.object({
    ...globalShape,
    platform: z.enum(['web', 'pwa', 'android', 'ios']).optional(),
  }),
  offline_mode_entered: z.object({
    ...globalShape,
    network_type: z.enum(['wifi', '4g', '3g', 'offline']).optional(),
  }),

  // 2. Search & Discovery
  search_performed: z.object({
    ...globalShape,
    query_type: z.enum(['typed', 'voice', 'suggestion']).optional(),
    query_length_bucket: z.string().max(16).optional(),
    result_count_bucket: z.string().max(16).optional(),
    category_code: z.string().max(64).optional(),
    has_filters: z.boolean().optional(),
  }),
  search_zero_results: z.object({
    ...globalShape,
    category_code: z.string().max(64).optional(),
    query_length_bucket: z.string().max(16).optional(),
  }),
  provider_card_clicked: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    rank_position: z.number().int().min(1).max(100).optional(),
    is_sponsored: z.boolean().optional(),
  }),

  // 3. Provider & Facility Detail
  provider_viewed: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    provider_id_hash: z.string().max(128).optional(),
    source: z.string().max(64).optional(),
  }),
  provider_profile_shared: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    channel: z.string().max(32).optional(),
  }),

  // 4. Booking Funnel
  booking_started: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    mode: z.enum(['inperson', 'video', 'home']).optional(),
  }),
  slot_selected: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    slot_day_offset: z.number().int().min(0).max(365).optional(),
  }),
  payment_started: z.object({
    ...globalShape,
    gateway: z.string().max(32).optional(),
    amount_bucket: z.string().max(32).optional(),
  }),
  payment_succeeded: z.object({
    ...globalShape,
    gateway: z.string().max(32).optional(),
    amount_bucket: z.string().max(32).optional(),
  }),
  payment_failed: z.object({
    ...globalShape,
    gateway: z.string().max(32).optional(),
    reason_class: z.string().max(64).optional(),
  }),
  booking_confirmed: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    amount_bucket: z.string().max(32).optional(),
  }),
  booking_completed: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    mode: z.enum(['inperson', 'video', 'home']).optional(),
    amount_bucket: z.string().max(32).optional(),
  }),
  booking_cancelled: z.object({
    ...globalShape,
    by: z.enum(['patient', 'provider', 'ops']).optional(),
    reason_code: z.string().max(64).optional(),
  }),

  // 5. Orders & Deliveries
  cart_updated: z.object({
    ...globalShape,
    item_count: z.number().int().min(0).max(100).optional(),
    has_rx_items: z.boolean().optional(),
  }),
  rx_uploaded: z.object({
    ...globalShape,
    doc_count: z.number().int().min(1).max(20).optional(),
  }),
  order_placed: z.object({
    ...globalShape,
    order_type: z.enum(['medicine', 'otc', 'device']).optional(),
    amount_bucket: z.string().max(32).optional(),
  }),
  delivery_assigned: z.object({
    ...globalShape,
    eta_bucket: z.string().max(32).optional(),
  }),
  delivery_completed: z.object({
    ...globalShape,
    duration_bucket: z.string().max(32).optional(),
  }),

  // 6. Memberships & Programs (Flow D)
  plan_viewed: z.object({
    ...globalShape,
    plan_type: z.string().max(64).optional(),
  }),
  trial_started: z.object({
    ...globalShape,
    plan_type: z.string().max(64).optional(),
  }),
  membership_started: z.object({
    ...globalShape,
    plan_type: z.string().max(64).optional(),
    term_months: z.number().int().min(1).max(60).optional(),
  }),
  membership_renewed: z.object({
    ...globalShape,
    plan_type: z.string().max(64).optional(),
  }),
  class_booked: z.object({
    ...globalShape,
    class_type: z.string().max(64).optional(),
  }),
  check_in_recorded: z.object({
    ...globalShape,
    method: z.enum(['qr', 'manual']).optional(),
  }),

  // 7. Events & Camps (Flow E)
  event_viewed: z.object({
    ...globalShape,
    event_type: z.string().max(64).optional(),
  }),
  event_registered: z.object({
    ...globalShape,
    event_type: z.string().max(64).optional(),
    fee_type: z.enum(['free', 'paid']).optional(),
  }),
  event_checked_in: z.object({
    ...globalShape,
    event_type: z.string().max(64).optional(),
  }),
  event_attended: z.object({
    ...globalShape,
    event_type: z.string().max(64).optional(),
  }),

  // 8. Records & Patient Dashboard
  record_uploaded: z.object({
    ...globalShape,
    record_type: z.string().max(32).optional(),
  }),
  record_shared: z.object({
    ...globalShape,
    record_type: z.string().max(32).optional(),
    duration_bucket: z.string().max(32).optional(),
  }),
  consent_granted: z.object({
    ...globalShape,
    purpose: z.string().max(64).optional(),
  }),
  consent_revoked: z.object({
    ...globalShape,
    purpose: z.string().max(64).optional(),
  }),
  access_log_viewed: z.object({ ...globalShape }),

  // 9. Join / Provider Onboarding
  join_landing_viewed: z.object({
    ...globalShape,
    source: z.string().max(64).optional(),
  }),
  join_type_selected: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
  }),
  join_step_completed: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    step_key: z.string().max(64).optional(),
  }),
  join_document_uploaded: z.object({
    ...globalShape,
    doc_type: z.string().max(64).optional(),
    scan_status: z.enum(['clean', 'flagged']).optional(),
  }),
  join_submitted: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    doc_count: z.number().int().min(0).max(100).optional(),
  }),
  provider_activated: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
  }),

  // 10. Provider Dashboard Usage
  pd_booking_accepted: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
  }),
  pd_availability_updated: z.object({ ...globalShape }),
  pd_payout_viewed: z.object({ ...globalShape }),

  // 11. Reviews, Support & SOS
  review_submitted: z.object({
    ...globalShape,
    rating: z.number().min(1).max(5).optional(),
    has_text: z.boolean().optional(),
  }),
  support_ticket_created: z.object({
    ...globalShape,
    category: z.string().max(64).optional(),
  }),
  dispute_opened: z.object({
    ...globalShape,
    dispute_type: z.string().max(64).optional(),
  }),
  sos_triggered: z.object({
    ...globalShape,
    type: z.enum(['medical', 'police', 'fire']).optional(),
  }),

  // 12. Notifications
  notification_sent: z.object({
    ...globalShape,
    channel: z.enum(['sms', 'whatsapp', 'email', 'push']).optional(),
    discreet: z.boolean().optional(),
  }),
  notification_opened: z.object({
    ...globalShape,
    channel: z.enum(['sms', 'whatsapp', 'email', 'push']).optional(),
  }),

  // 13. Payments & Wallet
  wallet_topup_started: z.object({
    ...globalShape,
    amount_bucket: z.string().max(32).optional(),
  }),
  coupon_applied: z.object({
    ...globalShape,
    success: z.boolean().optional(),
    reason_class: z.string().max(32).optional(),
  }),

  // 14. AI Features
  ai_chat_started: z.object({ ...globalShape }),
  ai_message_sent: z.object({
    ...globalShape,
    length_bucket: z.string().max(16).optional(),
  }),
  ai_escalated_to_emergency: z.object({ ...globalShape }),

  // 15. Technical Errors & Performance
  api_error: z.object({
    ...globalShape,
    route_group: z.string().max(64).optional(),
    status_class: z.string().max(16).optional(),
  }),
  web_vital: z.object({
    ...globalShape,
    metric: z.enum(['cls', 'lcp', 'inp', 'fid']).optional(),
    rating: z.enum(['good', 'needs_improvement', 'poor']).optional(),
  }),
};

export type AllowedEvent = keyof typeof EVENT_SCHEMAS;

export interface TrackResult {
  ok: boolean;
  reason?: 'unknown_event' | 'schema_rejected' | 'pii_detected' | 'no_consent' | 'minors_excluded';
}

export interface TrackOptions {
  userId?: string;
  isMinor?: boolean;
}

export function track(
  event: string,
  props?: Record<string, unknown>,
  opts?: TrackOptions,
): TrackResult {
  // Minor exclusion rule
  if (opts?.isMinor) {
    return { ok: false, reason: 'minors_excluded' };
  }

  // Reject if any supplied prop value looks like PII (even before unknown-key stripping)
  if (props && typeof props === 'object') {
    for (const value of Object.values(props)) {
      if (looksLikePii(value)) return { ok: false, reason: 'pii_detected' };
    }
  }

  const schema = EVENT_SCHEMAS[event];
  if (!schema) return { ok: false, reason: 'unknown_event' };

  const parsed = schema.safeParse(props ?? {});
  if (!parsed.success) return { ok: false, reason: 'schema_rejected' };

  if (!hasAnalyticsConsent()) return { ok: false, reason: 'no_consent' };

  const sanitizedProps = { ...(parsed.data as Record<string, unknown>) };

  // Mask sensitive medical categories to count-only
  if (typeof sanitizedProps.category_code === 'string' && isSensitiveCategory(sanitizedProps.category_code)) {
    sanitizedProps.category_code = 'sensitive_masked';
  }

  try {
    posthog.capture(event, {
      ...sanitizedProps,
      schema_version: '1.0',
      session_id: getSessionId(),
      consent_analytics: true,
      ...(opts?.userId ? { distinct_id: hashDistinctId(opts.userId) } : {}),
    });
  } catch {
    return { ok: false, reason: 'no_consent' };
  }
  return { ok: true };
}

export function identifyUser(userId: string, opts?: { isMinor?: boolean }): void {
  if (opts?.isMinor || !hasAnalyticsConsent() || !userId) return;
  try {
    // Pseudonymous only — never the raw id, email or phone.
    posthog.identify(hashDistinctId(userId));
  } catch {
    // Analytics must never break the app.
  }
}
