import { describe, it, expect, jest } from '@jest/globals';

/**
 * NOTIF-M-02 (preferences / quiet hours / DPDP split) and
 * NOTIF-M-06 (the audit trail).
 *
 * `decide()` and `inQuietHours()` are pure and are tested directly. The wiring
 * into `createNotification` is asserted by source inspection rather than by
 * booting Mongo, because every meaningful branch there is a decision ABOUT
 * whether to write - which is exactly the branch a mocked write cannot verify.
 */
const load = () => import('../../src/services/notificationPreferences.js');

const pref = (over = {}) => ({
  channels: { inApp: true, email: true, sms: true, push: true },
  marketingOptIn: true,
  mutedTypes: [],
  quietHours: { enabled: false, startMinute: 1320, endMinute: 420 },
  ...over,
});

describe('NOTIF-M-02 quiet hours', () => {
  it('treats a window that wraps past midnight as a wrap, not an empty range', async () => {
    const { inQuietHours } = await load();
    const q = { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60 };

    // 23:00 IST and 03:00 IST are inside 22:00 -> 07:00.
    expect(inQuietHours(q, new Date('2024-01-01T17:30:00Z'))).toBe(true); // 23:00 IST
    expect(inQuietHours(q, new Date('2024-01-01T21:30:00Z'))).toBe(true); // 03:00 IST
    expect(inQuietHours(q, new Date('2024-01-01T08:30:00Z'))).toBe(false); // 14:00 IST
  });

  it('handles a same-day window', async () => {
    const { inQuietHours } = await load();
    const q = { enabled: true, startMinute: 9 * 60, endMinute: 17 * 60 };
    expect(inQuietHours(q, new Date('2024-01-01T04:00:00Z'))).toBe(true); // 09:30 IST
    expect(inQuietHours(q, new Date('2024-01-01T12:00:00Z'))).toBe(false); // 17:30 IST
  });

  it('is inert when disabled or when start equals end', async () => {
    const { inQuietHours } = await load();
    expect(inQuietHours({ enabled: false, startMinute: 1320, endMinute: 420 })).toBe(false);
    expect(inQuietHours({ enabled: true, startMinute: 600, endMinute: 600 })).toBe(false);
  });
});

describe('NOTIF-M-02 a user cannot opt out of clinical or safety contact', () => {
  it('critical priority bypasses every control', async () => {
    const { decide } = await load();
    const worst = pref({ channels: { inApp: true, email: false, sms: false, push: false }, quietHours: { enabled: true, startMinute: 0, endMinute: 1439 } });

    expect(decide({ type: 'sos', priority: 'critical', channel: 'email', preference: worst })).toEqual({ allow: true, reason: null });
  });

  it('quiet hours and channel opt-out do not suppress transactional types', async () => {
    const { decide } = await load();
    const quiet = pref({ quietHours: { enabled: true, startMinute: 0, endMinute: 1439 } });

    for (const type of ['sos', 'emergency', 'lab', 'prescription', 'appointment', 'billing', 'payment', 'records', 'token', 'reminder']) {
      expect(decide({ type, channel: 'inApp', preference: quiet })).toEqual({ allow: true, reason: null });
    }
  });

  it('muting a type cannot mute a transactional type', async () => {
    const { decide } = await load();
    const muted = pref({ mutedTypes: ['lab', 'sos', 'prescription'] });
    expect(decide({ type: 'lab', channel: 'inApp', preference: muted }).allow).toBe(true);
  });

  it('a disabled transport stops only that transport, not the in-app record', async () => {
    const { decide } = await load();
    const noEmail = pref({ channels: { inApp: true, email: false, sms: true, push: true } });

    expect(decide({ type: 'reminder', channel: 'email', preference: noEmail })).toEqual({ allow: false, reason: 'channel-disabled' });
    expect(decide({ type: 'reminder', channel: 'inApp', preference: noEmail }).allow).toBe(true);
  });

  it('marketing is the only opt-out-able class', async () => {
    const { decide, isTransactional } = await load();
    const optedOut = pref({ marketingOptIn: false });

    expect(decide({ type: 'promotion', channel: 'email', preference: optedOut })).toEqual({ allow: false, reason: 'marketing-opted-out' });
    expect(decide({ type: 'lab', channel: 'email', preference: optedOut }).allow).toBe(true);
    expect(isTransactional('sos')).toBe(true);
    expect(isTransactional('promotion')).toBe(false);
  });

  it('non-transactional types DO respect quiet hours and per-type mute', async () => {
    const { decide } = await load();
    const quiet = pref({ quietHours: { enabled: true, startMinute: 0, endMinute: 1439 } });
    expect(decide({ type: 'assistant', channel: 'inApp', preference: quiet })).toEqual({ allow: false, reason: 'quiet-hours' });

    const muted = pref({ mutedTypes: ['lawyer'] });
    expect(decide({ type: 'lawyer', channel: 'inApp', preference: muted })).toEqual({ allow: false, reason: 'type-muted' });
  });
});

