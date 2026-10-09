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
  // File 22 P0-8: hospital operations templates. Actions mirror the
  // ROLE_PERMISSIONS rows; scopes/conditions are the IAM-native part.
  {
    key: 'billing-executive',
    name: 'Billing Executive',
    statements: [
      { sid: 'BillingOps', effect: 'Allow', actions: ['billing:read', 'billing:write', 'patients:read', 'appointments:read', 'insurance:read'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverApproveOwn', effect: 'Deny', actions: ['billing:approve:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'cashier',
    name: 'Cashier (counter)',
    statements: [
      { sid: 'CounterOps', effect: 'Allow', actions: ['billing:read', 'billing:write', 'patients:read'], resources: ['tenant/self/*'], conditions: { shift: 'current' } },
      { sid: 'NeverRecords', effect: 'Deny', actions: ['records:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'insurance-desk',
    name: 'Insurance / TPA desk',
    statements: [
      { sid: 'TpaOps', effect: 'Allow', actions: ['insurance:read', 'insurance:write', 'billing:read', 'patients:read'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverRecords', effect: 'Deny', actions: ['records:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'store-keeper',
    name: 'Store keeper / Purchase',
    statements: [
      { sid: 'InventoryOps', effect: 'Allow', actions: ['inventory:manage'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverApproveOwnPO', effect: 'Deny', actions: ['purchase:approve:own'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'hr-manager',
    name: 'HR Manager',
    statements: [
      { sid: 'PeopleOps', effect: 'Allow', actions: ['staff:manage', 'reports:read'], resources: ['tenant/self/*'], conditions: { mfa: true } },
      { sid: 'NeverRoleChange', effect: 'Deny', actions: ['users:role-change'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'quality-officer',
    name: 'Quality Officer',
    statements: [
      { sid: 'QualityRead', effect: 'Allow', actions: ['audit:read', 'reports:read', 'records:read'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverWrite', effect: 'Deny', actions: ['records:write', 'billing:write'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'call-center-agent',
    name: 'Call Center Agent',
    statements: [
      { sid: 'BookingOps', effect: 'Allow', actions: ['appointments:read', 'appointments:write', 'patients:read', 'chat:read', 'chat:write'], resources: ['tenant/self/*'], conditions: { shift: 'current' } },
      { sid: 'NeverRecords', effect: 'Deny', actions: ['records:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'medical-director',
    name: 'Medical Director / CMO',
    statements: [
      { sid: 'ClinicalOversight', effect: 'Allow', actions: ['records:read', 'reports:read', 'audit:read', 'appointments:read', 'patients:read'], resources: ['tenant/self/*'], conditions: { mfa: true } },
      { sid: 'NeverWrite', effect: 'Deny', actions: ['records:write'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'nursing-supervisor',
    name: 'Nursing Supervisor / Matron',
    statements: [
      { sid: 'WardOps', effect: 'Allow', actions: ['records:read', 'vitals:write', 'patients:read', 'beds:read', 'staff:manage'], resources: ['ward/{ownWards}/*'], conditions: { mfa: true, shift: 'current' } },
      { sid: 'NeverClinical', effect: 'Deny', actions: ['records:clinical:*'], resources: ['tenant/self/*'] },
    ],
  },
  {
    key: 'medical-records-officer',
    name: 'MRD Officer',
    statements: [
      { sid: 'RecordsOps', effect: 'Allow', actions: ['records:read', 'patients:read', 'reports:read', 'dsr:read'], resources: ['tenant/self/*'], conditions: {} },
      { sid: 'NeverWrite', effect: 'Deny', actions: ['records:write'], resources: ['tenant/self/*'] },
    ],
  },
];

export const templateByKey = (key) => MANAGED_TEMPLATES.find((t) => t.key === key) || null;
