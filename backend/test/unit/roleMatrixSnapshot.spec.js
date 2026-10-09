/**
 * docs2/08 §8.4 rule 7: permission matrix snapshot test. Pins the §8.3 table
 * cells that matter (who can touch money/records) plus the enum↔matrix
 * pairing, so a later edit cannot silently widen a role.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROLE_PERMISSIONS, CANONICAL_ROLES, rolesEquivalent, roleHasPermission,
} from '../../src/config/permissions.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(HERE, '..', '..');

function userEnumRoles() {
  const src = fs.readFileSync(path.join(BACKEND, 'src', 'models', 'User.js'), 'utf8');
  const at = src.indexOf('role:');
  const enumAt = src.indexOf('enum:', at);
  const open = src.indexOf('[', enumAt);
  // Bracket-match from the enum array start (nested arrays do not occur here).
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '[') depth += 1;
    if (src[i] === ']') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = src.slice(open, end + 1);
  return [...body.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

const has = (role, perm) => (ROLE_PERMISSIONS[role] || []).includes(perm);

describe('role matrix snapshot (docs2/08 §8.3)', () => {
  test('enum and matrix cover each other exactly', () => {
    const enumRoles = userEnumRoles();
    expect(enumRoles.length).toBeGreaterThan(90);
    for (const r of CANONICAL_ROLES) {
      expect(enumRoles).toContain(r);
    }
    const deprecated = ['counselor', 'mid_level_counselor', 'senior_counselor'];
    for (const r of enumRoles) {
      if (deprecated.includes(r)) continue;
      expect(CANONICAL_ROLES).toContain(r);
    }
  });

  test('money roles: billing writes, cashier fenced', () => {
    expect(has('billing_executive', 'billing:write')).toBe(true);
    expect(has('billing_executive', 'records:write')).toBe(false);
    expect(has('cashier', 'billing:write')).toBe(true);
    expect(has('cashier', 'records:read')).toBe(false);
    expect(has('cashier', 'patients:read')).toBe(true);
    expect(has('insurance_desk', 'insurance:write')).toBe(true);
    expect(has('insurance_desk', 'records:write')).toBe(false);
  });

  test('clinical fence: directors read, surgeons write, nurses vitals', () => {
    expect(has('medical_director', 'records:read')).toBe(true);
    expect(has('medical_director', 'records:write')).toBe(false);
    expect(has('surgeon', 'records:write')).toBe(true);
    expect(has('ward_nurse', 'vitals:write')).toBe(true);
    expect(has('ward_nurse', 'records:write')).toBe(false);
    expect(has('infection_control_nurse', 'reports:read')).toBe(true);
  });

  test('ops roles: least privilege holds', () => {
    expect(has('hr_manager', 'staff:manage')).toBe(true);
    expect(has('hr_manager', 'billing:write')).toBe(false);
    expect(has('store_keeper', 'inventory:manage')).toBe(true);
    expect(has('store_keeper', 'billing:write')).toBe(false);
    expect(has('cssd_technician', 'inventory:manage')).toBe(true);
    expect(has('quality_officer', 'audit:read')).toBe(true);
    expect(has('quality_officer', 'records:write')).toBe(false);
    expect(has('call_center_agent', 'appointments:write')).toBe(true);
    expect(has('call_center_agent', 'billing:write')).toBe(false);
    expect(has('call_center_agent', 'records:read')).toBe(false);
    expect(has('medical_records_officer', 'dsr:read')).toBe(true);
    expect(has('medical_records_officer', 'records:write')).toBe(false);
    expect(has('mortuary_attendant', 'records:read')).toBe(false);
    expect(has('pharmacovigilance_officer', 'pharmacy:read')).toBe(true);
  });

  test('front_desk mirrors receptionist exactly', () => {
    expect([...ROLE_PERMISSIONS.front_desk].sort()).toEqual([...ROLE_PERMISSIONS.receptionist].sort());
  });

  test('permission families resolve (handler role === checks)', () => {
    expect(rolesEquivalent('surgeon', 'doctor')).toBe(true);
    expect(rolesEquivalent('ward_nurse', 'nurse')).toBe(true);
    expect(rolesEquivalent('front_desk', 'receptionist')).toBe(true);
    expect(rolesEquivalent('cmo', 'medical_director')).toBe(true);
    expect(roleHasPermission('surgeon', 'records:write')).toBe(true);
    expect(roleHasPermission('cashier', 'billing:write')).toBe(true);
    expect(roleHasPermission('cashier', 'records:read')).toBe(false);
  });
});
