/**
 * 8.md 1 + 7.md 4: the ops console's least-privilege contract.
 *
 * Eight roles run the console - kyc_reviewer, moderator, support_agent,
 * finance_admin, catalog_manager, compliance_officer, content_editor,
 * city_manager - and the whole point of §1 is that NONE of them gets god mode.
 * That claim is only true if three things stay in sync, so all three are
 * pinned here:
 *
 *   1. the PERMISSION rows (config/permissions.js) are exact - `support_agent`
 *      holds support:read/write but deliberately not support:manage;
 *      `finance_admin` may approve a payout but not create or pay one;
 *   2. the ROUTE guards name BOTH superadmin and their ops role, so widening a
 *      console can never quietly drop superadmin from the gate - and a role
 *      never appears in a console it does not own;
 *   3. the UI half (RoleRoute allowedRoles in App.tsx) agrees with the API
 *      half, so an ops user is not shown a page their token cannot load.
 *
 * Plus 8.md 13's mandatory 2FA, which for these roles must be code-level
 * rather than an env var an operator remembers to export.
 *
 * Deliberately NOT duplicated here:
 *   - checkPermissionMatrix.mjs  - every permission string is declared
 *   - check-authz-coverage.mjs   - every route carries an authorization tag
 *   - authMatrix.spec.js         - authorize()/platformAdminOnly semantics
 *   - adminApplications.spec.js  - the KYC queue's own behaviour
 *   - opsRoleRouteGates.spec.js  - a mounted router deciding by role over HTTP
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANONICAL_ROLES, ROLE_PERMISSIONS, MANDATORY_TWO_FACTOR_ROLES, OPS_ROLES,
  roleHasPermission, canonicalRole,
} from '../../src/config/permissions.js';
import { authorize } from '../../src/middleware/authorize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '..', '..');
const REPO = path.resolve(BACKEND, '..');

const read = (file) => fs.readFileSync(file, 'utf8');
const routeSrc = (file) => read(path.join(BACKEND, 'src', 'routes', file));

/**
 * 7.md §4 written out as data: the exact slice each role owns. Pinned exactly
 * (not "has some permissions") so an accidental extra grant fails here instead
 * of shipping as a quiet privilege escalation.
 */
const EXPECTED = {
  kyc_reviewer: ['applications:read', 'applications:decide', 'documents:read'],
  moderator: ['moderation:read', 'moderation:write'],
  support_agent: ['support:read', 'support:write'],
  finance_admin: ['commission:read', 'payouts:read', 'payouts:approve'],
  catalog_manager: [
    'categories:read', 'categories:write', 'provider-types:read', 'provider-types:write',
  ],
  compliance_officer: [
    'audit:read', 'dsr:read', 'dsr:approve', 'licenses:read', 'licenses:write',
  ],
  content_editor: ['content:read', 'content:write'],
  city_manager: ['cities:read', 'cities:write', 'service-cities:read', 'service-cities:write'],
};

describe('8.md 1 · the ops roles are first-class rows in the canonical matrix', () => {
  it.each(OPS_ROLES)('%s is canonical (an alias would deny it everything)', (role) => {
    expect(CANONICAL_ROLES).toContain(role);
    expect(canonicalRole(role)).toBe(role);
    expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
  });

  it('keeps superadmin the only wildcard - no ops role inherits god mode', () => {
    expect(ROLE_PERMISSIONS.superadmin).toContain('*');
    for (const role of OPS_ROLES) {
      expect(ROLE_PERMISSIONS[role]).not.toContain('*');
    }
  });

  it.each(Object.entries(EXPECTED))('%s holds exactly its own slice', (role, permissions) => {
    expect([...ROLE_PERMISSIONS[role]].sort()).toEqual([...permissions].sort());
  });

  it('does not grant console work to the roles that must not have it', () => {
    // A patient/doctor/staff account must not acquire platform capability by
    // accident, and one ops role must not pick up another's authority.
    expect(roleHasPermission('patient', 'audit:read')).toBe(false);
    expect(roleHasPermission('doctor', 'payouts:approve')).toBe(false);
    expect(roleHasPermission('support_agent', 'support:manage')).toBe(false);
    expect(roleHasPermission('support_agent', 'audit:read')).toBe(false);
    expect(roleHasPermission('moderator', 'audit:read')).toBe(false);
    expect(roleHasPermission('moderator', 'payouts:approve')).toBe(false);
    expect(roleHasPermission('finance_admin', 'audit:read')).toBe(false);
    expect(roleHasPermission('finance_admin', 'categories:write')).toBe(false);
    expect(roleHasPermission('kyc_reviewer', 'support:read')).toBe(false);
    expect(roleHasPermission('city_manager', 'audit:read')).toBe(false);
    // Tenant-admin powers stay with the tenant admin.
    for (const role of OPS_ROLES) {
      expect(roleHasPermission(role, 'insurance:write')).toBe(false);
    }
  });
});

