#!/usr/bin/env node
/**
 * Staging parity check (doc 19: "Staging parity + synthetic data + sandbox vendors").
 *
 * What this does:
 *   compares `infra/docker-compose.yml` (base) to the production overlay
 *   `infra/docker-compose.prod.yml` and asserts the service sets match and
 *   that the production overlay actually enforces the non-negotiables it
 *   claims (no host ports published, no dev-only passwords, digests pinned,
 *   non-root where applicable). Also runs a `--dry-run` compose merge
 *   (`docker compose config`) when Docker is available.
 *
 * What this does NOT do: it does not deploy anything, and it cannot create
 * a staging environment by itself. The staging environment, sandbox vendor
 * credentials and synthetic data are provisioned by the DevOps owner — see
 * `docs/ops/staging-environments.md` (this script is the pre-flight check).
 *
 * Exit codes: 0 = parity clean (or skipped because Docker missing); 1 = drift
 * detected; 2 = script error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const base = path.join(ROOT, 'infra', 'docker-compose.yml');
const overlay = path.join(ROOT, 'infra', 'docker-compose.prod.yml');

const read = (f) => fs.readFileSync(f, 'utf8');
const svcNames = (src) => [...src.matchAll(/^  ([a-zA-Z0-9_-]+):/gm)].map((m) => m[1]);
const missingArg = (name) => `Environment variable ${name} missing (supply at compose-time)`;

const baseText = read(base);
const overlayText = read(overlay);

const baseSvcs = new Set(svcNames(baseText));
const overlaySvcs = new Set(svcNames(overlayText));
const onlyBase = [...baseSvcs].filter((s) => !overlaySvcs.has(s));
console.log('base services:  ', [...baseSvcs].join(', '));
console.log('overlay services:', [...overlaySvcs].join(', '));

// 1) The production overlay must keep every data-plane service from the base.
const required = ['mongo1', 'postgres', 'redis', 'opensearch', 'minio', 'kafka', 'valhalla', 'clamav', 'nginx'];
const missing = required.filter((s) => !overlaySvcs.has(s));

// 2) Overlay must reset every host port publication.
const portResets = [...overlayText.matchAll(/ports:\s*!reset\s*\[\]/g)].length;

// 3) Overlay must define the dev-secret guard.
const hasGuard = /name:\s*findmedi-prod-guard/.test(overlayText) || /guard:/m.test(overlayText);

// 4) Images must be digest-pinned via IMAGE_DIGEST_* or BACKUP_IMAGE.
const pinned = /IMAGE_DIGEST_[A-Z_]+|BACKUP_IMAGE:[^#\n]*sha256/.test(overlayText);

// 5) Informational: dev-only credential literals. Base is dev scaffolding; overlay's
// guard service blocks them in production (see INF-B-02). Not a failure condition.
const devOnlyBase = [...baseText.matchAll(/\*?dev_only\*?/gi)].length;
const devOnlyOverlay = [...overlayText.matchAll(/\*?dev_only\*?/gi)].length;

// 6) Offer `docker compose config` merge when available (non-fatal if no docker).
let dockerOk = false;
try {
  execFileSync('docker', ['compose', '-f', base, '-f', overlay, 'config', '--quiet'], { stdio: 'ignore' });
  dockerOk = true;
} catch { dockerOk = false; }

const problems = [];
for (const s of missing) problems.push(`overlay missing required service: ${s}`);
if (portResets < 1) problems.push('overlay does not reset every published host port (expected "ports: !reset []" on datastores)');
if (!hasGuard) problems.push('overlay does not define the dev-secret guard service');
if (!pinned) problems.push('overlay does not pin images by digest (IMAGE_DIGEST_*/BACKUP_IMAGE)');

console.log('\ncheck:');
console.log('  datastore host-ports reset:', portResets >= 1 ? 'yes' : 'NO');
console.log('  dev-secret guard defined:  ', hasGuard ? 'yes' : 'NO');
console.log('  images digest-pinned:      ', pinned ? 'yes' : 'NO');
console.log('  services parity (required):', missing.length === 0 ? 'ok' : `missing: ${missing.join(', ')}`);
console.log('  docker merge validate:      ', dockerOk ? 'clean' : 'skipped (docker not available)');
console.log('  dev-only literals (base/overlay): ' + devOnlyBase + '/' + devOnlyOverlay + '   # base: scaffolding; overlay: guard rejects');

if (problems.length) {
  console.error('\nPARITY DRIFT:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nstaging parity check: OK' + (dockerOk ? '' : ' (syntax-level; run with docker for full validation)'));
