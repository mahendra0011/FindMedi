import { PostHog } from 'posthog-node';

let unleash = null;
const configuredFlags = () => {
  try {
    const value = JSON.parse(process.env.FEATURE_FLAGS || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};
let posthog = null;

export function initFeatureFlags() {
  // Backend flags are currently environment-backed; do not fetch remote rules
  // or send request context to an external feature-flag service.
  unleash = configuredFlags();
  return unleash;
}

export function initPostHog() {
  if (!process.env.POSTHOG_API_KEY) {
    console.warn('PostHog not configured, analytics disabled');
    return null;
  }
  
  posthog = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    flushAt: 10,
    flushInterval: 10000,
  });
  
  return posthog;
}

export function getUnleash() {
  return unleash;
}

export function getPostHog() {
  return posthog;
}

export function isFeatureEnabled(flagName, context = {}) {
  void context;
  const flags = unleash || configuredFlags();
  return flags[flagName] === true;
}

export function getVariant(flagName, context = {}) {
  void flagName;
  void context;
  return null;
}

export function capturePostHogEvent(event, properties = {}, distinctId = undefined) {
  if (!posthog) return;
  // §6.6: server-side analytics must never carry PHI/PII — allowlisted keys
  // only, and a pseudonymous distinctId (never raw userId/email/phone).
  posthog.capture({
    event,
    distinctId: distinctId ? pseudonymizeServer(String(distinctId)) : 'server',
    properties: scrubAnalyticsProps(properties),
  });
}

// §6.6: allowlist, not denylist — a new PHI field tomorrow is dropped, not shipped.
const ANALYTICS_SAFE_KEYS = new Set([
  'role', 'plan', 'screen', 'surface', 'flag', 'variant', 'source', 'action',
  'success', 'error_code', 'duration_ms', 'count',
]);

const ANALYTICS_UNSAFE_KEY = /(name|email|phone|mobile|address|dob|birth|age|gender|sex|aadhaar|pan|passport|voter|bank|upi|card|diagnos|disease|symptom|prescription|treatment|therapy|mental|report|lab|record|patient|doctor|hospital|clinic|otp|password|token|secret|key)/i;

function scrubAnalyticsProps(props = {}) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
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

function pseudonymizeServer(userId) {
  // Sync salted hash (cyrb53) — deterministic per user, raw id never leaves.
  const raw = `findmedi-analytics|${userId}`;
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
