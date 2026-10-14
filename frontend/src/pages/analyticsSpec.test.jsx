/**
 * Document 17 — Analytics Event Taxonomy (PHI-free) Test Suite
 * Validating:
 * 1. PII detection (phones, emails, Aadhaar, PAN, cards, long text)
 * 2. Pseudonymous HMAC identity generation (hashDistinctId)
 * 3. Consent gating and minor exclusion rules
 * 4. Sensitive medical category masking (count-only / sensitive_masked)
 * 5. Event allowlist validation and funnels
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';
import {
  track,
  identifyUser,
  looksLikePii,
  hashDistinctId,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  isSensitiveCategory,
  SENSITIVE_CATEGORIES_MASK,
  ANALYTICS_FUNNELS,
  GLOBAL_ANALYTICS_PROPERTIES,
} from '@/lib/analytics';

// Mock posthog-js
vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
  },
}));

describe('Document 17 — Analytics Event Taxonomy & PHI Shielding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. Zero-PHI and PII Detection Engine', () => {
    it('detects and flags phone numbers, emails, Aadhaar, PAN, and cards', () => {
      expect(looksLikePii('+91 9876543210')).toBe(true);
      expect(looksLikePii('9876543210')).toBe(true);
      expect(looksLikePii('patient@domain.com')).toBe(true);
      expect(looksLikePii('2345 6789 0123')).toBe(true); // Aadhaar
      expect(looksLikePii('ABCDE1234F')).toBe(true); // PAN
      expect(looksLikePii('4111 2222 3333 4444')).toBe(true); // Card
      expect(looksLikePii('a'.repeat(300))).toBe(true); // Long free text
    });

    it('allows clean coarse analytical properties', () => {
      expect(looksLikePii('dental')).toBe(false);
      expect(looksLikePii('BHO')).toBe(false);
      expect(looksLikePii('web')).toBe(false);
      expect(looksLikePii('inperson')).toBe(false);
    });

    it('generates pseudonymous distinct IDs without leaking raw user IDs', () => {
      const id1 = hashDistinctId('user_abc123');
      const id2 = hashDistinctId('user_abc123');
      const id3 = hashDistinctId('user_xyz999');

      expect(id1).toMatch(/^fm-[a-f0-9]{16}$/);
      expect(id1).toBe(id2); // deterministic
      expect(id1).not.toBe(id3); // distinct
      expect(id1).not.toContain('user_abc123');
    });
  });

  describe('2. Consent Gating & Minor Shielding', () => {
    it('rejects tracking when consent is not granted', () => {
      setAnalyticsConsent(false);
      const res = track('search_performed', { city_code: 'BHO' });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('no_consent');
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('strictly shields minors (<18) from behavioural tracking even with consent', () => {
      setAnalyticsConsent(true);
      const res = track('booking_started', { provider_type: 'dental' }, { isMinor: true });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('minors_excluded');
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('blocks identifyUser for minors', () => {
      setAnalyticsConsent(true);
      identifyUser('minor_patient_123', { isMinor: true });
      expect(posthog.identify).not.toHaveBeenCalled();
    });
  });

  describe('3. Event Allowlist & Sensitive Category Masking', () => {
    beforeEach(() => {
      setAnalyticsConsent(true);
    });

    it('rejects un-cataloged events', () => {
      const res = track('arbitrary_non_existent_event', { city_code: 'BHO' });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('unknown_event');
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('rejects events containing PII properties', () => {
      const res = track('search_performed', {
        query_type: 'typed',
        phone: '9876543210',
      });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('pii_detected');
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('masks sensitive medical categories to count-only (sensitive_masked)', () => {
      expect(isSensitiveCategory('mental_health')).toBe(true);
      expect(isSensitiveCategory('oncology')).toBe(true);
      expect(isSensitiveCategory('dental')).toBe(false);

      const res = track('search_performed', {
        category_code: 'mental_health',
        city_code: 'BHO',
      });

      expect(res.ok).toBe(true);
      expect(posthog.capture).toHaveBeenCalledWith('search_performed', expect.objectContaining({
        category_code: 'sensitive_masked',
        city_code: 'BHO',
        schema_version: '1.0',
      }));
    });

    it('passes clean regular categories without masking', () => {
      const res = track('booking_started', {
        provider_type: 'dental',
        mode: 'inperson',
      }, { userId: 'patient_42' });

      expect(res.ok).toBe(true);
      expect(posthog.capture).toHaveBeenCalledWith('booking_started', expect.objectContaining({
        provider_type: 'dental',
        mode: 'inperson',
        distinct_id: expect.stringMatching(/^fm-/),
      }));
    });
  });

  describe('4. Canonical Funnels & Global Properties', () => {
    it('defines canonical funnels across customer and provider journeys', () => {
      expect(ANALYTICS_FUNNELS.length).toBeGreaterThanOrEqual(4);
      const funnelNames = ANALYTICS_FUNNELS.map((f) => f.name);
      expect(funnelNames).toContain('Discovery to Booking');
      expect(funnelNames).toContain('Join to Live Provider');
      expect(funnelNames).toContain('Pharmacy and Lab Orders');
    });

    it('defines all 11 global context properties', () => {
      expect(GLOBAL_ANALYTICS_PROPERTIES).toContain('schema_version');
      expect(GLOBAL_ANALYTICS_PROPERTIES).toContain('distinct_id');
      expect(GLOBAL_ANALYTICS_PROPERTIES).toContain('consent_analytics');
      expect(GLOBAL_ANALYTICS_PROPERTIES).toContain('city_code');
    });
  });
});
