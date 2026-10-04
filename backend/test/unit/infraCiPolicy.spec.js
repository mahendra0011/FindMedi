import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertBackupImagePolicy, isImmutableImageDigest } from '../../scripts/check-backup-image-policy.mjs';
import { writeAuditArtifact } from '../../scripts/lib/auditArtifact.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('INF-B-04 backup image policy', () => {
  const compose = fs.readFileSync(path.join(REPO, 'infra', 'docker-compose.prod.yml'), 'utf8');

  it('requires backup and restore drill to share the mandatory immutable image variable', () => {
    expect(assertBackupImagePolicy(compose)).toBe(true);
    expect(assertBackupImagePolicy(compose, `ghcr.io/findmedi/backup@sha256:${'a'.repeat(64)}`)).toBe(true);
  });

  it('rejects floating tags, malformed digests, and a drifted drill image', () => {
    expect(isImmutableImageDigest('findmedi/backup:latest')).toBe(false);
    expect(isImmutableImageDigest(`findmedi/backup@sha256:${'A'.repeat(64)}`)).toBe(false);
    expect(() => assertBackupImagePolicy(compose, 'findmedi/backup:ci')).toThrow(/immutable/);
    const changed = compose.replace(/(backup-drill:\r?\n)[ ]{4}image: .+/, '$1    image: findmedi/backup:latest');
    expect(() => assertBackupImagePolicy(changed)).toThrow(/backup-drill.image/);
  });
});

describe('INF-B-04 restore-drill evidence archive', () => {
  it('archives a per-drill JSON evidence record with the offsite artifacts', () => {
    const drill = fs.readFileSync(path.join(REPO, 'infra', 'backup', 'restore-drill.sh'), 'utf8');
    expect(drill).toContain('drill-evidence-');
    expect(drill).toContain('"verdict": "PASSED"');
    expect(drill).toContain('elapsed_min');
    expect(drill).toContain('rto_budget_min');
    expect(drill).toContain('image_digest');
    // Evidence lands where the backups go (offsite-copied), not in /tmp.
    expect(drill).toMatch(/EVIDENCE_FILE="\$\{ARTIFACT_DIR\}/);
  });
});

describe('INF-M-01 + INF-B-06 deployment digest and provenance', () => {
  it('every k8s image is digest-pinned, never a floating tag', () => {
    const core = fs.readFileSync(path.join(REPO, 'infra', 'k8s', 'core.yaml'), 'utf8');
    const images = [...core.matchAll(/^\s*image:\s*(\S+)\s*$/gm)].map((m) => m[1]);
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(isImmutableImageDigest(image)).toBe(true);
    }
    expect(core).not.toMatch(/image:\s*\S+:latest/);
  });

  it('deploys only through environment approvals from a releasable ref (provenance)', () => {
    const deploy = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'deploy.yml'), 'utf8');
    // Human approval gate: the job blocks until the environment approver clicks.
    expect(deploy).toContain('environment: ${{ inputs.target }}');
    // Provenance: only a vX.Y.Z tag or main-descendant ref may deploy, deploys
    // queue instead of cancelling each other, and the target must prove liveness.
    expect(deploy).toContain("git tag -l 'v*'");
    expect(deploy).toContain('cancel-in-progress: false');
    expect(deploy).toContain('Post-deploy health probe');
  });
});

describe('INF-M-05 audit evidence artifacts', () => {
  it('writes parseable backend/frontend npm audit JSON using predictable artifact names', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'findmedi-audit-artifact-'));
    try {
      const audit = { metadata: { vulnerabilities: { total: 0 } }, vulnerabilities: {} };
      const backendFile = writeAuditArtifact(dir, 'backend', audit);
      const frontendFile = writeAuditArtifact(dir, 'frontend', audit);
      expect(path.basename(backendFile)).toBe('backend-npm-audit.json');
      expect(path.basename(frontendFile)).toBe('frontend-npm-audit.json');
      expect(JSON.parse(fs.readFileSync(backendFile, 'utf8'))).toEqual(audit);
      expect(JSON.parse(fs.readFileSync(frontendFile, 'utf8'))).toEqual(audit);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uploads audit JSON even when the vulnerability ratchet fails', () => {
    const workflow = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(workflow).toContain('VULN_AUDIT_ARTIFACT_DIR: ${{ runner.temp }}/findmedi-vulnerability-audit');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('findmedi-vulnerability-audit/*.json');
    expect(workflow).toContain('retention-days: 30');
  });
});