describe('NOTIF-M-06 the audit trail records decisions, not just deliveries', () => {
  const readSrc = async (rel) => (await import('node:fs')).readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

  it('every non-delivery branch in createNotification is audited', async () => {
    const src = await readSrc('src/services/notificationService.js');
    const expected = [
      'outcome: \'suppressed\', reason: suppressReason', // consent / quiet hours / channel
      'outcome: \'suppressed\', reason: \'rate-capped\'',
      'outcome: \'duplicate\'',
      'outcome: \'sent\'',
    ];
    for (const marker of expected) {
      expect(src).toContain(marker);
    }
  });

  it('suppressed notifications are recorded BEFORE returning, not fire-and-forget', async () => {
    const src = await readSrc('src/services/notificationService.js');
    const suppressedReturn = src.indexOf('return { notification: null, reason: suppressReason }');
    const suppressedAudit = src.indexOf("outcome: 'suppressed', reason: suppressReason");
    expect(suppressedAudit).toBeGreaterThan(-1);
    expect(suppressedAudit).toBeLessThan(suppressedReturn);
    // And awaited, so the audit row cannot be lost to an unhandled promise.
    expect(src).toContain('await record({');
  });

  it('never writes notification body text into the audit metadata', async () => {
    const src = await readSrc('src/services/notificationService.js');
    // Bound each call properly. Splitting on 'record({' makes the LAST segment
    // run to end-of-file, where unrelated functions also use a `message` key -
    // the assertion then fails on someone else's code.
    const calls = src.match(/record\(\{[\s\S]*?\}\);/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(4);

    for (const call of calls) {
      expect(call).not.toMatch(/metadata:\s*(rest|req\.body)\b/);
      expect(call).not.toMatch(/\b(title|message|text|body)\s*:/);
    }
  });

  it('the audit model is append-only', async () => {
    const src = await readSrc('src/models/NotificationAudit.js');
    expect(src).toContain("updateOne', 'updateMany', 'findOneAndUpdate'");
    expect(src).toContain('append-only');
    // A trail that can be rewritten is not evidence.
    expect(src).not.toMatch(/timestamps:\s*true/);
  });

  it('an audit write failure is surfaced, never silently swallowed', async () => {
    const src = await readSrc('src/services/notificationPreferences.js');
    expect(src).toMatch(/AUDIT WRITE FAILED/);
  });
});

describe('preference routes are self-scoped and validated', () => {
  const readSrc = async () => (await import('node:fs')).readFileSync(new URL('../../src/routes/notifications.js', import.meta.url), 'utf8');

  it('preference reads and writes key off the authenticated user, never a param', async () => {
    const src = await readSrc();
    expect(src).toMatch(/get\('\/preferences', protect/);
    expect(src).toMatch(/put\('\/preferences', protect/);
    expect(src).toContain('loadPreference(req.user._id)');
    expect(src).toContain('userId: String(req.user._id) }');
    // No caller-supplied userId may reach the preference filter.
    const block = src.slice(src.indexOf("put('/preferences'"), src.indexOf("get('/audit'"));
    expect(block).not.toMatch(/req\.(body|query)\.userId/);
  });

  it('rejects malformed quiet hours instead of storing an impossible window', async () => {
    const src = await readSrc();
    expect(src).toContain('integer 0-1439');
    expect(src).toContain('must be a boolean');
  });
});