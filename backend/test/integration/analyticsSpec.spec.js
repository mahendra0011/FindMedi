import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';
import {
  ANALYTICS_EVENT_CATALOG,
  ANALYTICS_FUNNELS,
  SENSITIVE_CATEGORIES_MASK,
  GLOBAL_ANALYTICS_PROPERTIES,
  containsPii,
  generatePseudonymousId,
  scrubAndValidateEvent,
} from '../../src/config/analyticsEvents.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 17: Analytics Event Taxonomy (PHI-free) Spec API', () => {
  test('Patients cannot access analytics-spec (403)', async () => {
    await as(patient).get('/analytics-spec').expect(403);
  });

  test('Superadmin receives full PHI-free event catalog, funnels, and sensitive mask (200)', async () => {
    const res = await as(superadmin).get('/analytics-spec').expect(200);

    expect(res.body).toHaveProperty('catalog');
    expect(res.body).toHaveProperty('funnels');
    expect(res.body).toHaveProperty('sensitiveCategoriesMask');
    expect(res.body).toHaveProperty('globalProperties');

    // Catalog coverage across 15 areas
    expect(Object.keys(res.body.catalog).length).toBeGreaterThanOrEqual(12);
    expect(res.body.catalog.search).toContain('search_performed');
    expect(res.body.catalog.search).toContain('search_zero_results');
    expect(res.body.catalog.booking).toContain('booking_started');
    expect(res.body.catalog.booking).toContain('booking_completed');
    expect(res.body.catalog.join_wizard).toContain('join_submitted');

    // Funnels coverage
    expect(res.body.funnels.length).toBeGreaterThanOrEqual(4);
    const bookingFunnel = res.body.funnels.find((f) => f.name.includes('Booking'));
    expect(bookingFunnel.steps).toContain('search_performed');
    expect(bookingFunnel.steps).toContain('booking_completed');

    // Sensitive categories mask
    expect(res.body.sensitiveCategoriesMask).toContain('mental_health');
    expect(res.body.sensitiveCategoriesMask).toContain('oncology');
    expect(res.body.sensitiveCategoriesMask).toContain('sexual_health');
    expect(res.body.sensitiveCategoriesMask).toContain('fertility');
  });

  test('City manager has crm:read and can access analytics-spec (200)', async () => {
    const res = await as(cityManager).get('/analytics-spec').expect(200);
    expect(res.body.funnels.length).toBeGreaterThanOrEqual(4);
  });

  describe('Zero-PHI & PII Detection Engine', () => {
    test('containsPii flags phone numbers, emails, Aadhaar, PAN, and cards', () => {
      expect(containsPii('Patient contact: +91 9876543210')).toBe(true);
      expect(containsPii('patient.email@example.com')).toBe(true);
      expect(containsPii('2345 6789 0123')).toBe(true); // Aadhaar
      expect(containsPii('ABCDE1234F')).toBe(true); // PAN
      expect(containsPii('4111 2222 3333 4444')).toBe(true); // Card
      expect(containsPii('a'.repeat(300))).toBe(true); // Arbitrary long text
    });

    test('containsPii allows clean coarse taxonomy properties', () => {
      expect(containsPii('dental')).toBe(false);
      expect(containsPii('BHO')).toBe(false);
      expect(containsPii({ category_code: 'dental', city_code: 'BHO', count: 5 })).toBe(false);
    });

    test('generatePseudonymousId returns salted HMAC without leaking raw identity', () => {
      const id1 = generatePseudonymousId('user_12345');
      const id2 = generatePseudonymousId('user_12345');
      const id3 = generatePseudonymousId('user_67890');

      expect(id1).toMatch(/^fm-[a-f0-9]{16}$/);
      expect(id1).toBe(id2); // deterministic
      expect(id1).not.toBe(id3); // unlinkable
      expect(id1).not.toContain('user_12345');
    });

    test('scrubAndValidateEvent masks sensitive category to sensitive_masked', () => {
      const res = scrubAndValidateEvent('search_performed', {
        category_code: 'mental_health',
        city_code: 'BHO',
      }, { userId: 'usr-999' });

      expect(res.ok).toBe(true);
      expect(res.event.category_code).toBe('sensitive_masked');
      expect(res.event.distinct_id).toMatch(/^fm-/);
    });

    test('scrubAndValidateEvent excludes minors from tracking', () => {
      const res = scrubAndValidateEvent('search_performed', { category_code: 'dental' }, { isMinor: true });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('minors_excluded');
    });

    test('scrubAndValidateEvent drops unknown events and PII', () => {
      const unknown = scrubAndValidateEvent('hack_platform', {});
      expect(unknown.ok).toBe(false);
      expect(unknown.reason).toBe('unknown_event');

      const withPhone = scrubAndValidateEvent('booking_started', {
        phone: '9876543210',
      });
      expect(withPhone.ok).toBe(false);
      expect(withPhone.reason).toBe('pii_detected');
    });
  });
});
