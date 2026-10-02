/**
 * Missing-feature inventory.
 *
 * WHY THIS EXISTS
 * The 19 `*-missing.md` reports hold 140 findings written as prose. There is no
 * machine-readable index, so "which are High/Phase 1?" is a question only a
 * human with all 19 files open can answer, and the answer drifts the moment a
 * report is edited. This parses them into one ranked table.
 *
 * It deliberately does NOT claim a finding is real or still open. The
 * authorization work showed why: 288 "unguarded routes" turned out to be ~1 real
 * gap, because a report records what was true when it was written. Every row
 * here needs re-verification against source before it is believed, and
 * `--verify` exists to make that mechanical where it can be.
 *
 *   node scripts/missing-feature-inventory.mjs             # ranked table
 *   node scripts/missing-feature-inventory.mjs --phase 1   # one phase
 *   node scripts/missing-feature-inventory.mjs --json      # machine-readable
 *   node scripts/missing-feature-inventory.mjs --verify    # re-check claims
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'audit-reports'
);

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const phaseArg = (args.find((a) => a.startsWith('--phase=')) || '').split('=')[1];
const verify = args.includes('--verify');

/**
 * Parse a `- **Key**: value` bullet.
 *
 * `inline` matters: most reports write `- **Priority**: High | **Phase**:
 * Phase 1` on ONE line, so a pattern anchored at `^-` finds Priority and misses
 * Phase entirely - which is why the first run reported all 140 findings as
 * "unset" and sorted them into a single undifferentiated bucket.
 */
const field = (body, key) => {
  const m = body.match(new RegExp(`\\*\\*${key}\\*\\*\\s*:?\\s*([^\\n|]+)`, 'i'));
  return m ? m[1].trim() : null;
};

const findings = [];
const duplicateIds = [];

for (const file of fs.readdirSync(ROOT).filter((f) => f.endsWith('-missing.md'))) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  // A finding starts at `## [ID] title` and runs to the next `## `.
  const chunks = text.split(/^##\s+/m).slice(1);
  for (const chunk of chunks) {
    // The `m` flag is load-bearing: without it `$` means end-of-STRING, the
    // title never matches (there is always a body after it), and the inventory
    // silently reports 0 findings while looking like it ran fine. A parser that
    // finds nothing is the most dangerous kind of broken tool, because the
    // empty result reads as "no findings".
    const head = chunk.match(/^\[([^\]]+)\]\s*(.*)$/m);
    if (!head) continue;
    const [, id, title] = head;
    const dup = findings.find((f) => f.id === id);
    if (dup) duplicateIds.push({ id, files: [dup.file, file] });
    findings.push({
      id,
      title: title.trim(),
      file,
      priority: (field(chunk, 'Priority') || 'unset').split('|')[0].trim(),
      phase: (field(chunk, 'Phase') || 'unset').match(/\d+/)?.[0] || 'unset',
      todos: (chunk.match(/^- \*\*TODOs\*\*:(.*)$/im)?.[1] || '')
        .split(/\[[ x]\]/i).filter((s) => s.trim().length > 2).length,
      affected: (field(chunk, 'Affected Files') || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
      body: chunk,
    });
  }
}

const RANK = { High: 0, Medium: 1, Low: 2, unset: 3 };
findings.sort(
  (a, b) =>
    (Number(a.phase) || 9) - (Number(b.phase) || 9) ||
    RANK[a.priority] - RANK[b.priority] ||
    a.id.localeCompare(b.id)
);

// An ID used in two reports is a bookkeeping error, not a duplicate fix: two
// people could "close" the same string and only one finding would disappear.
if (duplicateIds.length > 0) {
  console.error(`DUPLICATE IDS: ${duplicateIds.map((d) => d.id).join(', ')}`);
  if (asJson) process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify({ total: findings.length, duplicates: duplicateIds, findings }, null, 2));
  process.exit(0);
}

const bar = '='.repeat(78);
console.log(bar);
console.log(`MISSING-FEATURE INVENTORY — ${findings.length} findings across 19 reports`);
console.log(bar);

// The counts are the useful part; a per-file dump is what the reports are for.
const byPhase = new Map();
const byPriority = new Map();
for (const f of findings) {
  byPhase.set(f.phase, (byPhase.get(f.phase) || 0) + 1);
  byPriority.set(f.priority, (byPriority.get(f.priority) || 0) + 1);
}
console.log('by phase   : ' + [...byPhase.entries()].sort().map(([k, v]) => `P${k}=${v}`).join('  '));
console.log('by priority: ' + [...byPriority.entries()].sort((a, b) => RANK[a[0]] - RANK[b[0]]).map(([k, v]) => `${k}=${v}`).join('  '));
console.log('');

const selected = phaseArg
  ? findings.filter((f) => f.phase === String(phaseArg))
  : findings;

for (const f of selected) {
  const files = f.affected.slice(0, 2).join(' ') || '-';
  console.log(
    `${f.id.padEnd(16)} ${f.priority.padEnd(7)} P${f.phase}  ${f.todos ? `[${f.todos} todo] ` : ''}${f.title.slice(0, 58)}`
  );
  if (files !== '-') console.log(`${' '.repeat(16)} ${files.slice(0, 96)}`);
}
console.log(`\n  shown: ${selected.length} of ${findings.length}`);

