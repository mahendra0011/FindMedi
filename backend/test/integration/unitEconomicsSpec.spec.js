import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';
import {
  BUSINESS_MODEL_CANVAS,
  REVENUE_STREAMS,
  CATEGORY_BENCHMARKS,
  LEGAL_COMMERCIAL_GUARDRAILS,
  calculateContributionMargin,
  calculatePatientLtv,
  calculateBreakEvenBookings,
  calculateLtvCacRatio,
} from '../../src/config/unitEconomics.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 16: Business Model & Unit Economics Spec API', () => {
  test('Patients cannot access unit-economics-spec (403)', async () => {
    await as(patient).get('/unit-economics-spec').expect(403);
  });

  test('Superadmin receives commercial canvas, revenue streams and guardrails (200)', async () => {
    const res = await as(superadmin).get('/unit-economics-spec').expect(200);

    expect(res.body).toHaveProperty('canvas');
    expect(res.body).toHaveProperty('revenueStreams');
    expect(res.body).toHaveProperty('categoryBenchmarks');
    expect(res.body).toHaveProperty('legalCommercialGuardrails');

    // Canvas checks
    expect(res.body.canvas.customerSegments.length).toBeGreaterThanOrEqual(4);
    expect(res.body.canvas.valueProposition).toHaveProperty('patients');
    expect(res.body.canvas.valueProposition).toHaveProperty('providers');

    // Revenue streams checks
    expect(res.body.revenueStreams.length).toBeGreaterThanOrEqual(5);
    const commissionStream = res.body.revenueStreams.find((s) => s.stream.includes('Commission'));
    expect(commissionStream.regulatorySafeguard).toContain('NMC/MCI');

    // Category benchmarks checks
    expect(res.body.categoryBenchmarks).toHaveProperty('consult');
    expect(res.body.categoryBenchmarks).toHaveProperty('lab');
    expect(res.body.categoryBenchmarks).toHaveProperty('pharmacy');
    expect(res.body.categoryBenchmarks).toHaveProperty('equipment_rental');

    // Statutory guardrails checks
    const guardrailRules = res.body.legalCommercialGuardrails.map((g) => g.rule);
    expect(guardrailRules).toContain('Prohibition of Doctor Referral Fees / Fee-Splitting');
    expect(guardrailRules).toContain('Escrow & Payment Aggregator Nodal Account Compliance');
  });

  test('City manager has crm:read and can access unit-economics-spec (200)', async () => {
    const res = await as(cityManager).get('/unit-economics-spec').expect(200);
    expect(res.body.revenueStreams).toHaveLength(6);
  });

  describe('Unit Economics Calculation Utilities', () => {
    test('calculateContributionMargin matches Document 16 dental worked example', () => {
      // AOV ₹800, Take Rate 12%, Gateway 2%, Notif ₹2, Support ₹6, Refund 1%
      const res = calculateContributionMargin({
        aov: 800,
        takeRatePercent: 12,
        gatewayFeePercent: 2,
        notifCost: 2,
        supportCost: 6,
        refundLeakagePercent: 1,
      });

      expect(res.revenue).toBe(96); // 800 * 0.12
      expect(res.variableCosts).toBe(32); // 16 + 2 + 6 + 8
      expect(res.contribution).toBe(64); // 96 - 32
      expect(res.contributionMarginPercent).toBe(8); // 64 / 800 * 100
    });

    test('calculatePatientLtv computes 2-year lifetime value', () => {
      // 3 bookings/yr, 2 years, ₹64 contribution/bkg = ₹384 LTV
      const ltv = calculatePatientLtv({
        contributionPerBooking: 64,
        bookingsPerYear: 3,
        retentionYears: 2,
      });
      expect(ltv).toBe(384);
    });

    test('calculateBreakEvenBookings computes required volume with subscription offset', () => {
      // Fixed costs ₹8,00,000/mo, subscriptions ₹1,99,800/mo, contribution ₹64/bkg
      const breakEven = calculateBreakEvenBookings({
        fixedCostsMonthly: 800000,
        subscriptionRevenueMonthly: 199800,
        blendedContributionPerBooking: 64,
      });
      // (800000 - 199800) / 64 = 600200 / 64 = 9378.125 -> 9379
      expect(breakEven).toBe(9379);
    });

    test('calculateLtvCacRatio classifies LTV:CAC health status', () => {
      expect(calculateLtvCacRatio({ ltv: 384, cac: 128 })).toEqual({ ratio: 3, status: 'healthy' });
      expect(calculateLtvCacRatio({ ltv: 500, cac: 100 })).toEqual({ ratio: 5, status: 'excellent' });
      expect(calculateLtvCacRatio({ ltv: 200, cac: 100 })).toEqual({ ratio: 2, status: 'fair' });
      expect(calculateLtvCacRatio({ ltv: 100, cac: 100 })).toEqual({ ratio: 1, status: 'poor' });
      expect(calculateLtvCacRatio({ ltv: 100, cac: 0 })).toEqual({ ratio: 0, status: 'unknown' });
    });
  });
});
