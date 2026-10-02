/**
 * DOC-M-07: incident & breach-notification playbook guard.
 *
 * The finding: DPDP requires breach-notification timelines, and we had only a
 * five-step summary in SECURITY.md §7 — no severity classes, no roles, no
 * notifiability decision rule, no clock table, no comms templates, no
 * post-mortem template. docs/incident-response.md is the deliverable; this
 * suite keeps it from rotting.
 *
 * A playbook fails in two ways: someone deletes a section under deadline
 * pressure (structure pins below stop that), or the law drifts and the clock
 * table silently lies (timeline pins stop that — they are the exact figures
 * from DPDP Rules 2025 Rule 7 and CERT-In Directions 20(3)/2022, so a legal
 * update must be a conscious edit here too). It also pins that the playbook
 * stays reachable from the two documents that point at breach response
 * (SECURITY.md §7, DPIA §9) and that it remains grounded in this codebase's
 * actual containment mechanisms rather than becoming generic advice.
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..', '..');
const PLAYBOOK = path.join(REPO, 'docs', 'incident-response.md');
const SECURITY = path.join(REPO, 'SECURITY.md');
const DPIA = path.join(REPO, 'docs', 'privacy', 'DPIA.md');

const playbook = fs.readFileSync(PLAYBOOK, 'utf8');
const security = fs.readFileSync(SECURITY, 'utf8');
const dpia = fs.readFileSync(DPIA, 'utf8');

describe('playbook structure', () => {
  it('exists and carries every operational section', () => {
    expect(fs.existsSync(PLAYBOOK)).toBe(true);
    const required = [
      '## 1. Severity classification',
      '## 2. Roles and escalation',
      '## 3. First 15 minutes (checklist)',
      '## 4. Containment runbook by scenario',
      '## 5. Notifiability assessment (the decision that has a clock)',
      '## 6. Notification timelines and obligations',
      '## 7. Notification templates',
      '## 8. Evidence preservation checklist',
      '## 9. Post-mortem',
      '## 10. Drills and maintenance',
    ];
    for (const heading of required) {
      expect(playbook).toContain(heading);
    }
  });

  it('defines SEV1-SEV4 with a default-notifiable posture', () => {
    for (const sev of ['SEV1', 'SEV2', 'SEV3', 'SEV4']) {
      expect(playbook).toContain(sev);
    }
    expect(playbook).toMatch(/default answer to\s+question 4 is\s+\*\*notifiable\*\*/);
    expect(playbook).toContain('it never\nmoves'); // T0 is immutable
  });

  it('assigns the five incident roles and keeps contacts out of the repo', () => {
    for (const role of [
      'Incident Commander',
      'Tech Lead',
      'Privacy Officer',
      'Comms Lead',
      'Scribe',
    ]) {
      expect(playbook).toContain(role);
    }
    expect(playbook).toContain('incident/contacts'); // where real numbers live
    expect(playbook).toContain('Acknowledgement SLA');
  });
});

describe('timeline pins (DPDP Rules 2025 Rule 7 + CERT-In 20(3)/2022)', () => {
  it('pins the DPDP clocks', () => {
    expect(playbook).toContain('DPDP Rules 2025, Rule 7');
    expect(playbook).toMatch(/Board first intimation.*without delay|without delay.*Board first intimation/s);
    expect(playbook).toMatch(/≤ ?72 hours|72 hours.*Board/s);
    expect(playbook).toMatch(/7\(1\)/); // Data Principal intimation rule ref
    expect(playbook).toMatch(/7\(2\)/); // Board intimation rule ref
    expect(playbook).toContain('Data Protection Board');
    expect(playbook).toContain('notified 13 Nov 2025');
  });

  it('pins the CERT-In obligations', () => {
    expect(playbook).toContain('20(3)/2022');
    expect(playbook).toMatch(/6 hours/);
    expect(playbook).toContain('incident@cert-in.org.in');
    expect(playbook).toContain('180 days'); // log retention precondition
    expect(playbook).toContain('Annexure I');
    expect(playbook).toContain('Point of Contact');
    expect(playbook).toMatch(/noticing or being brought to notice|noticing, not at confirming/);
  });

  it('keeps the HIPAA contingency windows', () => {
    expect(playbook).toMatch(/≤ ?60 days/);
    expect(playbook).toContain('§164.400');
  });
});

describe('templates', () => {
  it('ships all seven send-ready templates with placeholders', () => {
    const templates = [
      'Board — first intimation',
      'Board — detailed report',
      'Affected Data Principal notice',
      'CERT-In — preliminary incident report',
      'HIPAA individual notice',
      'Internal all-hands / status-page holding statement',
      'Hospital tenant notice',
    ];
    for (const t of templates) expect(playbook).toContain(t);
    expect(playbook).toContain('[BRACKETS]');
    // Rule 7(1) five content elements must be in the Data Principal template
    for (const el of ['consequences', 'safety measures', 'contact person']) {
      expect(playbook.toLowerCase()).toContain(el);
    }
    // Rule 7(2)(b)(vi) requires the send log, so the template demands one
    expect(playbook).toContain('send log');
  });

  it('post-mortem template carries the notification-compliance table', () => {
    expect(playbook).toContain('## Notification compliance');
    expect(playbook).toContain('Board detailed report | T0 + 72h');
    expect(playbook).toContain('CERT-In (if Annexure I) | T0 + 6h');
    expect(playbook).toContain('Regression test');
    expect(playbook).toContain('5 business days');
  });
});

describe('codebase grounding', () => {
  it('names the containment mechanisms that actually exist here', () => {
    for (const token of [
      'JWT_SECRET',
      'User.tokenVersion',
      'RefreshToken',
      'AuditLog',
      'LoginEvent',
      'DeletionRequest', // erasure hold — evidence destruction guard
      'bulk_export',
      'refresh-token', // or refresh token revocation
    ]) {
      expect(playbook).toContain(token);
    }
    expect(playbook).toContain('docs/data-dictionary.md'); // blast radius via the generated dictionary
    expect(playbook).toContain('X-Export-Truncated');
  });

  it('stays reachable from SECURITY.md and DPIA.md', () => {
    expect(security).toContain('docs/incident-response.md');
    expect(dpia).toContain('incident-response.md');
    expect(security).toContain('72 hours'); // §7 summary updated to the real clock
    expect(security).toContain('6 hours');
  });
});
