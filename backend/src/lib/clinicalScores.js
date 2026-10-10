const NEWS2_WEIGHTS = [
  [3, [3]],
  [2, [2]],
  [1, [1]],
  [0, [0]],
  [1, [1]],
  [2, [2]],
  [3, [3]],
];

export function scoreNEWS2({ respRate, spo2, oxygenSupplemented, systolicBp, heartRate, consciousness, temperature }) {
  const scores = [0, 0, 0, 0, 0, 0, 0];
  if (respRate != null) {
    const r = Number(respRate);
    if (r <= 8) scores[0] = 3; else if (r <= 11) scores[0] = 1;
    else if (r <= 20) scores[0] = 0; else if (r <= 24) scores[0] = 2; else scores[0] = 3;
  }
  if (spo2 != null) {
    const s = Number(spo2);
    if (s <= 91) scores[1] = 3; else if (s <= 93) scores[1] = 2;
    else if (s <= 95) scores[1] = 1; else scores[1] = 0;
  }
  if (oxygenSupplemented) scores[2] = 2;
  if (systolicBp != null) {
    const bp = Number(systolicBp);
    if (bp <= 90) scores[3] = 3; else if (bp <= 100) scores[3] = 2;
    else if (bp <= 110) scores[3] = 1; else scores[3] = 0;
  }
  if (heartRate != null) {
    const hr = Number(heartRate);
    if (hr <= 39) scores[4] = 1; else if (hr <= 49) scores[4] = 0;
    else if (hr <= 90) scores[4] = 0; else if (hr <= 109) scores[4] = 1;
    else if (hr <= 129) scores[4] = 2; else scores[4] = 3;
  }
  if (consciousness === 'CVPU' || consciousness === 'C') scores[5] = 3;
  else if (consciousness === 'A') scores[5] = 0; else scores[5] = 0;
  if (temperature != null) {
    const t = Number(temperature);
    if (t <= 35.0) scores[6] = 3; else if (t <= 36.0) scores[6] = 1;
    else if (t <= 38.0) scores[6] = 0; else if (t <= 39.0) scores[6] = 1;
    else scores[6] = 2;
  }
  const total = scores.reduce((a, b) => a + b, 0);
  let risk = 'Low';
  if (total >= 7) risk = 'High'; else if (total >= 5) risk = 'Medium';
  return { total, scores, risk };
}

export function scoreMorseFall({ historyOfFalls, secondaryDiagnosis, ambulatoryAid, ivHeparinLock, gaitTransferring, mentalStatus }) {
  let total = 0;
  if (historyOfFalls != null) total += Number(historyOfFalls ? 25 : 0);
  if (secondaryDiagnosis != null) total += Number(secondaryDiagnosis ? 15 : 0);
  if (ambulatoryAid) {
    if (ambulatoryAid === 'None' || ambulatoryAid === 'Bed rest' || ambulatoryAid === 'Crutches/Cane/Walker') total += 0;
    else if (ambulatoryAid === 'Furniture') total += 30;
    else total += 15;
  }
  if (ivHeparinLock) total += 20;
  if (gaitTransferring) {
    if (gaitTransferring === 'Normal' || gaitTransferring === 'Bed rest' || gaitTransferring === 'Immobile') total += 0;
    else if (gaitTransferring === 'Weak') total += 10;
    else if (gaitTransferring === 'Impaired') total += 20;
  }
  if (mentalStatus) {
    if (mentalStatus === 'Oriented to own ability') total += 0;
    else if (mentalStatus === 'Overestimates/forgets limitations') total += 15;
  }
  let risk = 'Low';
  if (total >= 51) risk = 'High'; else if (total >= 25) risk = 'Medium';
  return { total, risk };
}

export function scoreBraden({ sensoryPerception, moisture, activity, mobility, nutrition, frictionShear }) {
  const table = {
    sensoryPerception: { 1: 1, 2: 2, 3: 3, 4: 4 },
    moisture: { 1: 1, 2: 2, 3: 3, 4: 4 },
    activity: { 1: 1, 2: 2, 3: 3, 4: 4 },
    mobility: { 1: 1, 2: 2, 3: 3, 4: 4 },
    nutrition: { 1: 1, 2: 2, 3: 3, 4: 4 },
    frictionShear: { 1: 1, 2: 2, 3: 3 },
  };
  const vals = [];
  for (const [k, v] of Object.entries(table)) {
    const score = Number(arguments[0]?.[k] ?? 0);
    if (!(score >= 1 && score <= 4)) return { total: null, risk: null, error: `Invalid ${k} score` };
    vals.push(v[score] || score);
  }
  const total = vals.reduce((a, b) => a + b, 0);
  let risk = 'No Risk';
  if (total <= 9) risk = 'Very High Risk';
  else if (total <= 12) risk = 'High Risk';
  else if (total <= 14) risk = 'Moderate Risk';
  else if (total <= 18) risk = 'Mild Risk';
  return { total, risk };
}
