/**
 * Document 17 — Analytics Event Taxonomy (PHI-free)
 * Frontend analytical spec dictionary, funnel definitions, and tracking exports.
 */

export {
  track,
  identifyUser,
  looksLikePii,
  hashDistinctId,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  isSensitiveCategory,
  SENSITIVE_CATEGORIES_MASK,
  EVENT_SCHEMAS,
} from './track';

export interface AnalyticsFunnel {
  name: string;
  steps: string[];
}

export const ANALYTICS_FUNNELS: AnalyticsFunnel[] = [
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
