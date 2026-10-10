/**
 * MISS-AUTHZ-001 regression: `staff:view` is the read counterpart of
 * `staff:manage` (safety/frontoffice/roster/quality/masters/insights/
 * contactCenter/reportStudio all pair `authorize('staff:view')` LIST routes
 * with `authorize('staff:manage')` writes in the same file). It was referenced
 * by 47 route call sites while NO non-superadmin role held it, so every
 * non-superadmin got a permanent 403 on those lists and the
 * checkPermissionMatrix.mjs CI gate failed.
 *
 * The HTTP harness substitutes authorize() with a pass-through marker
 * (appHarness.js), so an integration spec cannot prove permission GRANTS.
 * This spec pins them at the matrix level instead, and re-runs the gate's
 * reachability check over the previously-broken route files so the exact
 * failure cannot come back unnoticed.
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROLE_PERMISSIONS, CANONICAL_ROLES, roleHasPermission,
} from '../../src/config/permissions.js';
import { stripComments } from '../../scripts/lib/routeScan.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(HERE, '..', '..');
const ROUTES = path.join(BACKEND, 'src', 'routes');

const WORKING_ROLES = CANONICAL_ROLES.filter((r) => r !== 'superadmin');

const authorizeLiterals = (file) => {
  const lines = stripComments(fs.readFileSync(path.join(ROUTES, file), 'utf8')).split('\n');
  const perms = [];
  lines.forEach((line, i) => {
    const at = line.indexOf('authorize(');
    if (at === -1) return;
    const args = line.slice(at + 'authorize('.length);
    const end = args.indexOf(')');
    const argText = end === -1 ? args : args.slice(0, end);
    for (const m of argText.matchAll(/'([^']+)'|"([^"]+)"/g)) {
      perms.push({ perm: m[1] || m[2], site: `${file}:${i + 1}` });
    }
  });
  return perms;
};

const holdersOf = (perm) => WORKING_ROLES.filter((role) => roleHasPermission(role, perm));

describe('staff:view permission hole (MISS-AUTHZ-001)', () => {
  test('every permission the previously-broken list routes require is held by a real role', () => {
    const unreachable = [];
    for (const file of ['safety.js', 'frontoffice.js', 'roster.js']) {
      const used = authorizeLiterals(file);
      expect(used.length).toBeGreaterThan(0);
      for (const { perm, site } of used) {
        if (holdersOf(perm).length === 0) unreachable.push(`${site}  ${perm}`);
      }
    }
    expect(unreachable).toEqual([]);
  });

  test('staff:view is held by the roles that were permanently 403ed on the lists', () => {
    for (const role of [
      'hospital_admin', 'quality_officer', 'nursing_supervisor', 'matron',
      'front_desk', 'receptionist', 'hr_manager', 'infection_control_nurse',
      'medical_records_officer', 'call_center_agent', 'clinic_admin',
    ]) {
      expect(ROLE_PERMISSIONS[role]).toContain('staff:view');
      expect(roleHasPermission(role, 'staff:view')).toBe(true);
    }
  });

  test('nurse family can request shift swaps (roster POST /swaps is staff:view)', () => {
    expect(roleHasPermission('ward_nurse', 'staff:view')).toBe(true);
    expect(roleHasPermission('icu_nurse', 'staff:view')).toBe(true);
  });

  test('staff:view stays least-privilege: self-service and fenced roles do not hold it', () => {
    for (const role of ['patient', 'helper', 'cashier', 'support_agent', 'auditor']) {
      expect(roleHasPermission(role, 'staff:view')).toBe(false);
    }
  });

  test('front_desk still mirrors receptionist exactly', () => {
    expect([...ROLE_PERMISSIONS.front_desk].sort()).toEqual([...ROLE_PERMISSIONS.receptionist].sort());
  });

  test('records:amend (AI human-review decide) is held by a real role', () => {
    expect(ROLE_PERMISSIONS.hospital_admin).toContain('records:amend');
    expect(holdersOf('records:amend').length).toBeGreaterThan(0);
  });
});
