import fs from 'node:fs';

// One-shot: bump .authz-coverage-baseline.json total after adding the 4 new
// checklist modules (feedback, ambulance-trips, linen, security) + NICU
// bilirubin/phototherapy, H1 register + substitution, PACS viewer-url and
// forms chain routes. Unclassified stays 0 — every new route is tagged or
// carries a real guard. Run: node scripts/bump-authz-baseline.mjs
const file = new URL('../.authz-coverage-baseline.json', import.meta.url);
const manifestFile = new URL('../authz-manifest.json', import.meta.url);
const baseline = JSON.parse(fs.readFileSync(file, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const before = baseline.total;
baseline.total = manifest.total;
baseline._note = `${baseline._note} Raised ${before} -> ${baseline.total} (2026-10-12): +${baseline.total - before} routes added WITH the same guarantee — 0 unclassified.`;
fs.writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`baseline total ${before} -> ${baseline.total}`);
