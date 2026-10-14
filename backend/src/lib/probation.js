// 2.md §6 — probation for a freshly approved listing: a daily booking cap and
// a payout hold until an operator clears them (POST /providers/:id/probation).
// applicationToProvider seeds `active: true, bookingCap: 10, payoutHold: true`
// on every new listing, so these two functions are the enforcement half of
// that policy.
//
// The policy lives on Provider.probation. Every money/booking boundary reads
// it through THIS module so the rules cannot drift apart across routes: the
// cap is counted the same way everywhere, and "held" means the same thing
// everywhere.
import Provider from '../models/Provider.js';
import Appointment from '../models/Appointment.js';

// A cancelled booking released its seat and never happened, so it falls out of
// the cap count. Completed and Missed bookings DID happen — the provider
// accepted them — so they keep counting against the day's cap.
const EXCLUDED_FROM_CAP = ['Cancelled'];

/**
 * Daily booking cap for a provider on probation.
 *
 * @param {{providerId?: string, date?: string}} params booking context
 * @returns {Promise<null | {status: number, code: string, message: string}>}
 *   null when the booking may proceed, otherwise the response the route should
 *   send. `bookingCap: 0` while active means the operator has not opened
 *   bookings at all yet.
 *
 * Infrastructure failures fail OPEN, matching the patient-hard-stop guard in
 * routes/appointments.js: a cap lookup is a business limit, not an
 * availability guard, and a blip in it must never take bookings down.
 */
export async function probationBookingBlock({ providerId, date } = {}) {
  if (!providerId || !date) return null;
  try {
    const provider = await Provider.findById(providerId).select('name probation').lean();
    const probation = provider?.probation;
    if (!probation?.active) return null;

    const cap = Number(probation.bookingCap ?? 0);
    if (!(cap > 0)) {
      return {
        status: 409,
        code: 'PROBATION_BOOKING_CAP',
        message: `${provider?.name || 'This provider'} is on probation and is not taking bookings yet.`,
      };
    }

    const used = await Appointment.countDocuments({
      providerId,
      date,
      status: { $nin: EXCLUDED_FROM_CAP },
    });
    if (used >= cap) {
      return {
        status: 409,
        code: 'PROBATION_BOOKING_CAP',
        message: `This provider has reached its daily booking limit of ${cap}. Please try again tomorrow.`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Payout hold for a provider document (or its plain probation sub-object).
 * Returns the 403 response payload while `active && payoutHold`, else null.
 */
export function probationPayoutBlockFrom(provider) {
  const probation = provider?.probation;
  if (!probation?.active || !probation?.payoutHold) return null;
  const name = provider?.name ? ` ${provider.name}` : '';
  return {
    status: 403,
    code: 'PROBATION_PAYOUT_HOLD',
    message: `Payouts to${name} are on hold while the provider is on probation.`,
  };
}

/**
 * The commission payout seam (routes/commission.js): a payout whose config is
 * linked to a Provider (Provider.commissionConfigId) is that provider's money,
 * and must not be created or paid while the listing holds payouts.
 *
 * @returns {Promise<null | {status: number, code: string, message: string}>}
 */
export async function heldProviderForCommissionConfig(configId) {
  if (!configId) return null;
  try {
    const provider = await Provider.findOne({
      commissionConfigId: configId,
      'probation.active': true,
      'probation.payoutHold': true,
    }).select('name probation').lean();
    if (!provider) return null;
    return probationPayoutBlockFrom(provider);
  } catch {
    return null;
  }
}
