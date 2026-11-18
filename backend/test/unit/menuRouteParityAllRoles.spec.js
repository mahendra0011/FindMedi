/**
 * Extended menu â†” route parity: every sidebar entry across ALL clinic/HMS
 * roles must resolve to an App route the role may actually open. This is the
 * systematic check that catches dead sidebar links (broken pages the user
 * sees) rather than doctor-only spot checks.
 *
 * Routes may reference a role-list constant â€” resolved by roleConstants().
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..', '..');
const sidebar = fs.readFileSync(path.join(REPO, 'frontend', 'src', 'components', 'AppSidebar.tsx'), 'utf8');
const app = fs.readFileSync(path.join(REPO, 'frontend', 'src', 'App.tsx'), 'utf8');

const menuBlock = (role) => {
  const start = sidebar.indexOf(`  ${role}: [`);
  if (start < 0) return '';
  const end = sidebar.indexOf('],', start);
  return sidebar.slice(start, end);
};

const menuPaths = (role) => {
  const paths = [];
  const re = /path:\s*'([^']+)'/g;
  let m;
  const block = menuBlock(role);
  while ((m = re.exec(block)) !== null) paths.push(m[1].split('?')[0]);
  return [...new Set(paths)];
};

const roleConstants = () => {
  const consts = {};
  const re = /const\s+([A-Z][A-Z0-9_]*)\s*=\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(app)) !== null) {
    consts[m[1]] = m[2].replace(/['"\s]/g, '').split(',').filter(Boolean);
  }
  return consts;
};

const appRoutes = () => {
  const out = [];
  const consts = roleConstants();
  const re = /<Route path="([^"]+)" element=\{<(\w+)( allowedRoles=\{(\[[^\]]*\]|[A-Za-z_$][\w$]*)\})?/g;
  let m;
  while ((m = re.exec(app)) !== null) {
    const isRoleRoute = m[2] === 'RoleRoute';
    const raw = m[4] || '';
    const roles = isRoleRoute
      ? (raw.startsWith('[')
          ? raw.replace(/['"[\]\s]/g, '').split(',').filter(Boolean)
          : (consts[raw] || []))
      : ['patient','doctor','clinic_doctor','clinic_admin','clinic_receptionist','clinic_nurse','clinic_cashier','clinic_accountant','clinic_pharmacist','clinic_branch_manager','clinic_telemed_coordinator'];
    out.push({ path: m[1], roles });
  }
  return out;
};

const SIDEBAR_ROLES = [
  'patient', 'doctor', 'clinic_doctor', 'clinic_admin', 'clinic_receptionist',
  'clinic_nurse', 'clinic_cashier', 'clinic_accountant', 'clinic_pharmacist',
  'clinic_branch_manager', 'clinic_telemed_coordinator',
];

const ROLE_EXPANSIONS = {
  patient: ['patient'],
  doctor: ['doctor', 'clinic_doctor'],
  clinic_doctor: ['clinic_doctor', 'doctor'],
  clinic_admin: ['clinic_admin'],
  clinic_receptionist: ['clinic_receptionist'],
  clinic_nurse: ['clinic_nurse'],
  clinic_cashier: ['clinic_cashier'],
  clinic_accountant: ['clinic_accountant', 'clinic_cashier'],
  clinic_pharmacist: ['clinic_pharmacist'],
  clinic_branch_manager: ['clinic_branch_manager'],
  clinic_telemed_coordinator: ['clinic_telemed_coordinator'],
};

describe('sidebar â†” route parity (all clinic roles)', () => {
  it('finds the full clinic sidebar set', () => {
    for (const r of SIDEBAR_ROLES) expect(menuBlock(r)).not.toBe('');
  });
  for (const role of SIDEBAR_ROLES) {
    it(`every ${role} sidebar path has a route allowing the role`, () => {
      const allowed = ROLE_EXPANSIONS[role];
      const routes = appRoutes();
      expect(routes.length).toBeGreaterThan(10);
      const missing = [];
      for (const p of menuPaths(role)) {
        const hit = routes.find((r) => r.path === p && r.roles.some((x) => allowed.includes(x)));
        if (!hit) missing.push(p);
      }
      expect(missing).toEqual([]);
    });
  }
});
