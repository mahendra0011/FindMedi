import { UnleashClient } from '@unleash/proxy-client-react';
import posthog from 'posthog-js';

let unleash: UnleashClient | null = null;
let posthogInitialized = false;

export function initFeatureFlags(): UnleashClient | null {
  const unleashUrl = (import.meta as any).env?.VITE_UNLEASH_URL;
  const clientKey = (import.meta as any).env?.VITE_UNLEASH_CLIENT_KEY;

  if (!unleashUrl || !clientKey) {
    return null;
  }

  unleash = new UnleashClient({
    url: unleashUrl,
    clientKey,
    appName: 'findmedi-frontend',
    refreshInterval: 15,
    disableMetrics: true,
  });

  unleash.on('error', (err) => console.error('Unleash error:', err));
  unleash.start().catch(() => {
    // Fail-soft: flags stay off, app keeps working.
  });

  return unleash;
}

export function initPostHog() {
  const apiKey = (import.meta as any).env?.VITE_POSTHOG_API_KEY;
  const host = (import.meta as any).env?.VITE_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey || posthogInitialized) {
    return;
  }

  try {
    posthog.init(apiKey, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: false,
      // §6.6: analytics must stay pseudonymous — no cookie/localStorage identity
      // that survives logout on a shared clinic PC, no autocapture of form/PHI
      // text, no session replay of clinical screens.
      persistence: 'memory',
      autocapture: false,
      disable_session_recording: true,
    });
    posthogInitialized = true;
  } catch {
    // Analytics must never break the app.
  }
}

export function isFeatureEnabled(flagName: string, context?: Record<string, unknown>): boolean {
  if (!unleash) return false;
  try {
    // §6.7: flag context must stay pseudonymous — hash any userId/email/phone
    // the caller passes instead of shipping raw PII to the flag service.
    return unleash.isEnabled(flagName, scrubFlagContext(context));
  } catch {
    return false;
  }
}

export function getVariant(flagName: string, context?: Record<string, unknown>) {
  if (!unleash) return null;
  try {
    return unleash.getVariant(flagName, scrubFlagContext(context));
  } catch {
    return null;
  }
}

function scrubFlagContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    if (['userId', 'user_id', 'email', 'phone', 'mobile'].includes(k) && typeof v === 'string') {
      out[k] = pseudonymize(v);
      continue;
    }
    if (ANALYTICS_UNSAFE_KEY.test(k)) continue;
    out[k] = v;
  }
  return out;
}

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>) {
  if (!posthogInitialized) return;
  try {
    posthog.capture(event, scrubAnalyticsProps(properties));
  } catch {
    // ignore
  }
}

export function identifyPostHogUser(userId: string, traits?: Record<string, unknown>) {
  if (!posthogInitialized) return;
  try {
    // §6.6: analytics identity is a pseudonymous hash, never raw email/phone —
    // and traits must never carry PHI/PII (name, email, phone, diagnosis...).
    posthog.identify(pseudonymize(userId), scrubAnalyticsProps(traits));
  } catch {
    // ignore
  }
}

// §6.6: allowlist, not denylist — unknown keys (a new PHI field tomorrow) are
// dropped instead of shipped to the analytics vendor.
const ANALYTICS_SAFE_KEYS = new Set([
  'role', 'plan', 'screen', 'surface', 'flag', 'variant', 'source', 'action',
  'success', 'error_code', 'duration_ms', 'count',
]);

const ANALYTICS_UNSAFE_KEY = /(name|email|phone|mobile|address|dob|birth|age|gender|sex|aadhaar|pan|passport|voter|bank|upi|card|diagnos|disease|symptom|prescription|treatment|therapy|mental|report|lab|record|patient|doctor|hospital|clinic|otp|password|token|secret|key)/i;

function scrubAnalyticsProps(props?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (ANALYTICS_SAFE_KEYS.has(k)) {
      out[k] = v;
      continue;
    }
    if (ANALYTICS_UNSAFE_KEY.test(k)) continue;
    if (typeof v === 'string' && v.length > 200) continue;
    if (v !== null && typeof v === 'object') continue;
    out[k] = v;
  }
  return out;
}

function pseudonymize(userId: string): string {
  // Sync salted hash (cyrb53) — deterministic per user, but the raw id
  // (Mongo ObjectId / email) never leaves the browser. Not a crypto hash,
  // but analytics only needs unlinkability from the raw id, not secrecy.
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
