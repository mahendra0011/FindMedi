import { describe, it, expect } from '@jest/globals';

/**
 * MIND-M-04: purpose-bound consent and session-level retention.
 *
 * Two properties worth protecting:
 *   - treatment consent must NOT imply research/insurance consent, and
 *   - a dry run must never destroy anything.
 */
const load = () => import('../../src/services/mentalHealthConsent.js');

const consent = (over = {}) => ({
  consentType: 'Treatment Consent',
  status: 'Active',
  purposes: ['treatment', 'medication'],
  retentionDays: 365,
  grantedAt: new Date('2024-01-01T00:00:00Z'),
  expiryDate: null,
  ...over,
});

const referral = (over = {}) => ({ consents: [consent()], sessions: [], ...over });

describe('MIND-M-04 purpose limitation', () => {
  it('treatment consent does not imply research or insurance consent', async () => {
    const { assertPurposeConsent } = await load();
    const r = referral();

    expect(assertPurposeConsent(r, 'treatment').ok).toBe(true);
    expect(assertPurposeConsent(r, 'medication').ok).toBe(true);
    expect(assertPurposeConsent(r, 'research')).toEqual({ ok: false, reason: 'no-active-consent-for-purpose' });
    expect(assertPurposeConsent(r, 'insurance')).toEqual({ ok: false, reason: 'no-active-consent-for-purpose' });
    expect(assertPurposeConsent(r, 'third-party-sharing').ok).toBe(false);
  });

  it('FAILS CLOSED when no consent exists at all', async () => {
    const { assertPurposeConsent } = await load();
    expect(assertPurposeConsent({ consents: [] }, 'treatment')).toEqual({ ok: false, reason: 'no-consent-on-record' });
    expect(assertPurposeConsent({}, 'treatment')).toEqual({ ok: false, reason: 'no-consent-on-record' });
  });

  it('a legacy consent with no purposes array authorises care only', async () => {
    const { assertPurposeConsent } = await load();
    // Pre-MIND-M-04 rows have no `purposes`. Defaulting them to "everything"
    // would retroactively widen every historical consent on the platform.
    const legacy = referral({ consents: [{ status: 'Active' }] });
    expect(assertPurposeConsent(legacy, 'treatment').ok).toBe(true);
    expect(assertPurposeConsent(legacy, 'research').ok).toBe(false);
  });

  it('revoked and expired consents do not authorise anything', async () => {
    const { assertPurposeConsent } = await load();
    const now = new Date('2024-06-01T00:00:00Z');

    expect(assertPurposeConsent(referral({ consents: [consent({ status: 'Revoked' })] }), 'treatment').ok).toBe(false);
    expect(assertPurposeConsent(referral({ consents: [consent({ expiryDate: new Date('2024-03-01') })] }), 'treatment', now).ok).toBe(false);
  });

  it('picks the live consent when an older one has lapsed', async () => {
    const { assertPurposeConsent } = await load();
    const r = referral({ consents: [
      consent({ expiryDate: new Date('2024-02-01') }),
      consent({ expiryDate: new Date('2026-02-01'), retentionDays: 30 }),
    ] });
    const found = assertPurposeConsent(r, 'treatment', new Date('2024-06-01'));
    expect(found.ok).toBe(true);
    expect(found.consent.retentionDays).toBe(30);
  });
});

