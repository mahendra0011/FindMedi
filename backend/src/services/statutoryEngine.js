import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config/statutory.json');
let statutoryConfig;
try {
  statutoryConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {
  statutoryConfig = {
    pf: { employeeRate: 0.12, employerRate: 0.12, wageCeiling: 15000, maxEmployeeMonthlyContribution: 1800 },
    esi: { grossWageCeiling: 21000, employeeRate: 0.0075, employerRate: 0.0325 },
    gratuity: { daysFactorNumerator: 15, daysFactorDenominator: 26, minimumTenureYears: 5 },
    newTaxRegimeSlabs: [
      { upTo: 400000, rate: 0.0 },
      { upTo: 800000, rate: 0.05 },
      { upTo: 1200000, rate: 0.10 },
      { upTo: 1600000, rate: 0.15 },
      { upTo: 2000000, rate: 0.20 },
      { upTo: 2400000, rate: 0.25 },
      { upTo: null, rate: 0.30 },
    ],
  };
}

/**
 * Calculates Employee & Employer Provident Fund (PF).
 * Wage base = Basic + DA.
 * If wage <= 15000: 12% employee capped at ₹1800, employer 12% (3.67% EPF + 8.33% EPS).
 */
export function calculatePf(basicPay, da = 0, optVoluntaryHigher = false) {
  const wage = Math.max(0, Number(basicPay || 0) + Number(da || 0));
  const { employeeRate, wageCeiling, maxEmployeeMonthlyContribution } = statutoryConfig.pf;

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
 */
export function calculateEsi(grossSalary) {
  const gross = Math.max(0, Number(grossSalary || 0));
  const { grossWageCeiling, employeeRate, employerRate } = statutoryConfig.esi;

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
 */
export function calculateGratuity(lastDrawnBasic, tenureYears) {
  const basic = Math.max(0, Number(lastDrawnBasic || 0));
  const years = Math.max(0, Number(tenureYears || 0));
  const { daysFactorNumerator, daysFactorDenominator, minimumTenureYears } = statutoryConfig.gratuity;

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
 * under New Tax Regime FY 2025-26 slabs + standard deductions.
 */
export function calculateTds(annualTaxableIncome, deductions80C = 0, deductions80D = 0) {
  const gross = Math.max(0, Number(annualTaxableIncome || 0));
  // Standard deduction under new regime (₹75,000)
  const standardDeduction = 75000;
  const taxable = Math.max(0, gross - standardDeduction - Number(deductions80C || 0) - Number(deductions80D || 0));

  let tax = 0;
  let prevLimit = 0;

  for (const slab of statutoryConfig.newTaxRegimeSlabs) {
    if (taxable <= prevLimit) break;
    const currentLimit = slab.upTo != null ? slab.upTo : taxable;
    const taxableInChunk = Math.min(taxable, currentLimit) - prevLimit;
    if (taxableInChunk > 0) {
      tax += taxableInChunk * slab.rate;
    }
    if (slab.upTo == null) break;
    prevLimit = slab.upTo;
  }

  // Rebate under section 87A if taxable income <= 12,00,000 under revised slabs
  if (taxable <= 1200000) {
    tax = 0;
  }

  // Health and Education cess 4%
  const cess = Math.round(tax * 0.04);
  const totalAnnualTax = tax + cess;
  const monthlyTds = Math.round(totalAnnualTax / 12);

  return {
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
};