// Mirrors authMatrix.spec.js: the decision paths of the REAL authorize(), not
// the harness's substitution of it (the harness proves a guard is in the
// chain; only the real middleware can prove how it decides).
const run = (mw, req) => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(b) { this.body = b; return this; },
    setHeader() { return this; },
  };
  let nextCalled = false;
  mw(req, res, (err) => { if (err) throw err; nextCalled = true; });
  return { nextCalled, statusCode: res.statusCode, body: res.body };
};

const reqAs = (role) => ({ user: { id: `${role}-1`, role }, originalUrl: '/api/ops-probe' });

describe('7.md 4 · permission-gated consoles decide through the real authorize()', () => {
  it('lets a support_agent read and reply, but not manage, a ticket', () => {
    expect(run(authorize('support:read'), reqAs('support_agent')).nextCalled).toBe(true);
    expect(run(authorize('support:write'), reqAs('support_agent')).nextCalled).toBe(true);
    const manage = run(authorize('support:manage'), reqAs('support_agent'));
    expect(manage.nextCalled).toBe(false);
    expect(manage.statusCode).toBe(403);
  });

  it('lets a compliance_officer read the audit log but nothing else', () => {
    expect(run(authorize('audit:read'), reqAs('compliance_officer')).nextCalled).toBe(true);
    for (const permission of ['support:manage', 'payouts:approve', 'insurance:write']) {
      expect(run(authorize(permission), reqAs('compliance_officer')).statusCode).toBe(403);
    }
  });

  it('denies one ops role the permission of another', () => {
    expect(run(authorize('payouts:approve'), reqAs('finance_admin')).nextCalled).toBe(true);
    expect(run(authorize('payouts:approve'), reqAs('support_agent')).statusCode).toBe(403);
    expect(run(authorize('categories:write'), reqAs('catalog_manager')).nextCalled).toBe(true);
    expect(run(authorize('categories:write'), reqAs('kyc_reviewer')).statusCode).toBe(403);
  });

  it('still lets superadmin through every ops permission', () => {
    for (const permission of ['support:manage', 'audit:read', 'payouts:approve']) {
      expect(run(authorize(permission), reqAs('superadmin')).nextCalled).toBe(true);
    }
  });

  it('keeps the 403 body generic for an ops role (AUTHZ-B-03)', () => {
    const r = run(authorize('support:manage'), reqAs('support_agent'));
    expect(r.statusCode).toBe(403);
    expect(r.body).toEqual({ message: 'Insufficient permissions' });
  });
});

/**
 * The guard line for a route, or a failing test that names the route it could
 * not find - a source pin that silently matches nothing would be worse than no
 * pin at all.
 */
const gate = (file, needle) => {
  const line = routeSrc(file).split('\n').find((l) => l.includes(needle));
  if (!line) throw new Error(`${file}: no line containing ${JSON.stringify(needle)}`);
  return line;
};

