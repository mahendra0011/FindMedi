/**
 * codemod-implicit-any-params.mjs
 *
 * Annotates simple (non-destructured) parameters that tsc reports as TS7006
 * ("Parameter 'x' implicitly has an 'any' type") with the shared `Unmodelled`
 * alias, plus the alias import.
 *
 *   const f = (event) => {}      ->  const f = (event: Unmodelled) => {}
 *   list.filter(a => x)          ->  list.filter((a: Unmodelled) => x)
 *   const f = (a? ) => {}        ->  const f = (a?: Unmodelled) => {}
 *
 * SITES: consumes tsc's exact line/column per TS7006 row, right-to-left per
 * line, so earlier offsets stay valid. Three cases:
 *   1. tail `=>`  — paren-less arrow parameter; an annotation cannot sit where
 *      it stands, so the parameter is wrapped: `(a: Unmodelled) =>`.
 *   2. tail `,`, `)`, `=` — normal parameter; annotation goes after the name
 *      (and after an optional `?` marker).
 *   3. anything else — the column did not point where the message said; skip
 *      rather than guess.
 *
 * The file's `@/lib/ApiRow`-style import is created or widened (Unmodelled is
 * appended to an existing apiTypes import).
 *
 * Usage:
 *   node scripts/codemod-implicit-any-params.mjs --tsc-log _tsc.txt [--dry-run]
 *
 * Reversal: search `: Unmodelled` (both this pass and codemod-destructure-any
 * use the same alias; the destructure one only follows a closing `}`).
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
  const m = raw.match(/^(.+?)\((\d+),(\d+)\): error TS7006: Parameter '(.+?)' implicitly/);
  if (!m) continue;
  if (!byFile.has(m[1])) byFile.set(m[1], []);
  byFile.get(m[1]).push({ line: +m[2], col: +m[3], name: m[4] });
}
if (byFile.size === 0) {
  console.error('no TS7006 rows parsed from the tsc log (wrong file or log encoding?)');
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
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.split(/\r?\n/);
  let touched = 0;

  const ordered = [...sites].sort((a, b) => b.line - a.line || b.col - a.col);
  for (const site of ordered) {
    const text = lines[site.line - 1];
    if (text === undefined) { skipped += 1; skips.push(`${rel}:${site.line}: no such line`); continue; }
    const idx = site.col - 1;
    if (!IDENT.test(text[idx] || '')) {
      skipped += 1;
      skips.push(`${rel}:${site.line}:${site.col}: name mismatch ${JSON.stringify(text.slice(idx, idx + 12))}`);
      continue;
    }
    let end = idx + site.name.length;
    while (end < text.length && IDENT.test(text[end])) end += 1;
    // Optional parameters (`x?`) carry the marker AFTER the name; the
    // annotation belongs after the marker, not before it.
    if (text[end] === '?') end += 1;
    const rest = text.slice(end);
    const tail = rest.trimStart();

    if (rest.startsWith(':')) { skipped += 1; continue; } // already annotated

    if (tail.startsWith('=>')) {
      // Paren-less arrow parameter: `filter(a => x)` cannot take an annotation
      // where it stands — it has to become `filter((a: Unmodelled) => x)`, so
      // the opening parenthesis goes in front of the name as well.
      lines[site.line - 1] =
        text.slice(0, idx) + '(' + text.slice(idx, end) + ANNOTATION + ')' + text.slice(end);
      inserted += 1;
      touched += 1;
      continue;
    }

    // A parameter may only be followed by the next parameter, the closing
    // paren, or a default value. Anything else (notably `=>`, handled above)
    // means the column did not point where the message said it did.
    if (tail !== '' && !/^[,)=]/.test(tail)) {
      skipped += 1;
      skips.push(`${rel}:${site.line}:${site.col} tail ${JSON.stringify(tail.slice(0, 12))}`);
      continue;
    }

    lines[site.line - 1] = text.slice(0, end) + ANNOTATION + text.slice(end);
    inserted += 1;
    touched += 1;
  }

  if (touched === 0) continue;

  let next = lines.join(eol);
  next = widenImport(next);
  if (!dryRun) writeFileSync(abs, next, 'utf8');
  files += 1;
}

console.log(
  `${dryRun ? '[dry-run] ' : ''}${inserted} params annotated across ${files} files (${skipped} skipped).`,
);
for (const s of skips.slice(0, 20)) console.log(`  skip: ${s}`);
if (skips.length > 20) console.log(`  ... and ${skips.length - 20} more skips`);
