// PHARMA-001: attach the fail-closed tenant-ownership guard to the store-scoped
// mutating pharmacy routes. The inline `if (req.user.hospitalId && ...)` checks
// these replace failed open for any account without a hospitalId.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

// [method, path, model, param]
const OWNED = [
  ['put', '/medicines/:id', 'Medicine', 'id'],
  ['delete', '/medicines/:id', 'Medicine', 'id'],
  ['put', '/medicines/:id/stock', 'Medicine', 'id'],
  ['put', '/orders/:id', 'PharmacyOrder', 'id'],
  ['delete', '/orders/:id', 'PharmacyOrder', 'id'],
  ['post', '/orders/:id/forward', 'PharmacyOrder', 'id'],
  ['put', '/orders/:id/reject', 'PharmacyOrder', 'id'],
  ['put', '/deliveries/:id', 'PharmacyDelivery', 'id'],
  ['put', '/offers/:id', 'PharmacyOffer', 'id'],
  ['delete', '/offers/:id', 'PharmacyOffer', 'id'],
  ['put', '/returns/:id', 'PharmacyReturn', 'id'],
  ['post', '/orders/:id/refund', 'PharmacyOrder', 'id'],
];

const FILE = 'src/routes/pharmacy.js';
let src = fs.readFileSync(FILE, 'utf8');

let applied = 0, skipped = 0;
const misses = [];

for (const [method, rpath, model, param] of OWNED) {
  const esc = rpath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match the whole registration up to the handler arrow, then inject the guard
  // right after `protect` so it runs before any query in the handler body.
  const re = new RegExp(`(router\\.${method}\\(\\s*'${esc}'\\s*,\\s*protect)(?![\\w])`);
  if (!re.test(src)) { misses.push(`${method.toUpperCase()} ${rpath}`); skipped++; continue; }
  if (/requireTenantOwnership/.test(src.match(new RegExp(`router\\.${method}\\(\\s*'${esc}'[^=]*?=>`))?.[0] || '')) {
    continue; // already guarded
  }
  const guard = `$1, requireTenantOwnership(async (req) => (await import('../models/${model}.js')).default.findById(req.params.${param}))`;
  src = src.replace(re, guard);
  applied++;
}

// Import the middleware + every model used by the guard loader.
if (applied && !/middleware\/tenantOwnership\.js/.test(src)) {
  src = src.replace(
    /import \{ protect, authorize \} from '\.\.\/middleware\/auth\.js';/,
    "import { protect, authorize } from '../middleware/auth.js';\nimport { requireTenantOwnership } from '../middleware/tenantOwnership.js';"
  );
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`pharmacy: guards added ${applied}, skipped ${skipped}`);
for (const m of misses) console.log('   unmatched: ' + m);
