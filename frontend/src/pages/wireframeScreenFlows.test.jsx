/**
 * Document 12 — Wireframes & Screen Flows (ASCII, low-fidelity)
 * Contract and integration test suite validating that all key UI screens and
 * user interaction journeys adhere to Document 12's wireframe specifications.
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Component imports
import ProviderCardBase from '@/components/cards/ProviderCardBase';
import UniversalBookingModal from '@/components/booking/UniversalBookingModal';
import EquipmentRentalModal from '@/components/booking/EquipmentRentalModal';
import EventRegistrationModal from '@/components/booking/EventRegistrationModal';
import UnifiedSearch from '@/components/search/UnifiedSearch';
import NationalHelplinesModal from '@/components/emergency/NationalHelplinesModal';
import SOSButton from '@/components/emergency/SOSButton';
import SOSModeSelect from '@/components/emergency/SOSModeSelect';
import AccessibilityControls from '@/components/accessibility/AccessibilityControls';

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'Test Patient', role: 'patient', phone: '9876543210' },
    token: 'mock-jwt-token',
    isAuthenticated: true,
  }),
}));

// Mocks for API and router navigation
vi.mock('@/lib/api', () => {
  const apiObj = {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    dispatch: vi.fn().mockResolvedValue({ members: [] }),
    getDoctors: vi.fn().mockResolvedValue([]),
    getBookedSlots: vi.fn().mockResolvedValue([]),
    lockAppointmentSlot: vi.fn().mockResolvedValue({ success: true }),
    releaseAppointmentSlot: vi.fn().mockResolvedValue({ success: true }),
  };
  return {
    default: apiObj,
    api: apiObj,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Document 12 — Wireframes & Screen Flows Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  /* ─── 1. Global Screens (§1) ────────────────────────────────────────────── */
  describe('1. Global Screens & Search Wireframes (§1.1 - §1.4)', () => {
    it('renders Unified Search wireframe with search input, quick symptom chips, and voice search (§1.1, §1.2)', () => {
      render(
        <MemoryRouter>
          <UnifiedSearch />
        </MemoryRouter>
      );

      // Search input with placeholder
      const searchInput = screen.getByPlaceholderText(/search doctors, clinics, tests, medicines/i);
      expect(searchInput).toBeInTheDocument();

      // Voice search button
      expect(screen.getByRole('button', { name: /voice search/i })).toBeInTheDocument();

      // Quick symptom/category chips (Hinglish / English)
      expect(screen.getByText(/tooth pain/i)).toBeInTheDocument();
      expect(screen.getByText(/seene me dard/i)).toBeInTheDocument();
      expect(screen.getByText(/hadda ka doctor/i)).toBeInTheDocument();
    });

    it('enforces Base Listing Card wireframe rules including < 3 reviews badge (§1.3)', () => {
      // 1. New Provider (< 3 reviews)
      const { rerender } = render(
        <ProviderCardBase
          title="Dr. Amit Verma"
          subtitle="BDS - Dental Surgeon"
          verified={true}
          ratingAvg={5.0}
          ratingCount={2} // < 3 reviews
          priceLine="₹500 consult"
          primaryLabel="Book Appointment"
        />
      );

      expect(screen.getByText('Dr. Amit Verma')).toBeInTheDocument();
      expect(screen.getByText(/New/i)).toBeInTheDocument();
      expect(screen.queryByText('(2)')).not.toBeInTheDocument(); // Numeric count masked

      // 2. Established Provider (>= 3 reviews)
      rerender(
        <ProviderCardBase
          title="Dr. Amit Verma"
          subtitle="BDS - Dental Surgeon"
          verified={true}
          ratingAvg={4.8}
          ratingCount={45}
          priceLine="₹500 consult"
          primaryLabel="Book Appointment"
        />
      );
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('(45)')).toBeInTheDocument();
    });

    it('enforces Discreet Mode wireframe on Listing Card for sensitive care (§1.3, §5.3)', () => {
      render(
        <ProviderCardBase
          title="Confidential MindCare Center"
          subtitle="Mental Health & Therapy"
          verified={true}
          discreet={true}
          ratingAvg={4.9}
          ratingCount={100}
          priceLine="₹1,200 per session"
          primaryLabel="Book Session"
        />
      );

      // In discreet mode, detailed numeric rating is replaced with Verified Provider text
      expect(screen.getByText(/Verified Provider/i)).toBeInTheDocument();
      expect(screen.queryByText('4.9')).not.toBeInTheDocument();
    });
  });

  /* ─── 2. Universal Booking Flows (§3) ───────────────────────────────────── */
  describe('2. Universal Booking & Order Flows (§3 & §4)', () => {
    it('dispatches Flow G (Equipment Rental) with duration & deposit calculation (§4.2)', () => {
      render(
        <MemoryRouter>
          <EquipmentRentalModal
            open={true}
            onOpenChange={vi.fn()}
            equipment={{
              id: 'equip-1',
              name: 'Oxygen Concentrator 5L',
              monthlyRent: 4500,
              deposit: 5000,
              rxRequired: true,
            }}
          />
        </MemoryRouter>
      );

      // Verify rental wireframe elements
      expect(screen.getByText(/Oxygen Concentrator 5L/i)).toBeInTheDocument();
      expect(screen.getByText(/Select Rental Duration/i)).toBeInTheDocument();
      expect(screen.getByText(/100% Autoclaved & Sanitised/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed to pay/i })).toBeInTheDocument();
    });

    it('dispatches Flow E (Event/Camp Registration) with ticket generation consent (§4.3)', () => {
      render(
        <MemoryRouter>
          <EventRegistrationModal
            open={true}
            onOpenChange={vi.fn()}
            event={{
              id: 'event-eye-camp',
              title: 'Free Eye Checkup & Cataract Screening Camp',
              fee: 0,
              seatsLeft: 23,
              eligibility: '40+ years',
              organizer: 'Rotary Club & City Eye Hospital',
              category: 'Preventive Camp',
            }}
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/Free Eye Checkup & Cataract Screening Camp/i)).toBeInTheDocument();
      expect(screen.getByText(/23 spots remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/I consent to on-spot diagnostic screenings/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm free registration pass/i })).toBeInTheDocument();
    });

    it('dispatches Flow H (Info Only for Govt Facilities) without payment gate (§3, §4)', () => {
      render(
        <MemoryRouter>
          <UniversalBookingModal
            open={true}
            onOpenChange={vi.fn()}
            flowType="info"
            category="govt_facility"
            facility={{
              name: 'District Civil Hospital Bhopal',
              city: 'Bhopal',
              address: 'Near Hamidia Road, Bhopal',
            }}
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/District Civil Hospital Bhopal/i)).toBeInTheDocument();
      expect(screen.getByText(/Public Health Facility · Info & Walk-In/i)).toBeInTheDocument();
      expect(screen.getByText(/General OPD Timings/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate today's opd token/i })).toBeInTheDocument();
    });
  });

  /* ─── 3. Accessibility & Elder Mode Controls (§1.1, §11) ───────────────── */
  describe('3. Accessibility & Inclusive Experience (§1.1, §11)', () => {
    it('renders floating accessibility widget and toggles Elder Mode', () => {
      render(<AccessibilityControls />);

      const a11yBtn = screen.getByRole('button', { name: /accessibility & elder mode settings/i });
      expect(a11yBtn).toBeInTheDocument();
      fireEvent.click(a11yBtn);

      // In open panel, the first checkbox is Elder Mode
      const checkboxes = screen.getAllByRole('checkbox');
      const elderCheckbox = checkboxes[0];
      fireEvent.click(elderCheckbox);

      expect(document.documentElement.classList.contains('elder-mode')).toBe(true);
    });
  });

  /* ─── 4. Emergency SOS Flow (§8) ────────────────────────────────────────── */
  describe('4. Emergency SOS Wireframe & Fallback Flow (§8)', () => {
    it('triggers National Helplines without requiring authentication or payment gate', () => {
      const handleClose = vi.fn();
      render(<NationalHelplinesModal open={true} onClose={handleClose} />);

      // Emergency numbers
      expect(screen.getByText(/official national emergency helplines/i)).toBeInTheDocument();
      expect(screen.getAllByText(/112/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/108/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0); // Tele-MANAS
      expect(screen.getByText(/all-in-one national emergency/i)).toBeInTheDocument();
    });

    it('renders floating SOS trigger with instant one-tap emergency action', () => {
      const handleSos = vi.fn();
      render(
        <MemoryRouter>
          <SOSButton onClick={handleSos} />
        </MemoryRouter>
      );

      const sosFab = screen.getByRole('button', { name: /emergency sos/i });
      expect(sosFab).toBeInTheDocument();
      fireEvent.click(sosFab);
      expect(handleSos).toHaveBeenCalledTimes(1);
    });

    it('supports SOS Mode Select with auto/manual dispatch wireframe', () => {
      const onSelect = vi.fn();
      const onContinue = vi.fn();
      render(<SOSModeSelect selected="auto_select_ambulance" onSelect={onSelect} onContinue={onContinue} />);

      expect(screen.getByRole('heading', { name: /kaise search karein/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^select vehicle khud/i }));
      expect(onSelect).toHaveBeenCalledWith('manual_select');
      fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });
});
