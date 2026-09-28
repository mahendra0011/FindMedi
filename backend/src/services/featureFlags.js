import { Unleash } from 'unleash-client';
import { PostHog } from 'posthog-node';

let unleash = null;
let posthog = null;

export function initFeatureFlags() {
  if (!process.env.UNLEASH_URL || !process.env.UNLEASH_API_TOKEN) {
    console.warn('Unleash not configured, feature flags disabled');
    return null;
  }
  
  unleash = new Unleash({
    url: process.env.UNLEASH_URL,
    clientKey: process.env.UNLEASH_API_TOKEN,
    appName: 'findmedi-backend',
    refreshInterval: 15000,
    disableMetrics: true,
  });
  
  unleash.on('error', (err) => console.error('Unleash error:', err.message));
  unleash.on('warn', (msg) => console.warn('Unleash warn:', msg));
  
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
  if (!unleash) return false;
  return unleash.isEnabled(flagName, context);
}

export function getVariant(flagName, context = {}) {
  if (!unleash) return null;
  return unleash.getVariant(flagName, context);
}

export function capturePostHogEvent(event, properties = {}) {
  if (!posthog) return;
  posthog.capture({
    event,
    properties,
  });
}