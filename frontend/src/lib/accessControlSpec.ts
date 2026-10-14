/**
 * Document 25: Access Control Center (AWS-IAM style) Frontend Specification & Types
 */

export interface IamLayerSpec {
  layer: string;
  name: string;
  desc: string;
}

export const IAM_EVALUATION_LAYERS: IamLayerSpec[] = [
  { layer: 'L0', name: 'Platform Guardrails (SCP)', desc: 'Platform-wide hard limits; Tier-3 (gym/wellness) blocked from clinical actions' },
  { layer: 'L1', name: 'Tenant Boundary', desc: 'Strict isolation by tenantId; cross-tenant requests fail-closed' },
  { layer: 'L2', name: 'Identity Policies', desc: 'Roles + Groups + Direct Assignments; Explicit Deny > Allow > Default Deny' },
  { layer: 'L3', name: 'Resource Scope', desc: 'Department, Ward, Location, and Care-Team scope filtering' },
  { layer: 'L4', name: 'Conditions', desc: 'MFA, Shift-time, Hospital IP, Device trust, Expiration timestamps' },
  { layer: 'L5', name: 'Healthcare Sensitivity & Consent', desc: 'Restricted labels (psych/HIV/substance), patient consent, VIP flags' },
  { layer: 'L6', name: 'Session & Step-Up Auth', desc: 'Step-up re-authentication required for admin-critical and high-risk actions' },
];

export interface SoDRule {
  id: string;
  title: string;
  actions: [string, string];
  severity: 'high' | 'critical' | 'medium';
  description: string;
}

export const SOD_RULES: SoDRule[] = [
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
    description: 'Dispensing pharmacist cannot unilaterally edit Schedule H1 / narcotic vault balances.',
  },
];

export const ACCESS_CENTER_TABS = [
  { id: 'roles', label: 'Roles & Templates' },
  { id: 'policies', label: 'Policies' },
  { id: 'teams', label: 'Teams & Groups' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'scopes', label: 'Scopes & Hierarchy' },
  { id: 'requests', label: 'Access Requests' },
  { id: 'reviews', label: 'Access Reviews' },
  { id: 'simulator', label: 'Policy Simulator' },
  { id: 'analyzer', label: 'Access Analyzer' },
  { id: 'grants', label: 'Emergency Break-Glass' },
  { id: 'apikeys', label: 'API Keys' },
  { id: 'activity', label: 'Activity & Audit' },
] as const;

export type AccessCenterTabId = (typeof ACCESS_CENTER_TABS)[number]['id'];
