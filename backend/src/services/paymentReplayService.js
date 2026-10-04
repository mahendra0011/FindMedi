/** Return a safe conflict for a completed payment replay, or null if it is owned. */
export function paymentReplayConflict(payment, userId, serviceType) {
  if (String(payment?.patient_id ?? payment?.patientId ?? '') !== String(userId ?? '')) {
    return { status: 404, message: 'Payment not found.' };
  }
  if (String(payment?.serviceType ?? '') !== String(serviceType ?? '')) {
    return { status: 409, message: 'This reference was already paid for a different service.' };
  }
  return null;
}
