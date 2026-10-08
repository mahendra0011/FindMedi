import { describe, it, expect } from '@jest/globals';
import { sanitizeDto, FORBIDDEN_RESPONSE_FIELDS } from '../../src/utils/safeError.js';
import { sanitizeUserDto } from '../../src/models/User.js';
import { toProductCard } from '../../src/routes/products.js';
import { toSearchCard } from '../../src/utils/searchDto.js';

// §5.3/§5.4/§24.9: har DTO se forbidden fields kabhi bahar nahi — regression gate.
describe('response DTO leak guard', () => {
  it('sanitizeDto strips every forbidden field', () => {
    const input = {};
    for (const field of FORBIDDEN_RESPONSE_FIELDS) input[field] = 'secret-value';
    input.name = 'Priya';
    input.role = 'patient';
    const out = sanitizeDto(input);
    for (const field of FORBIDDEN_RESPONSE_FIELDS) {
      expect(out[field]).toBeUndefined();
    }
    expect(out.name).toBe('Priya');
    expect(out.role).toBe('patient');
  });

  it('sanitizeDto passes through primitives', () => {
    expect(sanitizeDto(null)).toBeNull();
    expect(sanitizeDto('x')).toBe('x');
  });

  it('sanitizeUserDto strips auth secrets but keeps profile fields', () => {
    const out = sanitizeUserDto({
      name: 'Asha',
      email: 'a@example.com',
      password: 'hash',
      tokenVersion: 3,
      twoFactorSecret: 's',
      twoFactorTempSecret: 't',
      twoFactorBackupCodes: ['h'],
      driveTokens: {},
      abhaOtpHash: 'h',
      __v: 0,
    });
    expect(out.password).toBeUndefined();
    expect(out.tokenVersion).toBeUndefined();
    expect(out.twoFactorSecret).toBeUndefined();
    expect(out.name).toBe('Asha');
    expect(out.email).toBe('a@example.com');
  });

  it('covers the guide §5.4 forbidden keys', () => {
    for (const key of ['password', 'tokenVersion', 'twoFactorSecret', '__v']) {
      expect(FORBIDDEN_RESPONSE_FIELDS.has(key)).toBe(true);
    }
  });
});

// 10.md 4.1 "Public (cacheable, DTO-only)": the public catalogue surfaces are
// anonymous, so their DTOs are built by ALLOWLIST. These are the contract
// tests the spec asks for — feed each mapper a row containing everything a
// model CAN hold, and prove only the published keys survive.
describe('public catalogue DTO allowlists', () => {
  const leakyProduct = {
    _id: 'p1',
    vendorId: 'v-end-1', // join key only, never on the card
    kind: 'supplement',
    categoryCodes: ['SUP.AYUR'],
    brand: 'AyurCo',
    name: 'Ashwagandha 60t',
    images: ['img/1.jpg'],
    rxSchedule: 'OTC',
    storage: 'ambient',
    claims: ['stress'],
    warrantyMonths: 6,
    rentable: { perDay: 10, deposit: 50, available: true },
    composition: 'withania somnifera',
    fssaiNo: 'FSSAI-123',
    cdscoNo: 'CDSCO-9',
    hsn: '3004',
    gstRate: 18,
    status: 'active',
    variants: [{
      sku: 'SKU1',
      pack: '60 tablets',
      price: 100,
      mrp: 120,
      stock: 7,
      batch: 'BATCH-77',
      expiry: new Date('2027-01-01'),
    }],
  };

  it('toProductCard keeps the storefront fields and drops the back office', () => {
    const card = toProductCard(leakyProduct);
    expect(card).toMatchObject({
      kind: 'supplement',
      name: 'Ashwagandha 60t',
      brand: 'AyurCo',
      rxSchedule: 'OTC',
      rentable: { perDay: 10, deposit: 50, available: true },
    });
    expect(card.variants[0]).toEqual({
      sku: 'SKU1', pack: '60 tablets', price: 100, mrp: 120, inStock: true,
    });
    for (const forbidden of ['vendorId', 'fssaiNo', 'cdscoNo', 'hsn', 'gstRate', 'status', 'composition']) {
      expect(card[forbidden]).toBeUndefined();
    }
    const variant = card.variants[0];
    for (const forbidden of ['batch', 'expiry', 'stock']) {
      expect(variant[forbidden]).toBeUndefined();
    }
  });

  it('toProductCard reports stock as a boolean, never a count', () => {
    const card = toProductCard({ ...leakyProduct, variants: [{ sku: 'S', pack: 'p', price: 1, stock: 0 }] });
    expect(card.variants[0].inStock).toBe(false);
    expect(card.variants[0].stock).toBeUndefined();
  });

  it('toSearchCard copies only known keys from an index hit', () => {
    const hit = {
      score: 3.2,
      providerId: 'doc-1',
      vertical: 'doctor',
      fullName: 'Dr Mehta',
      specialization: 'Cardiology',
      city: 'Pune',
      // Whatever a future index version stores must not walk out on an
      // endpoint nobody is logged into:
      relayPhone: '+919999999999',
      ownerUserId: 'user-77',
      geoPoint: { lat: 18.5, lon: 73.8 },
      email: 'x@example.com',
    };
    expect(toSearchCard(hit)).toEqual({
      score: 3.2,
      providerId: 'doc-1',
      vertical: 'doctor',
      fullName: 'Dr Mehta',
      specialization: 'Cardiology',
      city: 'Pune',
    });
    expect(toSearchCard({})).toEqual({});
  });
});