describe('MIND-M-04 session retention', () => {
  it('stamps a deadline from the governing consent, never leaving it unset', async () => {
    const { retentionDeadlineFor, DEFAULT_RETENTION_DAYS } = await load();
    const now = new Date('2024-01-01T00:00:00Z');

    // 2024 is a leap year: Jan 1 + 90 days is 31 Jan + 29 Feb + 30 Mar = 31 March.
// (1 April would be 91 days, which is the off-by-one this caught.)
    expect(retentionDeadlineFor(consent({ retentionDays: 90, grantedAt: new Date('2024-01-01') }), now).toISOString())
      .toBe(new Date('2024-03-31T00:00:00Z').toISOString());

    // A null deadline would mean "never expires" - the opposite of the intent.
    expect(retentionDeadlineFor(consent({ retentionDays: undefined }), now).getTime())
      .toBe(now.getTime() + DEFAULT_RETENTION_DAYS * 86400000);
  });

  const past = { date: new Date('2023-01-01'), notes: 'sensitive therapy note', type: 'CBT', conductedBy: 'Dr X' };
  const future = { date: new Date('2026-01-01'), notes: 'recent note', type: 'CBT', conductedBy: 'Dr X' };

  it('finds only sessions past their deadline that still have notes', async () => {
    const { sessionsPastRetention } = await load();
    const now = new Date('2024-06-01T00:00:00Z');
    const r = { sessions: [
      { ...past, retainUntil: new Date('2024-01-01') },
      { ...past, retainUntil: new Date('2027-01-01') },
      { ...past, retainUntil: new Date('2024-01-01'), purgedAt: new Date('2024-02-01') },
      { ...past, retainUntil: new Date('2024-01-01'), notes: '   ' },
      future,
    ] };
    expect(sessionsPastRetention(r, now)).toHaveLength(1);
  });

  it('DRY RUN is the default and destroys nothing', async () => {
    const { sweepRetention } = await load();
    const r = { sessions: [{ ...past, retainUntil: new Date('2024-01-01') }] };
    const result = sweepRetention(r, { now: new Date('2024-06-01') });

    expect(result.dryRun).toBe(true);
    expect(result.eligible).toBe(1);
    expect(result.purged).toBe(0);
    expect(r.sessions[0].notes).toBe('sensitive therapy note');
  });

  it('a confirmed sweep destroys the notes but KEEPS the encounter', async () => {
    const { sweepRetention } = await load();
    const r = { sessions: [{ ...past, retainUntil: new Date('2024-01-01'), consentId: 'c1' }] };
    const result = sweepRetention(r, { dryRun: false, now: new Date('2024-06-01') });

    expect(result.purged).toBe(1);
    expect(r.sessions[0].notes).toBe('');
    expect(r.sessions[0].purgedAt).toBeInstanceOf(Date);

    // Clinical continuity: when, what, who, under which consent.
    expect(r.sessions[0].date).toEqual(past.date);
    expect(r.sessions[0].type).toBe('CBT');
    expect(r.sessions[0].conductedBy).toBe('Dr X');
    expect(r.sessions[0].consentId).toBe('c1');
  });

  it('a second sweep is a no-op', async () => {
    const { sweepRetention } = await load();
    const r = { sessions: [{ ...past, retainUntil: new Date('2024-01-01') }] };
    sweepRetention(r, { dryRun: false, now: new Date('2024-06-01') });
    expect(sweepRetention(r, { dryRun: false, now: new Date('2024-07-01') }).eligible).toBe(0);
  });

  it('reports how overdue each session is', async () => {
    const { sweepRetention } = await load();
    const r = { sessions: [{ ...past, retainUntil: new Date('2024-01-01') }] };
    expect(sweepRetention(r, { now: new Date('2024-01-11') }).details[0].daysOverdue).toBe(10);
  });
});

describe('MIND-M-04 consent renewal', () => {
  it('carries purposes and retention forward, and chains to the prior consent', async () => {
    const { buildRenewal } = await load();
    const previous = { _id: 'old-1', consentType: 'Treatment Consent', purposes: ['treatment', 'research'], retentionDays: 180 };
    const renewed = buildRenewal(previous, { signedBy: 'Dr X', retentionDays: 90 });

    expect(renewed.purposes).toEqual(['treatment', 'research']);
    expect(renewed.retentionDays).toBe(90);
    expect(renewed.renewedFrom).toBe('old-1');
    expect(renewed.status).toBe('Active');
  });

  it('a renewal with no prior purpose set falls back to care only', async () => {
    const { buildRenewal } = await load();
    expect(buildRenewal({ _id: 'old-2' }, { signedBy: 'Dr X' }).purposes).toEqual(['treatment', 'medication']);
  });
});

describe('MIND-M-04 wiring', () => {
  const readRoutes = async () => (await import('node:fs')).readFileSync(new URL('../../src/routes/mentalhealth.js', import.meta.url), 'utf8');

  it('the renewal route supersedes rather than edits the prior consent', async () => {
    const src = await readRoutes();
    // An audit trail that edits the old record cannot show what was agreed when.
    expect(src).toMatch(/previous\.status\s*=\s*'Expired'/);
    expect(src).toContain('buildRenewal(');
    expect(src).toMatch(/r\.consents\.push\(renewal\)/);
  });

  it('the sweep endpoint is dry-run unless confirm is explicitly true', async () => {
    const src = await readRoutes();
    expect(src).toContain('req.body?.confirm === true');
    expect(src).toContain('dryRun: !confirm');
    expect(src).toMatch(/adminOnly/);
  });

  it('a session cannot be written without live treatment consent', async () => {
    const src = await readRoutes();
    const block = src.slice(src.indexOf("/referrals/:id/session'"), src.indexOf('─── Medication Management'));
    expect(block).toContain("assertPurposeConsent(r, 'treatment')");
    expect(block).toContain('retainUntil');
    // The guard must come BEFORE the write.
    expect(block.indexOf('assertPurposeConsent')).toBeLessThan(block.indexOf('r.sessions.push'));
  });

  it('retention and consent state are audited, not silently mutated', async () => {
    const src = await readRoutes();
    expect(src).toContain("auditLog('mental_health_consent_renewed'");
    expect(src).toContain("auditLog('mental_health_retention_sweep'");
  });
});
