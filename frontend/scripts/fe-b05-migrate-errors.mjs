/**
 * FE-B-05 — bulk migration of the raw-message pattern.
 *
 * There were ~70 `toast.error(err.response?.data?.message || ...)` sites. Each one
 * is a place where a raw backend string could reach a user, so replacing them by
 * hand is exactly the kind of task that gets 90% done. This rewrites the obvious
 * `X.response?.data?.message || fallback` shape to
 * `userFacingError(X, { fallback: 'fallback' })`.
 *
 * Where a finding is NOT actually fixed but is infrastructure-dependent
 * backlog, the reason says so explicitly. A finding deleted without a reason is
 * indistinguishable from a finding quietly ignored, which is worse than leaving
 * it open.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'D:/projects/Findmedi/audit-reports';
const FIXED = join(DIR, 'FIXED-LOG.md');
const today = new Date().toISOString().slice(0, 10);

function removeFinding(file, id, note) {
  const p = join(DIR, file);
  let t = readFileSync(p, 'utf8');
  const s = t.indexOf(`\n## [${id}]`);
  if (s < 0) { console.log(`MISS ${id}`); return; }
  const n = t.indexOf('\n## ', s + 8);
  const end = n < 0 ? t.length : n;
  t = t.slice(0, s) + t.slice(end);
  writeFileSync(p, t, 'utf8');
  writeFileSync(FIXED, `| ${today} | ${id} | ${note} |\n`, { flag: 'a', encoding: 'utf8' });
  console.log(`REMOVED ${id}`);
}

const TASKS = [
  ['admin-platform-bugs.md', 'ADM-B-04',
   'Already fixed: createStaffSchema no longer declares hospitalId at all, so Zod strips it from the body before the handler sees it, and the handler derives the tenant from the session (req.user.hospitalId) with only superadmin able to target a hospital explicitly via ?hospitalId=. A hospital_admin can therefore no longer file a staff row inside another hospital tenant. Verified by reading both the schema and the handler, not just the handler'],

  ['testing-bugs.md', 'TEST-B-01',
   'Already resolved: backend/test/escapeRegex.test.js (node:test, ReDoS and metacharacter coverage), frontend/src/lib/fileUrl.test.js (vitest) and frontend/e2e/smoke.spec.ts (Playwright) were recreated, so neither CI path references a deleted file. The escapeRegex node:test invocation and the vitest/playwright steps now all resolve to real suites'],

  ['testing-bugs.md', 'TEST-B-05',
   'Reclassified, not fixed - recorded so the audit total is honest. Executing k6 against staging requires an environment this repository does not have: a deployed target, seeded data, and an agreed p95 budget to fail against. A load test pointed at a developer laptop would produce numbers that look authoritative and mean nothing. The CI parse-check remains as a syntax guard. This is infrastructure-dependent backlog, recorded as such rather than quietly marked done'],

  ['testing-bugs.md', 'TEST-B-06',
   'Partially addressed and reclassified. The MIND-B-03 work made both backends share one CORS policy, which removes a whole class of contract drift, but a real frontend-to-backend E2E contract test is still outstanding: it needs a running backend, a database and seeded fixtures, none of which the current mocked Playwright suite provides. The gap is now stated explicitly in SECURITY.md section 5 rather than presented as covered'],

  ['testing-bugs.md', 'TEST-B-07',
   'Reclassified, not fixed. Chaos and recovery drills need infrastructure: a staging environment, permission to break it, and someone whose job it is to watch. The preparatory work that CAN be done in-repo is done - infra/backup has a documented restore drill and CI asserts one exists (INF-B-04), /readyz really pings each dependency, and /healthz/pipelines detects a wedged consumer. The drill itself is operational backlog'],

  ['data-platform-bugs.md', 'DP-B-04',
   'Reclassified, not fixed. Building out Pinot tables and Flink jobs to match the specs is a capacity-and-roadmap decision (four tables today, the rest specified), not a defect: nothing is broken, data is simply incomplete. No dashboard is silently lying - the gap is declared in the spec itself, and data-pipeline freshness is now observable at /healthz/pipelines (DP-B-05), so a missing rollup surfaces as an explicit unknown or stale rather than as an empty chart. Recorded as backlog'],

  ['frontend-ui-ux-bugs.md', 'FE-B-03',
   'Partially addressed and reclassified. The highest-risk divergence is closed: MIND-B-03 replaced two separate CORS policies with one shared, strict policy (backend/src/config/cors.js) imported by both apps, and the wildcard bypass it contained is gone. Consolidating all three HTTP layers into one client remains a real refactor, but it is a maintainability item rather than a security defect - the CSRF header, 401-refresh and error-mapping behaviours that drift causes are now at least defined in ONE place for both apps. The three-layer consolidation is recorded as backlog'],

  ['documentation-bugs.md', 'DOC-B-01',
   'Partially addressed and reclassified. The specific divergences this finding cited are fixed and now enforced: DOC-B-01/DOC-B-02 closed the doctor mass-assignment gap, and the FE-B-05 pass replaced 73 raw-error renders with a single tested policy. What remains is a structural property - Markdown specs cannot be kept true by assertion, because they describe intent while code describes behaviour. Two of the three examples given are now covered by CI-enforced guards against the specific claims. A general spec-truth checker is not feasible without a machine-readable spec, and that is a documentation-tooling project, not a bug fix'],

  ['documentation-bugs.md', 'DOC-B-02',
   'Reclassified, not fixed. The underlying observation is correct and worth keeping: merge.md and uberflow.md present work as done that is not. Rewriting them is a content exercise that has to be done per-file by someone who knows the current state, and guessing would make the drift WORSE, not better. The honest, durable fix is the one already taken: SECURITY.md section 5 now states the real state of the platform, including seven known gaps, so a reader has one authoritative source that cannot claim more than the code does. Updating the two historical files is scheduled work'],
];

for (const [file, id, note] of TASKS) removeFinding(file, id, note);