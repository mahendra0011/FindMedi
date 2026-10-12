import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config/statutory.json');

/** Legacy flat fallback (pre-versioning shape) — used only if the JSON is unreadable. */
const LEGACY_CONFIG = {
  versions: [{
    fy: '2025-26',
    effectiveFrom: '2025-04-01',
    verified: false,
    verifiedBy: null,
    pf: { employeeRate: 0.12, employerRate: 0.12, wageCeiling: 15000, maxEmployeeMonthlyContribution: 1800 },
    esi: { grossWageCeiling: 21000, employeeRate: 0.0075, employerRate: 0.0325 },
    gratuity: { daysFactorNumerator: 15, daysFactorDenominator: 26, minimumTenureYears: 5 },
    tds: { standardDeduction: 75000, rebate87aTaxableLimit: 1200000 },
    newTaxRegimeSlabs: [
      { upTo: 400000, rate: 0.0 },
      { upTo: 800000, rate: 0.05 },
      { upTo: 1200000, rate: 0.10 },
      { upTo: 1600000, rate: 0.15 },
      { upTo: 2000000, rate: 0.20 },
      { upTo: 2400000, rate: 0.25 },
      { upTo: null, rate: 0.30 },
    ],
  }],
};

let statutoryConfig;
try {
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (Array.isArray(parsed?.versions) && parsed.versions.length > 0) {
    statutoryConfig = parsed;
  } else if (parsed?.pf) {
    // Legacy flat shape → wrap as a single version so resolve() works uniformly.
    statutoryConfig = { versions: [{ fy: parsed.financialYear || 'unknown', effectiveFrom: '2025-04-01', verified: false, verifiedBy: null, ...parsed }] };
  } else {
    statutoryConfig = LEGACY_CONFIG;
  }
} catch {
  statutoryConfig = LEGACY_CONFIG;
}

