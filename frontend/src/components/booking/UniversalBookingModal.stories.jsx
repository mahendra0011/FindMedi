/**
 * Document 11 — Design System Storybook Stories for UniversalBookingModal
 * Demonstrates Flow A (Slots), Flow B (Quote), Flow D (Membership), Flow G (Rental), Flow H (Info-only)
 */
import React, { useState } from 'react';
import UniversalBookingModal from './UniversalBookingModal';
import { Button } from '@/components/ui/button';
import { MemoryRouter } from 'react-router-dom';

export default {
  title: 'DesignSystem/UniversalBookingModal',
  component: UniversalBookingModal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

function ModalTriggerDemo(props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Open {props.title || 'Modal'}</Button>
      <UniversalBookingModal
        {...props}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

export const FlowA_DoctorConsult = {
  name: 'Flow A — Clinic/Doctor Slot Booking',
  render: () => (
    <ModalTriggerDemo
      title="Doctor Booking"
      category="doctor"
      flowType="FLOW_A_SLOT_BOOKING"
      doctor={{
        id: 'doc-1',
        name: 'Dr. Neha Kapoor',
        specialty: 'Pediatrician',
        fees: 600,
      }}
    />
  ),
};

export const FlowB_HomeCareQuote = {
  name: 'Flow B — Request Quote (Home Care / IV Therapy)',
  render: () => (
    <ModalTriggerDemo
      title="Request Quote"
      category="home_service"
      flowType="FLOW_B_REQUEST_QUOTE"
      service={{
        title: 'Post-Operative Nursing Support',
        priceType: 'quote',
      }}
    />
  ),
};

export const FlowD_GymMembership = {
  name: 'Flow D — Gym / Yoga Membership Enrollment',
  render: () => (
    <ModalTriggerDemo
      title="Enroll Membership"
      category="fitness_gym"
      flowType="FLOW_D_RECURRING_MEMBERSHIP"
      service={{
        title: 'Unlimited Fitness Pass',
        price: 2499,
        period: 'monthly',
      }}
    />
  ),
};

export const FlowG_EquipmentRental = {
  name: 'Flow G — Hospital Bed / Oxygen Rental',
  render: () => (
    <ModalTriggerDemo
      title="Rent Equipment"
      category="equipment_rental"
      flowType="FLOW_G_RENTAL"
      service={{
        title: 'Motorized Hospital Bed ICU 3-Function',
        dailyRate: 350,
        securityDeposit: 5000,
      }}
    />
  ),
};

export const FlowH_GovtSchemeInfo = {
  name: 'Flow H — Govt Hospital & Scheme Info Modal',
  render: () => (
    <ModalTriggerDemo
      title="Govt Scheme Info"
      category="govt_facility"
      flowType="FLOW_H_INFO_ONLY"
      facility={{
        name: 'AIIMS New Delhi — OPD & Ayushman Bharat Cell',
        timing: '8:00 AM - 1:00 PM',
        phone: '011-26588500',
        address: 'Ansari Nagar, New Delhi',
        schemes: ['PMJAY (Ayushman Bharat)', 'CGHS', 'ECHS', 'Rashtriya Arogya Nidhi'],
      }}
    />
  ),
};
