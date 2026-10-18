/**
 * codemod-destructure-any.mjs
 *
 * Annotates destructured component/function parameters that tsc reports as
 * TS7031 ("Binding element 'x' implicitly has an 'any' type").
 *
 *   function Card({ title, onClose })   ->  function Card({ title, onClose }: Unmodelled)
 *
 * Strategy: each reported site's column points at a binding element name inside
 * a pattern. We scan backwards for the `{` that opens that pattern (stepping
 * over nested `key: { ... }` patterns and object-literal defaults such as
 * `drafts = {}`), brace-match forwards to its `}` — skipping strings and
 * comments so apostrophes inside JSDoc cannot derail the scan — and insert the
 * annotation right after it. Only the tail `)` or `,` is accepted; a tail of
 * `=` (outer default value, e.g. `({ a } = {})`) would need the annotation
 * AFTER the default, so those are skipped rather than guessed.
 *
 * All sites mapping to the same closing brace are deduplicated, insertions are
 * applied right-to-left (so earlier offsets stay valid), and the file's
 * `@/lib/apiTypes` import is created/widened afterwards.
 *
 * Usage:
 *   node scripts/codemod-destructure-any.mjs --tsc-log _tsc.txt [--dry-run]
 *
 * Reversal: remove `: Unmodelled` that immediately follows a `}`, then trim
 * `Unmodelled` from the apiTypes import.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ANNOTATION = ': Unmodelled';
const IMPORT_LINE = "import type { Unmodelled } from '@/lib/apiTypes';";
const IDENT = /[A-Za-z0-9_$]/;

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const logIdx = argv.indexOf('--tsc-log');
const TSC_LOG = logIdx >= 0 ? argv[logIdx + 1] : '_tsc.txt';
const logPath = join(ROOT, TSC_LOG);
if (!existsSync(logPath)) {
  console.error(`tsc log not found: ${logPath}`);
  process.exit(2);
}

/** PowerShell `>` redirect emits UTF-16LE; sniffer handles that plus utf8+BOM. */
function readLog(path) {
  const buf = readFileSync(path);
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  return buf.toString('utf8').replace(/^\uFEFF/, '');
}

function readSource(path) {
  return readFileSync(path).toString('utf8').replace(/^\uFEFF/, '');
}

/** Line start offsets for a text blob (used to convert line/col -> offset). */
function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

/**
 * Offset of the `{` opening the pattern that encloses `nameOffset`.
 *
 * The nearest preceding brace is not always the pattern's own: a default
 * value can be an object literal (`drafts = {}`), whose `{` sits between the
 * binding name and the real pattern opener. So candidates are filtered by what
 * precedes them: a pattern only ever opens after `(`, `,`, or `=>`; a `{`
 * preceded by `:` is a nested binding pattern and a `{` preceded by `=` is an
 * object-literal default — both are stepped over.
 */
function findPatternOpen(text, nameOffset) {
  let i = nameOffset;
  for (let guard = 0; guard < 60; guard += 1) {
    const open = text.lastIndexOf('{', i);
    if (open < 0) return -1;
    const before = text.slice(0, open).trimEnd();
    if (before.endsWith(':') || before.endsWith('=')) {
      i = open - 1; // nested pattern or object-literal default
      continue;
    }
    if (before.endsWith('(') || before.endsWith(',') || before.endsWith('=>')) return open;
    i = open - 1; // unknown context — keep looking rather than guess
  }
  return -1;
}

/**
 * Offset just past the `}` matching `open`, or -1 if unbalanced.
 *
 * Parens inside the region are legitimate (arrow defaults like
 * `easing = (t) => t`, and `hsl(var(--primary))` inside a string), so only
 * braces count. Strings and comments are skipped: parameter lists carry JSDoc
 * blocks, and comments contain quotes ("row's `rowKey`") that would otherwise
 * be mistaken for strings, while a stray quote would swallow the closing `}`.
 */
