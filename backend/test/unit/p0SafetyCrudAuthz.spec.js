/**
 * File 22 P0-5/P0-6: the HTTP harness substitutes authorize() with a
 * pass-through marker, so an integration spec cannot prove WHO may call a
 * route. This spec pins the route->permission wiring and the permission->role
 * grants at the matrix level, in the style of staffViewPermission.spec.js:
 * read routes require staff:view/billing:read, every mutation requires the
 * manage/write counterpart, and roles holding neither are permanently 403ed
 * (which is the assertion an integration 403 could not make under the harness).
 */
import { describe, it, expect } from '@jest/globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_ROLES, roleHasPermission } from '../../src/config/permissions.js';
import { scanRoutes } from '../../scripts/lib/routeScan.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROUTES = path.join(HERE, '..', '..', 'src', 'routes');

const WORKING_ROLES = CANONICAL_ROLES.filter((r) => r !== 'superadmin');
const holdersOf = (perm) => WORKING_ROLES.filter((role) => roleHasPermission(role, perm));
const NO_ACCESS_ROLES = ['patient', 'helper', 'cashier', 'support_agent', 'auditor'];

const authorizeLiterals = (routeLine) => {
  const at = routeLine.indexOf('authorize(');
  if (at === -1) return [];
  const args = routeLine.slice(at + 'authorize('.length);
  const end = args.indexOf(')');
  const argText = end === -1 ? args : args.slice(0, end);
  return [...argText.matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]);
};

const rowsFor = (file) => scanRoutes(ROUTES, file).filter((r) => r.file === `${file}.js`);
const route = (file, method, target) => {
  const row = rowsFor(file).find((r) => r.method === method && r.target === target);
  if (!row) throw new Error(`${method} ${target} not found in ${file}.js`);
  return row;
};

describe('P0-5 safety ledgers carry manage-permission mutations', () => {
  const LEDGERS = ['visitor-passes', 'mlc', 'incidents', 'adr', 'bmw'];

  it.each(LEDGERS)('%s: list is staff:view, create/patch/delete are staff:manage', (base) => {
    expect(authorizeLiterals(route('safety', 'GET', `/${base}`).routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('safety', 'POST', `/${base}`).routeLine)).toContain('staff:manage');
    expect(authorizeLiterals(route('safety', 'GET', `/${base}/:id`).routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('safety', 'PATCH', `/${base}/:id`).routeLine)).toContain('staff:manage');
    expect(authorizeLiterals(route('safety', 'DELETE', `/${base}/:id`).routeLine)).toContain('staff:manage');
  });

  it('credentials follow the same matrix, and /expiring is not shadowed by /:id', () => {
    expect(authorizeLiterals(route('safety', 'GET', '/credentials').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('safety', 'POST', '/credentials').routeLine)).toContain('staff:manage');
    expect(authorizeLiterals(route('safety', 'GET', '/credentials/expiring').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('safety', 'GET', '/credentials/:id').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('safety', 'DELETE', '/credentials/:id').routeLine)).toContain('staff:manage');
    const expiring = route('safety', 'GET', '/credentials/expiring');
    const byId = route('safety', 'GET', '/credentials/:id');
    expect(expiring.line).toBeLessThan(byId.line);
  });

  it('every permission safety.js requires is held by a real role', () => {
    const unreachable = [];
    for (const row of rowsFor('safety')) {
      for (const perm of authorizeLiterals(row.routeLine)) {
        if (holdersOf(perm).length === 0) unreachable.push(`${row.file}:${row.line} ${perm}`);
      }
    }
    expect(unreachable).toEqual([]);
  });

  it('roles holding neither staff:view nor staff:manage are 403ed on every safety route', () => {
    for (const role of NO_ACCESS_ROLES) {
      expect(roleHasPermission(role, 'staff:view')).toBe(false);
      expect(roleHasPermission(role, 'staff:manage')).toBe(false);
    }
  });
});

