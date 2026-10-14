// 2.md 7 — the activation checklist an approved provider must clear before it
// is treated as a fully-live listing.
//
// Six items, each computed from a source that already exists:
//
//   profile_80     ≥80% of THIS type's wizard steps saved (same rule as the
//                  onboarding funnel's `COMPLETENESS_THRESHOLD`);
//   payout         payout step holds an account holder + (account+IFSC or UPI);
//   availability   a capacity signal exists (slots/day, max/slot or day list);
//   two_factor     the owner's account has 2FA enrolled;
//   test_booking   platform-recorded test booking (set by a reviewer — only the
//                  platform can vouch for it);
//   training       onboarding training acknowledged (same reviewer-set rule).
//
// Items a type legitimately does not have (a vendor has no availability step)
// come back `done: true` with a "not required" hint, so the checklist reads
// "6/6" rather than permanently showing a blocker the applicant cannot clear.
//
// Pure by design: no model imports, no queries — routes fetch the four inputs
// and pass them in, which is what makes this cheap to unit test.

export const ACTIVATION_THRESHOLD = 0.8;

export const ACTIVATION_ITEM_KEYS = [
  'profile_80', 'payout', 'availability', 'two_factor', 'test_booking', 'training',
];

const item = (key, label, done, hint) => ({ key, label, done: Boolean(done), hint });

function profileRatio(stepData, config) {
  const steps = config?.steps ?? [];
  if (steps.length === 0) return null;
  const saved = new Set(Object.keys(stepData ?? {}));
  const present = steps.filter((s) => saved.has(s.key)).length;
  return present / steps.length;
}

function hasPayout(stepData) {
  const payout = stepData?.payout ?? {};
  const holder = String(payout.account_holder ?? '').trim();
  const hasBank = Boolean(payout.account_number && payout.ifsc);
  const hasUpi = Boolean(payout.upi);
  return Boolean(holder && (hasBank || hasUpi));
}

function hasAvailability(stepData, config) {
  const hasStep = (config?.steps ?? []).some((s) => s.key === 'availability');
  if (!hasStep) return { applicable: false, ok: false };
  const av = stepData?.availability ?? {};
  const slots = Number(av.slots_per_day ?? 0);
  const perSlot = Number(av.max_per_slot ?? 0);
  const days = Array.isArray(av.available_days) ? av.available_days.length : 0;
  return { applicable: true, ok: slots > 0 || perSlot > 0 || days > 0 };
}

/**
 * @param {{application?: object, user?: object, provider?: object, config?: object}} input
 * @returns {{items: object[], doneCount: number, total: number, ratio: number,
 *            complete: boolean, checkedAt: Date}}
 */
export function buildActivationChecklist({ application, user, provider, config } = {}) {
  const stepData = application?.draft?.stepData ?? {};
  const approved = Boolean(application?.providerId);
  const checkedAt = new Date();

  const ratio = profileRatio(stepData, config);
  const profileDone = ratio !== null && ratio >= ACTIVATION_THRESHOLD;

  const payoutOk = hasPayout(stepData);
  const availability = hasAvailability(stepData, config);
  const twoFactorOk = Boolean(user?.twoFactorEnabled);
  const testBookingAt = provider?.onboarding?.testBookingAt ?? null;
  const trainingAt = provider?.onboarding?.trainingCompletedAt ?? null;

  const items = [
    item(
      'profile_80',
      'Profile at least 80% complete',
      profileDone,
      ratio === null
        ? 'Type configuration unavailable — cannot measure completeness'
        : `${Math.round(ratio * 100)}% of wizard steps saved (need ${Math.round(ACTIVATION_THRESHOLD * 100)}%)`,
    ),
    item(
      'payout',
      'Payout / bank details added',
      payoutOk,
      payoutOk ? 'Payout account on file' : 'Add account holder + account/IFSC or UPI in the Payout step',
    ),
    item(
      'availability',
      'Availability / capacity configured',
      availability.applicable ? availability.ok : true,
      !availability.applicable
        ? 'Not required for this provider type'
        : availability.ok ? 'Capacity configured' : 'Set slots per day (or available days) in the Availability step',
    ),
    item(
      'two_factor',
      'Two-factor authentication enabled',
      twoFactorOk,
      twoFactorOk ? '2FA enrolled on the owner account' : 'Owner must enable 2FA from account security settings',
    ),
    item(
      'test_booking',
      'Platform test booking completed',
      Boolean(testBookingAt),
      testBookingAt
        ? `Recorded ${new Date(testBookingAt).toISOString().slice(0, 10)}`
        : approved
          ? 'A reviewer records this after the platform test booking'
          : 'Available once the application is approved',
    ),
    item(
      'training',
      'Onboarding training completed',
      Boolean(trainingAt),
      trainingAt
        ? `Recorded ${new Date(trainingAt).toISOString().slice(0, 10)}`
        : approved
          ? 'A reviewer marks this after the onboarding walkthrough'
          : 'Available once the application is approved',
    ),
  ];

  const doneCount = items.filter((i) => i.done).length;
  return {
    items,
    doneCount,
    total: items.length,
    ratio: items.length > 0 ? Number((doneCount / items.length).toFixed(4)) : 0,
    complete: doneCount === items.length,
    approved,
    checkedAt,
  };
}