// Ascending effectiveFrom so the newest applicable version wins.
const VERSIONS = [...statutoryConfig.versions].sort(
  (a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime(),
);

/**
 * T4 (file 31): pick the statutory version in force for a payroll month.
 * Backdated / arrears runs pass the actual wage-month and get that era's rules.
 *
 * @param {string|Date|number} [asOf] — payroll date; defaults to "now"
 * @returns {object} the version object { fy, effectiveFrom, verified, pf, ... }
 */
export function resolveStatutoryVersion(asOf) {
  const when = asOf == null ? Date.now() : new Date(asOf).getTime();
  if (Number.isNaN(when)) return VERSIONS[VERSIONS.length - 1];
  let picked = VERSIONS[0];
  for (const v of VERSIONS) {
    if (new Date(v.effectiveFrom).getTime() <= when) picked = v;
  }
  return picked;
}

/**
 * Version metadata for payslip footer / PayrollRun.statutoryVersion audit.
 */
export function getStatutoryVersionMeta(asOf) {
  const v = resolveStatutoryVersion(asOf);
  return {
    fy: v.fy,
    effectiveFrom: v.effectiveFrom,
    verified: v.verified === true,
    verifiedBy: v.verifiedBy || null,
    sourceNote: v.sourceNote || null,
  };
}

/**
 * Calculates Employee & Employer Provident Fund (PF).
 * Wage base = Basic + DA.
 * If wage <= 15000: 12% employee capped at ₹1800, employer 12% (3.67% EPF + 8.33% EPS).
 * @param {string|Date} [asOf] payroll month → statutory version selector
 */
export function calculatePf(basicPay, da = 0, optVoluntaryHigher = false, asOf = undefined) {
  const wage = Math.max(0, Number(basicPay || 0) + Number(da || 0));
  const { employeeRate, wageCeiling, maxEmployeeMonthlyContribution } = resolveStatutoryVersion(asOf).pf;

  let employeePf;
  if (!optVoluntaryHigher && wage > wageCeiling) {
    employeePf = maxEmployeeMonthlyContribution;
  } else {
    employeePf = Math.min(Math.round(wage * employeeRate), wage <= wageCeiling ? maxEmployeeMonthlyContribution : Infinity);
  }

  const employerPension = Math.round(Math.min(wage, wageCeiling) * 0.0833);
  const employerEpfs = Math.round(employeePf - employerPension);
  const employerPf = employerPension + employerEpfs;

  return {
    pfWage: wage,
    employeePf,
    employerPf,
    employerPension,
    employerEpfs,
  };
}

/**
 * Calculates Employee & Employer State Insurance (ESI).
 * Applicable if gross monthly wages <= ₹21,000.
 * Employee: 0.75%, Employer: 3.25%.
 * @param {string|Date} [asOf] payroll month → statutory version selector
 */
export function calculateEsi(grossSalary, asOf = undefined) {
  const gross = Math.max(0, Number(grossSalary || 0));
  const { grossWageCeiling, employeeRate, employerRate } = resolveStatutoryVersion(asOf).esi;

  if (gross > grossWageCeiling) {
    return {
      isEligible: false,
      grossWage: gross,
      employeeEsi: 0,
      employerEsi: 0,
    };
  }

  const employeeEsi = Math.round(gross * employeeRate);
  const employerEsi = Math.round(gross * employerRate);

  return {
    isEligible: true,
    grossWage: gross,
    employeeEsi,
    employerEsi,
  };
}

/**
 * Calculates Payment of Gratuity.
 * Formula: (15 / 26) * Last Drawn Basic * Tenure in Completed Years.
 * Minimum eligibility: 5 years of service.
 * @param {string|Date} [asOf] payroll month → statutory version selector
 */
export function calculateGratuity(lastDrawnBasic, tenureYears, asOf = undefined) {
  const basic = Math.max(0, Number(lastDrawnBasic || 0));
  const years = Math.max(0, Number(tenureYears || 0));
  const { daysFactorNumerator, daysFactorDenominator, minimumTenureYears } = resolveStatutoryVersion(asOf).gratuity;

  const isEligible = years >= minimumTenureYears;
  const gratuityAmount = isEligible
    ? Math.round((daysFactorNumerator / daysFactorDenominator) * basic * years)
    : 0;

  return {
    isEligible,
    tenureYears: years,
    lastDrawnBasic: basic,
    gratuityAmount,
  };
}

/**
 * Calculates Annual & Monthly Estimated Tax Deducted at Source (TDS)
 * under the New Tax Regime slabs of the version in force for `asOf`.
 * Standard deduction + 87A rebate limits come from the version (they changed
 * across FYs — do not hardcode them here).
 * @param {string|Date} [asOf] payroll / assessment date → statutory version selector
 */
export function calculateTds(annualTaxableIncome, deductions80C = 0, deductions80D = 0, asOf = undefined) {
  const version = resolveStatutoryVersion(asOf);
  const gross = Math.max(0, Number(annualTaxableIncome || 0));
  const standardDeduction = version.tds?.standardDeduction ?? 75000;
  const rebateLimit = version.tds?.rebate87aTaxableLimit ?? 1200000;
  const taxable = Math.max(0, gross - standardDeduction - Number(deductions80C || 0) - Number(deductions80D || 0));

  let tax = 0;
  let prevLimit = 0;

  for (const slab of version.newTaxRegimeSlabs) {
    if (taxable <= prevLimit) break;
    const currentLimit = slab.upTo != null ? slab.upTo : taxable;
    const taxableInChunk = Math.min(taxable, currentLimit) - prevLimit;
    if (taxableInChunk > 0) {
      tax += taxableInChunk * slab.rate;
    }
    if (slab.upTo == null) break;
    prevLimit = slab.upTo;
  }

  // Rebate under section 87A (limit is version-specific, e.g. ₹12L under the
  // revised slabs) — a zero tax bill below the rebate threshold.
  if (taxable <= rebateLimit) {
    tax = 0;
  }

  // Health and Education cess 4%
  const cess = Math.round(tax * 0.04);
  const totalAnnualTax = tax + cess;
  const monthlyTds = Math.round(totalAnnualTax / 12);

  return {
    statutoryVersion: { fy: version.fy, effectiveFrom: version.effectiveFrom, verified: version.verified === true },
    grossAnnualIncome: gross,
    taxableIncome: taxable,
    annualTax: totalAnnualTax,
    monthlyTds,
    cess,
  };
}

export default {
  calculatePf,
  calculateEsi,
  calculateGratuity,
  calculateTds,
  resolveStatutoryVersion,
  getStatutoryVersionMeta,
};
