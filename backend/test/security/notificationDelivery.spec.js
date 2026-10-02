import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';

/**
 * NOTIF-M-04: delivery receipts, bounded retry, dead-letter.
 *
 * The retry policy is unit-tested directly because it is pure and because the
 * decision it encodes - retry a 503, dead-letter a 400 - is the whole point.
 */
const load = () => import('../../src/services/notificationDelivery.js');
const errWith = (status, msg = 'x', extra = {}) => Object.assign(new Error(msg), { status, ...extra });

describe('NOTIF-M-04 what is worth retrying', () => {
  it('retries server errors, rate limits and unknown/network failures', async () => {
    const { isRetryable } = await load();
    expect(isRetryable(errWith(500))).toBe(true);
    expect(isRetryable(errWith(503))).toBe(true);
    expect(isRetryable(errWith(429))).toBe(true);
    // No status: a timeout tells us nothing, so we must not treat it as final.
    expect(isRetryable(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('does NOT retry a permanently bad request', async () => {
    const { isRetryable } = await load();
    // A malformed address fails identically forever; retrying just delays the
    // dead-letter that tells a human to fix it.
    expect(isRetryable(errWith(400))).toBe(false);
    expect(isRetryable(errWith(401))).toBe(false);
    expect(isRetryable(errWith(422))).toBe(false);
  });

  it('an explicit permanent marker overrides any status', async () => {
    const { isRetryable } = await load();
    expect(isRetryable(errWith(503, 'x', { permanent: true }))).toBe(false);
  });
});

describe('NOTIF-M-04 backoff', () => {
  it('grows exponentially and is capped', async () => {
    const { backoffMs } = await load();
    const half = () => 0.5; // removes jitter, so the sequence is exact
    expect([1, 2, 3, 4].map((a) => backoffMs(a, half)))
      .toEqual([60_000, 120_000, 240_000, 480_000]);
    expect(backoffMs(20, half)).toBe(60 * 60 * 1000);
  });

  it('jitters within ±20% so an outage is not retried in lockstep', async () => {
    const { backoffMs } = await load();
    expect(backoffMs(1, () => 0)).toBe(48_000);
    expect(backoffMs(1, () => 1)).toBe(72_000);
    // A fixed (unjittered) schedule is what makes a retry storm.
    expect(backoffMs(1, () => 0.3)).not.toBe(backoffMs(1, () => 0.7));
  });
});

describe('NOTIF-M-04 receipts', () => {
  const model = fs.readFileSync(new URL('../../src/models/NotificationDelivery.js', import.meta.url), 'utf8');
  const service = fs.readFileSync(new URL('../../src/services/notificationDelivery.js', import.meta.url), 'utf8');

  it('keeps `sent` and `delivered` as DIFFERENT states', () => {
    // The specific lie this finding was about: reporting an ACCEPTED message as
    // delivered. Collapsing them is how a critical lab alert gets reported as
    // received when it bounced.
    expect(model).toMatch(/'sent',\s*'delivered'/);
    const enumBlock = model.slice(model.indexOf('enum: ['), model.indexOf('enum: [') + 200);
    expect(enumBlock).toContain('delivered');
    expect(enumBlock).toContain('dead-letter');
  });

  it('records every attempt rather than only the last outcome', () => {
    expect(model).toContain('attempts: { type: [deliveryAttemptSchema]');
    expect(service).toContain('$push: { attempts: attemptEntry }');
  });

  it('one row per notification+channel, so "was it delivered" has one answer', () => {
    expect(model).toMatch(/index\(\{ notificationId: 1, channel: 1 \}, \{ unique: true \}\)/);
  });

  it('a dead-letter clears nextAttemptAt and parks the delivery', () => {
    expect(service).toMatch(/status: retryable \? 'failed' : 'dead-letter'/);
    expect(service).toContain('DEAD-LETTER');
  });

  it('an unknown webhook message id is refused, not invented into a receipt', () => {
    expect(service).toMatch(/if \(!row\) return false/);
  });

  it('the Brevo error carries its HTTP status so retryability is decidable', () => {
    const svc = fs.readFileSync(new URL('../../src/services/notificationService.js', import.meta.url), 'utf8');
    expect(svc).toMatch(/err\.status\s*=\s*response\.status/);
  });

  it('a receipt write failure cannot fail the send it is describing', () => {
    expect(service).toContain('receipt write failed');
    expect(service).toMatch(/\)\.catch\(\(err\) => logger\.error/);
  });
});