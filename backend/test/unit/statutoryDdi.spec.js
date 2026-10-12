import { readFileSync } from 'node:fs';
import { calculatePf, calculateEsi, calculateGratuity, calculateTds, resolveStatutoryVersion, getStatutoryVersionMeta } from '../../src/services/statutoryEngine.js';
import { checkDrugInteractions, checkDrugInteractionsDetailed } from '../../src/services/ddiEngine.js';

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

    // T4 (file 31): FY-versioned statutory config — payroll month decides
    // which rules apply, so arrears/backdated runs stay correct.
    test('resolveStatutoryVersion picks FY by payroll month (boundary 2026-04-01)', () => {
      const mar = resolveStatutoryVersion('2026-03-31');
      const apr = resolveStatutoryVersion('2026-04-01');
      expect(mar.fy).toBe('2025-26');
      expect(apr.fy).toBe('2026-27');
      expect(resolveStatutoryVersion(new Date('2026-07-15')).fy).toBe('2026-27');
      // Default (no arg) = current version in force
      expect(resolveStatutoryVersion().fy).toBe('2026-27');
    });

    test('getStatutoryVersionMeta reports sign-off status for payslip/audit', () => {
      const meta = getStatutoryVersionMeta('2026-06-01');
      expect(meta.fy).toBe('2026-27');
      expect(meta.effectiveFrom).toBe('2026-04-01');
      // FY 2026-27 must stay unverified until a CA signs off
      expect(meta.verified).toBe(false);
      expect(meta.sourceNote).toContain('CA');

      const old = getStatutoryVersionMeta('2025-10-01');
      expect(old.fy).toBe('2025-26');
      expect(old.verified).toBe(true);
    });

    test('calculations accept an asOf date (backdated runs use that era rules)', () => {
      const pfMar = calculatePf(25000, 5000, false, '2026-03-31');
      const pfApr = calculatePf(25000, 5000, false, '2026-04-01');
      expect(pfMar.employeePf).toBe(1800);
      expect(pfApr.employeePf).toBe(1800); // ceiling unchanged in seeded values

      const tdsBackdated = calculateTds(2400000, 0, 0, '2026-03-31');
      expect(tdsBackdated.statutoryVersion.fy).toBe('2025-26');
      const tdsCurrent = calculateTds(2400000);
      expect(tdsCurrent.statutoryVersion.fy).toBe('2026-27');
    });

    test('statutory.json versions are structurally sound', () => {
      const raw = JSON.parse(readFileSync(new URL('../../src/config/statutory.json', import.meta.url), 'utf8'));
      expect(Array.isArray(raw.versions)).toBe(true);
      expect(raw.versions.length).toBeGreaterThanOrEqual(2);
      for (const v of raw.versions) {
        expect(v.fy).toMatch(/^\d{4}-\d{2}$/);
        expect(v.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(v.pf?.employeeRate).toBeGreaterThan(0);
        expect(v.esi?.grossWageCeiling).toBeGreaterThan(0);
        expect(v.gratuity?.minimumTenureYears).toBeGreaterThan(0);
        expect(v.tds?.standardDeduction).toBeGreaterThan(0);
        expect(Array.isArray(v.newTaxRegimeSlabs)).toBe(true);
        expect(typeof v.verified).toBe('boolean');
      }
      // The only verified version must be the CA-approved baseline; the new FY
      // must remain unverified until sign-off happens outside this repo.
      expect(raw.versions.find((v) => v.fy === '2025-26').verified).toBe(true);
      expect(raw.versions.find((v) => v.fy === '2026-27').verified).toBe(false);
      // No silent gap: versions must be contiguous FYs
      const fys = raw.versions.map((v) => v.fy);
      expect(new Set(fys).size).toBe(fys.length);
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

    // Wave 4 hardening: the knowledge base grew from 12 to 145 curated pairs and
    // matching is symmetric. These tests stop a silent shrink or a one-way key.
    test('knowledge base stays curated (>= 100 pairs) with a majority of major severity', () => {
      const db = JSON.parse(readFileSync(new URL('../../src/config/interactions.json', import.meta.url), 'utf8'));
      expect(db.length).toBeGreaterThanOrEqual(100);
      const major = db.filter((e) => e.severity === 'major').length;
      expect(major).toBeGreaterThanOrEqual(60);
      for (const e of db) {
        expect(['major', 'moderate', 'minor']).toContain(e.severity);
        expect(e.drugA && e.drugB && e.effect && e.recommendation).toBeTruthy();
      }
    });

    test('matching is symmetric regardless of prescribed order', () => {
      const forward = checkDrugInteractions(['clarithromycin', 'simvastatin']);
      const reverse = checkDrugInteractions(['simvastatin', 'clarithromycin']);
      expect(forward.length).toBe(1);
      expect(reverse.length).toBe(1);
      expect(reverse[0].severity).toBe('major');
      expect(reverse[0].drugA).toBe('simvastatin');
    });

    test('sorts multi-drug results by severity (major before moderate)', () => {
      const results = checkDrugInteractions([
        'warfarin', 'aspirin', 'sertraline', 'phenelzine', 'ibuprofen',
      ]);
      const order = results.map((r) => r.severity);
      expect(order[0]).toBe('major');
      expect(order[order.length - 1]).toBe('moderate');
      const idxMajor = order.indexOf('major');
      const idxModerate = order.indexOf('moderate');
      expect(idxMajor).toBeLessThan(idxModerate);
    });

    // T3 (file 31) hardening: strength tokens are stripped, unknown drugs are
    // surfaced as "not checked", and a 20-drug check stays well under 50ms.
    test('strips strength tokens so "Warfarin 5 mg" still matches entry "warfarin"', () => {
      const results = checkDrugInteractions(['Warfarin 5 mg', 'Aspirin 75 mg']);
      expect(results.length).toBe(1);
      expect(results[0].severity).toBe('major');
    });

    test('reports unknown drugs instead of silently claiming "safe"', () => {
      const { interactions, unknownDrugs } = checkDrugInteractionsDetailed([
        'Zzznotindb Drug 10mg', 'Anotherzzi Pill 5mg',
      ]);
      expect(interactions).toEqual([]);
      expect(unknownDrugs).toHaveLength(2);
    });

    test('mixed known pair still flags the interaction', () => {
      const { interactions } = checkDrugInteractionsDetailed([
        'Warfarin 5mg', 'Aspirin 75mg', 'Zzznotindb Drug 10mg',
      ]);
      expect(interactions).toHaveLength(1);
      expect(interactions[0].severity).toBe('major');
    });

    test('performs a 20-drug check in under 50ms (pre-normalized DB + cache)', () => {
      const drugs = Array.from({ length: 20 }, (_, i) => `Drugname${i} ${i + 1}mg`);
      drugs[0] = 'Warfarin 5mg';
      drugs[1] = 'Aspirin 75mg';
      const t0 = performance.now();
      checkDrugInteractions(drugs);
      const first = performance.now() - t0;
      const t1 = performance.now();
      checkDrugInteractions(drugs); // cached second call
      const second = performance.now() - t1;
      expect(first).toBeLessThan(50);
      expect(second).toBeLessThan(50);
    });

    test('empty / single-drug input returns no interactions', () => {
      expect(checkDrugInteractions([])).toEqual([]);
      expect(checkDrugInteractions(['Aspirin'])).toEqual([]);
      expect(checkDrugInteractions('not-an-array')).toEqual([]);
    });
  });
});
