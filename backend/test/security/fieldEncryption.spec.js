import { describe, it, expect } from '@jest/globals';
import {
  encryptField,
  decryptField,
  isEncrypted,
  blindIndex,
  getEncryptionKeyset,
} from '../../src/utils/fieldEncryption.js';

describe('Field-Level Encryption (AES-256-GCM)', () => {
  const secretDiagnosis = 'Patient diagnosed with Acute Major Depressive Episode with Psychotic Features';
  const aad = 'MentalHealth:rec_987654321';

  it('encrypts and decrypts correctly with matching AAD', () => {
    const ciphertext = encryptField(secretDiagnosis, aad);
    expect(isEncrypted(ciphertext)).toBe(true);
    expect(ciphertext).toMatch(/^v1:1:/);
    expect(ciphertext).not.toContain(secretDiagnosis);

    const decrypted = decryptField(ciphertext, aad);
    expect(decrypted).toBe(secretDiagnosis);
  });

  it('fails decryption when AAD is tampered (prevents record transplantation)', () => {
    const ciphertext = encryptField(secretDiagnosis, 'MentalHealth:doc_A');
    // Attempting to decrypt under doc_B
    expect(() => {
      decryptField(ciphertext, 'MentalHealth:doc_B');
    }).toThrow();
  });

  it('fails decryption when ciphertext payload is tampered', () => {
    const ciphertext = encryptField(secretDiagnosis, aad);
    const parts = ciphertext.split(':');
    // Tamper with ciphertext payload
    parts[4] = Buffer.from('tampered-payload').toString('base64');
    const tampered = parts.join(':');

    expect(() => {
      decryptField(tampered, aad);
    }).toThrow();
  });

  it('fails decryption when auth tag is tampered', () => {
    const ciphertext = encryptField(secretDiagnosis, aad);
    const parts = ciphertext.split(':');
    // Tamper with auth tag
    parts[3] = Buffer.from('badtag1234567890').toString('base64');
    const tampered = parts.join(':');

    expect(() => {
      decryptField(tampered, aad);
    }).toThrow();
  });

  it('handles objects with JSON serialization and parsing', () => {
    const sensitiveObj = {
      bankAccount: '123456789012',
      ifsc: 'HDFC0001234',
      kycVerified: true,
    };
    const ciphertext = encryptField(sensitiveObj, 'Bank:1');
    const decrypted = decryptField(ciphertext, 'Bank:1', true);
    expect(decrypted).toEqual(sensitiveObj);
  });

  it('passes unencrypted legacy data through unchanged for smooth migration', () => {
    const legacyPlaintext = 'Plain text diagnosis from 2024';
    expect(decryptField(legacyPlaintext, aad)).toBe(legacyPlaintext);
  });

  it('generates consistent blind index for identical values (case-insensitive)', () => {
    const idx1 = blindIndex('ABC-12345-XYZ', 'kyc_salt');
    const idx2 = blindIndex('abc-12345-xyz', 'kyc_salt');
    const idx3 = blindIndex('DIFF-VALUE', 'kyc_salt');

    expect(idx1).toBe(idx2);
    expect(idx1).not.toBe(idx3);
    expect(idx1).toMatch(/^[0-9a-f]{64}$/);
  });
});
