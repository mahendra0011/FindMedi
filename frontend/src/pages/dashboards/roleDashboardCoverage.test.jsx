/**
 * Role dashboard coverage — every User.role enum value must resolve to a
 * dedicated, role-appropriate dashboard spec. This locks in three guarantees:
 *
 *  1. No enum role silently falls through to a "lab_manager" / "radiology_manager"
 *     blueprint (the old UniversalHmsDashboard fallback bug).
 *  2. Only the documented legacy aliases are allowed to reuse another role's spec.
 *  3. Every resolved spec has enough substance to render a real dashboard.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('offline'))),
    post: vi.fn(() => Promise.reject(new Error('offline'))),
  },
}));

import { HMS_ROLE_SPECS, getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';
import { CMS_ROLE_SPECS, getCmsDashboardSpec } from '@/lib/cmsDashboardSpec';
import { LIS_ROLE_SPECS, getLisDashboardSpec } from '@/lib/lisDashboardSpec';
import { RIS_ROLE_SPECS, getRisDashboardSpec } from '@/lib/risDashboardSpec';
import { getPlatformDashboardSpec, getAllPlatformRoles } from '@/lib/platformTrustDashboardSpec';
import { getMarketplaceDashboardSpec, getAllMarketplaceRoles } from '@/lib/marketplaceDashboardSpec';
import UniversalHmsDashboard from './UniversalHmsDashboard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function readEnumRoles() {
  const src = readFileSync(resolvePath(process.cwd(), '../backend/src/models/User.js'), 'utf8');
  const enumBlock = src.match(/enum:\s*\[([\s\S]*?)\n\s*\]/);
  if (!enumBlock) throw new Error('Could not locate role enum in backend/src/models/User.js');
  return [...enumBlock[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

const PLATFORM_ROLES = new Set(getAllPlatformRoles());
const MARKETPLACE_ROLES = new Set(getAllMarketplaceRoles());

const isLisRole = (role) =>
  role.startsWith('lab_') ||
  [
    'pathologist', 'phlebotomist', 'biochem_tech', 'hematology_tech',
    'clinical_pathology_tech', 'microbiology_tech', 'histopathology_tech',
    'cytology_tech', 'serology_tech', 'molecular_tech', 'analyzer_staff',
    'home_collection_staff', 'report_coordinator',
  ].includes(role);

const isRisRole = (role) =>
  role.startsWith('radiology_') ||
  [
    'radiologist', 'mri_technician', 'xray_technician', 'ct_technician',
    'us_technician', 'mammo_technician', 'pacs_admin', 'reporting_assistant',
    'equipment_manager',
  ].includes(role);

const isClinicRole = (role) => role.startsWith('clinic_') || role === 'super_admin';

/** Mirrors UniversalHmsDashboard's dispatch order. */
function resolveRoleDashboard(role) {
  if (isClinicRole(role)) {
    const spec = getCmsDashboardSpec(role);
    return spec ? { spec, family: 'cms', dedicated: Boolean(CMS_ROLE_SPECS[role]) } : null;
  }
  if (isLisRole(role)) {
    const spec = getLisDashboardSpec(role);
    return spec ? { spec, family: 'lis', dedicated: Boolean(LIS_ROLE_SPECS[role]) } : null;
  }
  if (isRisRole(role)) {
    const spec = getRisDashboardSpec(role);
    return spec ? { spec, family: 'ris', dedicated: Boolean(RIS_ROLE_SPECS[role]) } : null;
  }
  const hms = getHmsDashboardSpec(role);
  if (hms) return { spec: hms, family: 'hms', dedicated: Boolean(HMS_ROLE_SPECS[role]) };
  const platform = getPlatformDashboardSpec(role);
  if (platform) return { spec: platform, family: 'platform', dedicated: PLATFORM_ROLES.has(role) };
  const marketplace = getMarketplaceDashboardSpec(role);
  if (marketplace) {
    return { spec: marketplace, family: 'marketplace', dedicated: MARKETPLACE_ROLES.has(role) };
  }
  return null;
}

/**
 * Intentional legacy synonyms. Each of these is allowed to reuse a canonical
 * role's spec (e.g. `counselor` is the deprecated spelling of `counsellor`).
 * Anything not on this list must have its own dedicated spec.
 */
const ALLOWED_ALIASES = new Set([
  'lab_owner',
  'counselor',
  'dental_clinic_admin',
  'optical_shop_owner',
  'yoga_instructor',
  'trainer',
  'therapist',
  'product_vendor',
  'clinic_telemed_coordinator',
  'front_desk',
  'insurance_desk',
  'kitchen_staff',
]);

const MODULE_FAMILIES = new Set(['hms', 'platform', 'marketplace', 'lis', 'ris']);

