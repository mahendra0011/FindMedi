/**
 * Doc 11 §7 acceptance 5: every path in the doctor sidebar must resolve to
 * an App route the doctor role may actually open. Catches D2-class drift
 * (menu links to pages the role cannot open, or dead paths).
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

const appRoutes = () => {
  const out = [];
  // Any element shape EXCEPT a RoleRoute that excludes doctors counts as
  // open (bare components sit under an authenticated layout; ProtectedRoute
  // is any-session). Only a doctor-less RoleRoute is a real denial.
  const re = /<Route path="([^"]+)" element=\{<(\w+)( allowedRoles=\{\[([^\]]*)\])?/g;
  let m;
  while ((m = re.exec(app)) !== null) {
    const isRoleRoute = m[2] === 'RoleRoute';
    const roles = isRoleRoute
      ? (m[4] || '').replace(/['"\s]/g, '').split(',').filter(Boolean)
      : ['doctor', 'clinic_doctor'];
    out.push({ path: m[1], roles });
  }
  return out;
};

const checkParity = (role, allowed) => {
  const routes = appRoutes();
  expect(routes.length).toBeGreaterThan(10);
  const missing = [];
  for (const p of menuPaths(role)) {
    const hit = routes.find((r) => r.path === p && r.roles.some((x) => allowed.includes(x)));
    if (!hit) missing.push(p);
  }
  expect(missing).toEqual([]);
};

describe('doc 11 acceptance: doctor menu ↔ route parity', () => {
  it('every doctor menu path has a route allowing doctor or clinic_doctor', () => {
    checkParity('doctor', ['doctor', 'clinic_doctor']);
  });

  it('every clinic_doctor menu path has a route allowing clinic_doctor', () => {
    checkParity('clinic_doctor', ['clinic_doctor', 'doctor']);
  });
});
