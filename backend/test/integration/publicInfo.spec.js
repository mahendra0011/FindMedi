import { jest as jestApi, describe, it, expect, afterEach } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const { as } = await mountApp('publicInfo');

describe('public info routes', () => {
  afterEach(() => jestApi.useRealTimers());

  it('serves seasonal reminders without authentication or personal data', async () => {
    jestApi.useFakeTimers().setSystemTime(new Date('2026-07-01T00:00:00.000Z'));
    const res = await as(null).get('/seasonal-alerts');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('public');
    expect(res.body.month).toBe(7);
    expect(res.body.liveData).toBe(false);
    expect(res.body.alerts.map((alert) => alert.key)).toContain('dengue');
    expect(JSON.stringify(res.body)).not.toMatch(/patient|profile|condition/i);
  });
});
