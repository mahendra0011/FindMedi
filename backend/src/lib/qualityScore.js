// Compliance score for quality checklists (7.md §3.41). Pure leaf: the
// route and the spec both import from here so no spec ever imports the route
// module itself (which would bind the REAL auth middleware before the harness
// mocks it and 401 everything — the lesson from lib/wellnessStreaks.js).
//
// Weights: compliant=1, partial=0.5, non_compliant=0, na=excluded from the
// denominator (not-applicable must neither help nor hurt an audit score).
export const scoreChecklist = (items = []) => {
  const scored = items.filter((i) => i.status !== 'na');
  const points = scored.reduce(
    (sum, i) => sum + (i.status === 'compliant' ? 1 : i.status === 'partial' ? 0.5 : 0), 0,
  );
  const counts = { compliant: 0, partial: 0, non_compliant: 0, na: 0 };
  for (const i of items) {
    if (counts[i.status] !== undefined) counts[i.status] += 1;
  }
  return {
    scorePct: scored.length ? Math.round((points / scored.length) * 1000) / 10 : null,
    counts,
  };
};
