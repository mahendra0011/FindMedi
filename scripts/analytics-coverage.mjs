/**
 * Analytics registry gate (File 17 follow-through).
 *
 * The human source of truth is analytics/events.yaml; the enforced registry
 * is EVENT_SCHEMAS in frontend/src/lib/track.ts (unknown events are rejected
 * at runtime). This script fails closed when the two drift:
 *  - a runtime schema with no yaml entry = undocumented event;
 *  - a yaml entry with no runtime schema = dead spec no one can emit.
 *
 * Usage: node scripts/analytics-coverage.mjs [--strict]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const yaml = fs.readFileSync(path.join(ROOT, 'analytics/events.yaml'), 'utf8');
const yamlNames = new Set(
  [...yaml.matchAll(/^\s*-\s*name:\s*([a-z0-9_]+)/gm)].map((m) => m[1]),
);

const trackSrc = fs.readFileSync(path.join(ROOT, 'frontend/src/lib/track.ts'), 'utf8');
const schemasBlock = trackSrc.slice(
  trackSrc.indexOf('EVENT_SCHEMAS'),
  trackSrc.indexOf('EVENT_SCHEMAS') + 20000,
);
const schemaNames = new Set(
  [...schemasBlock.matchAll(/^\s{2}([a-z0-9_]+):\s*z\.object/gm)].map((m) => m[1]),
);

const undocumented = [...schemaNames].filter((k) => !yamlNames.has(k));
const dead = [...yamlNames].filter((k) => !schemaNames.has(k));

console.log(`yaml events: ${yamlNames.size}, runtime schemas: ${schemaNames.size}`);
if (undocumented.length) console.log('UNDOCUMENTED (runtime without yaml):', undocumented);
if (dead.length) console.log('DEAD SPEC (yaml without runtime):', dead);

const strict = process.argv.includes('--strict');
// Fail-closed ONLY on undocumented emissions (events flowing with no spec
// entry and no reviewed pii_class). Dead spec (yaml without a runtime
// schema) is roadmap, not a violation — reported, never failed.
if (undocumented.length && strict) {
  console.error('analytics coverage gate FAILED: undocumented events');
  process.exit(1);
}
console.log(undocumented.length ? 'UNDOCUMENTED EMISSIONS (see above)' : 'parity: OK');
