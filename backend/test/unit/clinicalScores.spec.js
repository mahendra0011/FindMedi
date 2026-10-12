import { describe, it, expect } from '@jest/globals';
import { calculateSofaScore, calculateApache2Score } from '../../src/services/clinicalScoresService.js';

describe('SOFA Scoring Engine Golden Tests', () => {
  it('calculates 0 score for completely normal baseline vitals & labs', () => {
    const baseline = {
      pao2Fio2Ratio: 450,
      platelets: 250,
      bilirubin: 0.8,
      meanArterialPressure: 85,
      vasopressorDose: {},
      gcsTotal: 15,
      creatinine: 0.9,
      urineOutput24h: 1500
    };
    const res = calculateSofaScore(baseline);
    expect(res.respiration).toBe(0);
    expect(res.coagulation).toBe(0);
    expect(res.liver).toBe(0);
    expect(res.cardiovascular).toBe(0);
    expect(res.cns).toBe(0);
    expect(res.renal).toBe(0);
    expect(res.total).toBe(0);
    expect(res.mortalityEstimatePct).toBe(0.0);
  });

  it('correctly calculates respiration thresholds (PaO2/FiO2)', () => {
    expect(calculateSofaScore({ pao2Fio2Ratio: 350 }).respiration).toBe(1);
    expect(calculateSofaScore({ pao2Fio2Ratio: 250 }).respiration).toBe(2);
    expect(calculateSofaScore({ pao2Fio2Ratio: 150 }).respiration).toBe(3);
    expect(calculateSofaScore({ pao2Fio2Ratio: 80 }).respiration).toBe(4);
    expect(calculateSofaScore({ pao2Fio2Ratio: 500 }).respiration).toBe(0);
  });

  it('correctly calculates platelet thresholds', () => {
    expect(calculateSofaScore({ platelets: 140 }).coagulation).toBe(1);
    expect(calculateSofaScore({ platelets: 80 }).coagulation).toBe(2);
    expect(calculateSofaScore({ platelets: 35 }).coagulation).toBe(3);
    expect(calculateSofaScore({ platelets: 15 }).coagulation).toBe(4);
    expect(calculateSofaScore({ platelets: 200 }).coagulation).toBe(0);
  });

  it('correctly calculates liver/bilirubin thresholds', () => {
    expect(calculateSofaScore({ bilirubin: 1.5 }).liver).toBe(1);
    expect(calculateSofaScore({ bilirubin: 3.5 }).liver).toBe(2);
    expect(calculateSofaScore({ bilirubin: 8.0 }).liver).toBe(3);
    expect(calculateSofaScore({ bilirubin: 14.2 }).liver).toBe(4);
    expect(calculateSofaScore({ bilirubin: 0.6 }).liver).toBe(0);
  });

  it('correctly calculates cardiovascular MAP and vasopressor doses', () => {
    // MAP < 70 without pressors -> 1
    expect(calculateSofaScore({ meanArterialPressure: 65 }).cardiovascular).toBe(1);
    // dopamine <= 5 -> 2
    expect(calculateSofaScore({ vasopressorDose: { dopamine: 4 } }).cardiovascular).toBe(2);
    // dopamine > 5 & <= 15 or low-dose norepinephrine/epinephrine <= 0.1 -> 3
    expect(calculateSofaScore({ vasopressorDose: { dopamine: 10 } }).cardiovascular).toBe(3);
    expect(calculateSofaScore({ vasopressorDose: { norepinephrine: 0.08 } }).cardiovascular).toBe(3);
    expect(calculateSofaScore({ vasopressorDose: { epinephrine: 0.05 } }).cardiovascular).toBe(3);
    // high-dose vasopressor -> 4
    expect(calculateSofaScore({ vasopressorDose: { norepinephrine: 0.2 } }).cardiovascular).toBe(4);
    expect(calculateSofaScore({ vasopressorDose: { epinephrine: 0.25 } }).cardiovascular).toBe(4);
    expect(calculateSofaScore({ vasopressorDose: { dopamine: 20 } }).cardiovascular).toBe(4);
  });

  it('correctly evaluates CNS GCS scales', () => {
    expect(calculateSofaScore({ gcsTotal: 15 }).cns).toBe(0);
    expect(calculateSofaScore({ gcsTotal: 13 }).cns).toBe(1);
    expect(calculateSofaScore({ gcsTotal: 11 }).cns).toBe(2);
    expect(calculateSofaScore({ gcsTotal: 8 }).cns).toBe(3);
    expect(calculateSofaScore({ gcsTotal: 4 }).cns).toBe(4);
  });

  it('correctly calculates renal scores via creatinine & urine output', () => {
    expect(calculateSofaScore({ creatinine: 1.5 }).renal).toBe(1);
    expect(calculateSofaScore({ creatinine: 2.5 }).renal).toBe(2);
    expect(calculateSofaScore({ creatinine: 4.0 }).renal).toBe(3);
    expect(calculateSofaScore({ creatinine: 5.5 }).renal).toBe(4);
    // Oliguria override
    expect(calculateSofaScore({ creatinine: 1.0, urineOutput24h: 400 }).renal).toBe(3);
    expect(calculateSofaScore({ creatinine: 1.0, urineOutput24h: 150 }).renal).toBe(4);
  });

  it('never returns NaN on empty or partial inputs', () => {
    const res = calculateSofaScore({});
    expect(Number.isFinite(res.total)).toBe(true);
    expect(res.total).toBe(0);
    expect(res.mortalityEstimatePct).toBe(0);
  });
});

