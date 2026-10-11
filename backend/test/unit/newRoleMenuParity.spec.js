/**
 * File 22 P0-8: every NEW operations-role menu path resolves to an App route
 * admitting that role. Same parser discipline as menuRouteParity.spec.js
 * (doctor-only) — this one covers the 30 roles added in P0-8.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..', '..');
const sidebar = fs.readFileSync(path.join(REPO, 'frontend', 'src', 'components', 'AppSidebar.tsx'), 'utf8');
const app = fs.readFileSync(path.join(REPO, 'frontend', 'src', 'App.tsx'), 'utf8');

const menuBlock = (role) => {
  const start = sidebar.indexOf(`  ${role}: [`);
  if (start === -1) return '';
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
  // Resolve `const NAME = [...]` role constants (e.g. allowedRoles={CLINIC_ROLES})
  // so constant-based routes are not false denials.
  const consts = {};
  const cre = /const\s+([A-Z][A-Z0-9_]*)\s*=\s*\[([^\]]*)\]/g;
  let cm;
  while ((cm = cre.exec(app)) !== null) {
    consts[cm[1]] = cm[2].replace(/['"\s]/g, '').split(',').filter(Boolean);
  }
  const re = /<Route path="([^"]+)" element=\{<(\w+)( allowedRoles=\{(\[[^\]]*\]|[A-Za-z_$][\w$]*)\})?/g;
  let m;
  while ((m = re.exec(app)) !== null) {
    const isRoleRoute = m[2] === 'RoleRoute';
    const raw = m[4] || '';
    const roles = isRoleRoute
      ? (raw.startsWith('[')
          ? raw.replace(/['"[\]\s]/g, '').split(',').filter(Boolean)
          : (consts[raw] || []))
      : ['*'];
    out.push({ path: m[1], roles });
  }
  return out;
};

const NEW_ROLES = [
  'front_desk', 'billing_executive', 'cashier', 'insurance_desk',
  'medical_director', 'cmo', 'nursing_supervisor', 'matron',
  'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse',
  'surgeon', 'anaesthetist', 'ot_technician', 'cssd_technician',
  'store_keeper', 'purchase_officer', 'hr_manager',
  'biomedical_engineer', 'maintenance',
  'housekeeping_supervisor', 'ward_boy',
  'dietician_head', 'kitchen_staff', 'mortuary_attendant',
  'medical_records_officer', 'quality_officer', 'pharmacovigilance_officer',
  'call_center_agent',
];

describe('P0-8: new operations-role menus resolve to admitting routes', () => {
  test('every new role has a sidebar menu', () => {
    const missing = NEW_ROLES.filter((r) => menuPaths(r).length === 0);
    expect(missing).toEqual([]);
  });

  test('every menu path admits its role', () => {
    const routes = appRoutes();
    expect(routes.length).toBeGreaterThan(10);
    const problems = [];
    for (const role of NEW_ROLES) {
      for (const p of menuPaths(role)) {
        const hit = routes.find(
          (r) => r.path === p && (r.roles.includes('*') || r.roles.includes(role)),
        );
        if (!hit) problems.push(`${role} -> ${p}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
