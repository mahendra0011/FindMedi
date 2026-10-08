/**
 * Generic, PHI-free wording, shared by two surfaces (6.md §2.15, 9.md §3):
 *
 *  1. the Notification model's push hook - `message` frequently embeds
 *     diagnoses, lab values or names, which are PHI on a lock screen, so push
 *     payloads are generated from the TYPE only;
 *  2. applyDiscreetCopy (services/notificationPreferences.js) - a user with
 *     discreet mode on sees this same wording as the in-app list / read-ack /
 *     live-toast preview.
 *
 * It lives in lib/ rather than on the model because the preference service
 * needs it too: a service -> model import for one constant would make the
 * model's own module (and every spec that mocks it) part of that service's
 * load graph. One table, zero edges.
 */
export const NEUTRAL_COPY = {
  lab: { title: 'New lab update', body: 'A lab report update is available in FindMedi.' },
  radiology: { title: 'New radiology update', body: 'A radiology report update is available in FindMedi.' },
  prescription: { title: 'Prescription update', body: 'There is a prescription update in FindMedi.' },
  emergency: { title: 'Emergency alert', body: 'An emergency alert was raised. Open FindMedi.' },
  billing: { title: 'Billing update', body: 'There is a billing update in FindMedi.' },
  token: { title: 'Security alert', body: 'There was a security-related change on your account. Open FindMedi.' },
  records: { title: 'New health record update', body: 'A health record was updated in FindMedi.' },
  appointment: { title: 'Appointment update', body: 'You have an appointment update in FindMedi.' },
  payment: { title: 'Payment update', body: 'There is a payment update in FindMedi.' },
  ride: { title: 'Ride update', body: 'There is an update about your ride in FindMedi.' },
  reminder: { title: 'Reminder', body: 'You have a new reminder in FindMedi.' },
  sos: { title: 'Emergency alert', body: 'An emergency alert was raised. Open FindMedi.' },
  assistant: { title: 'Assistant update', body: 'You have a new assistant message in FindMedi.' },
  lawyer: { title: 'Legal update', body: 'You have a new legal update in FindMedi.' },
  system: { title: 'FindMedi', body: 'You have a new notification in FindMedi.' },
};
