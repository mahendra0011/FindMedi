import { describe, it, expect } from '@jest/globals';
import { sanitizeDto, FORBIDDEN_RESPONSE_FIELDS } from '../../src/utils/safeError.js';
import { toProductCard } from '../../src/routes/products.js';
import { toSearchCard } from '../../src/utils/searchDto.js';

// Extension of test/security/dtoLeak.spec.js for the newer public surfaces:
// Provider (directory), Product (storefront), Event (camps). Same rule — a
// public DTO is built by ALLOWLIST, so auth secrets (password/tokenVersion),
// money rails (bank/ifsc/upi) and licence/regulatory internals must never
// survive the mapper, even when the underlying row holds them.
const AUTH_SECRETS = ['password', 'passwordHash', 'tokenVersion', 'otpHash'];
const MONEY_RAILS = ['bankAccount', 'bankAccountNumber', 'accountNumber', 'ifsc', 'upiId'];
const LICENCE_INTERNALS = ['licenseNumber', 'fssaiNo', 'cdscoNo', 'hsn', 'gstRate'];

describe('public DTO leak guard — Provider/Product/Event extension', () => {
  it('FORBIDDEN_RESPONSE_FIELDS covers auth secrets and money rails', () => {
    for (const key of [...AUTH_SECRETS, ...MONEY_RAILS, 'aadhaar', 'pan', '__v']) {
      expect(FORBIDDEN_RESPONSE_FIELDS.has(key)).toBe(true);
    }
  });

  it('sanitizeDto strips secrets from a Provider-shaped row but keeps the card fields', () => {
    const out = sanitizeDto({
      name: 'City Care Hospital',
      kind: 'hospital',
      city: 'Pune',
      slug: 'city-care',
      ownerUserId: 'user-77',
      password: 'hash',
      tokenVersion: 3,
      bankAccount: '501000123456',
      ifsc: 'HDFC0001234',
      upiId: 'citycare@upi',
      licenseNumber: 'FULL-LIC-998877',
      aadhaar: '999988887777',
      __v: 0,
    });
    for (const forbidden of [...AUTH_SECRETS, ...MONEY_RAILS, 'aadhaar', '__v']) {
      expect(out[forbidden]).toBeUndefined();
    }
    // sanitizeDto is a denylist: public display fields pass through.
    expect(out.name).toBe('City Care Hospital');
    expect(out.city).toBe('Pune');
  });

  it('sanitizeDto strips secrets from an Event-shaped row', () => {
    const out = sanitizeDto({
      title: 'Free Eye Camp',
      type: 'camp',
      city: 'Nagpur',
      organizerId: 'prov-1',
      password: 'hash',
      tokenVersion: 1,
      bankAccount: 'acc',
      ifsc: 'IFSC1',
      pan: 'ABCDE1234F',
      __v: 0,
    });
    for (const forbidden of [...AUTH_SECRETS, ...MONEY_RAILS, 'pan', '__v']) {
      expect(out[forbidden]).toBeUndefined();
    }
    expect(out.title).toBe('Free Eye Camp');
  });

  it('toProductCard never emits auth/bank/licence internals even on a fully-loaded row', () => {
    const card = toProductCard({
      _id: 'p9',
      kind: 'device',
      categoryCodes: ['DEV.NEB'],
      brand: 'MediCo',
      name: 'Nebulizer X1',
      images: [],
      rxSchedule: 'OTC',
      storage: 'ambient',
      claims: [],
      warrantyMonths: 12,
      rentable: { perDay: 50, deposit: 500, available: true },
      variants: [{ sku: 'S1', pack: '1 pc', price: 999, mrp: 1299, stock: 4, batch: 'B-1', expiry: new Date() }],
      // Back-office / secret-shaped fields a future select() might pull in:
      vendorId: 'v-1',
      password: 'hash',
      tokenVersion: 2,
      bankAccount: 'acc',
      ifsc: 'IFSC9',
      licenseNumber: 'FULL-LIC-112233',
      composition: 'secret formula',
      fssaiNo: 'F-1',
      cdscoNo: 'C-1',
      hsn: '9019',
      gstRate: 12,
    });
    for (const forbidden of [...AUTH_SECRETS, ...MONEY_RAILS, ...LICENCE_INTERNALS, 'vendorId', 'composition']) {
      expect(card[forbidden]).toBeUndefined();
    }
    expect(card.name).toBe('Nebulizer X1');
  });

  it('toSearchCard never emits secrets for a provider index hit', () => {
    const card = toSearchCard({
      score: 1.1,
      providerId: 'prov-9',
      vertical: 'hospital',
      fullName: 'City Care',
      specialization: 'General',
      city: 'Pune',
      password: 'hash',
      tokenVersion: 9,
      bankAccount: 'acc',
      licenseNumber: 'FULL-LIC-445566',
      relayPhone: '+919999999999',
      email: 'owner@example.com',
    });
    for (const forbidden of [...AUTH_SECRETS, ...MONEY_RAILS, ...LICENCE_INTERNALS]) {
      expect(card[forbidden]).toBeUndefined();
    }
    expect(card.fullName).toBe('City Care');
    expect(card.city).toBe('Pune');
  });
});
