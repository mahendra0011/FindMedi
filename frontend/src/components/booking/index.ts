/**
 * Universal Booking & Order Flow Registry (File 05 Spec)
 *
 * Dispatches 8 canonical booking & access flows across all FindMedi categories:
 * - Flow A: Slot Booking (Doctor, Dentist, Physio, Counsellor, Lab appointment, Vaccination slot)
 * - Flow B: Request & Quote (Home nursing agency, Dental treatment plan, Elder-care/Assisted living/Hospice, IVF consult, Rehab/Child development)
 * - Flow C: Order Goods (Pharmacy, Health foods, Supplements, Medical devices, Diet-kitchen meals, Optical)
 * - Flow D: Recurring / Membership (Gym, Yoga, Chronic disease care, Dialysis series, Meal subscription)
 * - Flow E: Event Registration (Health camps, Screening drives, Workshops, Webinars, CPR training)
 * - Flow F: Emergency / Instant (SOS, Ambulance dispatch, Blood emergency, Rides)
 * - Flow G: Rental (Wheelchairs, Hospital beds, O2 concentrators, CPAP, Mobility aids)
 * - Flow H: Info Only (Govt PHC/CHC/UPHC/Arogya Mandir, Helplines, Scheme eligibility)
 */

export { default as BookingModal } from '@/components/BookingModal';
export { default as RequestQuoteModal } from './RequestQuoteModal';
export { default as EquipmentRentalModal } from './EquipmentRentalModal';
export { default as EventRegistrationModal } from './EventRegistrationModal';
export { default as MembershipEnrollModal } from './MembershipEnrollModal';
export { default as UniversalBookingModal } from './UniversalBookingModal';

export type BookingFlowType =
  | 'slot'
  | 'quote'
  | 'order'
  | 'membership'
  | 'event'
  | 'emergency'
  | 'rental'
  | 'info';

/**
 * Determines which canonical booking flow should handle an establishment or practitioner category.
 */
export function getFlowForCategory(category?: string): BookingFlowType {
  if (!category) return 'slot';
  const c = category.toLowerCase().trim();

  // Flow F: Emergency / Instant
  if (
    c.includes('emergency') ||
    c.includes('ambulance') ||
    c.includes('sos') ||
    c.includes('blood_request') ||
    c === 'ride' ||
    c.includes('patient_ride')
  ) {
    return 'emergency';
  }

  // Flow H: Info Only (Govt facilities, helplines, schemes)
  if (
    c.includes('phc') ||
    c.includes('chc') ||
    c.includes('uphc') ||
    c.includes('arogya_mandir') ||
    c.includes('sub_centre') ||
    c.includes('helpline') ||
    c.includes('govt_facility') ||
    c.includes('scheme')
  ) {
    return 'info';
  }

  // Flow E: Event Registration
  if (
    c.includes('camp') ||
    c.includes('event') ||
    c.includes('workshop') ||
    c.includes('webinar') ||
    c.includes('drive') ||
    c.includes('cpr_training') ||
    c.includes('screening_drive') ||
    c.includes('blood_donation')
  ) {
    return 'event';
  }

  // Flow G: Rental
  if (
    c.includes('rental') ||
    c.includes('rent_') ||
    c.includes('equipment_rental') ||
    c.includes('wheelchair') ||
    c.includes('oxygen_cylinder') ||
    c.includes('o2_concentrator') ||
    c.includes('hospital_bed') ||
    c.includes('cpap')
  ) {
    return 'rental';
  }

  // Flow D: Recurring / Membership / Subscriptions
  if (
    c.includes('gym') ||
    c.includes('membership') ||
    c.includes('subscription') ||
    c.includes('chronic_plan') ||
    c.includes('chronic_care') ||
    c.includes('dialysis_series') ||
    c.includes('physio_package') ||
    c.includes('meal_subscription') ||
    c.includes('diet_kitchen')
  ) {
    return 'membership';
  }

  // Flow B: Request & Quote
  if (
    c.includes('quote') ||
    c.includes('eldercare') ||
    c.includes('elder_care') ||
    c.includes('assisted_living') ||
    c.includes('hospice') ||
    c.includes('palliative') ||
    c.includes('home_nursing_agency') ||
    c.includes('long_term_care') ||
    c.includes('caregiver_agency') ||
    c.includes('ivf_intake') ||
    c.includes('fertility_intake') ||
    c.includes('child_dev') ||
    c.includes('corporate_wellness') ||
    c.includes('non_emergency_transport')
  ) {
    return 'quote';
  }

  // Flow C: Order (Goods)
  if (
    c.includes('medicine') ||
    c.includes('pharmacy') ||
    c.includes('chemist') ||
    c.includes('store') ||
    c.includes('product') ||
    c.includes('supplement') ||
    c.includes('optical') ||
    c.includes('spectacles')
  ) {
    return 'order';
  }

  // Flow A: Slot Booking (Default)
  return 'slot';
}

/**
 * Returns user-facing primary action label for UI cards and detail pages.
 */
export function getFlowActionLabel(
  flow: BookingFlowType,
  options?: { isDoctor?: boolean; isSensitive?: boolean; customNoun?: string }
): string {
  switch (flow) {
    case 'quote':
      return 'Request Estimate & Plan';
    case 'membership':
      return 'Enroll in Program';
    case 'event':
      return 'Register for Camp / Drive';
    case 'rental':
      return 'Rent Medical Equipment';
    case 'order':
      return 'Order Medicines / Supplies';
    case 'emergency':
      return 'Emergency Dispatch';
    case 'info':
      return 'View Timings & Directions';
    case 'slot':
    default:
      return options?.isDoctor ? 'Book Consultation' : 'Book Appointment';
  }
}
