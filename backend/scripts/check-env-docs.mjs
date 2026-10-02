/**
 * DOC-B-03 — env-var drift guard.
 *
 * The runbooks document env vars; `envValidator.js` enforces them; `.env.example`
 * lists them. Nothing connected the three, so they drifted silently: a var could
 * be required in code, undocumented in the example, and named differently in a
 * runbook — and the failure only appeared as a confusing startup crash.
 *
 * This checks the mechanical direction, which is the one that actually breaks
 * deployments:
 *
 *   1. Every var REQUIRED by envValidator.js must appear in `.env.example`.
 *      A missing example entry means the first person to deploy discovers it by
 *      hitting the error.
 *   2. Every var used in docker-compose / k8s must be in the example too.
 *   3. Every var in `.env.example` should be recognised by the validator —
 *      otherwise the example is teaching a variable the app ignores.
 *
 * It deliberately does NOT try to parse prose in Markdown. A doc scanner that
 * cries wolf on a code sample in a runbook gets disabled within a week, and a
 * disabled check is worse than no check. Run from the repo root:
 *
 *   node backend/scripts/check-env-docs.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);

/**
 * Locate the env example without hard-coding one location.
 *
 * The repo has `backend/.env.example`, `frontend/.env.example` and
 * `backend/mindsupport/.env.example`. The backend one is the one that must cover
 * every server-side var, so it is preferred; if it is ever moved, the check
 * reports which paths it looked at rather than silently finding nothing and
 * passing.
 */
const EXAMPLE_CANDIDATES = [
  'backend/.env.example',
  '.env.example',
  'frontend/.env.example',
];

function findExample() {
  for (const rel of EXAMPLE_CANDIDATES) {
    const abs = join(REPO, rel);
    if (existsSync(abs)) return abs;
  }
  return null;
}

/** Names inside `{ name: 'X', ... }` entries of REQUIRED_VARS. */
function requiredFromValidator(src) {
  const out = new Set();
  if (!src) return out;
  const block = src.slice(src.indexOf('REQUIRED_VARS'));
  for (const m of block.matchAll(/name:\s*'([A-Z0-9_]+)'/g)) out.add(m[1]);
  return out;
}

/** Names inside `{ name: 'X' }` entries of OPTIONAL_VARS, plus known-optional lists. */
function optionalFromValidator(src) {
  const out = new Set();
  if (!src) return out;
  for (const m of src.matchAll(/OPTIONAL_VARS[\s\S]{0,4000}/g)) {
    for (const n of m[0].matchAll(/'([A-Z][A-Z0-9_]+)'/g)) out.add(n[1]);
  }
  return out;
}

/** `KEY=value` pairs in a dotenv-style file. */
function keysFromDotenv(src) {
  const out = new Set();
  if (!src) return out;
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
    if (m) out.add(m[1]);
  }
  return out;
}

/** `${VAR}` / `$VAR` references in compose and k8s manifests. */
function varsFromManifests() {
  const out = new Set();
  const files = [
    'infra/docker-compose.yml',
    'infra/docker-compose.prod.yml',
    'infra/k8s/core.yaml',
  ];
  for (const rel of files) {
    const src = read(join(REPO, rel));
    if (!src) continue;
    for (const m of src.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)) out.add(m[1]);
  }
  return out;
}

const validator = read(join(REPO, 'backend/src/config/envValidator.js'));
const examplePath = findExample();
if (!examplePath) {
  console.error(
    'No .env.example found. Looked in:\n  ' +
    EXAMPLE_CANDIDATES.map((p) => join(REPO, p)).join('\n  ')
  );
  process.exit(1);
}
const example = keysFromDotenv(read(examplePath));

const required = requiredFromValidator(validator);
const optional = optionalFromValidator(validator);
const manifestVars = varsFromManifests();

const problems = [];

// 1 & 2. Anything required or used by a manifest must be documented.
for (const key of [...required].sort()) {
  if (!example.has(key)) {
    problems.push(
      `REQUIRED but missing from .env.example: ${key}` +
      `\n    Add it to .env.example, or the first deployment discovers it as a startup crash.`
    );
  }
}
for (const key of [...manifestVars].sort()) {
  if (!example.has(key)) {
    problems.push(`Used in infra manifests but missing from .env.example: ${key}`);
  }
}

// 3. Documented but not known to the app.
const known = new Set([...required, ...optional]);
const undocumentedInCode = [];
for (const key of [...example].sort()) {
  if (known.size > 0 && !known.has(key)) undocumentedInCode.push(key);
}

const separator = '='.repeat(72);
console.log(separator);
console.log('DOC-B-03 · env documentation drift');
console.log(separator);
console.log(`required by validator : ${required.size}`);
console.log(`documented in example  : ${example.size}`);
console.log(`used in infra manifests: ${manifestVars.size}`);

if (problems.length) {
  console.error(`\n${problems.length} PROBLEM(S):\n`);
  for (const p of problems) console.error(`  - ${p}\n`);
  console.error(separator);
  process.exit(1);
}

if (undocumentedInCode.length) {
  // Reported, not fatal: a var can legitimately be consumed by the frontend, a
  // build script or a CI step, none of which the validator knows about. Failing
  // here would mean either a false positive or a stub entry in the validator.
  console.log(
    `\nNote: ${undocumentedInCode.length} var(s) in .env.example are not referenced by\n` +
    `envValidator.js (they may belong to the frontend, CI or an infra script):\n  ` +
    undocumentedInCode.join(', ')
  );
}

console.log(`\nOK — every required and manifest-referenced var is documented.`);
console.log(separator);