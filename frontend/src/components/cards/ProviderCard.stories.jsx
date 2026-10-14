/**
 * Document 11 — Design System Storybook Stories for ProviderCardBase
 * Demonstrates variants, states, discreet mode, rating rules, and accessibility.
 */
import React from 'react';
import ProviderCardBase from './ProviderCardBase';

export default {
  title: 'DesignSystem/ProviderCard',
  component: ProviderCardBase,
  tags: ['autodocs'],
};

export const VerifiedDoctor = {
  args: {
    id: 'doc-1',
    title: 'Dr. Ananya Sharma',
    subtitle: 'MBBS, MD - Cardiology • 12 yrs exp',
    verified: true,
    ratingAvg: 4.8,
    ratingCount: 142,
    distanceKm: 2.4,
    openNow: true,
    openLabel: 'Open Today till 8:00 PM',
    chips: ['Cardiology', 'ECG', 'Hypertension', 'Echo'],
    priceLine: '₹800 consultation fee',
    trustBadges: ['NMC Verified', 'NABH Accredited'],
    nextSlotLabel: 'Next slot today at 4:30 PM',
    primaryLabel: 'Book Appointment',
    secondaryLabel: 'View Profile',
  },
};

export const NewProvider = {
  name: 'New Provider (< 3 Reviews, Sparkles Badge)',
  args: {
    id: 'doc-new',
    title: 'Dr. Rahul Verma',
    subtitle: 'BDS - Dental Surgeon • 3 yrs exp',
    verified: true,
    ratingAvg: 5.0,
    ratingCount: 2, // < 3 reviews triggers "New" badge instead of numeric rating
    distanceKm: 1.1,
    openNow: true,
    chips: ['Root Canal', 'Teeth Whitening'],
    priceLine: '₹400 consultation fee',
    primaryLabel: 'Book Consultation',
  },
};

export const DiscreetMode = {
  name: 'Discreet / Sensitive Care (Private & Confidential)',
  args: {
    id: 'counsellor-1',
    title: 'MindCare Consultation Suite',
    subtitle: 'Clinical Psychology & Therapy',
    verified: true,
    discreet: true,
    ratingAvg: 4.9,
    ratingCount: 88,
    distanceKm: 3.5,
    openNow: true,
    chips: ['Confidential', 'Audio/Video', 'Discreet Billing'],
    priceLine: '₹1,200 per session',
    primaryLabel: 'Book Discreet Session',
  },
};

export const SponsoredListing = {
  name: 'Sponsored Placement (Clearly Labelled)',
  args: {
    id: 'clinic-sponsored',
    title: 'Apex Multi-Speciality Clinic',
    subtitle: 'Day Care, Diagnostics & OPD',
    verified: true,
    sponsored: true,
    ratingAvg: 4.6,
    ratingCount: 310,
    distanceKm: 4.8,
    openNow: true,
    chips: ['General Medicine', 'Pediatrics', 'Diagnostics'],
    priceLine: '₹500 consultation fee',
    primaryLabel: 'Book Now',
  },
};

export const UnavailableOrClosed = {
  name: 'Unavailable / Off-Duty Provider',
  args: {
    id: 'doc-off',
    title: 'Dr. Vikram Patel',
    subtitle: 'Orthopedic Surgeon',
    verified: true,
    unavailable: true,
    unavailableLabel: 'Fully booked this week',
    ratingAvg: 4.7,
    ratingCount: 95,
    distanceKm: 5.2,
    closed: true,
    chips: ['Joint Replacement', 'Fractures'],
    priceLine: '₹900 consultation fee',
    primaryLabel: 'Join Waitlist',
  },
};
