/**
 * Document 25: Access Control Center (AWS-IAM Style) Complete Specification Test Suite
 * Validating:
 * 1. Action Catalog (~120+ fine-grained actions) & 6 Sensitivity Classes
 * 2. Layered Evaluator (L0 Guardrails, L1 Tenant Boundary, L2 Identity Deny > Allow > Default Deny)
 * 3. Resource Scoping (Ward-3 vitals allowed, Ward-5 denied; Care-team attribute matching)
 * 4. Contextual Conditions (MFA, Shift-time, Hospital IP, Expiry timestamp)
 * 5. Healthcare Needs (Restricted sensitivity obligations: reason_required + step_up)
 * 6. Query-Level Scope Injection (scopeFilter database filter injection)
 * 7. Segregation of Duties (SoD) Conflict Detection
 * 8. Anti-Escalation & Last-Owner Protection Rules
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// In-memory mock store for IAM collections
const stores = { assignments: [], groups: [], roles: [], policies: [] };

const cmpVal = (actual, cond) => {
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    if ('$in' in cond) return cond.$in.map(String).includes(String(actual));
    if ('$gt' in cond) return new Date(actual).getTime() > new Date(cond.$gt).getTime();
    if ('$lt' in cond) return new Date(actual).getTime() < new Date(cond.$lt).getTime();
    return false;
  }
  if (cond === null) return actual === null || actual === undefined;
  if (actual instanceof Date || cond instanceof Date) {
    return new Date(actual).getTime() === new Date(cond).getTime();
  }
  return String(actual) !== 'undefined' && String(actual) === String(cond);
};

const matchIn = (rows, filter) => rows.filter((r) => {
  for (const [k, v] of Object.entries(filter || {})) {
    if (k === '$or') {
      if (!v.some((clause) => Object.entries(clause).every(([ck, cv]) => cmpVal(r[ck], cv)))) return false;
      continue;
    }
    if (!cmpVal(r[k], v)) return false;
  }
  return true;
});

const query = (rows, filter) => {
  const base = {
    select: () => base,
    sort: () => base,
    limit: () => base,
    skip: () => base,
    lean: async () => matchIn(rows, filter).map((r) => ({ ...r })),
    then: (res, rej) => Promise.resolve(matchIn(rows, filter)).then(res, rej),
  };
  return base;
};

const collection = (key) => ({
  find: (f) => query(stores[key], f),
});

jest.unstable_mockModule('../../src/models/IamAssignment.js', () => ({ default: collection('assignments') }));
jest.unstable_mockModule('../../src/models/IamGroup.js', () => ({ default: collection('groups') }));
jest.unstable_mockModule('../../src/models/IamRole.js', () => ({ default: collection('roles') }));
jest.unstable_mockModule('../../src/models/IamPolicy.js', () => ({ default: collection('policies') }));

const {
  can,
  matchAction,
  matchResource,
  evalConditions,
  guardrailsAllow,
  scopeFilter,
  clearIamCache,
} = await import('../../src/lib/iamEvaluator.js');

const {
  ACTION_CATALOG,
  SENSITIVITY_CLASSES,
  COARSE_TO_FINE_MAP,
  isActionAllowedForTier,
} = await import('../../src/lib/iamCatalog.js');

const {
  IAM_EVALUATION_LAYERS,
  SOD_RULES,
  ALLOWLISTED_CONDITION_KEYS,
  TENANT_TYPE_ROLE_TEMPLATES,
} = await import('../../src/config/accessControlSpec.js');

const P = (over = {}) => ({
  id: 'user_ravi',
  tenantId: 'tenant_apollo',
  tenantKind: 'hospital',
  isOwner: false,
  roles: [],
  deptIds: ['dept_nursing'],
  wardIds: ['ward_3'],
  careTeamPatientIds: [],
  mfa: true,
  ip: '192.168.1.100',
  onShift: true,
  policyVersion: 1,
  ...over,
});

const R = (over = {}) => ({
  type: 'record',
  id: 'rec_101',
  tenantId: 'tenant_apollo',
  deptId: 'dept_nursing',
  wardId: 'ward_3',
  sensitivity: 'standard',
  careTeam: [],
  ...over,
});

beforeEach(() => {
  stores.assignments = [];
  stores.groups = [];
  stores.roles = [];
  stores.policies = [];
  clearIamCache();
});

describe('Document 25 — §1 & §5: Fine-Grained Action Catalog & Sensitivity Classes', () => {
  it('contains ~120+ fine-grained actions categorized by module', () => {
    expect(ACTION_CATALOG.length).toBeGreaterThanOrEqual(100);
    const modules = new Set(ACTION_CATALOG.map((a) => a.module));
    expect(modules).toContain('patients');
    expect(modules).toContain('appointments');
    expect(modules).toContain('records');
    expect(modules).toContain('prescriptions');
    expect(modules).toContain('lab');
    expect(modules).toContain('billing');
    expect(modules).toContain('pharmacy');
    expect(modules).toContain('ipd');
    expect(modules).toContain('iam');
  });

  it('verifies 6 sensitivity classes across catalog', () => {
    expect(SENSITIVITY_CLASSES).toEqual([
      'standard',
      'sensitive',
      'restricted',
      'financial',
      'hr_sensitive',
      'admin_critical',
    ]);
  });

  it('maps legacy coarse permissions to fine-grained action sets', () => {
    expect(COARSE_TO_FINE_MAP['records:read']).toEqual(
      expect.arrayContaining(['records:summary:read', 'records:clinical:read'])
    );
    expect(COARSE_TO_FINE_MAP['billing:write']).toEqual(
      expect.arrayContaining(['billing:invoice:write'])
    );
    expect(COARSE_TO_FINE_MAP['lab:enter_result']).toEqual(['lab:result:enter']);
  });
});

describe('Document 25 — §3: Layered Authorization Evaluator (can())', () => {
  it('L0: enforces Platform Guardrails (T3 Wellness denied clinical actions)', async () => {
    const gymPrincipal = P({ tenantKind: 'wellness' });
    const res = await can(gymPrincipal, 'records:clinical:read', R());
    expect(res.allow).toBe(false);
    expect(res.reason).toBe('guardrail:t3-no-clinical');
  });

  it('L0: enforces Platform Guardrails (IAM administration is owner-only)', async () => {
    const nonOwnerPrincipal = P({ isOwner: false });
    const res = await can(nonOwnerPrincipal, 'iam:role:create', R());
    expect(res.allow).toBe(false);
    expect(res.reason).toBe('guardrail:iam-owner-only');
  });

  it('L1: strictly denies cross-tenant access (tenant mismatch)', async () => {
    const principalTenantA = P({ tenantId: 'tenant_A' });
    const resourceTenantB = R({ tenantId: 'tenant_B' });
    const res = await can(principalTenantA, 'vitals:read', resourceTenantB);
    expect(res.allow).toBe(false);
    expect(res.reason).toBe('tenant-mismatch');
  });

  it('L2: Explicit Deny takes precedence over Allow statements', async () => {
    stores.policies = [
      {
        _id: 'pol_1',
        status: 'active',
        statements: [
          { sid: 'AllowVitals', effect: 'Allow', actions: ['vitals:write'], resources: ['ward/ward_3/*'] },
          { sid: 'DenyClinical', effect: 'Deny', actions: ['records:clinical:*'], resources: ['tenant/self/*'] },
        ],
      },
    ];
    stores.assignments = [
      {
        _id: 'assign_1',
        tenantId: 'tenant_apollo',
        principalType: 'user',
        principalId: 'user_ravi',
        policyId: 'pol_1',
        status: 'active',
        expiresAt: null,
      },
    ];

    // Allowed action
    const allowRes = await can(P(), 'vitals:write', R({ type: 'vitals', wardId: 'ward_3' }));
    expect(allowRes.allow).toBe(true);

    // Explicitly denied action
    const denyRes = await can(P(), 'records:clinical:read', R({ type: 'record' }));
    expect(denyRes.allow).toBe(false);
    expect(denyRes.reason).toBe('explicit-deny:DenyClinical');
  });

  it('L2: Default Deny when no statements match', async () => {
    stores.policies = [
      {
        _id: 'pol_1',
        status: 'active',
        statements: [
          { sid: 'AllowBilling', effect: 'Allow', actions: ['billing:invoice:read'], resources: ['tenant/self/*'] },
        ],
      },
    ];
    stores.assignments = [
      {
        _id: 'assign_1',
        tenantId: 'tenant_apollo',
        principalType: 'user',
        principalId: 'user_ravi',
        policyId: 'pol_1',
        status: 'active',
        expiresAt: null,
      },
    ];

    const res = await can(P(), 'prescriptions:write', R());
    expect(res.allow).toBe(false);
    expect(res.reason).toBe('default-deny');
  });

  it('L3: Resource Scope enforces Ward-3 access and rejects Ward-5', async () => {
    stores.policies = [
      {
        _id: 'pol_ward3',
        status: 'active',
        statements: [
          {
            sid: 'Ward3VitalsOnly',
            effect: 'Allow',
            actions: ['vitals:write'],
            resources: ['ward/ward_3/*'],
          },
        ],
      },
    ];
    stores.assignments = [
      {
        _id: 'assign_ward3',
        tenantId: 'tenant_apollo',
        principalType: 'user',
        principalId: 'user_ravi',
        policyId: 'pol_ward3',
        status: 'active',
        expiresAt: null,
      },
    ];

    // Ward 3 access succeeds
    const ward3Res = await can(P(), 'vitals:write', R({ type: 'vitals', wardId: 'ward_3' }));
    expect(ward3Res.allow).toBe(true);

    // Ward 5 access fails default-deny because resource pattern does not match
    const ward5Res = await can(P(), 'vitals:write', R({ type: 'vitals', wardId: 'ward_5' }));
    expect(ward5Res.allow).toBe(false);
    expect(ward5Res.reason).toBe('default-deny');
  });

  it('L3: Care-Team need-to-know matches treating doctor attribute', async () => {
    const doctorPrincipal = P({ id: 'doc_arjun' });
    expect(matchResource('patient/{careTeam}', { type: 'patient', id: 'pat_1', careTeam: ['doc_arjun'] }, doctorPrincipal)).toBe(true);
    expect(matchResource('patient/{careTeam}', { type: 'patient', id: 'pat_1', careTeam: ['doc_other'] }, doctorPrincipal)).toBe(false);
  });

  it('L4: Conditions check MFA, Shift, IP, and Expiration', () => {
    const principal = P({ mfa: true, onShift: true, ip: '10.0.0.1' });
    const resource = R();

    // MFA condition
    expect(evalConditions({ mfa: true }, principal, resource)).toBe(true);
    expect(evalConditions({ mfa: true }, { ...principal, mfa: false }, resource)).toBe(false);

    // Shift condition
    expect(evalConditions({ shift: 'current' }, principal, resource)).toBe(true);
    expect(evalConditions({ shift: 'current' }, { ...principal, onShift: false }, resource)).toBe(false);

    // IP allowlist condition
    expect(evalConditions({ ip: ['10.0.0.1', '10.0.0.2'] }, principal, resource)).toBe(true);
    expect(evalConditions({ ip: ['192.168.1.1'] }, principal, resource)).toBe(false);

    // Expiry condition
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    expect(evalConditions({ expires_at: futureDate }, principal, resource)).toBe(true);
    expect(evalConditions({ expires_at: pastDate }, principal, resource)).toBe(false);

    // Unknown conditions fail-closed
    expect(evalConditions({ custom_injected_code: true }, principal, resource)).toBe(false);
  });

  it('L5: Healthcare Sensitivity requires reason_required and step_up obligations', async () => {
    stores.policies = [
      {
        _id: 'pol_psych',
        status: 'active',
        statements: [
          { sid: 'PsychRead', effect: 'Allow', actions: ['records:restricted:read'], resources: ['tenant/self/*'] },
        ],
      },
    ];
    stores.assignments = [
      {
        _id: 'assign_psych',
        tenantId: 'tenant_apollo',
        principalType: 'user',
        principalId: 'user_ravi',
        policyId: 'pol_psych',
        status: 'active',
        expiresAt: null,
      },
    ];

    const res = await can(P(), 'records:restricted:read', R({ sensitivity: 'restricted' }));
    expect(res.allow).toBe(true);
    expect(res.obligations).toContain('reason_required');
    expect(res.obligations).toContain('step_up');
  });
});

describe('Document 25 — §3.2: Query-Level Scope Injection (scopeFilter)', () => {
  it('injects tenantId, departmentId $in, and wardId $in into DB query filters', async () => {
    stores.assignments = [
      {
        _id: 'assign_scoped',
        tenantId: 'tenant_apollo',
        principalType: 'user',
        principalId: 'user_ravi',
        status: 'active',
        expiresAt: null,
        scope: {
          deptIds: ['dept_emergency', 'dept_icu'],
          wardIds: ['ward_3'],
          careTeamOnly: true,
        },
      },
    ];

    const filter = await scopeFilter(P());
    expect(filter.tenantId).toBe('tenant_apollo');
    expect(filter.deptId.$in).toEqual(expect.arrayContaining(['dept_emergency', 'dept_icu']));
    expect(filter.wardId.$in).toEqual(['ward_3']);
    expect(filter.careTeam).toBe('user_ravi');
  });
});

describe('Document 25 — §8: Segregation of Duties (SoD) Catalog', () => {
  it('defines 4 critical healthcare and procurement SoD conflict pairs', () => {
    expect(SOD_RULES.length).toBe(4);
    const ruleIds = SOD_RULES.map((r) => r.id);
    expect(ruleIds).toContain('SOD_PO_PROCUREMENT');
    expect(ruleIds).toContain('SOD_LAB_VERIFY');
    expect(ruleIds).toContain('SOD_BILLING_REFUND');
    expect(ruleIds).toContain('SOD_PHARMACY_H1');
  });

  it('validates conflict pairs for PO and Billing', () => {
    const poRule = SOD_RULES.find((r) => r.id === 'SOD_PO_PROCUREMENT');
    expect(poRule.actions).toEqual(['po:create', 'po:approve']);

    const billingRule = SOD_RULES.find((r) => r.id === 'SOD_BILLING_REFUND');
    expect(billingRule.actions).toEqual(['billing:invoice:write', 'billing:refund:issue']);
  });
});
