/**
 * AUTHZ: assistant-booking access.
 *
 * Mirrors `lawyerBookings.js` → `assertBookingAccess`, which was found comparing a
 * `clientId` field the model does not have. The same mistake is easy to repeat, so
 * the rule lives here once and both booking modules can use it.
 *
 * Access decision, in order:
 *   1. superadmin — unrestricted.
 *   2. The patient who owns the booking.
 *   3. The assigned assistant, resolved EITHER through `assistantId` OR through
 *      AssistantProfile.userId. Providers are referenced inconsistently across the
 *      codebase; requiring both would lock legitimate assistants out, so either
 *      match counts.
 *   4. A staff/admin role in the booking's hospital. Tenant-scoped, fail closed.
 *
 * Denial is 404, not 403: a 403 confirms the id exists, and an enumerable booking
 * id is exactly what an attacker is fishing for. The response then leaks patient
 * name, phone and email.
 */
import AssistantProfile from '../models/AssistantProfile.js';

const same = (a, b) => {
  if (a == null || b == null) return false;
  const norm = (v) => String(typeof v === 'object' ? (v._id ?? v.id ?? v) : v);
  return norm(a) === norm(b);
};

const STAFF_ROLES = new Set(['superadmin', 'hospital_admin', 'admin']);

/**
 * @returns {{ ok: true, reason: string } | { ok: false, code: 'not_found' | 'forbidden' }}
 */
export async function assertAssistantBookingAccess(req, booking, { action = 'read' } = {}) {
  if (!booking) return { ok: false, code: 'not_found' };

  const userId = req.user?._id;
  const role = req.user?.role;

  if (role === 'superadmin') return { ok: true, reason: 'superadmin' };

  if (same(booking.patientId, userId) || same(booking.patientId?._id, userId)) {
    return { ok: true, reason: 'own_patient' };
  }

  // The assigned assistant, by either reference shape.
  if (same(booking.assistantId, userId) || same(booking.assistantId?._id, userId)) {
    return { ok: true, reason: 'assigned_assistant' };
  }
  const profile = await AssistantProfile.findOne({ userId }).select('_id').lean();
  if (profile && (same(booking.assistantId, profile._id) || same(booking.assistantId, userId))) {
    return { ok: true, reason: 'assigned_assistant_via_profile' };
  }

  // Hospital staff: tenant must match on BOTH sides. A caller with no tenant, or a
  // booking with no tenant, is denied — "cannot determine" must not mean "allow".
  if (STAFF_ROLES.has(role)) {
    const callerTenant = req.user.hospitalId || req.user.facilityId;
    const bookingTenant = booking.hospitalId;
    if (callerTenant && bookingTenant && String(callerTenant) === String(bookingTenant)) {
      return { ok: true, reason: 'same_tenant_staff' };
    }
    return { ok: false, code: 'not_found' };
  }

  // A patient acting on someone else's booking, or an unrelated role.
  return { ok: false, code: role === 'patient' || role === 'assistant' ? 'not_found' : 'forbidden' };
}

/** Express-style responder for a denial. Always 404, to avoid an existence oracle. */
export function denyAssistantBooking(res, decision) {
  return res.status(404).json({ message: 'Booking not found' });
}

/**
 * Middleware form: `router.get('/:id', protect, requireAssistantBooking('read'), ...)`.
 * Attaches the already-authorised booking to `req.assistantBooking`.
 */
export function requireAssistantBooking(action = 'read') {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authorized' });
      const { default: AssistantBooking } = await import('../models/AssistantBooking.js');
      const booking = await AssistantBooking.findById(req.params.id);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });

      const decision = await assertAssistantBookingAccess(req, booking, { action });
      if (!decision.ok) return denyAssistantBooking(res, decision);

      req.assistantBooking = booking;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export default requireAssistantBooking;