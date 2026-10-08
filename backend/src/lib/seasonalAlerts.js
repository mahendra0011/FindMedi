// 6.md §2.11 "seasonal alerts (dengue, AQI, heatwave)" — IST-month keyed
// static vocabulary. Pure and local: an alert never depends on the user's
// health data, so it ships whether or not personalisation is on, and it can
// be unit-tested without a clock.

const ALERTS_BY_MONTH = Object.freeze({
  // Monsoon: mosquito breeding peaks.
  6: [{ key: 'dengue', title: 'Dengue season', detail: 'Clear stagnant water around you; seek care for high fever with severe body ache.' }],
  7: [{ key: 'dengue', title: 'Dengue season', detail: 'Clear stagnant water around you; seek care for high fever with severe body ache.' }],
  8: [{ key: 'dengue', title: 'Dengue season', detail: 'Clear stagnant water around you; seek care for high fever with severe body ache.' }],
  9: [{ key: 'dengue', title: 'Dengue season', detail: 'Clear stagnant water around you; seek care for high fever with severe body ache.' }],
  10: [{ key: 'dengue', title: 'Dengue season', detail: 'Clear stagnant water around you; seek care for high fever with severe body ache.' }],
  // Winter inversion: poor air quality.
  11: [{ key: 'aqi', title: 'Air quality dropping', detail: 'Limit outdoor exertion on bad-AQI days; keep windows closed in the evening.' }],
  12: [{ key: 'aqi', title: 'Air quality dropping', detail: 'Limit outdoor exertion on bad-AQI days; keep windows closed in the evening.' }],
  1: [{ key: 'aqi', title: 'Air quality dropping', detail: 'Limit outdoor exertion on bad-AQI days; keep windows closed in the evening.' }],
  2: [{ key: 'aqi', title: 'Air quality dropping', detail: 'Limit outdoor exertion on bad-AQI days; keep windows closed in the evening.' }],
  // Pre-monsoon heat.
  3: [{ key: 'heatwave', title: 'Heatwave risk', detail: 'Hydrate often; avoid the afternoon sun; watch for heat exhaustion.' }],
  4: [{ key: 'heatwave', title: 'Heatwave risk', detail: 'Hydrate often; avoid the afternoon sun; watch for heat exhaustion.' }],
  5: [{ key: 'heatwave', title: 'Heatwave risk', detail: 'Hydrate often; avoid the afternoon sun; watch for heat exhaustion.' }],
});

// month: 1-12 (IST). Out-of-range input returns [] rather than throwing — a
// bad clock must not take the discover page down.
export function seasonalAlertsForMonth(month) {
  const key = Number(month);
  if (!Number.isInteger(key) || key < 1 || key > 12) return [];
  return (ALERTS_BY_MONTH[key] ?? []).map((a) => ({ ...a }));
}