function findPatternClose(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      for (i += 1; i < text.length; i += 1) {
        if (text[i] === '\\') { i += 1; continue; }
        if (text[i] === c) break;
      }
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? text.length : nl;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) return -1;
      i = end + 1;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function widenImport(text) {
  if (/from '@\/lib\/apiTypes'/.test(text)) {
    return text.replace(
      /(import type \{)([^}]*)(\} from '@\/lib\/apiTypes';)/,
      (_whole, head, names, tail) => {
        const list = names.split(',').map((s) => s.trim()).filter(Boolean);
        if (list.includes('Unmodelled')) return head + names + tail;
        return `${head} ${[...list, 'Unmodelled'].join(', ')} ${tail}`;
      },
    );
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const rows = text.split(/\r?\n/);
  let lastImport = -1;
  let depth = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const t = rows[i].trim();
    const opens = (t.match(/\{/g) || []).length;
    const closes = (t.match(/\}/g) || []).length;
    if (depth === 0 && (t.startsWith('import ') || t.startsWith('} from '))) {
      lastImport = i;
      depth = Math.max(0, opens - closes);
    } else if (depth > 0) {
      depth = Math.max(0, depth + opens - closes);
      if (depth === 0) lastImport = i;
    }
  }
  rows.splice(lastImport + 1, 0, IMPORT_LINE);
  return rows.join(eol);
}

const byFile = new Map();
for (const raw of readLog(logPath).split(/\r?\n/)) {
  const m = raw.match(/^(.+?)\((\d+),(\d+)\): error TS7031:/);
  if (!m) continue;
  if (!byFile.has(m[1])) byFile.set(m[1], []);
  byFile.get(m[1]).push({ line: +m[2], col: +m[3] });
}
if (byFile.size === 0) {
  console.error('no TS7031 rows parsed from the tsc log (wrong file or log encoding?)');
  process.exit(2);
}

let files = 0;
let inserted = 0;
let skipped = 0;
const skips = [];

for (const [rel, sites] of byFile) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    skipped += sites.length;
    skips.push(`${rel}: file not found`);
    continue;
  }
  const original = readSource(abs);
  const starts = lineStarts(original);

  const offsets = new Set();
  for (const site of sites) {
    const lineStart = starts[site.line - 1];
    if (lineStart === undefined) { skipped += 1; skips.push(`${rel}:${site.line}: no such line`); continue; }
    const nameOffset = lineStart + site.col - 1;
    if (!IDENT.test(original[nameOffset] || '')) {
      skipped += 1;
      skips.push(`${rel}:${site.line}:${site.col}: name mismatch ${JSON.stringify(original.slice(nameOffset, nameOffset + 10))}`);
      continue;
    }

    const open = findPatternOpen(original, nameOffset);
    if (open < 0) { skipped += 1; skips.push(`${rel}:${site.line}:${site.col}: no pattern '{'`); continue; }
    const close = findPatternClose(original, open);
    if (close < 0) { skipped += 1; skips.push(`${rel}:${site.line}:${site.col}: unbalanced pattern`); continue; }

    const after = original.slice(close).match(/^\s*/)[0];
    const next = original[close + after.length];
    if (next === ':') { skipped += 1; continue; } // already annotated
    // Only a genuine parameter-list tail is safe: `)` closes the list, `,`
    // separates the next parameter.
    if (next !== ')' && next !== ',') {
      skipped += 1;
      skips.push(`${rel}:${site.line}:${site.col}: tail ${JSON.stringify(original.slice(close, close + 12))}`);
      continue;
    }
    offsets.add(close);
  }

  if (offsets.size === 0) continue;

  let next = original;
  const ordered = [...offsets].sort((a, b) => b - a);
  for (const off of ordered) next = next.slice(0, off) + ANNOTATION + next.slice(off);
  inserted += ordered.length;

  next = widenImport(next);
  if (!dryRun) writeFileSync(abs, next, 'utf8');
  files += 1;
}

console.log(
  `${dryRun ? '[dry-run] ' : ''}${inserted} patterns annotated across ${files} files (${skipped} skipped).`,
);
for (const s of skips.slice(0, 20)) console.log(`  skip: ${s}`);
if (skips.length > 20) console.log(`  ... and ${skips.length - 20} more skips`);