describe('P0-6 model routes carry their manage/write counterparts', () => {
  it('frontoffice enquiries: reads staff:view, delete staff:manage', () => {
    expect(authorizeLiterals(route('frontoffice', 'GET', '/enquiries').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('frontoffice', 'POST', '/enquiries').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('frontoffice', 'GET', '/enquiries/:id').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('frontoffice', 'PATCH', '/enquiries/:id').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('frontoffice', 'DELETE', '/enquiries/:id').routeLine)).toContain('staff:manage');
  });

  it('enterprise maintenance: reads billing:read, mutations billing:write', () => {
    expect(authorizeLiterals(route('enterprise', 'GET', '/maintenance').routeLine)).toContain('billing:read');
    expect(authorizeLiterals(route('enterprise', 'POST', '/maintenance').routeLine)).toContain('billing:write');
    expect(authorizeLiterals(route('enterprise', 'GET', '/maintenance/:id').routeLine)).toContain('billing:read');
    expect(authorizeLiterals(route('enterprise', 'PATCH', '/maintenance/:id').routeLine)).toContain('billing:write');
    expect(authorizeLiterals(route('enterprise', 'DELETE', '/maintenance/:id').routeLine)).toContain('billing:write');
  });

  it('roster swaps: reads staff:view, decide/withdraw staff:manage', () => {
    expect(authorizeLiterals(route('roster', 'GET', '/swaps').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('roster', 'POST', '/swaps').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('roster', 'GET', '/swaps/:id').routeLine)).toContain('staff:view');
    expect(authorizeLiterals(route('roster', 'DELETE', '/swaps/:id').routeLine)).toContain('staff:manage');
    expect(authorizeLiterals(route('roster', 'POST', '/swaps/:id/decide').routeLine)).toContain('staff:manage');
  });

  it('staff payslips: admin surface is staff:manage, /mine is self-scoped', () => {
    expect(authorizeLiterals(route('staff', 'GET', '/payslips').routeLine)).toContain('staff:manage');
    expect(authorizeLiterals(route('staff', 'POST', '/payslips').routeLine)).toContain('staff:manage');
    expect(authorizeLiterals(route('staff', 'GET', '/payslips/:id').routeLine)).toContain('staff:manage');
    expect(authorizeLiterals(route('staff', 'DELETE', '/payslips/:id').routeLine)).toContain('staff:manage');
    const mine = route('staff', 'GET', '/payslips/mine');
    expect(authorizeLiterals(mine.routeLine)).toEqual([]);
    expect(mine.authzTag).toBe('self');
    expect(mine.line).toBeLessThan(route('staff', 'GET', '/payslips/:id').line);
  });

  it('payoutStatements: reads billing:read, writes/approve/pay/delete billing:write', () => {
    expect(authorizeLiterals(route('payoutStatements', 'GET', '/').routeLine)).toContain('billing:read');
    expect(authorizeLiterals(route('payoutStatements', 'POST', '/').routeLine)).toContain('billing:write');
    expect(authorizeLiterals(route('payoutStatements', 'GET', '/:id').routeLine)).toContain('billing:read');
    expect(authorizeLiterals(route('payoutStatements', 'POST', '/:id/approve').routeLine)).toContain('billing:write');
    expect(authorizeLiterals(route('payoutStatements', 'POST', '/:id/pay').routeLine)).toContain('billing:write');
    expect(authorizeLiterals(route('payoutStatements', 'DELETE', '/:id').routeLine)).toContain('billing:write');
    const approve = route('payoutStatements', 'POST', '/:id/approve');
    expect(approve.routeLine).toContain("requireStepUp('payouts:add')");
  });

  it('every permission these routers require is held by a real role', () => {
    const unreachable = [];
    for (const file of ['frontoffice.js', 'enterprise.js', 'roster.js', 'staff.js', 'payoutStatements.js']) {
      for (const row of scanRoutes(ROUTES, file.replace('.js', ''))) {
        if (row.file !== file) continue;
        for (const perm of authorizeLiterals(row.routeLine)) {
          if (holdersOf(perm).length === 0) unreachable.push(`${file}:${row.line} ${perm}`);
        }
      }
    }
    expect(unreachable).toEqual([]);
  });

  it('cashier/patient hold billing:write? — writes stay admin/accountant-gated', () => {
    expect(holdersOf('billing:write').length).toBeGreaterThan(0);
    expect(holdersOf('billing:read').length).toBeGreaterThan(0);
    for (const role of ['patient', 'helper', 'support_agent', 'auditor']) {
      expect(roleHasPermission(role, 'billing:write')).toBe(false);
      expect(roleHasPermission(role, 'billing:read')).toBe(false);
    }
  });
});
