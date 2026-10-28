import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

// The ingestion route persists through AnalyticsEvent.create(); the harness
// is DB-free, so the model is a synchronous in-memory stub that lets the specs
// assert on exactly what the scrub-and-store pipeline would have written.
const store = [];
const { app, as } = await mountApp('analytics', {
  '../../src/models/AnalyticsEvent.js': () => ({
    default: {
      create: (row) => {
        store.push(row);
        return Promise.resolve(row);
      },
    },
  }),
}, {});

const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('SITE-ANT 3.3: analytics event ingestion', () => {
  const post = (user, body) => as(user).post('/events').send(body);
  const postAnon = (body) => as(null).post('/events').send(body);

  test('accepts registered events and stores a pseudonymous, PII-free row', async () => {
    const before = store.length;
    const res = await post(patient, {
      events: [{ name: 'booking_completed', props: { tier: 'early' }, locale: 'hi', platform: 'web' }],
    }).expect(202);
    expect(res.body.accepted).toBe(1);
    expect(res.body.rejected).toEqual([]);
    const row = store[store.length - 1];
    expect(store.length).toBeGreaterThan(before);
    expect(row.name).toBe('booking_completed');
    expect(row.distinct_id).toMatch(/^fm-/);
    expect(JSON.stringify(row.props)).not.toContain('507f1f77bcf86cd799439099');
  });

  test('rejects props that carry PII', async () => {
    const res = await post(patient, {
      events: [{ name: 'page_viewed', props: { back: 'call 9876543210 now' } }],
    }).expect(202);
    expect(res.body.accepted).toBe(0);
    expect(res.body.rejected[0]).toMatchObject({ ok: false, reason: 'pii_detected' });
  });

  test('rejects unregistered event names (the registry is the gate)', async () => {
    const res = await post(patient, { events: [{ name: 'totally_made_up_event' }] }).expect(202);
    expect(res.body.rejected[0]).toMatchObject({ reason: 'unknown_event' });
  });

  test('drops with a reason the events of minors', async () => {
    const res = await postAnon({ events: [{ name: 'app_opened', is_minor: true }] }).expect(202);
    expect(res.body.rejected[0].reason).toBe('minors_excluded');
  });

  test('consent_analytics:false stores NOTHING but still answers', async () => {
    const res = await post(patient, {
      consent_analytics: false,
      events: [{ name: 'app_opened' }],
    }).expect(202);
    expect(res.body.accepted).toBe(0);
    expect(res.body.reason).toBe('consent_withdrawn');
    expect(store.find((r) => r.name === 'app_opened')).toBeUndefined();
  });

  test('malformed payloads are 400 (zod endpoint contract)', async () => {
    await as(null).post('/events').send({ events: [] }).expect(400);
    await as(null).post('/events').send({ events: [{ props: { phone: '9876543210' } }] }).expect(400);
  });
});