describe('8.md 2 · every KYC queue names superadmin + kyc_reviewer', () => {
  const KYC = [
    ['adminApplications.js', 'router.use(protect,', 'the whole review queue'],
    ['hospitals.js', "router.get('/pending'", 'hospital pending queue'],
    ['hospitals.js', "router.put('/:id/approve'", 'hospital approve'],
    ['hospitals.js', "router.put('/:id/reject'", 'hospital reject'],
    ['facilities.js', "router.get('/pending'", 'facility pending queue'],
    ['facilities.js', "router.put('/:id/approve'", 'facility approve'],
    ['facilities.js', "router.put('/:id/reject'", 'facility reject'],
    ['adminRiders.js', 'router.use(protect,', 'rider router'],
    ['adminRiders.js', "router.get('/pending'", 'rider pending queue'],
    ['adminRiders.js', "router.put('/:id/approve'", 'rider approve'],
    ['adminRiders.js', "router.put('/:id/reject'", 'rider reject'],
    ['adminAssistants.js', 'router.use(protect,', 'assistant router'],
    ['adminAssistants.js', "router.get('/pending'", 'assistant pending queue'],
    ['adminAssistants.js', "router.put('/:id/approve'", 'assistant approve'],
    ['adminAssistants.js', "router.put('/:id/reject'", 'assistant reject'],
    ['adminLawyers.js', 'router.use(protect,', 'lawyer router'],
    ['adminLawyers.js', "router.get('/pending'", 'lawyer pending queue'],
    ['adminLawyers.js', "router.put('/:id/approve'", 'lawyer approve'],
    ['adminLawyers.js', "router.put('/:id/reject'", 'lawyer reject'],
    ['deliveryPartners.js', "'/:id/verify'", 'delivery-partner verification'],
  ];

  it.each(KYC)('%s · %s (%s)', (file, needle, _what) => {
    const line = gate(file, needle);
    expect(line).toContain("'superadmin'");
    expect(line).toContain("'kyc_reviewer'");
  });

  it('leaves suspension and the analytics lanes with superadmin', () => {
    expect(gate('hospitals.js', "router.put('/:id/suspend'")).toContain('superadminOnly');
    expect(gate('facilities.js', "router.put('/:id/suspend'")).toContain('superadminOnly');
    for (const file of ['adminRiders.js', 'adminAssistants.js', 'adminLawyers.js']) {
      expect(gate(file, "'/:id/suspend'")).toContain('platformAdminOnly');
      expect(gate(file, "'/analytics'")).toContain('platformAdminOnly');
    }
  });
});

describe('8.md 5 · the moderation queue names superadmin + moderator', () => {
  const MODERATION = [
    ["router.get('/', protect,", 'the queue list'],
    ["router.put('/:id/flag'", 'flag'],
    ["router.put('/:id/unflag'", 'unflag'],
  ];

  it.each(MODERATION)('%s (%s)', (needle, _what) => {
    const line = gate('reviewModeration.js', needle);
    expect(line).toContain("'superadmin'");
    expect(line).toContain("'moderator'");
  });

  it('keeps destructive review removal superadmin-only', () => {
    expect(gate('reviewModeration.js', "router.delete('/:id'")).toContain('superadminOnly');
  });
});

describe('8.md 8 · the finance console may read and approve, never authorise', () => {
  const FINANCE = [
    ["router.get('/config'", 'commission config read'],
    ["router.get('/ledger'", 'ledger read'],
    ["router.get('/tax-summary'", 'tax summary read'],
    ["router.get('/payouts'", 'payout queue read'],
    ["router.put('/payouts/:id/approve'", 'payout approval (second pair of eyes)'],
    ["router.get('/stats'", 'stats read'],
  ];

  it.each(FINANCE)('%s names superadmin + finance_admin (%s)', (needle, _what) => {
    const line = gate('commission.js', needle);
    expect(line).toContain("'superadmin'");
    expect(line).toContain("'finance_admin'");
  });

  it('leaves every money-moving write with superadmin', () => {
    // A finance_admin must never be able to authorise its own payout: it can
    // approve (the second pair of eyes) but not create, not pay, not edit the
    // split it is paid from, and not run the recon report.
    expect(gate('commission.js', "router.put('/config/:id'")).toContain('superadminOnly');
    expect(gate('commission.js', "router.post('/payouts'")).toContain('superadminOnly');
    expect(gate('commission.js', "router.put('/payouts/:id/pay'")).toContain('superadminOnly');
    expect(routeSrc('commission.js')).toContain("router.get('/recon', protect, superadminOnly,");
  });
});

