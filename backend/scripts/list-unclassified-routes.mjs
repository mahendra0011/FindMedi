/**
 * Print the unclassified routes grouped by file, so each file's access rule can
 * be decided once rather than per route.
 *
 *   node scripts/list-unclassified-routes.mjs            # all
 *   node scripts/list-unclassified-routes.mjs notifications  # one file
 *
 * The point is that a route file almost always has ONE access rule. Deciding it
 * per file and applying it to each route is both faster and more consistent than
 * adjudicating 288 endpoints one at a time — and inconsistency between two
 * routes in the same module is usually a bug, not a decision.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROUTES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'routes'
);

const filter = process.argv[2];

const ROLE_MARKERS = [
  'authorize(', 'restrictTo(', 'adminOnly', 'superadminOnly',
  'platformAdminOnly', 'authorizeObject(', 'sameFacilityStrict(',
  'requirePermission', 'staffOnly', 'doctorOnly', 'hospitalOnly',
];
const SELF_HINTS = ['/me', '/my-', '/profile', '/self', '/mine'];

const classify = (routeLine, prevComment) => {
  if (/^\s*\/\/ authz:/.test(prevComment || '')) {
    return prevComment.match(/authz:\s*(\w+)/)[1];
  }
  if (ROLE_MARKERS.some((m) => routeLine.includes(m))) {
    if (routeLine.includes('authorizeObject(')) return 'object';
    if (routeLine.includes('sameFacilityStrict(')) return 'facility';
    return 'role';
  }
  if (SELF_HINTS.some((h) => routeLine.toLowerCase().includes(h))) return 'self';
  if (!routeLine.includes('protect')) return 'public';
  return 'unclassified';
};

const byFile = new Map();

for (const file of fs.readdirSync(ROUTES_DIR)) {
  if (!file.endsWith('.js')) continue;
  if (filter && !file.includes(filter)) continue;

  const lines = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8').split(/\r?\n/);
  let routerGuarded = false;
  const gaps = [];

  lines.forEach((line, i) => {
    if (/router\.use\(/.test(line)) routerGuarded = true;
    const m = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*(.+)/);
    if (!m) return;

    let prev = '';
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      if (/^\s*\/\//.test(lines[j])) { prev = lines[j]; break; }
      if (lines[j].trim() && !/^\s*\/\//.test(lines[j])) break;
    }

    let tag = classify(line, prev);
    if (tag === 'unclassified' && routerGuarded) tag = 'inherited';
    if (tag === 'unclassified') {
      gaps.push({ line: i + 1, method: m[1].toUpperCase(), target: m[2].split(',')[0].trim().slice(0, 70) });
    }
  });

  if (gaps.length) byFile.set(file, gaps);
}

const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
let total = 0;

for (const [file, gaps] of sorted) {
  total += gaps.length;
  console.log(`\n${'='.repeat(78)}`);
  console.log(`${file}  (${gaps.length})`);
  console.log('='.repeat(78));
  for (const g of gaps) {
    console.log(`  L${String(g.line).padStart(4)}  ${g.method.padEnd(6)} ${g.target}`);
  }
}

console.log(`\n${'-'.repeat(78)}`);
console.log(`${sorted.length} file(s), ${total} unclassified route(s)`);