/**
 * Mathematical ICU Scoring Engines: SOFA & APACHE II
 * SOFA: Sequential Organ Failure Assessment (Respiration, Coagulation, Liver, Cardiovascular, CNS, Renal)
 * APACHE II: Acute Physiology and Chronic Health Evaluation II
 */

export function calculateSofaScore({
  pao2Fio2Ratio, // mmHg (e.g. 350, 150)
  platelets,     // x10^3/uL (e.g. 180, 75)
  bilirubin,     // mg/dL (e.g. 0.8, 3.5)
  meanArterialPressure, // MAP mmHg (e.g. 75)
  vasopressorDose,      // { dopamine?: number, epinephrine?: number, norepinephrine?: number } in mcg/kg/min
  gcsTotal,      // Glasgow Coma Scale (3 - 15)
  creatinine,    // mg/dL (e.g. 1.1, 4.2)
  urineOutput24h // mL/day (optional)
}) {
  let sofa = {
    respiration: 0,
    coagulation: 0,
    liver: 0,
    cardiovascular: 0,
    cns: 0,
    renal: 0,
    total: 0,
    mortalityEstimatePct: 0
  };

  // 1. Respiration: PaO2 / FiO2
  if (pao2Fio2Ratio != null) {
    if (pao2Fio2Ratio < 100) sofa.respiration = 4;
    else if (pao2Fio2Ratio < 200) sofa.respiration = 3;
    else if (pao2Fio2Ratio < 300) sofa.respiration = 2;
    else if (pao2Fio2Ratio < 400) sofa.respiration = 1;
    else sofa.respiration = 0;
  }

  // 2. Coagulation: Platelets
  if (platelets != null) {
    if (platelets < 20) sofa.coagulation = 4;
    else if (platelets < 50) sofa.coagulation = 3;
    else if (platelets < 100) sofa.coagulation = 2;
    else if (platelets < 150) sofa.coagulation = 1;
    else sofa.coagulation = 0;
  }

  // 3. Liver: Bilirubin (mg/dL)
  if (bilirubin != null) {
    if (bilirubin >= 12.0) sofa.liver = 4;
    else if (bilirubin >= 6.0) sofa.liver = 3;
    else if (bilirubin >= 2.0) sofa.liver = 2;
    else if (bilirubin >= 1.2) sofa.liver = 1;
    else sofa.liver = 0;
  }

  // 4. Cardiovascular: MAP & Inotropes
  const vaso = vasopressorDose || {};
  if (vaso.epinephrine > 0.1 || vaso.norepinephrine > 0.1 || vaso.dopamine > 15) {
    sofa.cardiovascular = 4;
  } else if ((vaso.epinephrine > 0 && vaso.epinephrine <= 0.1) ||
             (vaso.norepinephrine > 0 && vaso.norepinephrine <= 0.1) ||
             (vaso.dopamine > 5 && vaso.dopamine <= 15)) {
    sofa.cardiovascular = 3;
  } else if (vaso.dopamine > 0 && vaso.dopamine <= 5) {
    sofa.cardiovascular = 2;
  } else if (meanArterialPressure != null && meanArterialPressure < 70) {
    sofa.cardiovascular = 1;
  } else {
    sofa.cardiovascular = 0;
  }

  // 5. Central Nervous System: GCS
  if (gcsTotal != null) {
    if (gcsTotal < 6) sofa.cns = 4;
    else if (gcsTotal <= 9) sofa.cns = 3;
    else if (gcsTotal <= 12) sofa.cns = 2;
    else if (gcsTotal <= 14) sofa.cns = 1;
    else sofa.cns = 0;
  }

  // 6. Renal: Creatinine or Urine Output
  if (creatinine != null) {
    if (creatinine >= 5.0 || (urineOutput24h != null && urineOutput24h < 200)) sofa.renal = 4;
    else if (creatinine >= 3.5 || (urineOutput24h != null && urineOutput24h < 500)) sofa.renal = 3;
    else if (creatinine >= 2.0) sofa.renal = 2;
    else if (creatinine >= 1.2) sofa.renal = 1;
    else sofa.renal = 0;
  }

  sofa.total = sofa.respiration + sofa.coagulation + sofa.liver + sofa.cardiovascular + sofa.cns + sofa.renal;

  // Approximate Vincent et al. ICU mortality correlation
  if (sofa.total <= 1) sofa.mortalityEstimatePct = 0.0;
  else if (sofa.total <= 3) sofa.mortalityEstimatePct = 6.4;
  else if (sofa.total <= 5) sofa.mortalityEstimatePct = 20.2;
  else if (sofa.total <= 7) sofa.mortalityEstimatePct = 21.5;
  else if (sofa.total <= 9) sofa.mortalityEstimatePct = 33.3;
  else if (sofa.total <= 11) sofa.mortalityEstimatePct = 50.0;
  else sofa.mortalityEstimatePct = 85.0;

  return sofa;
}

