/**
 * i18n coverage gate (11.md §12 follow-through).
 *
 * Two checks, both fail-closed:
 *  1. KEY PARITY — every key in `en` must exist in `hi` (and vice versa).
 *     A missing Hindi key renders English fallback silently; a missing
 *     English key renders blank. Neither is allowed to drift.
 *  2. ADOPTION — reports how many .tsx source files under frontend/src use
 *     react-i18next vs how many render hardcoded Latin UI strings. This is
 *     informational (no threshold) until adoption crosses 50%.
 *
 * Usage: node scripts/i18n-coverage.mjs [--strict]
 * --strict exits non-zero on parity mismatch (CI gate).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const flatKeys = (obj, prefix = '') => {
  const out = new Set();
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatKeys(v, key)) out.add(sub);
    } else {
      out.add(key);
    }
  }
  return out;
};

// i18n.ts holds inline defaultResources (locales/*.json are legacy, unused).
// The literal is plain JS (no TS syntax): balanced-brace extraction from the
// first `{` after the marker, honouring quoted strings.
const src = fs.readFileSync(path.join(ROOT, 'frontend/src/i18n.ts'), 'utf8');
const grab = () => {
  const startMarker = 'export const defaultResources = ';
  const start = src.indexOf(startMarker) + startMarker.length;
  let i = src.indexOf('{', start);
  const first = i;
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      inStr = ch;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return new Function(`return (${src.slice(first, i + 1)});`)();
};

const resources = grab();
const en = flatKeys(resources.en?.translation);
const hi = flatKeys(resources.hi?.translation);
const onlyEn = [...en].filter((k) => !hi.has(k));
const onlyHi = [...hi].filter((k) => !en.has(k));

console.log(`en keys: ${en.size}, hi keys: ${hi.size}`);
if (onlyEn.length) console.log('MISSING in hi:', onlyEn);
if (onlyHi.length) console.log('MISSING in en:', onlyHi);

// Adoption scan: .tsx files using useTranslation/t( vs total.
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walk(p, out);
    } else if (e.name.endsWith('.tsx') && !e.name.endsWith('.test.jsx') && !e.name.endsWith('.test.tsx')) {
      out.push(p);
    }
  }
  return out;
};
const files = walk(path.join(ROOT, 'frontend/src'));
const adopted = files.filter((f) => {
  const t = fs.readFileSync(f, 'utf8');
  return t.includes('useTranslation') || t.includes('react-i18next');
});
console.log(`adoption: ${adopted.length}/${files.length} tsx files use react-i18next`);

const strict = process.argv.includes('--strict');
if ((onlyEn.length || onlyHi.length) && strict) {
  console.error('i18n coverage gate FAILED: key parity mismatch');
  process.exit(1);
}
console.log(onlyEn.length || onlyHi.length ? 'parity: DRIFT (see above)' : 'parity: OK');
