import { describe, it, expect } from '@jest/globals';
import { assertMentalHealthAccess } from '../../src/services/mentalHealthAccess.js';

const referral = { _id: 'ref-1', patientId: 'patient-1', hospitalId: 'tenant-1' };

describe('platform access to mental-health referrals', () => {
  it.each(['superadmin', 'super_admin', 'platform_admin', 'support_l1', 'support_l2', 'dpo', 'clinical_safety'])('%s is denied without a matching active grant', (role) => {
    expect(assertMentalHealthAccess({ role, _id: 'operator-1' }, referral).ok).toBe(false);
  });

  it('allows only the exact referral or patient under an approved unexpired mental-health grant', () => {
    const user = { role: 'clinical_safety', _id: 'operator-1' };
    const grant = {
      status: 'approved', expiresAt: new Date(Date.now() + 60_000),
      subject: { type: 'mental_health', id: 'ref-1' },
    };
    expect(assertMentalHealthAccess(user, referral, { breakGlassGrant: grant })).toMatchObject({ ok: true, reason: 'approved_break_glass' });
    expect(assertMentalHealthAccess(user, referral, { breakGlassGrant: { ...grant, subject: { type: 'patient', id: 'ref-1' } } }).ok).toBe(false);
    expect(assertMentalHealthAccess(user, referral, { breakGlassGrant: { ...grant, subject: { type: 'mental_health', id: 'other-ref' } } }).ok).toBe(false);
  });

  it('keeps same-tenant treating clinicians on the clinical access path', () => {
    expect(assertMentalHealthAccess({ role: 'doctor', _id: 'doc-1', hospitalId: 'tenant-1' }, referral)).toMatchObject({ ok: true, reason: 'same_tenant_clinical' });
  });
});
