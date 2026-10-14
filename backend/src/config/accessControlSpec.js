/**
 * Document 25: Access Control Center (AWS-IAM style) Specification Master
 * Fine-grained access control for Hospitals, Clinics, and Multi-tenant Healthcare Facilities.
 */

export const IAM_EVALUATION_LAYERS = [
  { layer: 'L0', name: 'Platform Guardrails (SCP)', desc: 'Platform-wide hard limits; Tier-3 (gym/wellness) blocked from clinical actions' },
  { layer: 'L1', name: 'Tenant Boundary', desc: 'Strict isolation by tenantId; cross-tenant requests fail-closed' },
  { layer: 'L2', name: 'Identity Policies', desc: 'Roles + Groups + Direct Assignments; Explicit Deny > Allow > Default Deny' },
  { layer: 'L3', name: 'Resource Scope', desc: 'Department, Ward, Location, and Care-Team scope filtering' },
  { layer: 'L4', name: 'Conditions', desc: 'MFA, Shift-time, Hospital IP, Device trust, Expiration timestamps' },
  { layer: 'L5', name: 'Healthcare Sensitivity & Consent', desc: 'Restricted labels (psych/HIV/substance), patient consent, VIP flags, minor guardians' },
  { layer: 'L6', name: 'Session & Step-Up Auth', desc: 'Step-up re-authentication required for admin-critical and high-risk actions' },
];

export const SENSITIVITY_CLASSES = {
  STANDARD: {
    key: 'standard',
    label: 'Standard Operations',
    description: 'General front-desk, scheduling, queues, basic demographics, inventory quantities',
    requiresReason: false,
    requiresStepUp: false,
  },
  SENSITIVE: {
    key: 'sensitive',
    label: 'Clinical & Diagnostic Data',
    description: 'Consultation notes, vitals, lab reports, medication orders, DICOM imaging',
    requiresReason: false,
    requiresStepUp: false,
  },
  RESTRICTED: {
    key: 'restricted',
    label: 'Highly Restricted Medical Data',
    description: 'Psychiatry/mental health, HIV/STDs, substance abuse, sexual/reproductive health, chart amendments',
    requiresReason: true,
    requiresStepUp: true,
  },
  FINANCIAL: {
    key: 'financial',
    label: 'Financial & Billing Data',
    description: 'Invoices, refunds, fee tariffs, insurance/TPA claims, cashbook registers',
    requiresReason: false,
    requiresStepUp: false,
  },
  HR_SENSITIVE: {
    key: 'hr_sensitive',
    label: 'Staff HR & Payroll',
    description: 'Employee salary, bank accounts, biometric attendance, disciplinary history',
    requiresReason: false,
    requiresStepUp: false,
  },
  ADMIN_CRITICAL: {
    key: 'admin_critical',
    label: 'IAM & Security Governance',
    description: 'Policy creation, role assignment, API keys, service accounts, audit log export',
    requiresReason: true,
    requiresStepUp: true,
  },
};

export const ALLOWLISTED_CONDITION_KEYS = [
  'mfa',
  'ip',
  'expires_at',
  'shift',
  'time_between',
  'dept_in',
  'ward_in',
  'careteam_includes_me',
  'sensitivity_not',
  'reason_required',
  'consent_required',
  'emergency_flag',
];

export const SOD_RULES = [
  {
    id: 'SOD_PO_PROCUREMENT',
    title: 'Procurement SoD: Create & Approve PO',
    actions: ['po:create', 'po:approve'],
    severity: 'high',
    description: 'User cannot both generate a purchase order and authorize payment/PO approval.',
  },
  {
    id: 'SOD_LAB_VERIFY',
    title: 'Laboratory SoD: Enter & Verify Results',
    actions: ['lab:result:enter', 'lab:result:verify'],
    severity: 'high',
    description: 'Technician who enters raw diagnostic lab values cannot sign off / verify the final report.',
  },
  {
    id: 'SOD_BILLING_REFUND',
    title: 'Financial SoD: Write Invoice & Issue Refund',
    actions: ['billing:invoice:write', 'billing:refund:issue'],
    severity: 'critical',
    description: 'Cashier who generates billing invoices cannot independently authorize financial refunds.',
  },
  {
    id: 'SOD_PHARMACY_H1',
    title: 'Pharmacy SoD: Dispense & Write H1 Register',
    actions: ['pharmacy:dispense', 'pharmacy:h1register:write'],
    severity: 'high',
    description: 'Dispensing pharmacist cannot unilaterally edit Schedule H1 / narcotic vault balances without independent witness.',
  },
];

export const TENANT_TYPE_ROLE_TEMPLATES = {
  HOSPITAL: ['Owner/Admin', 'Medical Superintendent', 'Doctor', 'Resident/Intern', 'Nurse (ward-scoped)', 'Front-desk/Receptionist', 'Billing executive', 'TPA/Insurance exec', 'Lab technician', 'Pathologist/Radiologist', 'Pharmacist', 'Store keeper', 'Accountant', 'HR', 'IT admin', 'Medical records officer', 'Quality/NABH officer', 'Auditor (read-only)'],
  DENTAL_CLINIC: ['Dentist', 'Dental assistant', 'Front desk', 'Lab-work coordinator', 'Billing'],
  EYE_CLINIC: ['Ophthalmologist', 'Optometrist', 'Optician/job-card tech', 'Front desk'],
  DIALYSIS_CENTRE: ['Nephrologist', 'Dialysis technician', 'Nurse', 'Water-quality officer', 'Billing'],
  FERTILITY_CLINIC: ['Fertility doctor', 'Embryologist', 'Counsellor', 'Coordinator'],
  LAB_DIAGNOSTICS: ['Lab technician', 'Pathologist', 'Radiographer', 'Sonographer', 'Receptionist', 'Phlebotomist'],
  PHARMACY: ['Pharmacist', 'Pharmacy assistant', 'Store keeper', 'Delivery coordinator', 'Accountant'],
  WELLNESS_GYM: ['Owner', 'Manager', 'Trainer/instructor', 'Front desk', 'Accountant'],
};

export const UI_SECTIONS_SPEC = [
  { id: 'roles', label: 'Roles & Templates', desc: 'Managed templates + tenant custom roles with versioning' },
  { id: 'policies', label: 'Policies', desc: 'Visual policy builder + JSON editor with validation' },
  { id: 'teams', label: 'Teams & Groups', desc: 'Departmental staff groups with attached policies' },
  { id: 'assignments', label: 'Assignments', desc: 'Scoped bindings with conditions and expiration' },
  { id: 'scopes', label: 'Resource Scopes', desc: 'Hierarchy master for departments, wards, and locations' },
  { id: 'requests', label: 'Access Requests', desc: 'Staff access request and dual-approver workflow' },
  { id: 'reviews', label: 'Access Reviews', desc: 'Quarterly user access certification campaigns' },
  { id: 'simulator', label: 'Policy Simulator', desc: 'Deterministic evaluation simulation (Can X do Y on Z?)' },
  { id: 'analyzer', label: 'Access Analyzer', desc: 'Detects SoD violations, missing MFA, and expired grants' },
  { id: 'grants', label: 'Emergency Break-Glass', desc: 'Time-boxed 30-min emergency access with mandatory reason' },
  { id: 'apikeys', label: 'API Keys & Service Accounts', desc: 'Scoped, hashed, expiring, and IP-bound integration tokens' },
  { id: 'activity', label: 'Activity & Audit', desc: 'Immutable security log and patient-visible access trail' },
];
