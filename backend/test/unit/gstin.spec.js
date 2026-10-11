import { validateGstin, gstinChecksum } from '../../src/lib/gstin.js';

describe('GSTIN checksum (checklist L5)', () => {
  it('accepts a real-world GSTIN (27AAACR5055K1Z7)', () => {
    expect(validateGstin('27AAACR5055K1Z7')).toEqual({ valid: true, gstin: '27AAACR5055K1Z7' });
  });

  it('accepts lowercase and trims whitespace', () => {
    expect(validateGstin('  27aaacr5055k1z7  ')).toEqual({ valid: true, gstin: '27AAACR5055K1Z7' });
  });

  it('rejects a single-character typo in the check digit', () => {
    expect(validateGstin('27AAACR5055K1Z8')).toEqual({ valid: false, reason: 'checksum' });
  });

  it('rejects a single-character typo in the body', () => {
    // PAN char changed 5 -> 6; check digit no longer agrees.
    expect(validateGstin('27AAACR6055K1Z7')).toEqual({ valid: false, reason: 'checksum' });
  });

  it('rejects malformed format', () => {
    expect(validateGstin('27AAACR5055K1Z').reason).toBe('format'); // 14 chars
    expect(validateGstin('27AAACR505511Z7').reason).toBe('format'); // entity code 1 not allowed
    expect(validateGstin('27AAACR5055K0Z7').reason).toBe('format'); // entity code never 0
    expect(validateGstin('').reason).toBe('format');
    expect(validateGstin(null).reason).toBe('format');
  });

  it('rejects out-of-range state codes', () => {
    expect(validateGstin('00AAACR5055K1Z7').reason).toBe('state_code'); // 00 invalid
    expect(validateGstin('39AAACR5055K1Z7').reason).toBe('state_code'); // 39 not issued
    expect(validateGstin('97AAACR5055K1Z7').reason !== 'state_code').toBe(true); // 97 (exports) ok → checksum verdict
  });

  it('round-trips a generated checksum', () => {
    const body = '29ABCDE1234F1Z';
    const full = body + gstinChecksum(body);
    expect(validateGstin(full).valid).toBe(true);
  });

  it('is deterministic and covers 0..35 alphabet', () => {
    const body = '06AAAAAAAAA1AZ'.toUpperCase();
    const a = gstinChecksum(body);
    const b = gstinChecksum(body);
    expect(a).toBe(b);
    expect('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ').toContain(a);
  });
});