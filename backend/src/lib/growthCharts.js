// File 22 P2-40: WHO-style percentile estimation.
// Uses the LMS method with reference median values for boys/girls 0-60 months.
// These are simplified reference values — production should use full WHO tables.

const LMS = {
  boy: {
    weight: { L: 0.3, M: 3.3, S: 0.15 },
    height: { L: 1, M: 50, S: 0.05 },
    bmi: { L: 0.5, M: 16, S: 0.08 },
  },
  girl: {
    weight: { L: 0.3, M: 3.2, S: 0.15 },
    height: { L: 1, M: 49, S: 0.05 },
    bmi: { L: 0.5, M: 15.8, S: 0.08 },
  },
};

function zToPercentile(z) {
  // Standard normal CDF approximation
  const a = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.3989422804;
  const c = 0.3989422804;
  const t = 1 / (1 + a * Math.abs(z));
  const phi = c * Math.exp(-z * z / 2);
  const poly = b1 * t + b2 * t ** 2 + b3 * t ** 3 + b4 * t ** 4 + b5 * t ** 5;
  const tail = 1 - phi * poly;
  return z >= 0 ? tail : 1 - tail;
}

export function whoPercentile(sex, ageMonths, value, type) {
  const ref = LMS[sex]?.[type];
  if (!ref) return null;
  const { L, M, S } = ref;
  const z = L !== 0
    ? ((value / M) ** L - 1) / (L * S)
    : Math.log(value / M) / S;
  return zToPercentile(z);
}

export function classifyGrowth(percentile) {
  if (percentile == null) return 'unknown';
  if (percentile < 3) return 'severely-underweight';
  if (percentile < 15) return 'underweight';
  if (percentile <= 85) return 'normal';
  if (percentile <= 97) return 'overweight';
  return 'obese';
}
