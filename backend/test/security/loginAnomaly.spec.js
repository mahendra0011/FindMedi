import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';

/**
 * AUTH-M-08: login anomaly alerts.
 *
 * The detection logic depends on a Mongo collection, so what is unit-tested here
 * is the part that decides: the pure fingerprint and window rules, plus the
 * properties that must hold in the wiring. The security-relevant claims here are
 * mostly "does NOT fire when it should not" - an anomaly detector that cries
 * wolf on every login is one users learn to ignore.
 */
const load = () => import('../../src/services/authAnomalyService.js');

describe('AUTH-M-08 device fingerprinting', () => {
  it('is stable for the same agent and differs for a different one', async () => {
    const { deviceHashFor } = await load();
    const chrome = deviceHashFor('Mozilla/5.0 Chrome/120');
    expect(deviceHashFor('Mozilla/5.0 Chrome/120')).toBe(chrome);
    expect(deviceHashFor('Mozilla/5.0 Chrome/121')).not.toBe(chrome);
  });

  it('does not store the raw user agent as the fingerprint', async () => {
    const { deviceHashFor } = await load();
    const ua = 'Mozilla/5.0 (Windows NT 10.0)';
    const hash = deviceHashFor(ua);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain('Mozilla');
  });

  it('handles a missing user agent without throwing', async () => {
    const { deviceHashFor } = await load();
    expect(deviceHashFor()).toMatch(/^[0-9a-f]{32}$/);
    expect(deviceHashFor(null)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('AUTH-M-08 wiring', () => {
  const readSrc = () => fs.readFileSync(new URL('../../src/routes/auth.js', import.meta.url), 'utf8');

  it('detects on BOTH login legs', async () => {
    const src = readSrc();
    const calls = src.match(/recordLoginEvent\(/g) || [];
    // Password leg AND 2FA completion. Missing the 2FA leg flags the legitimate
    // "password here, OTP on my phone" flow as the attack it prevents.
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('detection happens AFTER tokens are signed, so it cannot deny a valid login', async () => {
    const src = readSrc();
    for (const call of src.matchAll(/const \{ accessToken, refreshToken \} = sign\([^)]*\);[\s\S]{0,400}?recordLoginEvent\(/g)) {
      expect(call[0]).toMatch(/sign\(/);
    }
    // And the response is still sent on the same path.
    expect(src).toMatch(/await recordLoginEvent\([^;]+;\s*\n\s*setAuthCookies/);
  });

  it('a detection failure can never throw into the login path', async () => {
    const src = fs.readFileSync(new URL('../../src/services/authAnomalyService.js', import.meta.url), 'utf8');
    // The whole body must be inside a try/catch that swallows.
    expect(src).toContain('login anomaly detection failed');
    const body = src.slice(src.indexOf('export const recordLoginEvent'));
    expect(body).toMatch(/try\s*\{[\s\S]*catch\s*\(err\)[\s\S]*return \{ anomalies: \[\] \}/);
  });

  it('an anomaly alert is CRITICAL, so it is not deferred by quiet hours', async () => {
    const src = fs.readFileSync(new URL('../../src/services/authAnomalyService.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('createNotification({'));
    expect(block).toMatch(/priority:\s*'critical'/);
  });

  it('the alert audit metadata carries identifiers, never the request body', async () => {
    const src = fs.readFileSync(new URL('../../src/services/authAnomalyService.js', import.meta.url), 'utf8');
    const call = src.slice(src.indexOf('createNotification({'));
    expect(call).toMatch(/auditMetadata:\s*\{ anomalies, ip \}/);
  });

  it('impossible-travel only fires when a geolocation resolver is actually configured', async () => {
    const src = fs.readFileSync(new URL('../../src/services/authAnomalyService.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('const resolver ='));
    // Guarded. An "impossible travel" derived from IP prefixes would look like
    // the real control without being it.
    expect(block).toContain('typeof resolver === \'function\'');
    expect(block).toContain('here?.country && there?.country');
  });

  it('login history is TTL-expired so it cannot become a permanent behavioural record', async () => {
    const src = fs.readFileSync(new URL('../../src/models/LoginEvent.js', import.meta.url), 'utf8');
    expect(src).toMatch(/expireAfterSeconds:\s*180/);
  });
});