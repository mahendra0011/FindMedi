import { describe, it, expect } from '@jest/globals';
import { flattenStepData, mapApplicationToProvider } from '../../src/lib/applicationToProvider.js';

// 10.md 6 step 4: approval turns an application into a Provider row. The draft
// payload is config-shaped (2.md 1), so the translation is a pure function and
// every assumption it makes is pinned here - including the ones it does NOT
// make (an unknown key must never land on the public listing).

const CONFIG = {
  typeKey: 'dental_clinic',
  kind: 'facility',
  group: 'clinical',
  tier: 'T1',
  label: 'Dental Clinic',
};

const application = (overrides = {}) => ({
  applicantUserId: '64b00000000000000000aa01',
  typeKey: 'dental_clinic',
  kind: 'facility',
  group: 'clinical',
  tier: 'T1',
  draft: { stepData: {} },
  ...overrides,
});

describe('flattenStepData', () => {
  it('walks nested steps down to normalized leaf keys', () => {
    const leaves = flattenStepData({
      account: { 'Display Name': 'Smile Dental Studio' },
      location: { city: 'Pune' },
    });
    expect(leaves.get('display_name')).toBe('Smile Dental Studio');
    expect(leaves.get('city')).toBe('Pune');
  });

  it('keeps arrays of scalars whole instead of exploding them', () => {
    const leaves = flattenStepData({ languages: ['Hindi', 'English'] });
    expect(leaves.get('languages')).toEqual(['Hindi', 'English']);
  });

  it('lets the first step that asked for a key keep it', () => {
    const leaves = flattenStepData({ account: { name: 'Owner supplied' }, review: { name: 'ignored later value' } });
    expect(leaves.get('name')).toBe('Owner supplied');
  });
});

describe('mapApplicationToProvider', () => {
  it('builds the listing from the saved draft', () => {
    const provider = mapApplicationToProvider(application({
      draft: {
        stepData: {
          account: { display_name: 'Smile Dental Studio', tagline: 'Painless dentistry' },
          location: {
            address_line1: '12 MG Road', area: 'Camp', city: 'Pune', state: 'MH',
            pincode: '411001', latitude: '18.5208', longitude: '73.8567',
          },
          contact: { mobile: '+911100000000', email: 'hello@smile.example' },
          services: { languages: ['Hindi', 'English'], amenities: ['Parking', 'Wheelchair'] },
        },
      },
    }), CONFIG, { verifiedBy: 'reviewer-1', now: new Date('2026-10-06T10:00:00Z') });

    expect(provider).toEqual(expect.objectContaining({
      ownerUserId: '64b00000000000000000aa01',
      kind: 'facility',
      type: 'dental_clinic',
      group: 'clinical',
      tier: 'T1',
      name: 'Smile Dental Studio',
      tagline: 'Painless dentistry',
      languages: ['Hindi', 'English'],
      amenities: ['Parking', 'Wheelchair'],
    }));
    expect(provider.address).toEqual({
      line1: '12 MG Road',
      area: 'Camp',
      city: 'Pune',
      state: 'MH',
      pincode: '411001',
      geo: { type: 'Point', coordinates: [73.8567, 18.5208] },
    });
    expect(provider.contact).toEqual({ publicPhone: '+911100000000', email: 'hello@smile.example' });
  });

  it('falls back to the config label when the draft never supplied a name', () => {
    const provider = mapApplicationToProvider(application(), CONFIG, {});
    expect(provider.name).toBe('Dental Clinic');
  });

  it('does not lift keys the mapper has no alias for onto the listing', () => {
    const provider = mapApplicationToProvider(application({
      draft: { stepData: { account: { pan_number: 'ABCDE1234F', owner_name: 'Some Owner' } } },
    }), CONFIG, {});
    expect(provider.name).toBe('Dental Clinic');
    expect(JSON.stringify(provider)).not.toContain('ABCDE1234F');
    expect(JSON.stringify(provider)).not.toContain('Some Owner');
  });

  it('omits geo unless both coordinates parse and are in range', () => {
    const missingLng = mapApplicationToProvider(application({
      draft: { stepData: { location: { latitude: '18.52' } } },
    }), CONFIG, {});
    expect(missingLng.address.geo).toBeUndefined();

    const outOfRange = mapApplicationToProvider(application({
      draft: { stepData: { location: { latitude: '999', longitude: '73.85' } } },
    }), CONFIG, {});
    expect(outOfRange.address.geo).toBeUndefined();
  });

  it('drops an email that is not an email', () => {
    const provider = mapApplicationToProvider(application({
      draft: { stepData: { contact: { email: 'not-an-email' } } },
    }), CONFIG, {});
    expect(provider.contact.email).toBe('');
  });

  it('pins the probation policy rather than trusting the draft', () => {
    const provider = mapApplicationToProvider(application({
      draft: { stepData: { account: { status: 'live', trusted: true, plan: 'premium' } } },
    }), CONFIG, {});
    expect(provider.status).toBe('approved');
    expect(provider.trusted).toBe(false);
    expect(provider.plan).toBe('free');
    expect(provider.probation).toEqual({ active: true, bookingCap: 10, payoutHold: true });
    expect(provider.verification).toEqual(expect.objectContaining({
      status: 'verified',
      level: 1,
      scope: ['kyc'],
    }));
  });

  it('uses the config when the application snapshot is empty', () => {
    const provider = mapApplicationToProvider(
      application({ kind: '', group: '', tier: '' }),
      CONFIG,
      {},
    );
    expect(provider.kind).toBe('facility');
    expect(provider.group).toBe('clinical');
    expect(provider.tier).toBe('T1');
  });
});
