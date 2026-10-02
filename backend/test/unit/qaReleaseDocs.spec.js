/**
 * DOC-M-04 + INF-M-01: QA & release documentation + deploy-workflow guard.
 *
 * The finding: no test plan, no finding-to-test traceability contract, no
 * release checklist, no semver/changelog policy, no migration policy for
 * breaking API changes. docs/qa-release.md + CHANGELOG.md are the deliverables;
 * this suite keeps them executable instead of aspirational.
 *
 * The sharpest check is command validity: a release checklist that references
 * a script nobody has is worse than no checklist, so every backticked
 * `npm run`/`npm test`/`node scripts/…` command in the doc is parsed and
 * asserted to exist in backend/package.json, frontend/package.json, or on
 * disk. The rest pins structure (sections cannot be quietly deleted), the
 * CI-parity gates (the checklist must include the same ratchets CI runs),
 * and the changelog policy (Keep a Changelog skeleton + version + finding-ID
 * citations actually present in CHANGELOG.md).
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..', '..');
const DOC = path.join(REPO, 'docs', 'qa-release.md');
const CHANGELOG = path.join(REPO, 'CHANGELOG.md');
const BACKEND_PKG = path.join(REPO, 'backend', 'package.json');
const FRONTEND_PKG = path.join(REPO, 'frontend', 'package.json');
const SCRIPTS_DIR = path.join(REPO, 'backend', 'scripts');

const doc = fs.readFileSync(DOC, 'utf8');
const backendScripts = JSON.parse(fs.readFileSync(BACKEND_PKG, 'utf8')).scripts ?? {};
const frontendScripts = JSON.parse(fs.readFileSync(FRONTEND_PKG, 'utf8')).scripts ?? {};

const checklist = (doc.split('## 3. Release checklist')[1] ?? '').split('## 4.')[0];

describe('DOC-M-04 docs/qa-release.md structure', () => {
  it('exists with all six sections', () => {
    for (const heading of [
      '## 1. Test plan',
      '## 2. Traceability: finding → evidence',
      '## 3. Release checklist',
      '## 4. Versioning, API compatibility, changelog',
      '## 5. Migration & breaking-change policy',
      '## 6. Related documents',
    ]) {
      expect(doc).toContain(heading);
    }
  });

  it('is honest about what each test layer does not prove', () => {
    expect(doc).toContain('Does **not** prove');
    expect(doc).toContain('mock backend');
    expect(doc).toContain('regression ratchet, not an adequacy claim');
    expect(doc).toContain('TEST-M');
  });

  it('keeps the traceability contract on the three breadcrumbs', () => {
    const trace = doc.split('## 2. Traceability')[1].split('## 3.')[0];
    expect(trace).toContain('FIXED-LOG.md');
    expect(trace).toContain('ci.yml');
    expect(trace).toContain('grep -r');
    expect(trace).toContain('196');
  });
});

describe('DOC-M-04 release checklist commands are real', () => {
  it('every `npm run <script>` exists in backend or frontend', () => {
    const names = [...checklist.matchAll(/`npm run ([\w:.-]+)`/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(8);
    const missing = names.filter((name) => backendScripts[name] === undefined && frontendScripts[name] === undefined);
    expect(missing).toEqual([]);
  });

  it('every `npm test` reference is backed by a test script', () => {
    expect(checklist).toContain('`npm test`');
    expect(backendScripts.test).toBeDefined();
    expect(frontendScripts.test).toBeDefined();
  });

  it('every `node scripts/<file>` exists on disk', () => {
    const files = [...checklist.matchAll(/`node scripts\/([\w.-]+)`/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThanOrEqual(3);
    const missingFiles = files.filter((file) => !fs.existsSync(path.join(SCRIPTS_DIR, file)));
    expect(missingFiles).toEqual([]);
  });

  it('includes every ratchet CI runs (CI-parity gates)', () => {
    const gates = [
      'authz:coverage',
      'authz:triage',
      'authz:tenant-guard',
      'docs:dictionary:check',
      'test:coverage',
      'typecheck:ratchet',
      'check-env-docs.mjs',
      'check-vuln-regression.mjs',
      'test:e2e',
    ];
    expect(gates.filter((gate) => !checklist.includes(gate))).toEqual([]);
  });

  it('has deploy smoke + rollback + sign-off', () => {
    expect(checklist).toContain('/healthz');
    expect(checklist).toContain('/readyz');
    expect(checklist).toContain('Rollback');
    expect(checklist).toContain('Sign-off');
    expect(checklist).toContain('digest-pinned');
  });
});

describe('DOC-M-04 versioning & changelog policy', () => {
  it('pins semver mapping and the breaking-change rules', () => {
    for (const token of ['MAJOR', 'MINOR', 'PATCH', 'breaking', 'additive-only', 'Sunset', 'Deprecation', '90 days']) {
      expect(doc).toContain(token);
    }
    expect(doc).toContain('What counts as breaking');
    expect(doc).toContain('/api/v2/');
  });

  it('pins the expand → migrate → contract migration policy', () => {
    for (const token of ['Expand', 'Backfill', 'Contract', 'MIGRATIONS.md', 'reconcile-pg.mjs', 'forward-only']) {
      expect(doc).toContain(token);
    }
    expect(fs.existsSync(path.join(SCRIPTS_DIR, 'MIGRATIONS.md'))).toBe(true);
  });

  it('CHANGELOG.md exists with Keep a Changelog skeleton and this policy link', () => {
    const changelog = fs.readFileSync(CHANGELOG, 'utf8');
    expect(changelog).toContain('Keep a Changelog');
    expect(changelog).toContain('## [Unreleased]');
    expect(changelog).toContain('## [1.0.0]');
    expect(changelog).toContain('docs/qa-release.md');
    expect(changelog).toContain('FIXED-LOG.md');
    expect(changelog).toMatch(/\[Unreleased\]:\s*https:\/\//);
    expect(changelog).toMatch(/\[1\.0\.0\]:\s*https:\/\//);
  });

  it('the overhaul plan points back at the release process', () => {
    const plan = fs.readFileSync(path.join(REPO, 'audit-reports', 'testing-overhaul-plan.md'), 'utf8');
    expect(plan).toContain('docs/qa-release.md');
  });
});

describe('INF-M-01 deploy workflow with environment approvals', () => {
  const DEPLOY = path.join(REPO, '.github', 'workflows', 'deploy.yml');

  it('exists and is manual + environment-gated (approvals come from GitHub, not this file)', () => {
    const wf = fs.readFileSync(DEPLOY, 'utf8');
    expect(wf).toContain('workflow_dispatch:');
    expect(wf).toContain('environment: ${{ inputs.target }}');
    expect(wf).toContain('type: choice');
    expect(wf).toContain('- staging');
    expect(wf).toContain('- production');
    expect(wf).toContain('cancel-in-progress: false');
    expect(wf).toContain('DEPLOY_WEBHOOK_URL');
    expect(wf).toContain('DEPLOY_HEALTH_URL');
  });

  it('refuses unreleasable refs, keeps the changelog contract, and skips loudly when unwired', () => {
    const wf = fs.readFileSync(DEPLOY, 'utf8');
    expect(wf).toContain('Refuse to deploy');
    expect(wf).toContain("git tag -l 'v*'");
    expect(wf).toContain('origin/main');
    expect(wf).toContain('## \\[Unreleased\\]');
    expect(wf).toContain('::notice::');
    expect(wf).toContain('Post-deploy health probe');
    expect(wf).toContain('steps.trigger.outputs.triggered');
  });

  it('the release checklist and one-time settings activate it (and branch protection)', () => {
    const missing = ['deploy.yml', 'Required reviewers', 'Branch protection', 'UPTIME_HEALTH_URL', 'status checks']
      .filter((token) => !doc.includes(token));
    expect(missing).toEqual([]);
  });
});