describe('APACHE II Scoring Engine Golden Tests', () => {
  it('handles healthy young adult baseline', () => {
    const normal = {
      age: 28,
      temperatureC: 37.0,
      meanArterialPressure: 90,
      heartRate: 75,
      respiratoryRate: 14,
      pao2Fio2Ratio: 450,
      arterialPh: 7.4,
      serumSodium: 140,
      serumPotassium: 4.0,
      serumCreatinine: 0.9,
      hematocrit: 42,
      wbcCount: 7.5,
      gcsTotal: 15,
      chronicHealthStatus: 'none'
    };
    const res = calculateApache2Score(normal);
    // pao2Fio2Ratio < 500 gives 2 points in this engine:
    // age 28: 0, temp 37: 0, map 90: 0, hr 75: 0, rr 14: 0, pao2: 2, ph: 0, na: 0, k: 0, cr: 0, hct: 0, wbc: 0, gcs: 0, chronic: 0
    expect(res.apacheScore).toBe(2);
    expect(res.predictedMortalityPct).toBeGreaterThan(0);
    expect(Number.isFinite(res.predictedMortalityPct)).toBe(true);
  });

  it('calculates acute renal failure doubling correctly', () => {
    const withoutArf = calculateApache2Score({ age: 30, serumCreatinine: 3.6, isAcuteRenalFailure: false });
    const withArf = calculateApache2Score({ age: 30, serumCreatinine: 3.6, isAcuteRenalFailure: true });
    expect(withoutArf.apacheScore).toBe(4);
    expect(withArf.apacheScore).toBe(8);
  });

  it('adds chronic health points according to surgery status', () => {
    const elective = calculateApache2Score({ age: 30, chronicHealthStatus: 'elective_postop' });
    const emergency = calculateApache2Score({ age: 30, chronicHealthStatus: 'emergency_postop_or_nonsurgical' });
    expect(elective.apacheScore).toBe(2);
    expect(emergency.apacheScore).toBe(5);
  });

  it('scores severe physiological disturbance correctly', () => {
    const severe = {
      age: 78, // +6
      temperatureC: 41.5, // +4
      meanArterialPressure: 45, // +4
      heartRate: 185, // +4
      respiratoryRate: 52, // +4
      pao2Fio2Ratio: 180, // +4
      arterialPh: 7.10, // +4
      serumSodium: 185, // +4
      serumPotassium: 7.5, // +4
      serumCreatinine: 4.0, // +4 (*2 if ARF = +8)
      isAcuteRenalFailure: true,
      hematocrit: 18, // +4
      wbcCount: 45, // +4
      gcsTotal: 6, // 15 - 6 = +9
      chronicHealthStatus: 'emergency_postop_or_nonsurgical' // +5
    };
    const res = calculateApache2Score(severe);
    expect(res.apacheScore).toBe(68);
    expect(res.predictedMortalityPct).toBeGreaterThan(95);
  });
});
