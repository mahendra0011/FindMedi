// Streaks over IST calendar days for the wellness module (6.md §2.10).
// Pure leaf: the route and the spec both import from here so no spec ever
// needs to import the route module itself (which would bind the REAL auth
// middleware before the harness mocks it).

const DAY_MS = 86400000;

// The streak is alive on grace: counting starts today when today is logged,
// otherwise yesterday (one missed day does not kill it); then strictly
// consecutive days. Longest is the max run anywhere in history.
export const computeStreaks = (uniqueDatesDesc, today) => {
  const set = new Set(uniqueDatesDesc);
  const shift = (day, n) => new Date(`${day}T00:00:00.000Z`).getTime() + n * DAY_MS;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  let cursor = set.has(today) ? today : iso(shift(today, -1));
  let current = 0;
  if (set.has(cursor)) {
    while (set.has(cursor)) {
      current += 1;
      cursor = iso(shift(cursor, -1));
    }
  }
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const day of [...set].sort()) {
    run = prev !== null && shift(prev, 1) === new Date(`${day}T00:00:00.000Z`).getTime() ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  return { currentStreak: current, longestStreak: longest, activeDays: set.size };
};