describe('Role dashboard coverage (all User.role enum values)', () => {
  const roles = readEnumRoles();

  it('parses the backend role enum', () => {
    expect(roles.length).toBeGreaterThanOrEqual(170);
    expect(roles).toContain('hospital_admin');
    expect(roles).toContain('lawyer');
  });

  it('resolves every enum role to a dashboard spec', () => {
    const unresolved = roles.filter((role) => !resolveRoleDashboard(role));
    expect(unresolved).toEqual([]);
  });

  it('only documented legacy aliases reuse another role spec', () => {
    const aliased = roles.filter((role) => {
      const resolved = resolveRoleDashboard(role);
      return resolved && !resolved.dedicated;
    });
    expect(aliased.sort()).toEqual([...ALLOWED_ALIASES].sort());
  });

  it('never routes non-lab roles to the LIS/RIS manager blueprints', () => {
    const lisManager = resolveRoleDashboard('lab_manager');
    const risManager = resolveRoleDashboard('radiology_manager');
    const nonLabRoles = roles.filter((role) => !isLisRole(role) && !isRisRole(role) && !isClinicRole(role));

    for (const role of nonLabRoles) {
      const resolved = resolveRoleDashboard(role);
      expect(resolved).not.toBeNull();
      expect(resolved.family).not.toBe('lis');
      expect(resolved.family).not.toBe('ris');
      expect(resolved.spec.roleKey).not.toBe(lisManager.spec.roleKey);
      expect(resolved.spec.roleKey).not.toBe(risManager.spec.roleKey);
    }
  });

  it('gives every role enough content to render a real dashboard', () => {
    const shallow = [];
    for (const role of roles) {
      const resolved = resolveRoleDashboard(role);
      expect(resolved).not.toBeNull();
      if (!resolved) continue;
      const { spec, family } = resolved;
      const counts = {
        kpis: (spec.kpis || []).length,
        tasks: (spec.tasks || []).length,
        alerts: (spec.alerts || []).length,
        queues: (spec.workQueues || []).length,
        actions: (spec.quickActions || []).length,
      };
      if (
        counts.kpis < 4 ||
        counts.tasks < 2 ||
        counts.alerts < 2 ||
        counts.queues < 3 ||
        counts.actions < 3
      ) {
        shallow.push({ role, family, ...counts });
      }
      if (MODULE_FAMILIES.has(family)) {
        expect((spec.domainModules || []).length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(shallow).toEqual([]);
  });

  it('defines a sidebar menu for every enum role', () => {
    const sideSrc = readFileSync(resolvePath(process.cwd(), 'src/components/AppSidebar.tsx'), 'utf8');
    const start = sideSrc.indexOf('const navConfig = {');
    const end = sideSrc.indexOf('\n};', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = sideSrc.slice(start, end);
    const keys = new Set([...block.matchAll(/^\s{2}([a-z0-9_]+):/gm)].map((m) => m[1]));
    expect(roles.filter((role) => !keys.has(role))).toEqual([]);
  });

  it('menuRouteParity: every sidebar entry that matches a RoleRoute route admits the role', () => {
    const appSrc = readFileSync(resolvePath(process.cwd(), 'src/App.tsx'), 'utf8');
    const sideSrc = readFileSync(resolvePath(process.cwd(), 'src/components/AppSidebar.tsx'), 'utf8');

    const constants = {};
    for (const m of appSrc.matchAll(/const ([A-Z_]+) = \[([^\]]*)\];/g)) {
      constants[m[1]] = [...m[2].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
    }

    const routeMap = new Map();
    for (const line of appSrc.split('\n')) {
      const m = line.match(/<Route path="(\/[^"]+)" element=\{<RoleRoute allowedRoles=\{(\[[^\]]*\]|[A-Z_]+)\}/);
      if (!m) continue;
      const allowed = m[2].startsWith('[')
        ? [...m[2].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1])
        : constants[m[2]] || [];
      const list = routeMap.get(m[1]) || [];
      for (const r of allowed) if (!list.includes(r)) list.push(r);
      routeMap.set(m[1], list);
    }

    const matchRoute = (path) => {
      const segs = path.split('/').filter(Boolean);
      let best = null;
      let bestScore = -1;
      for (const [rp, roles] of routeMap) {
        if (rp.includes('*')) continue;
        const rsegs = rp.split('/').filter(Boolean);
        if (rsegs.length !== segs.length) continue;
        let ok = true;
        let score = 0;
        for (let i = 0; i < rsegs.length; i++) {
          if (rsegs[i].startsWith(':') || rsegs[i].includes('?')) continue;
          if (rsegs[i] !== segs[i]) { ok = false; break; }
          score += 1;
        }
        if (ok && score > bestScore) { best = roles; bestScore = score; }
      }
      return best;
    };

    const start = sideSrc.indexOf('const navConfig = {');
    const end = sideSrc.indexOf('\n};', start);
    const body = sideSrc.slice(start, end);
    const violations = [];
    let role = null;
    for (const line of body.split('\n')) {
      const key = line.match(/^ {2}([a-z0-9_]+): /);
      if (key) role = key[1];
      const item = line.match(/\{ icon: .*?\bpath: '([^']+)'.*\}/);
      if (!item || !role) continue;
      const match = matchRoute(item[1].split('?')[0]);
      if (match && !match.includes(role)) violations.push(`${role} -> ${item[1]}`);
    }
    expect(violations).toEqual([]);
  });

  it('has no orphan dashboard components outside the router', () => {
    const appSrc = readFileSync(resolvePath(process.cwd(), 'src/App.tsx'), 'utf8');
    const dashboardFiles = readdirSync(resolvePath(process.cwd(), 'src/pages/dashboards')).filter((file) =>
      file.endsWith('Dashboard.tsx'),
    );
    const orphans = dashboardFiles.filter((file) => !appSrc.includes(file.replace(/\.tsx$/, '')));
    expect(dashboardFiles.length).toBeGreaterThan(0);
    expect(orphans).toEqual([]);
  });

  it('renders a lawyer dashboard instead of a laboratory blueprint', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboards/lawyer']}>
        <Routes>
          <Route path="/dashboards/:roleKey" element={<UniversalHmsDashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('universal-hms-dashboard')).toHaveAttribute('data-role-key', 'lawyer');
    expect(screen.queryAllByText(/Laboratory Main Operations/i)).toHaveLength(0);
    expect(screen.queryAllByText(/lab_manager/i)).toHaveLength(0);
  });
});
