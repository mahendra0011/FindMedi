/**
 * TEST-B-03 — TypeScript ratchet.
 *
 * The frontend has never been type-clean, so `tsc` was `continue-on-error: true`.
 * That is not "non-blocking", it is "unenforced": nobody can tell whether a PR
 * added ten errors or removed ten thousand, and the number silently drifts upward
 * because no gate exists.
 *
 * A ratchet fixes this without requiring the backlog to be paid first. The rule
 * is simple and absolute:
 *
 *     the error count may go DOWN. It may never go UP.
 *
 * The count is stored in `frontend/tsconfig.baseline.json`. CI fails when the
 * current count exceeds it, and the developer is told to run
 * `npm run typecheck:baseline` to re-baseline after fixing things. Fixing errors
 * is therefore rewarded immediately, and nobody is blocked by work that predates
 * them.
 *
 * Why a COUNT and not a file list: a per-file baseline is more precise but
 * trivially defeated — adding one `any` to a file removes that file from the
 * baseline while adding a new file adds it back, and a rename reshuffles
 * everything. The count is crude but it cannot be gamed by reorganising files.
 *
 * Usage:
 *   node scripts/typecheck-ratchet.mjs            # fail if worse than baseline
 *   node scripts/typecheck-ratchet.mjs --update   # rewrite the baseline
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_FILE = join(FRONTEND, 'tsconfig.baseline.json');
const update = process.argv.includes('--update');

/** Run tsc and count diagnostics. `tsc` exits non-zero whenever there are any. */
function countTypeErrors() {
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsc', '--noEmit', '-p', 'tsconfig.json'],
    { cwd: FRONTEND, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 }
  );

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  // `error TS####:` is the canonical diagnostic prefix. The npm notice lines and
  // any stack traces do not match, so they are excluded.
  const matches = output.match(/error TS\d+:/g) || [];
  return { count: matches.length, output };
}

const { count, output } = countTypeErrors();

if (!existsSync(BASELINE_FILE)) {
  if (update) {
    writeFileSync(BASELINE_FILE, JSON.stringify({ maxTypeErrors: count }, null, 2) + '\n', 'utf8');
    console.log(`Created baseline: maxTypeErrors = ${count}`);
    process.exit(0);
  }
  console.error(
    `No baseline at ${BASELINE_FILE}.\n` +
    'Run `npm run typecheck:baseline` once to create it.'
  );
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).maxTypeErrors;

if (update) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ maxTypeErrors: count }, null, 2) + '\n', 'utf8');
  console.log(`Baseline updated: ${baseline} -> ${count}`);
  process.exit(0);
}

if (count > baseline) {
  const added = count - baseline;
  console.error(
    '\n' +
    '='.repeat(72) + '\n' +
    `TEST-B-03 · TypeScript ratchet BROKEN\n\n` +
    `  baseline (max allowed): ${baseline}\n` +
    `  current:                ${count}\n` +
    `  NEW errors:             +${added}\n\n` +
    'This project is not type-clean yet, but the error count may only go DOWN.\n' +
    'Adding errors is not allowed. Either fix them, or (only if the new file\n' +
    'genuinely cannot be typed yet) run `npm run typecheck:baseline` and explain\n' +
    'in the PR why the count had to rise.\n' +
    '='.repeat(72) + '\n'
  );
  // Show a sample so the failure is actionable without a second CI step.
  const sample = output.split('\n').filter(l => /error TS\d+:/.test(l)).slice(0, 15);
  if (sample.length) {
    console.error('First diagnostics:\n' + sample.join('\n') + '\n');
  }
  process.exit(1);
}

const delta = baseline - count;
const msg = delta > 0
  ? `Improved by ${delta} errors — re-baseline with \`npm run typecheck:baseline\` to lock it in.`
  : 'No change.';
console.log(`TEST-B-03 · ratchet OK — ${count}/${baseline} type errors. ${msg}`);