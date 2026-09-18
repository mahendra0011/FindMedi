import { api } from './api';

export async function bookTestLab(bookingPayload, payPayload) {
  const booking = await api.createLabBooking(bookingPayload);
  const bookingId = booking?._id || booking?.booking?._id || '';
  const result = await api.payTransaction({
    serviceType: 'test',
    ...payPayload,
    referenceId: bookingId,
  });
  if (!result?.success) throw new Error('Payment failed');
  return { booking, bookingId, result };
}

export function isBookingConflictError(msg) {
  return msg.includes('already be completed') || msg.includes('Duplicate');
}
