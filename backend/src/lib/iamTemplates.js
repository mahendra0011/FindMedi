/**
 * File 25 §6: managed role templates. Actions use the EXISTING permission
 * vocabulary so each template is behaviour-equivalent to its ROLE_PERMISSIONS
 * row (migration §11 step 2) — scopes/conditions are the new part.
 * Tenant clones customize scope; statements stay structurally identical.
 */
export const MANAGED_TEMPLATES = [
  {
    key: 'owner',
    name: 'Owner / Admin',
    statements: [
      { sid: 'FullTenant', effect: 'Allow', actions: ['records:read', 'billing:read', 'billing:write', 'staff:manage', 'inventory:manage', 'appointments:read', 'appointments:write'], resources: ['tenant/self/*'], conditions: { mfa: true } },
      { sid: 'NeverRestricted', effect: 'Deny', actions: ['records:restricted:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'doctor',
    name: 'Doctor (care-team)',
    statements: [
      { sid: 'CareTeamClinical', effect: 'Allow', actions: ['records:read', 'records:write', 'prescriptions:write', 'patients:read'], resources: ['patient/{careTeam}'], conditions: { careteam_includes_me: true } },
      { sid: 'NeverRestricted', effect: 'Deny', actions: ['records:restricted:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'nurse-ward',
    name: 'Nurse (ward-scoped)',
    statements: [
      { sid: 'WardVitals', effect: 'Allow', actions: ['vitals:write', 'patients:read', 'beds:read'], resources: ['ward/{ownWards}/*'], conditions: { mfa: true, shift: 'current' } },
      { sid: 'NeverClinical', effect: 'Deny', actions: ['records:clinical:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'receptionist',
    name: 'Front-desk / Receptionist',
    statements: [
      { sid: 'FrontDesk', effect: 'Allow', actions: ['appointments:read', 'appointments:write', 'patients:read'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverRecordsBilling', effect: 'Deny', actions: ['records:*', 'billing:refund:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'billing',
    name: 'Billing Executive',
    statements: [
      { sid: 'BillingOps', effect: 'Allow', actions: ['billing:read', 'billing:write', 'patients:read'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverRecords', effect: 'Deny', actions: ['records:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'lab-tech',
    name: 'Lab Technician',
    statements: [
      { sid: 'LabEntry', effect: 'Allow', actions: ['lab:read', 'lab:enter_result'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverVerify', effect: 'Deny', actions: ['lab:verify'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'pharmacist',
    name: 'Pharmacist',
    statements: [
      { sid: 'PharmacyOps', effect: 'Allow', actions: ['pharmacy:read', 'pharmacy:dispense', 'inventory:manage'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverRecords', effect: 'Deny', actions: ['records:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'auditor-readonly',
    name: 'Auditor (read-only)',
    statements: [
      { sid: 'AuditRead', effect: 'Allow', actions: ['audit:read', 'reports:read', 'billing:read', 'inventory:read'], resources: ['tenant/self/*'], conditions: { mfa: true } },
    ],
  },
];

export const templateByKey = (key) => MANAGED_TEMPLATES.find((t) => t.key === key) || null;
