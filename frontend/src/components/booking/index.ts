/**
 * Universal Booking & Order Flow Registry (File 05 Spec)
 *
 * Dispatches 5 canonical booking flows across all FindMedi categories:
 * - Flow A: Slot Booking (Doctor, Dentist, Physio, Counsellor, Lab appointment)
 * - Flow B: Request & Quote (Home nursing agency, Dental treatment plan, Long-term caregiver)
 * - Flow C: Order Goods (Pharmacy, Health foods, Supplements, Medical devices)
 * - Flow D: Recurring / Membership (Gym, Yoga, Chronic disease program, Dialysis series)
 * - Flow E: Event Registration (Health camps, Workshops, Webinars, CPR training)
 * - Flow F: Emergency / Instant (SOS, Ambulance dispatch, Blood request, Rides)
 * - Flow G: Rental (Wheelchairs, Hospital beds, O2 concentrators, CPAP)
 */

export { default as BookingModal } from '@/components/BookingModal';
export { default as RequestQuoteModal } from './RequestQuoteModal';
export { default as EquipmentRentalModal } from './EquipmentRentalModal';
export { default as EventRegistrationModal } from './EventRegistrationModal';
export { default as MembershipEnrollModal } from './MembershipEnrollModal';

export type BookingFlowType = 'slot' | 'quote' | 'order' | 'membership' | 'event' | 'emergency' | 'rental';

export function getFlowForCategory(category?: string): BookingFlowType {
  if (!category) return 'slot';
  const c = category.toLowerCase();
  if (c.includes('camp') || c.includes('event') || c.includes('workshop') || c.includes('webinar')) return 'event';
  if (c.includes('rental') || c.includes('rent_') || c.includes('equipment_rental')) return 'rental';
  if (c.includes('gym') || c.includes('membership') || c.includes('subscription') || c.includes('chronic_plan') || c.includes('dialysis_series')) return 'membership';
  if (c.includes('quote') || c.includes('home_nursing_agency') || c.includes('long_term_care') || c.includes('ivf_intake')) return 'quote';
  if (c.includes('medicine') || c.includes('pharmacy') || c.includes('product') || c.includes('supplement')) return 'order';
  if (c.includes('emergency') || c.includes('ambulance') || c.includes('sos') || c.includes('blood_request')) return 'emergency';
  return 'slot';
}
