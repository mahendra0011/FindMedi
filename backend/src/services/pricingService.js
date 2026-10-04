/**
 * PAY-B-01: server-side price resolution.
 *
 * `POST /api/billing/pay` took `amount` straight from the request body and only
 * checked `> 0`. A modified client could book a consultation for ₹1 and the
 * appointment was recorded as PAID — revenue loss plus a forged "paid" state
 * that unlocks a doctor's slot.
 *
 * The server now owns the price. The client may still send an amount, but only
 * as a CHECKSUM: if it disagrees with the authoritative price the request is
 * rejected with 409 rather than silently overwriting it. Where no authoritative
 * price can be resolved (an unknown service type) the request is REFUSED — a
 * fallback to the client value would reintroduce the same hole.
 */
import Doctor from '../models/Doctor.js';
import LabBooking from '../models/LabBooking.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import Medicine from '../models/Medicine.js';
import Facility from '../models/Facility.js';
import Appointment from '../models/Appointment.js';
import logger from '../config/logger.js';

const rupees = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * @returns {Promise<{ ok: true, amount: number, source: string }
 *                  | { ok: false, reason: 'not-found' | 'no-price' | 'invalid-service', message: string }>}
 */
export async function resolveAuthoritativeAmount({
  serviceType,
  referenceId,
  appointment,
  lineItems,
} = {}) {
  const type = String(serviceType || '').toLowerCase();

  // ── Appointment: the doctor's listed consultation fee is the price ──
  if (type === 'appointment') {
    const doctorId = appointment?.doctorId || appointment?.doctor?.doctorId;
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId)
        .select('consultation_fees consultationFee consultationFees')
        .lean();
      const fee = rupees(
        doctor?.consultation_fees
        ?? doctor?.consultationFee
        ?? (Array.isArray(doctor?.consultationFees) ? doctor.consultationFees[0] : null)
        ?? 0
      );
      if (fee > 0) return { ok: true, amount: fee, source: 'doctor.consultation_fees' };
      logger.warn(`PAY-B-01: doctor ${doctorId} has no consultation fee configured — refusing client amount`);
      return { ok: false, reason: 'no-price', message: 'This service has no price configured. Please contact support.' };
    }
    return { ok: false, reason: 'invalid-service', message: 'An appointment payment requires a doctor' };
  }

  // ── Lab test ──
  // The booking's `totalAmount` is itself derived from the `tests` array, so it is
  // recomputed from the referenced test definitions when possible. A stored total
  // that a caller could have written is not an authoritative price.
  if (type === 'test' || type === 'lab') {
    if (referenceId) {
      const booking = await LabBooking.findById(referenceId).select('totalAmount tests').lean();
      if (!booking) return { ok: false, reason: 'not-found', message: 'Lab booking not found' };

      if (Array.isArray(booking.tests) && booking.tests.length) {
        const Test = (await import('../models/Test.js')).default;
        const names = booking.tests.map((t) => (typeof t === 'string' ? t : t?.name || t?.testName)).filter(Boolean);
        const tests = await Test.find({ name: { $in: names } }).select('name price').lean();
        if (tests.length === names.length) {
          const sum = tests.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
          if (sum > 0) return { ok: true, amount: rupees(sum), source: 'lab.test.price' };
        }
      }

      const total = rupees(booking.totalAmount ?? 0);
      if (total > 0) return { ok: true, amount: total, source: 'labbooking.totalAmount' };
      return { ok: false, reason: 'no-price', message: 'This lab booking has no price configured.' };
    }
    return { ok: false, reason: 'invalid-service', message: 'A lab payment requires a booking reference' };
  }

  // ── Pharmacy order: recompute from the order lines, never trust the stored total ──
  if (type === 'medicine' || type === 'pharmacy') {
    if (referenceId) {
      const order = await PharmacyOrder.findById(referenceId).select('patientId status paymentStatus items facilityId deliveryMode deliveryFee platformFee gst').lean();
      if (!order) return { ok: false, reason: 'not-found', message: 'Pharmacy order not found' };
      const items = Array.isArray(order.items) ? order.items : [];
      if (!items.length || items.some((item) => !item?.medicineId)) {
        return { ok: false, reason: 'no-price', message: 'Every pharmacy order line must reference a priced catalogue medicine.' };
      }
      const medicineIds = [...new Set(items.map((item) => String(item.medicineId)))];
      const medicines = await Medicine.find({ _id: { $in: medicineIds } }).select('_id sellingPrice').lean();
      const priceById = new Map(medicines.map((medicine) => [String(medicine._id), Number(medicine.sellingPrice)]));
      let sum = 0;
      for (const item of items) {
        const medicineId = String(item.medicineId);
        const price = priceById.get(medicineId);
        const qty = Number(item?.quantity ?? item?.qty);
        if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(qty) || qty <= 0) {
          return { ok: false, reason: 'no-price', message: 'Pharmacy order contains an invalid medicine price or quantity.' };
        }
        sum += price * qty;
      }
      if (sum > 0) {
        const facility = order.facilityId
          ? await Facility.findById(order.facilityId).select('type status details').lean()
          : null;
        if (!facility || facility.type !== 'pharmacy' || facility.status !== 'approved') {
          return { ok: false, reason: 'no-price', message: 'The pharmacy is no longer available.' };
        }
        const deliveryMode = order.deliveryMode === 'pickup' ? 'pickup' : 'delivery';
        const fee = Number(facility.details?.deliveryFee);
        const threshold = Number(facility.details?.freeDeliveryAbove);
        const deliveryFee = deliveryMode === 'pickup' || (Number.isFinite(threshold) && threshold > 0 && sum >= threshold)
          ? 0
          : (Number.isFinite(fee) && fee >= 0 ? fee : 0);
        const platformFee = 5;
        const gst = rupees(sum * 0.05);
        return { ok: true, amount: rupees(sum + deliveryFee + platformFee + gst), source: 'medicine.sellingPrice+serverFees' };
      }
    }
    return { ok: false, reason: 'not-found', message: 'Pharmacy order not found' };
  }

  // ── Anything with explicit priced line items (cart checkout) ──
  if (Array.isArray(lineItems) && lineItems.length) {
    const sum = lineItems.reduce((acc, item) => {
      const price = Number(item?.price ?? 0);
      const qty = Number(item?.qty ?? item?.quantity ?? 1);
      return acc + (price * qty);
    }, 0);
    if (sum > 0) return { ok: true, amount: rupees(sum), source: 'lineItems' };
  }

  // ── An existing appointment referenced by id ──
  if (referenceId && type === '') {
    const appt = await Appointment.findById(referenceId).select('fees').lean();
    const fees = rupees(appt?.fees ?? 0);
    if (fees > 0) return { ok: true, amount: fees, source: 'appointment.fees' };
  }

  return {
    ok: false,
    reason: 'no-price',
    message: `No server-side price is configured for '${serviceType || 'this service'}'. Payment refused.`,
  };
}

/**
 * Compare the client-sent amount against the authoritative one.
 * A client amount is optional; when present it must agree to the paisa.
 */
export function assertAmountMatches(authoritative, clientAmount) {
  if (clientAmount === undefined || clientAmount === null || clientAmount === '') return { ok: true };
  const client = rupees(clientAmount);
  if (client !== authoritative) {
    return {
      ok: false,
      message: 'Price changed. Please refresh and pay the current amount.',
      authoritative,
      received: client,
    };
  }
  return { ok: true };
}
