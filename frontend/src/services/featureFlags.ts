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
      persistence: 'localStorage',
      autocapture: false,
    });
    posthogInitialized = true;
  } catch {
    // Analytics must never break the app.
  }
}

export function isFeatureEnabled(flagName: string, context?: Record<string, unknown>): boolean {
  if (!unleash) return false;
  try {
    return unleash.isEnabled(flagName, context);
  } catch {
    return false;
  }
}

export function getVariant(flagName: string, context?: Record<string, unknown>) {
  if (!unleash) return null;
  try {
    return unleash.getVariant(flagName, context);
  } catch {
    return null;
  }
}

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>) {
  if (!posthogInitialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}

export function identifyPostHogUser(userId: string, traits?: Record<string, unknown>) {
  if (!posthogInitialized) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    // ignore
  }
}