if (verify) {
  // Mechanical cross-check of every finding's claims against the source.
  //
  // HONEST SCOPE: this is a SCREEN, not a verdict, and it was wrong more often
  // than it was right on its first two attempts. It matched `sent/delivered/read`
  // - three status WORDS in a sentence - as if they were a route path, and
  // reported six contradicted claims of which five were false. Tightening it to
  // real `router.<verb>('<path>'` registrations cut that to one, and that one was
  // also false for the same reason.
  //
  // So the conclusion is the opposite of the one this tool was built to produce:
  // PROSE FINDINGS CANNOT BE VERIFIED MECHANICALLY. A report says "no
  // sent/delivered/read tracking", and the words `delivered` and `read` are in
  // the sentence whether or not the feature exists. Only a human reading the
  // code can decide. AUTH-M-01 is the proof that the human check is worth doing -
  // that finding said a control was missing, the control was there, and a
  // CRITICAL bug sat underneath it.
  //
  // What IS reliable here: the phase/priority breakdown, the duplicate-ID check,
  // and `STALE-REFS` (a cited file that no longer exists), which needs no
  // interpretation.
  console.log(`\n${bar}\nVERIFY — claims cross-checked against source\n${bar}`);

  const SRC = path.join(ROOT, '..', 'backend', 'src');

  // The route table, as ACTUAL registrations rather than a blob of text.
  //
  // The first version grepped the concatenated route sources for a substring
  // like `/delivered/read`, which matched `read: false` inside a
  // countDocuments call, `/SNOMED/medication` matched `medication'`, and a
  // file path matched a filename. It reported 6 contradicted claims of which 5
  // were false. A checker that cries wolf on five out of six is worse than no
  // checker, so the route table is now extracted from real
  // `router.<verb>('<path>'` registrations and a claim only counts as
  // contradicted when that exact path is registered.
  const ROUTE_RE = /router\.(get|post|put|patch|delete)\s*\(\s*'([^']+)'/g;
  const registered = new Set();
  for (const file of fs.readdirSync(path.join(SRC, 'routes')).filter((f) => f.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(SRC, 'routes', file), 'utf8');
    let m;
    while ((m = ROUTE_RE.exec(text)) !== null) {
      registered.add(m[2].replace(/\/+$/, '') || '/');
    }
  }

  const pathClaim = /\/(?:api\/)?[a-z0-9_-]+(?:\/[a-z0-9_:-]+){1,4}/gi;
  const outFile = path.join(ROOT, '..', 'backend', 'scripts', 'missing-feature-verified.json');
  const results = [];

  for (const f of findings) {
    const claims = [...new Set((f.body.match(pathClaim) || [])
      .map((p) => p.replace(/\/+$/, ''))
      .filter((p) => p.split('/').length >= 2 && !p.includes('..')))];
    // Exact match, or structurally equal with `:param` treated as a wildcard.
    const present = claims.filter((p) => {
      const tail = p.replace(/^\/api/, '');
      if (registered.has(tail)) return true;
      const seg = tail.split('/').filter(Boolean);
      if (seg.length < 2) return false;
      return [...registered].some((r) => {
        const rs = r.split('/').filter(Boolean);
        if (rs.length !== seg.length) return false;
        return rs.every((s, i) => s.startsWith(':') || seg[i] === s);
      });
    });

    const files = f.affected
      .map((a) => a.replace(/[\\/].*$/, '').trim())
      .filter((a) => a && !a.includes('*'));
    const missingFiles = [...new Set(files)].filter((rel) => {
      const p = path.join(ROOT, '..', rel);
      return !fs.existsSync(p) && !fs.existsSync(p + '.js') && !fs.existsSync(p + '.ts');
    });

    const verdict = present.length > 0
      ? 'CLAIM-CONTRADICTED'
      : missingFiles.length > 0
        ? 'STALE-REFS'
        : 'UNVERIFIED';

    results.push({ id: f.id, phase: f.phase, priority: f.priority, verdict, present, missingFiles, title: f.title });
  }

  const by = results.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
  console.log(`CLAIM-CONTRADICTED : ${by['CLAIM-CONTRADICTED'] || 0}  (finding says X is missing; X exists in source)`);
  console.log(`STALE-REFS        : ${by['STALE-REFS'] || 0}  (cited files no longer exist)`);
  console.log(`UNVERIFIED        : ${by.UNVERIFIED || 0}  (needs a human to read the code)`);
  console.log('');

  const contrad = results.filter((r) => r.verdict === 'CLAIM-CONTRADICTED');
  for (const r of contrad.sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`  ${r.id.padEnd(15)} P${r.phase} ${r.priority.padEnd(7)} present: ${r.present.slice(0, 3).join(' ')}`);
  }
  if (contrad.length === 0) console.log('  (none)');

  fs.writeFileSync(outFile, JSON.stringify({ total: results.length, byVerdict: by, results }, null, 2));
  console.log(`\n  wrote ${path.relative(path.join(ROOT, '..'), outFile)}`);
}

