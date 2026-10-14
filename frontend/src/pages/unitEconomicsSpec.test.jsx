/**
 * Document 16 — Business Model & Unit Economics Test Suite
 * Validating:
 * 1. Unit economics calculation engine (Contribution Margin, LTV, Break-even, LTV:CAC)
 * 2. Canonical category benchmarks (Consult, Lab, Pharmacy, Home nursing, Rental, etc.)
 * 3. Revenue streams & statutory guardrails (NMC doctor referral ban, RBI PA escrow)
 * 4. Superadmin PlatformKPIs Unit Economics console UI integration
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  BUSINESS_MODEL_CANVAS,
  REVENUE_STREAMS,
  CATEGORY_BENCHMARKS,
  LEGAL_COMMERCIAL_GUARDRAILS,
  calculateContributionMargin,
  calculatePatientLtv,
  calculateBreakEvenBookings,
  calculateLtvCacRatio,
} from '@/lib/unitEconomics';
import PlatformKPIs from './superadmin/PlatformKPIs';

// Mock API calls for PlatformKPIs
vi.mock('@/lib/api', () => ({
  api: {
    dashboardStats: vi.fn().mockResolvedValue({
      stats: { totalDoctors: 150, totalPatients: 1200, totalBookings: 3400 },
      weeklyAppointments: [{ day: 'Mon', count: 12 }, { day: 'Tue', count: 18 }],
      revenueData: [{ month: 'Jan', revenue: 50000 }],
    }),
    getCommissionStats: vi.fn().mockResolvedValue({
      totalCommission: 75000,
      monthlyTrend: [{ month: 'Jan', earnings: 75000 }],
    }),
    getHospitals: vi.fn().mockResolvedValue({ total: 12 }),
    getUsers: vi.fn().mockResolvedValue({ total: 1200 }),
    getPendingHospitals: vi.fn().mockResolvedValue([]),
    getFacilities: vi.fn().mockResolvedValue({ total: 45 }),
    getTicketStats: vi.fn().mockResolvedValue({ open: 2, total: 20 }),
    getDisputeStats: vi.fn().mockResolvedValue({ open: 1 }),
    getEmergencyStats: vi.fn().mockResolvedValue({ active: 0 }),
    getTodayRegistrations: vi.fn().mockResolvedValue({ total: 5 }),
  },
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('Document 16 — Business Model & Unit Economics Spec', () => {
  describe('1. Unit Economics Calculation Engine', () => {
    it('calculates contribution margin matching Document 16 dental worked example', () => {
      // Dental booking: AOV ₹800, Take Rate 12%, Gateway 2% (₹16), Notif ₹2, Support ₹6, Refund 1% (₹8)
      // Revenue = ₹96, Variable = ₹32, Contribution = ₹64 (8% margin)
      const res = calculateContributionMargin({
        aov: 800,
        takeRatePercent: 12,
        gatewayFeePercent: 2,
        notifCost: 2,
        supportCost: 6,
        refundLeakagePercent: 1,
      });

      expect(res.revenue).toBe(96);
      expect(res.variableCosts).toBe(32);
      expect(res.contribution).toBe(64);
      expect(res.contributionMarginPercent).toBe(8);
    });

    it('calculates patient 2-year LTV correctly', () => {
      // 3 bookings/year, 2 years, ₹64 contribution/booking = ₹384 LTV
      const ltv = calculatePatientLtv({
        contributionPerBooking: 64,
        bookingsPerYear: 3,
        retentionYears: 2,
      });
      expect(ltv).toBe(384);
    });

    it('calculates break-even booking volume with subscription offset', () => {
      // Fixed costs ₹8,00,000, subscription revenue ₹1,99,800, contribution ₹64
      // Net fixed = 600200 / 64 = 9378.125 -> 9379 bookings
      const breakEven = calculateBreakEvenBookings({
        fixedCostsMonthly: 800000,
        subscriptionRevenueMonthly: 199800,
        blendedContributionPerBooking: 64,
      });
      expect(breakEven).toBe(9379);
    });

    it('evaluates LTV : CAC health status correctly', () => {
      expect(calculateLtvCacRatio({ ltv: 384, cac: 128 })).toEqual({ ratio: 3, status: 'healthy' });
      expect(calculateLtvCacRatio({ ltv: 600, cac: 120 })).toEqual({ ratio: 5, status: 'excellent' });
      expect(calculateLtvCacRatio({ ltv: 200, cac: 100 })).toEqual({ ratio: 2, status: 'fair' });
      expect(calculateLtvCacRatio({ ltv: 100, cac: 120 })).toEqual({ ratio: 0.8, status: 'poor' });
      expect(calculateLtvCacRatio({ ltv: 100, cac: 0 })).toEqual({ ratio: 0, status: 'unknown' });
    });
  });

  describe('2. Canonical Category Benchmarks', () => {
    it('contains baseline benchmarks for core marketplace categories', () => {
      expect(CATEGORY_BENCHMARKS).toHaveProperty('consult');
      expect(CATEGORY_BENCHMARKS).toHaveProperty('lab');
      expect(CATEGORY_BENCHMARKS).toHaveProperty('pharmacy');
      expect(CATEGORY_BENCHMARKS).toHaveProperty('home_nursing');
      expect(CATEGORY_BENCHMARKS).toHaveProperty('gym_yoga');
      expect(CATEGORY_BENCHMARKS).toHaveProperty('equipment_rental');
      expect(CATEGORY_BENCHMARKS).toHaveProperty('events');

      expect(CATEGORY_BENCHMARKS.consult.takeRatePercent).toBe(12);
      expect(CATEGORY_BENCHMARKS.pharmacy.takeRatePercent).toBe(5); // thin margins
      expect(CATEGORY_BENCHMARKS.gym_yoga.takeRatePercent).toBe(15);
    });
  });

  describe('3. Revenue Streams & Statutory Guardrails', () => {
    it('defines 6 active revenue streams with regulatory safeguards', () => {
      expect(REVENUE_STREAMS).toHaveLength(6);
      const commission = REVENUE_STREAMS.find((s) => s.stream.includes('Commission'));
      expect(commission.regulatorySafeguard).toMatch(/NMC\/MCI/i);
    });

    it('contains 4 statutory legal and tax guardrails', () => {
      expect(LEGAL_COMMERCIAL_GUARDRAILS).toHaveLength(4);
      const rules = LEGAL_COMMERCIAL_GUARDRAILS.map((g) => g.rule);
      expect(rules).toContain('Prohibition of Doctor Referral Fees / Fee-Splitting');
      expect(rules).toContain('Escrow & Payment Aggregator Nodal Account Compliance');
      expect(rules).toContain('E-Commerce Tax Deductions (TDS & GST)');
      expect(rules).toContain('Consumer Protection & Price Transparency');
    });
  });

  describe('4. Superadmin PlatformKPIs Unit Economics Console', () => {
    it('renders PlatformKPIs with Unit Economics action button', async () => {
      render(
        <MemoryRouter>
          <PlatformKPIs />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Platform Overview/i })).toBeInTheDocument();
      });

      expect(screen.getByTestId('unit-economics-btn')).toBeInTheDocument();
      expect(screen.getByText(/Unit Economics \(Doc 16\)/i)).toBeInTheDocument();
    });

    it('opens Unit Economics console modal and displays tabs', async () => {
      render(
        <MemoryRouter>
          <PlatformKPIs />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unit-economics-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('unit-economics-btn'));

      expect(screen.getByTestId('unit-economics-dialog')).toBeInTheDocument();
      expect(screen.getByText(/Business Model & Unit Economics Console/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Live Simulator/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Category Benchmarks/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Revenue Streams/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Legal Guardrails/i })).toBeInTheDocument();
    });
  });
});
