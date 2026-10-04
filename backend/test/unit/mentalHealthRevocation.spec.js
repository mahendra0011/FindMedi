/**
 * MH-M-01: consent-revocation propagation — after revoke, downstream reads
 * block (fail closed) and session free text carries deletion evidence.
 */
import {
  assertPurposeConsent,
  revokeConsentAndPropagate,
  sessionsPastRetention,
} from '../../src/services/mentalHealthConsent.js';

const referralWithConsent = () => ({
  consents: [{
    _id: 'c1', consentType: 'Treatment Consent', purposes: ['treatment', 'medication'],
    status: 'Active', grantedAt: new Date('2026-01-01T00:00:00Z'), retentionDays: 30,
  }],
  sessions: [
    { date: new Date('2026-02-01T00:00:00Z'), type: 'therapy', notes: 'patient disclosed X', consentId: 'c1', retainUntil: new Date('2026-02-02T00:00:00Z') },
    { date: new Date('2026-02-03T00:00:00Z'), type: 'therapy', notes: 'follow-up Y', consentId: 'c1', retainUntil: new Date('2027-02-03T00:00:00Z') },
  ],
});

describe('MH-M-01 revocation propagation', () => {
  it('treatment purpose is allowed before revoke and blocked after', () => {
    const referral = referralWithConsent();
    expect(assertPurposeConsent(referral, 'treatment').ok).toBe(true);
    revokeConsentAndPropagate(referral, 'c1', { now: new Date('2026-03-01T00:00:00Z'), reason: 'patient withdrew' });
    const after = assertPurposeConsent(referral, 'treatment', new Date('2026-03-02T00:00:00Z'));
    expect(after.ok).toBe(false);
    expect(after.reason).toBe('no-active-consent-for-purpose');
  });

  it('revoke purges governed session notes with deletion evidence, keeps encounter metadata', () => {
    const referral = referralWithConsent();
    const receipt = revokeConsentAndPropagate(referral, 'c1', { now: new Date('2026-03-01T00:00:00Z') });
    expect(receipt.revoked).toBe(true);
    expect(receipt.sessionsPurged).toBe(2);
    expect(receipt.evidence).toHaveLength(2);
    expect(receipt.evidence[0]).toMatchObject({ purgedAt: new Date('2026-03-01T00:00:00Z') });
    for (const s of referral.sessions) {
      expect(s.notes).toBe('');
      expect(s.purgedAt).toEqual(new Date('2026-03-01T00:00:00Z'));
      expect(s.date).toBeTruthy(); // encounter retained
      expect(s.type).toBe('therapy');
    }
    // Second revoke is stable (already purged sessions are not re-counted)
    const again = revokeConsentAndPropagate(referral, 'c1', { now: new Date('2026-03-02T00:00:00Z') });
    expect(again.sessionsPurged).toBe(0);
  });

  it('research export stays refused even before revoke (purpose binding)', () => {
    const referral = referralWithConsent();
    expect(assertPurposeConsent(referral, 'research').ok).toBe(false);
  });

  it('retention scan ignores already-purged sessions', () => {
    const referral = referralWithConsent();
    revokeConsentAndPropagate(referral, 'c1', { now: new Date('2026-03-01T00:00:00Z') });
    expect(sessionsPastRetention(referral, new Date('2026-04-01T00:00:00Z'))).toHaveLength(0);
  });
});