describe('8.md 4 · catalog and city consoles name their ops role', () => {
  const CATALOG = [
    ['categories.js', "router.get('/', protect,", 'category list'],
    ['categories.js', "router.post('/', protect,", 'category create'],
    ['categories.js', "router.put('/:id', protect,", 'category edit'],
    ['categories.js', "router.delete('/:id'", 'category delete'],
    ['categories.js', "router.post('/merge'", 'category merge'],
    ['adminProviderTypes.js', 'router.use(protect,', 'provider-type configs (whole router)'],
  ];

  it.each(CATALOG)('%s · %s names superadmin + catalog_manager', (file, needle, _what) => {
    const line = gate(file, needle);
    expect(line).toContain("'superadmin'");
    expect(line).toContain("'catalog_manager'");
  });

  const CITIES = [
    ['cities.js', "router.post('/', protect,", 'city create'],
    ['cities.js', "router.put('/:id', protect,", 'city edit'],
    ['serviceCities.js', "router.post('/', protect,", 'service-city create'],
    ['serviceCities.js', "router.put('/:id', protect,", 'service-city edit'],
  ];

  it.each(CITIES)('%s · %s names superadmin + city_manager', (file, needle, _what) => {
    const line = gate(file, needle);
    expect(line).toContain("'superadmin'");
    expect(line).toContain("'city_manager'");
  });

  it('leaves city deletion with superadmin', () => {
    expect(gate('cities.js', "router.delete('/:id'")).toContain('superadminOnly');
  });
});

describe('8.md 11 · compliance and content consoles', () => {
  const COMPLIANCE = [
    ["router.get('/', protect,", 'licence list'],
    ["router.put('/:id', protect,", 'licence edit'],
    ["router.get('/expiring'", 'expiry watch'],
    ["router.get('/stats'", 'licence stats'],
  ];

  it.each(COMPLIANCE)('%s (%s) names superadmin + compliance_officer', (needle, _what) => {
    const line = gate('licenses.js', needle);
    expect(line).toContain("'superadmin'");
    expect(line).toContain("'compliance_officer'");
  });

  it('lets the compliance officer investigate DSRs but not erase anyone', () => {
    expect(routeSrc('deletionRequests.js')).toMatch(/isAdmin = \(role\) => .*compliance_officer/);
    // Four hands (8.md 11): approve and execute stay superadmin-only.
    expect(routeSrc('deletionRequests.js').split('\n').filter((l) => l.includes('router.post('))
      .filter((l) => l.includes('/approve') || l.includes('/execute')))
      .toHaveLength(2);
    for (const line of routeSrc('deletionRequests.js').split('\n')) {
      if (line.includes('/approve') || line.includes('/execute')) {
        expect(line).toContain('superadminOnly');
      }
    }
  });

  it('names superadmin + content_editor for the platform content write', () => {
    const line = gate('platformContent.js', "router.put('/:key'");
    expect(line).toContain("'superadmin'");
    expect(line).toContain("'content_editor'");
  });
});

describe('least privilege · an ops role never appears in a console it does not own', () => {
  const FORBIDDEN = [
    ['moderator', ['commission.js', 'categories.js', 'licenses.js', 'adminApplications.js', 'deletionRequests.js']],
    ['support_agent', ['commission.js', 'reviewModeration.js', 'adminApplications.js', 'cities.js', 'platformContent.js']],
    ['finance_admin', ['adminApplications.js', 'reviewModeration.js', 'categories.js', 'serviceCities.js']],
    ['kyc_reviewer', ['commission.js', 'reviewModeration.js', 'platformContent.js', 'deletionRequests.js']],
    ['catalog_manager', ['commission.js', 'reviewModeration.js', 'adminApplications.js', 'licenses.js']],
    ['compliance_officer', ['commission.js', 'categories.js', 'adminApplications.js']],
    ['city_manager', ['commission.js', 'adminApplications.js', 'reviewModeration.js', 'platformContent.js']],
    ['content_editor', ['adminApplications.js', 'commission.js', 'categories.js', 'cities.js']],
  ];

  it.each(FORBIDDEN)('%s stays out of consoles it does not own', (role, files) => {
    for (const file of files) {
      if (routeSrc(file).includes(`'${role}'`)) {
        throw new Error(`${role} must not be granted by ${file}`);
      }
    }
  });
});

