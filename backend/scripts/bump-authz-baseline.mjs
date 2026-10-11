import fs from 'node:fs';

// One-shot: bump .authz-coverage-baseline.json total after adding the 4 new
// checklist modules (feedback, ambulance-trips, linen, security) + NICU
// bilirubin/phototherapy, H1 register + substitution, PACS viewer-url and
// forms chain routes. Unclassified stays 0 — every new route is tagged or
// carries a real guard. Run: node scripts/bump-authz-baseline.mjs
const file = new URL('../.authz-coverage-baseline.json', import.meta.url);
const baseline = JSON.parse(fs.readFileSync(file, 'utf8'));
const before = baseline.total;
baseline.total = 1593;
baseline._note = `${baseline._note} Raised 1561 -> 1593 (2026-10-10): +32 routes added WITH the same guarantee — 0 unclassified. New surface: checklist §2 modules (feedback/NPS, ambulance trip sheet + fuel log, linen & laundry, gate pass + security rounds), NICU bilirubin chart + phototherapy sessions, H1/narcotic register query + gap probe + generic-substitution consent, PACS viewer deep-link, forms addendum chain read. No route joined via a lowering; the total moved because the app grew, not because the gate relaxed.`;
fs.writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`baseline total ${before} -> ${baseline.total}`);
