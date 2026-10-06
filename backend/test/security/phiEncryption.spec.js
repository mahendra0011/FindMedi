import { describe, it, expect, beforeEach } from '@jest/globals';

// P2-9: PHI field-encryption wiring gates (DB-free). Crypto round-trips run
// against the per-boot dev key; production uses FIELD_ENCRYPTION_KEY(S).

describe('phiFields helpers', () => {
  let phi;
  let fle;
  beforeEach(async () => {
    phi = await import('../../src/utils/phiFields.js');
    fle = await import('../../src/utils/fieldEncryption.js');
  });

  it('encrypt/decrypt round-trips per model+field AAD', () => {
    const c = phi.encryptPhi('AssistantProfile', 'govtIdNumber', 'ABCDE1234F');
    expect(c).not.toBe('ABCDE1234F');
    expect(fle.isEncrypted(c)).toBe(true);
    expect(phi.decryptPhi('AssistantProfile', 'govtIdNumber', c)).toBe('ABCDE1234F');
  });

  it('is idempotent and passes empty/legacy values through', () => {
    const c = phi.encryptPhi('RiderProfile', 'govtIdNumber', 'XYZ123');
    expect(phi.encryptPhi('RiderProfile', 'govtIdNumber', c)).toBe(c);
    expect(phi.encryptPhi('RiderProfile', 'govtIdNumber', '')).toBe('');
    expect(phi.decryptPhi('RiderProfile', 'govtIdNumber', 'PLAINTEXT-LEGACY')).toBe('PLAINTEXT-LEGACY');
    expect(phi.decryptPhi('RiderProfile', 'govtIdNumber', '')).toBe('');
  });

  it('cross-model/field transplant fails closed (no crash, no leak)', () => {
    const c = phi.encryptPhi('AssistantProfile', 'govtIdNumber', 'ABCDE1234F');
    expect(phi.decryptPhi('RiderProfile', 'govtIdNumber', c)).toBe('');
    expect(phi.decryptPhi('AssistantProfile', 'bankDetails.accountNumber', c)).toBe('');
  });

  it('blind index is deterministic and case-insensitive', () => {
    expect(phi.phiBlindIndex('abcde1234f')).toBe(phi.phiBlindIndex('ABCDE1234F'));
    expect(phi.phiBlindIndex('ABCDE1234F')).not.toBe(phi.phiBlindIndex('ABCDE1234G'));
    expect(phi.normalizeGovtId('  abc 123 ')).toBe('ABC 123');
  });

  it('encryptBankDetails encrypts secrets, keeps holder plaintext', () => {
    const out = phi.encryptBankDetails('LawyerProfile', {
      accountHolder: 'A Sharma', accountNumber: '1234567890', ifsc: 'HDFC0001', upiId: 'a@upi',
    });
    expect(out.accountHolder).toBe('A Sharma');
    for (const f of ['accountNumber', 'ifsc', 'upiId']) {
      expect(fle.isEncrypted(out[f])).toBe(true);
      expect(phi.revealPhi('LawyerProfile', `bankDetails.${f}`, out[f]))
        .toBe({ accountNumber: '1234567890', ifsc: 'HDFC0001', upiId: 'a@upi' }[f]);
    }
  });

  it('mergeBankDetails encrypts new plaintext, keeps stored on masked/absent echo', () => {
    const stored = {
      accountHolder: 'A', accountNumber: 'CIPH1', ifsc: 'CIPH2', upiId: '', verified: false,
    };
    // new plaintext replaces
    const m1 = phi.mergeBankDetails('RiderProfile', stored, { accountNumber: '999988887777' });
    expect(m1.accountNumber).not.toBe('999988887777');
    expect(fle.isEncrypted(m1.accountNumber)).toBe(true);
    expect(m1.ifsc).toBe('CIPH2');
    // masked echo keeps stored value (no corruption)
    const m2 = phi.mergeBankDetails('RiderProfile', stored, { accountNumber: '****7777', ifsc: '' });
    expect(m2.accountNumber).toBe('CIPH1');
    expect(m2.ifsc).toBe('CIPH2');
  });

  it('looksMasked detects display echoes', () => {
    expect(phi.looksMasked('****1234')).toBe(true);
    expect(phi.looksMasked('HDFC****')).toBe(true);
    expect(phi.looksMasked('1234567890')).toBe(false);
  });
});
