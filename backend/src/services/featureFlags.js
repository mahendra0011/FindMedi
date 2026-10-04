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

export function capturePostHogEvent(event, properties = {}) {
  if (!posthog) return;
  posthog.capture({
    event,
    properties,
  });
}
