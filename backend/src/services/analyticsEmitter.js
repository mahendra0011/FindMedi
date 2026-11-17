/**
 * Document 17 §4.4/4.9/4.13/4.6 - server-side analytics emitter.
 *
 * Emits money/state-change events through the SAME registry scrubber the
 * ingest route uses (config/analyticsEvents.js). Fire-and-forget: analytics
 * must never slow or fail a booking/payment/join transition. Unknown events,
 * PII-carrying props, sensitive categories and minors are dropped or masked
 * by the scrubber - they are never written or forwarded.
 */
import logger from '../config/logger.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { scrubAndValidateEvent } from '../config/analyticsEvents.js';
import { getPostHog } from './featureFlags.js';

export async function emitAnalyticsEvent({
  name,
  props = {},
  userId = null,
  anonId = null,
  isMinor = false,
  platform = 'server',
  appVersion = '1.0.0',
  locale = 'en',
  sessionId = '',
} = {}) {
  const result = scrubAndValidateEvent(name, { ...props }, { userId: userId || anonId || null, isMinor });
  if (!result.ok) {
    logger.debug(`analytics emit dropped (${result.reason || 'unknown'}): ${name}`);
    return { ok: false, reason: result.reason || 'scrubbed' };
  }
  const event = result.event;
  // Persist first-party (our own store, for funnels/reporting) - never throws.
  try {
    await AnalyticsEvent.create({
      event_id: event.event_id,
      name,
      ts: new Date(event.ts),
      distinct_id: event.distinct_id || '',
      session_id: sessionId || '',
      platform,
      app_version: appVersion,
      locale,
      city_code: event.city_code || '',
      user_role: event.user_role || 'patient',
      consent: { analytics: true },
      props: { ...props },
    });
  } catch (err) {
    logger.warn(`analytics persist failed: ${err?.message || err}`);
  }
  // Forward to PostHog when configured (server-side capture) - never throws.
  try {
    const posthog = getPostHog();
    if (posthog) {
      posthog.capture({
        distinctId: event.distinct_id || 'anonymous',
        event: name,
        properties: { ...event, schema_version: event.schema_version, $source: 'server' },
      });
    }
  } catch (err) {
    logger.warn(`analytics forward failed: ${err?.message || err}`);
  }
  return { ok: true };
}
