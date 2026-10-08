// rolesmd/18.md §7 — the ONLY way to send analytics from the client.
// Repo convention (eslint note, not a plugin rule): NEVER call
// `posthog.capture` / `posthog.identify` directly anywhere else — always go
// through `track()` / `identifyUser()` here so the event allowlist, the PII
// detector and the consent gate apply. Direct SDK calls bypass PHI scrubbing
// and will be rejected in review.
//
// Pipeline: allowlist schema (zod, unknown props stripped) → PII detector
// (phone/email/Aadhaar/PAN patterns rejected) → consent gate (localStorage)
// → posthog with pseudonymous distinct_id (hashed, no raw PII).
/* eslint-disable no-restricted-syntax -- this module is the single sanctioned
   posthog.capture/identify call-site; ban direct SDK use everywhere else. */
import posthog from 'posthog-js';
import { z } from 'zod';

export const CONSENT_KEY = 'fm_analytics_consent';
const SESSION_KEY = 'fm_analytics_session';

// --- PII detector -----------------------------------------------------------
const PHONE_RE = /(?:^|[\s,;])(?:\+?91[\s-]?)?[6-9]\d{9}(?:$|[\s,;])/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Aadhaar: 12 digits starting 2-9, spaced or contiguous. PAN: 5 letters 4 digits 1 letter.
const AADHAAR_RE = /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/;
const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;

export function looksLikePii(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.length > 200) return true; // free text never belongs in analytics
  return (
    PHONE_RE.test(value) ||
    EMAIL_RE.test(value) ||
    AADHAAR_RE.test(value.replace(/[\s-]/g, (m) => m)) ||
    PAN_RE.test(value)
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

// --- Event allowlist (must match analytics/events.yaml) ---------------------
const globalShape = {
  city_code: z.string().max(16).optional(),
  platform: z.enum(['web', 'pwa', 'android', 'ios']).optional(),
  locale: z.enum(['hi', 'en']).optional(),
  user_role: z.enum(['patient', 'provider', 'ops']).optional(),
} as const;

const EVENT_SCHEMAS: Record<string, z.ZodObject<any>> = {
  app_opened: z.object({
    ...globalShape,
    entry_point: z.enum(['direct', 'push', 'deeplink', 'seo']).optional(),
    is_first_open: z.boolean().optional(),
  }),
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
  search_performed: z.object({
    ...globalShape,
    query_type: z.enum(['typed', 'voice', 'suggestion']).optional(),
    query_length_bucket: z.string().max(16).optional(),
    result_count_bucket: z.string().max(16).optional(),
    category_code: z.string().max(64).optional(),
    has_filters: z.boolean().optional(),
  }),
  provider_viewed: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    provider_id_hash: z.string().max(128).optional(),
    source: z.string().max(64).optional(),
  }),
  booking_started: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    mode: z.enum(['inperson', 'video', 'home']).optional(),
  }),
  booking_confirmed: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    amount_bucket: z.string().max(32).optional(),
  }),
  booking_cancelled: z.object({
    ...globalShape,
    by: z.enum(['patient', 'provider', 'ops']).optional(),
    reason_code: z.string().max(64).optional(),
  }),
  order_placed: z.object({
    ...globalShape,
    order_type: z.enum(['medicine', 'otc', 'device']).optional(),
    amount_bucket: z.string().max(32).optional(),
  }),
  membership_started: z.object({
    ...globalShape,
    plan_type: z.string().max(64).optional(),
    term_months: z.number().int().min(1).max(60).optional(),
  }),
  event_registered: z.object({
    ...globalShape,
    event_type: z.string().max(64).optional(),
    fee_type: z.enum(['free', 'paid']).optional(),
  }),
  join_submitted: z.object({
    ...globalShape,
    provider_type: z.string().max(64).optional(),
    doc_count: z.number().int().min(0).max(100).optional(),
  }),
  sos_triggered: z.object({
    ...globalShape,
    type: z.enum(['medical', 'police', 'fire']).optional(),
  }),
};

export type AllowedEvent = keyof typeof EVENT_SCHEMAS;

export interface TrackResult {
  ok: boolean;
  reason?: 'unknown_event' | 'schema_rejected' | 'pii_detected' | 'no_consent';
}

export function track(
  event: string,
  props?: Record<string, unknown>,
  opts?: { userId?: string },
): TrackResult {
  const schema = EVENT_SCHEMAS[event];
  if (!schema) return { ok: false, reason: 'unknown_event' };

  const parsed = schema.safeParse(props ?? {});
  if (!parsed.success) return { ok: false, reason: 'schema_rejected' };

  // Unknown props are stripped by zod; belt-and-braces: reject PII-shaped values.
  for (const value of Object.values(parsed.data as Record<string, unknown>)) {
    if (looksLikePii(value)) return { ok: false, reason: 'pii_detected' };
  }

  if (!hasAnalyticsConsent()) return { ok: false, reason: 'no_consent' };

  try {
    posthog.capture(event, {
      ...(parsed.data as Record<string, unknown>),
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

export function identifyUser(userId: string): void {
  if (!hasAnalyticsConsent() || !userId) return;
  try {
    // Pseudonymous only — never the raw id, email or phone.
    posthog.identify(hashDistinctId(userId));
  } catch {
    // Analytics must never break the app.
  }
}
