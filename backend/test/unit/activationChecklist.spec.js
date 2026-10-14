import {
  buildActivationChecklist,
  ACTIVATION_ITEM_KEYS,
  ACTIVATION_THRESHOLD,
} from '../../src/lib/activationChecklist.js';

// 2.md 7 — the six-item checklist between "approved" and "fully live". Pure by
// design (no models, no queries), so this suite feeds the four inputs in and
// reads the verdicts out. The rule that matters: items a type does not HAVE
// come back done — otherwise a vendor would sit at 5/6 forever through no
// fault of its own.

const CONFIG = {
  typeKey: 'dental_clinic',
  steps: [
    { key: 'account' },
    { key: 'location' },
    { key: 'payout' },
    { key: 'availability' },
  ],
};

const appWith = (stepData, overrides = {}) => ({
  providerId: null,
  draft: { stepData },
  ...overrides,
});

describe('buildActivationChecklist', () => {
  it('returns six items with stable keys, all pending on an empty application', () => {
    const out = buildActivationChecklist({ application: appWith({}), config: CONFIG });
    expect(out.items.map((i) => i.key)).toEqual(ACTIVATION_ITEM_KEYS);
    expect(out.total).toBe(6);
    expect(out.doneCount).toBe(0);
    expect(out.complete).toBe(false);
    expect(out.approved).toBe(false);
    expect(out.checkedAt).toBeInstanceOf(Date);
    expect(ACTIVATION_THRESHOLD).toBe(0.8);
    // Availability exists for this type and is empty → genuinely pending.
    const availability = out.items.find((i) => i.key === 'availability');
    expect(availability.done).toBe(false);
    expect(availability.hint).toContain('Availability');
  });

  it('marks profile_80 done at the 80% threshold, not a pixel below', () => {
    const below = buildActivationChecklist({
      application: appWith({ account: {}, location: {}, payout: {} }), // 3/4 = 0.75
      config: CONFIG,
    });
    expect(below.items.find((i) => i.key === 'profile_80').done).toBe(false);

    const at = buildActivationChecklist({
      application: appWith({ account: {}, location: {}, payout: {}, availability: {} }), // 4/4
      config: CONFIG,
    });
    const profile = at.items.find((i) => i.key === 'profile_80');
    expect(profile.done).toBe(true);
    expect(profile.hint).toContain('100%');
  });

  it('reports an unavailable type config as unmeasurable, not as 0%', () => {
    const out = buildActivationChecklist({
      application: appWith({ account: {}, location: {}, payout: {}, availability: {} }),
      config: undefined,
    });
    const profile = out.items.find((i) => i.key === 'profile_80');
    expect(profile.done).toBe(false);
    expect(profile.hint).toContain('cannot measure');
  });

  it('accepts payout via bank details or UPI, but never a bare holder name', () => {
    const bank = buildActivationChecklist({
      application: appWith({ payout: { account_holder: 'Ramesh Kumar', account_number: '123456789012', ifsc: 'HDFC0001234' } }),
      config: CONFIG,
    });
    expect(bank.items.find((i) => i.key === 'payout').done).toBe(true);

    const upi = buildActivationChecklist({
      application: appWith({ payout: { account_holder: 'Ramesh Kumar', upi: 'ramesh@okhdfc' } }),
      config: CONFIG,
    });
    expect(upi.items.find((i) => i.key === 'payout').done).toBe(true);

    const holderOnly = buildActivationChecklist({
      application: appWith({ payout: { account_holder: 'Ramesh Kumar' } }),
      config: CONFIG,
    });
    expect(holderOnly.items.find((i) => i.key === 'payout').done).toBe(false);
  });

  it('treats availability as NOT REQUIRED for a type that has no such step', () => {
    const vendorConfig = { typeKey: 'med_equipment_vendor', steps: [{ key: 'account' }, { key: 'payout' }] };
    const out = buildActivationChecklist({ application: appWith({}), config: vendorConfig });
    const availability = out.items.find((i) => i.key === 'availability');
    expect(availability.done).toBe(true);
    expect(availability.hint).toContain('Not required');
  });

  it('accepts any positive capacity signal in the availability step', () => {
    const slots = buildActivationChecklist({
      application: appWith({ availability: { slots_per_day: 8 } }), config: CONFIG,
    });
    expect(slots.items.find((i) => i.key === 'availability').done).toBe(true);

    const days = buildActivationChecklist({
      application: appWith({ availability: { available_days: ['mon', 'tue'] } }), config: CONFIG,
    });
    expect(days.items.find((i) => i.key === 'availability').done).toBe(true);
  });

  it('reads 2FA from the owner account the route passes in', () => {
    const enrolled = buildActivationChecklist({
      application: appWith({}), user: { twoFactorEnabled: true }, config: CONFIG,
    });
    expect(enrolled.items.find((i) => i.key === 'two_factor').done).toBe(true);

    const notEnrolled = buildActivationChecklist({
      application: appWith({}), user: { twoFactorEnabled: false }, config: CONFIG,
    });
    expect(notEnrolled.items.find((i) => i.key === 'two_factor').done).toBe(false);
  });

  it('reads the two reviewer-stamped flags off the listing, not off the application', () => {
    const stamped = buildActivationChecklist({
      application: appWith({}, { providerId: '7000000000000000000000e5' }),
      provider: { onboarding: { testBookingAt: '2026-10-01T10:00:00Z', trainingCompletedAt: '2026-10-02T10:00:00Z' } },
      config: CONFIG,
    });
    expect(stamped.approved).toBe(true);
    expect(stamped.items.find((i) => i.key === 'test_booking').done).toBe(true);
    expect(stamped.items.find((i) => i.key === 'training').done).toBe(true);

    const unapproved = buildActivationChecklist({
      application: appWith({}), provider: null, config: CONFIG,
    });
    expect(unapproved.approved).toBe(false);
    expect(unapproved.items.find((i) => i.key === 'test_booking').done).toBe(false);
    expect(unapproved.items.find((i) => i.key === 'test_booking').hint).toContain('once the application is approved');
  });

  it('goes 6/6 only when every item is genuinely done', () => {
    const out = buildActivationChecklist({
      application: appWith(
        {
          account: {}, location: {}, payout: { account_holder: 'Ramesh Kumar', upi: 'ramesh@okhdfc' },
          availability: { slots_per_day: 4 },
        },
        { providerId: '7000000000000000000000e5' },
      ),
      user: { twoFactorEnabled: true },
      provider: { onboarding: { testBookingAt: '2026-10-01T10:00:00Z', trainingCompletedAt: '2026-10-02T10:00:00Z' } },
      config: CONFIG,
    });
    expect(out.doneCount).toBe(6);
    expect(out.complete).toBe(true);
    expect(out.ratio).toBe(1);
  });

  it('never throws on missing inputs', () => {
    const out = buildActivationChecklist();
    expect(out.total).toBe(6);
    expect(out.complete).toBe(false);
  });
});