export function calculateApache2Score({
  age,
  temperatureC,
  meanArterialPressure,
  heartRate,
  respiratoryRate,
  pao2Fio2Ratio,
  arterialPh,
  serumSodium,
  serumPotassium,
  serumCreatinine,
  hematocrit,
  wbcCount,
  gcsTotal,
  chronicHealthStatus, // 'none' | 'elective_postop' | 'emergency_postop_or_nonsurgical'
  isAcuteRenalFailure = false
}) {
  let score = 0;

  // 1. Age
  if (age >= 75) score += 6;
  else if (age >= 65) score += 5;
  else if (age >= 55) score += 3;
  else if (age >= 44) score += 2;

  // 2. Temp °C
  if (temperatureC >= 41 || temperatureC <= 29.9) score += 4;
  else if ((temperatureC >= 39 && temperatureC <= 40.9) || (temperatureC >= 30 && temperatureC <= 31.9)) score += 3;
  else if (temperatureC >= 32 && temperatureC <= 33.9) score += 2;
  else if ((temperatureC >= 38.5 && temperatureC <= 38.9) || (temperatureC >= 34 && temperatureC <= 35.9)) score += 1;

  // 3. MAP mmHg
  if (meanArterialPressure >= 160 || meanArterialPressure <= 49) score += 4;
  else if (meanArterialPressure >= 130 && meanArterialPressure <= 159) score += 3;
  else if ((meanArterialPressure >= 110 && meanArterialPressure <= 129) || (meanArterialPressure >= 50 && meanArterialPressure <= 69)) score += 2;

  // 4. Heart Rate
  if (heartRate >= 180 || heartRate <= 39) score += 4;
  else if ((heartRate >= 140 && heartRate <= 179) || (heartRate >= 40 && heartRate <= 54)) score += 3;
  else if (heartRate >= 110 && heartRate <= 139) score += 2;

  // 5. Respiratory Rate
  if (respiratoryRate >= 50 || respiratoryRate <= 5) score += 4;
  else if (respiratoryRate >= 35 && respiratoryRate <= 49) score += 3;
  else if (respiratoryRate >= 10 && respiratoryRate <= 11) score += 1;
  else if (respiratoryRate >= 6 && respiratoryRate <= 9) score += 2;

  // 6. Oxygenation (PaO2/FiO2 ratio)
  if (pao2Fio2Ratio != null) {
    if (pao2Fio2Ratio < 200) score += 4;
    else if (pao2Fio2Ratio < 350) score += 3;
    else if (pao2Fio2Ratio < 500) score += 2;
  }

  // 7. Arterial pH
  if (arterialPh != null) {
    if (arterialPh >= 7.7 || arterialPh < 7.15) score += 4;
    else if ((arterialPh >= 7.6 && arterialPh < 7.7) || (arterialPh >= 7.15 && arterialPh < 7.25)) score += 3;
    else if (arterialPh >= 7.25 && arterialPh < 7.33) score += 2;
    else if (arterialPh >= 7.5 && arterialPh < 7.6) score += 1;
  }

  // 8. Serum Sodium (mmol/L)
  if (serumSodium != null) {
    if (serumSodium >= 180 || serumSodium <= 110) score += 4;
    else if ((serumSodium >= 160 && serumSodium <= 179) || (serumSodium >= 111 && serumSodium <= 119)) score += 3;
    else if ((serumSodium >= 155 && serumSodium <= 159) || (serumSodium >= 120 && serumSodium <= 129)) score += 2;
    else if (serumSodium >= 150 && serumSodium <= 154) score += 1;
  }

  // 9. Serum Potassium (mmol/L)
  if (serumPotassium != null) {
    if (serumPotassium >= 7.0 || serumPotassium < 2.5) score += 4;
    else if (serumPotassium >= 6.0 && serumPotassium <= 6.9) score += 3;
    else if (serumPotassium >= 2.5 && serumPotassium <= 2.9) score += 2;
    else if ((serumPotassium >= 5.5 && serumPotassium <= 5.9) || (serumPotassium >= 3.0 && serumPotassium <= 3.4)) score += 1;
  }

  // 10. Serum Creatinine (mg/dL) - points doubled if acute renal failure
  if (serumCreatinine != null) {
    let crPoints = 0;
    if (serumCreatinine >= 3.5) crPoints = 4;
    else if (serumCreatinine >= 2.0 && serumCreatinine <= 3.4) crPoints = 3;
    else if (serumCreatinine >= 1.5 && serumCreatinine <= 1.9) crPoints = 2;
    else if (serumCreatinine < 0.6) crPoints = 2;

    if (isAcuteRenalFailure) crPoints *= 2;
    score += crPoints;
  }

  // 11. Hematocrit (%)
  if (hematocrit != null) {
    if (hematocrit >= 60 || hematocrit < 20) score += 4;
    else if ((hematocrit >= 50 && hematocrit <= 59.9) || (hematocrit >= 20 && hematocrit <= 29.9)) score += 2;
    else if (hematocrit >= 46 && hematocrit <= 49.9) score += 1;
  }

  // 12. WBC Count (x10^3/uL)
  if (wbcCount != null) {
    if (wbcCount >= 40 || wbcCount < 1) score += 4;
    else if ((wbcCount >= 20 && wbcCount <= 39.9) || (wbcCount >= 1 && wbcCount <= 2.9)) score += 2;
    else if (wbcCount >= 15 && wbcCount <= 19.9) score += 1;
  }

  // 13. Glasgow Coma Scale (15 - GCS points added)
  if (gcsTotal != null) {
    score += Math.max(0, 15 - gcsTotal);
  }

  // 14. Chronic Health Condition Score
  if (chronicHealthStatus === 'emergency_postop_or_nonsurgical') {
    score += 5;
  } else if (chronicHealthStatus === 'elective_postop') {
    score += 2;
  }

  // Logit model approximation for predicted in-hospital mortality
  // logit = -3.517 + (APACHE II * 0.146)
  const logit = -3.517 + (score * 0.146);
  const predictedMortalityPct = (Math.exp(logit) / (1 + Math.exp(logit))) * 100;

  return {
    apacheScore: score,
    predictedMortalityPct: Math.round(predictedMortalityPct * 10) / 10
  };
}
