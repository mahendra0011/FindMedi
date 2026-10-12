import { calculatePf, calculateEsi, calculateGratuity, calculateTds } from '../../src/services/statutoryEngine.js';
import { checkDrugInteractions } from '../../src/services/ddiEngine.js';

describe('Wave 4 Unit Specs — Statutory & DDI Engines', () => {
  describe('Statutory Engine', () => {
    test('calculatePf computes correct 12% contribution with ₹1800 cap', () => {
      // Basic 10,000 + DA 2,000 = 12,000 (<= 15,000)
      const resBelow = calculatePf(10000, 2000);
      expect(resBelow.pfWage).toBe(12000);
      expect(resBelow.employeePf).toBe(1440);
      expect(resBelow.employerPf).toBe(1440);

      // Basic 25,000 + DA 5,000 = 30,000 (> 15,000 wage ceiling) -> capped at 1,800
      const resAbove = calculatePf(25000, 5000);
      expect(resAbove.pfWage).toBe(30000);
      expect(resAbove.employeePf).toBe(1800);
    });

    test('calculateEsi applies 0.75% employee and 3.25% employer if wage <= 21,000', () => {
      const eligible = calculateEsi(20000);
      expect(eligible.isEligible).toBe(true);
      expect(eligible.employeeEsi).toBe(150); // 20000 * 0.0075
      expect(eligible.employerEsi).toBe(650); // 20000 * 0.0325

      const ineligible = calculateEsi(25000);
      expect(ineligible.isEligible).toBe(false);
      expect(ineligible.employeeEsi).toBe(0);
      expect(ineligible.employerEsi).toBe(0);
    });

    test('calculateGratuity requires minimum 5 years tenure', () => {
      const underFive = calculateGratuity(30000, 4);
      expect(underFive.isEligible).toBe(false);
      expect(underFive.gratuityAmount).toBe(0);

      // 6 years: (15 / 26) * 30,000 * 6 = 103,846
      const eligible = calculateGratuity(30000, 6);
      expect(eligible.isEligible).toBe(true);
      expect(eligible.gratuityAmount).toBe(Math.round((15 / 26) * 30000 * 6));
    });

    test('calculateTds handles new tax regime slabs', () => {
      // Annual income 6,00,000 -> eligible for full 87A rebate
      const rebateRes = calculateTds(600000);
      expect(rebateRes.annualTax).toBe(0);
      expect(rebateRes.monthlyTds).toBe(0);

      // Annual income 24,00,000 -> tax calculated across slabs + 4% cess
      const highRes = calculateTds(2400000);
      expect(highRes.taxableIncome).toBe(2400000 - 75000);
      expect(highRes.annualTax).toBeGreaterThan(0);
      expect(highRes.monthlyTds).toBe(Math.round(highRes.annualTax / 12));
    });
  });

  describe('DDI Engine', () => {
    test('detects major severity interaction between warfarin and aspirin', () => {
      const results = checkDrugInteractions(['Warfarin 5mg', 'Aspirin 75mg']);
      expect(results.length).toBe(1);
      expect(results[0].severity).toBe('major');
      expect(results[0].drugA).toBe('warfarin');
      expect(results[0].drugB).toBe('aspirin');
    });

    test('detects metformin and iodinated contrast conflict', () => {
      const results = checkDrugInteractions(['Metformin 500mg', 'Iodinated Contrast']);
      expect(results.length).toBe(1);
      expect(results[0].severity).toBe('major');
      expect(results[0].effect).toContain('lactic acidosis');
    });

    test('returns empty array when prescribed drugs have no interactions', () => {
      const results = checkDrugInteractions(['Paracetamol 650mg', 'Amoxicillin 500mg']);
      expect(results).toEqual([]);
    });
  });
});