describe('8.md 13 · 2FA is mandatory for ops roles at the code level', () => {
  it('every ops role is in the mandatory set, lowercase (it is matched after toLowerCase())', () => {
    expect(MANDATORY_TWO_FACTOR_ROLES.length).toBe(OPS_ROLES.length);
    for (const role of OPS_ROLES) {
      expect(MANDATORY_TWO_FACTOR_ROLES).toContain(role);
      expect(role).toBe(role.toLowerCase());
    }
  });

  it('middleware/auth.js unions that set into TWO_FACTOR_REQUIRED_ROLES', () => {
    const src = read(path.join(BACKEND, 'src', 'middleware', 'auth.js'));
    expect(src).toContain('...MANDATORY_TWO_FACTOR_ROLES');
    expect(src).toContain('TWO_FACTOR_REQUIRED_ROLES = new Set([');
    // The env still ADDS roles; it must never be the only source.
    expect(src).toContain('process.env.TWO_FACTOR_REQUIRED_ROLES');
  });

  it('keeps the ops roles out of self-service signup', () => {
    // routes/auth.js normalises an unknown role to `patient`; the ops roles
    // must never be listed as sign-up choices.
    const src = read(path.join(BACKEND, 'src', 'routes', 'auth.js'));
    const signupBlock = src.match(/SELF_SIGNUP_ROLES = \[[^\]]*\]/);
    if (!signupBlock) throw new Error('routes/auth.js should declare SELF_SIGNUP_ROLES');
    for (const role of OPS_ROLES) {
      expect(signupBlock[0]).not.toContain(`'${role}'`);
    }
  });
});

describe('the UI half agrees with the API half (RoleRoute allowedRoles)', () => {
  const appTsx = path.join(REPO, 'frontend', 'src', 'App.tsx');

  // path -> the ops role that must be allowed alongside superadmin.
  const CONSOLES = {
    '/superadmin/kyc-command': 'kyc_reviewer',
    '/superadmin/pending': 'kyc_reviewer',
    '/superadmin/moderation': 'moderator',
    '/superadmin/tickets': 'support_agent',
    '/superadmin/revenue': 'finance_admin',
    '/superadmin/tax-ledger': 'finance_admin',
    '/superadmin/categories': 'catalog_manager',
    '/superadmin/catalog': 'catalog_manager',
    '/superadmin/cities': 'city_manager',
    '/superadmin/audit': 'compliance_officer',
    '/superadmin/licenses': 'compliance_officer',
    '/superadmin/legal': 'content_editor',
  };

  const routeLine = (routePath) => {
    if (!fs.existsSync(appTsx)) throw new Error(`${appTsx} is missing`);
    const src = read(appTsx);
    const line = src.split('\n').find((l) => l.includes(`path="${routePath}"`));
    if (!line) throw new Error(`App.tsx has no route for ${routePath}`);
    return line;
  };

  it.each(Object.entries(CONSOLES))('%s is reachable by %s', (routePath, role) => {
    const line = routeLine(routePath);
    expect(line).toContain('<RoleRoute allowedRoles={[');
    expect(line).toContain("'superadmin'");
    expect(line).toContain(`'${role}'`);
  });

  it('keeps consoles shut for roles that do not own them', () => {
    const line = routeLine('/superadmin/audit');
    expect(line).not.toContain("'support_agent'");
    expect(line).not.toContain("'kyc_reviewer'");
    expect(routeLine('/superadmin/revenue')).not.toContain("'compliance_officer'");
    expect(routeLine('/superadmin/moderation')).not.toContain("'finance_admin'");
  });
});
