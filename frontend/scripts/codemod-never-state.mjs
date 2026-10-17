/**
 * TEST-B-03 ratchet paydown — one-shot, type-only codemod.
 *
 * `const [rows, setRows] = useState([])` infers `never[]`, so every later
 * property read is TS2339 "does not exist on type 'never'". That single
 * pattern is ~4,900 of the frontend's 11,530 type errors across ~185 files.
 *
 * This rewrites `useState([])` -> `useState<ApiRow[]>([])` and imports the
 * ApiRow alias from @/lib/apiTypes. Nothing about the emitted JS changes
 * (type annotations are erased; `import type` is dropped by esbuild), so
 * runtime behaviour is byte-for-byte identical.
 *
 * Usage: node scripts/codemod-never-state.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const dryRun = process.argv.includes('--dry-run');
const IMPORT = "import type { ApiRow } from '@/lib/apiTypes';";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs);
  }
  return out;
}

const FILES = walk(join(ROOT, 'src'));

let touched = 0;
let replacements = 0;

for (const file of FILES) {
  if (file.endsWith('apiTypes.ts')) continue;
  const src = readFileSync(file, 'utf8');
  if (!src.includes('useState([])')) continue;

  const count = (src.match(/useState\(\[\]\)/g) || []).length;
  let next = src.replaceAll('useState([])', 'useState<ApiRow[]>([])');

  if (!next.includes("from '@/lib/apiTypes'")) {
    const lines = next.split('\n');
    let lastImport = -1;
    let depth = 0;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (depth === 0 && (line.startsWith('import ') || line.startsWith('} from '))) {
        lastImport = i;
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        depth = opens - closes;
      } else if (depth > 0) {
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        depth = Math.max(0, depth + opens - closes);
        if (depth === 0) lastImport = i;
      }
    }
    if (lastImport === -1) {
      console.warn(`SKIP (no import block): ${relative(ROOT, file)}`);
      continue;
    }
    lines.splice(lastImport + 1, 0, IMPORT);
    next = lines.join('\n');
  }

  if (!dryRun) writeFileSync(file, next, 'utf8');
  touched += 1;
  replacements += count;
}

console.log(`${dryRun ? '[dry-run] ' : ''}${replacements} useState([]) -> useState<ApiRow[]>([]) across ${touched} files.`);
