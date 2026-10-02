/**
 * AUTH-M-05: signup-burst anomaly detection (account farming).
 *
 * Turnstile on /register et al. stops farms that cannot solve a challenge;
 * this stops (well — SEES) the farms that can: one IP minting ≥ threshold
 * accounts inside an hour writes `signup_burst_detected` to the audit trail.
 *
 * Pinned here:
 *   - the counter never rejects a request (shared NAT would be the victim,
 *     and detection-only means this can never become an availability bug);
 *   - per-IP isolation and the window (Redis-backed in prod, process Map in
 *     tests / Redis-down — the fallback is what runs when the cache is gone);
 *   - it NEVER throws into the signup path: an audit failure degrades the
 *     return value, it does not fail the request (the route is fire-and-forget,
 *     but the promise still resolves either way);
 *   - the wiring: both account-creation paths call it (source pin — the auth
 *     router is far too heavy to mount for two call sites, and the service
 *     itself is what carries the behaviour).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditSpy = jest.fn(async () => {});
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: auditSpy }));

const { recordSignupEvent, SIGNUP_BURST_THRESHOLD } = await import('../../src/services/authAnomalyService.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTH_SRC = fs.readFileSync(path.join(HERE, '..', '..', 'src', 'routes', 'auth.js'), 'utf8');

beforeEach(() => {
  auditSpy.mockReset();
  auditSpy.mockImplementation(async () => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('AUTH-M-05 signup burst counter', () => {
  it('stays quiet below the threshold', async () => {
    for (let i = 0; i < SIGNUP_BURST_THRESHOLD - 1; i++) {
      const r = await recordSignupEvent({ ip: '198.51.100.1', userId: `u${i}`, email: `f${i}@x.test` });
      expect(r.burst).toBe(false);
      expect(r.count).toBe(i + 1);
    }
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it('writes exactly one audit row when the window fills, and keeps counting after', async () => {
    for (let i = 0; i < SIGNUP_BURST_THRESHOLD; i++) {
      await recordSignupEvent({ ip: '198.51.100.2', userId: `u${i}`, email: `f${i}@x.test` });
    }
    expect(auditSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy).toHaveBeenCalledWith(
      'signup_burst_detected',
      `u${SIGNUP_BURST_THRESHOLD - 1}`,
      expect.objectContaining({
        ip: '198.51.100.2',
        count: SIGNUP_BURST_THRESHOLD,
        windowMinutes: 60,
      }),
    );
    // 11th farming account is still a farming account.
    const r = await recordSignupEvent({ ip: '198.51.100.2', userId: 'u-next', email: 'n@x.test' });
    expect(r.burst).toBe(true);
    expect(r.count).toBe(SIGNUP_BURST_THRESHOLD + 1);
    expect(auditSpy).toHaveBeenCalledTimes(2);
  });

  it('counts per IP — one noisy neighbour cannot frame another', async () => {
    for (let i = 0; i < SIGNUP_BURST_THRESHOLD - 1; i++) {
      await recordSignupEvent({ ip: '198.51.100.3', userId: 'farmer' });
    }
    const other = await recordSignupEvent({ ip: '198.51.100.4', userId: 'innocent' });
    expect(other.count).toBe(1);
    expect(other.burst).toBe(false);
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it('the window resets — the counter is per hour, not per lifetime', async () => {
    const t0 = Date.parse('2026-10-02T00:00:00Z');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(t0);
    for (let i = 0; i < SIGNUP_BURST_THRESHOLD; i++) {
      await recordSignupEvent({ ip: '198.51.100.5', userId: 'u' });
    }
    expect(auditSpy).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(t0 + 61 * 60 * 1000);
    const afterWindow = await recordSignupEvent({ ip: '198.51.100.5', userId: 'later' });
    expect(afterWindow.count).toBe(1);
    expect(afterWindow.burst).toBe(false);
    expect(auditSpy).toHaveBeenCalledTimes(1); // no new row from the fresh window
  });

  it('never throws into the signup path — an audit failure degrades, it does not reject', async () => {
    auditSpy.mockImplementation(async () => { throw new Error('mongo down'); });
    for (let i = 0; i < SIGNUP_BURST_THRESHOLD; i++) {
      const r = await recordSignupEvent({ ip: '198.51.100.6', userId: 'u' });
      expect(r).toBeDefined();
    }
    const r = await recordSignupEvent({ ip: '198.51.100.6', userId: 'u' });
    expect(r.count).toBeNull();
    expect(r.burst).toBe(false);
  });

  it('is wired on BOTH account-creation paths (register + google-register new account)', () => {
    const calls = AUTH_SRC.match(/recordSignupEvent\(\{ ip: req\.ip, userId: user\._id, email:/g) || [];
    expect(calls.length).toBe(2);
    // And the CAPTCHA gate it pairs with is still on the same routes.
    const gated = (AUTH_SRC.match(/router\.post\('\/(?:register|google-register|resend-otp|forgot-password)'[^)]*botProtection\(\)/g) || []);
    expect(gated.length).toBeGreaterThanOrEqual(4);
  });
});
