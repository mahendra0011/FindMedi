// LAB-002: attach the fail-closed tenant-ownership guard to the remaining
// lab order routes, which previously only had a fail-open inline hospitalId check.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const ROUTES = [
  ['get', '/orders/:id'],
  ['put', '/orders/:id/register-sample'],
  ['put', '/orders/:id/collect-sample'],
  ['put', '/orders/:id/deliver-report'],
  ['post', '/orders/:id/dispatch-report'],
];

const FILE = 'src/routes/lab.js';
let src = fs.readFileSync(FILE, 'utf8');
let applied = 0;
const misses = [];

for (const [method, rpath] of ROUTES) {
  const esc = rpath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(router\\.${method}\\(\\s*'${esc}'\\s*,\\s*protect)(?![\\w])`);
  if (!re.test(src)) { misses.push(`${method.toUpperCase()} ${rpath}`); continue; }
  const existing = src.match(new RegExp(`router\\.${method}\\(\\s*'${esc}'[\\s\\S]{0,400}?=>`));
  if (existing && /requireTenantOwnership/.test(existing[0])) continue;
  src = src.replace(re, `$1, requireTenantOwnership(async (req) => LabOrder.findById(req.params.id))`);
  applied++;
}

if (applied && !/middleware\/tenantOwnership\.js/.test(src)) {
  src = src.replace(
    /import \{([^}]*)\} from '\.\.\/middleware\/auth\.js';/,
    (m, inner) => {
      if (/tenantOwnership/.test(inner)) return m;
      return `import {${inner}} from '../middleware/auth.js';\nimport { requireTenantOwnership } from '../middleware/tenantOwnership.js';`;
    }
  );
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`lab: guards added ${applied}`);
for (const m of misses) console.log('   unmatched: ' + m);
