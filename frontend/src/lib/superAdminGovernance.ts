/**
 * Document 23 — Super Admin Governance & Privacy Architecture (Frontend Library)
 * Scoped Roles, Access Control Matrix, Break-Glass Protocols,
 * Dynamic PII Masking, and Privacy Guarantees.
 */

export interface ScopedAdminRole {
  code: string;
  title: string;
  department: string;
  description: string;
  canApproveBreakGlass: boolean;
  requiresMfa: boolean;
  allowedScopes: string[];
}

export interface DataAccessMatrixRow {
  category: string;
  superadmin: string;
  kyc_reviewer: string;
  support_l1: string;
  support_l2: string;
  finance_admin: string;
  dpo: string;
  clinical_safety: string;
}

export interface BreakGlassReason {
  code: string;
  label: string;
  description: string;
  requiresDualApproval: boolean;
  requiresCaseNumber: boolean;
}

export interface BreakGlassPolicy {
  maxDurationMinutes: number;
  minJustificationLength: number;
  reasons: BreakGlassReason[];
  sensitiveCategoriesRequiringDualApproval: string[];
  approverRoles: string[];
}

export interface AdminSidebarItem {
  id: string;
  title: string;
  action: 'KEEP_AS_IS' | 'RESTRICT_ACCESS' | 'REMOVE_OR_REPLACE' | 'ADD_NEW';
  allowedRoles: string[];
  reason: string;
}

export interface PrivacyGuarantee {
  num: number;
  title: string;
  detail: string;
}

export const SCOPED_ADMIN_ROLES: ScopedAdminRole[] = [
  {
    code: 'superadmin',
    title: 'Platform Owner / Superadmin',
    department: 'Executive / Founders',
    description: 'Overall platform ownership, billing, legal covenants, and emergency break-glass approver. Zero routine clinical browsing.',
    canApproveBreakGlass: true,
    requiresMfa: true,
    allowedScopes: ['platform:manage', 'billing:manage', 'tenants:manage', 'breakglass:approve', 'audit:view'],
  },
  {
    code: 'platform_admin',
    title: 'Platform Infrastructure Admin',
    department: 'Engineering / DevOps',
    description: 'System configurations, feature flags, service health, and multi-tenant environment management. Strictly zero PHI access.',
    canApproveBreakGlass: false,
    requiresMfa: true,
    allowedScopes: ['infra:manage', 'flags:manage', 'services:read', 'telemetry:read'],
  },
  {
    code: 'kyc_reviewer',
    title: 'Provider KYC Reviewer',
    department: 'Supply Operations',
    description: 'Verifies doctor degrees, medical council registration (NMC/State Council), pharmacy drug licenses, and clinic photos.',
    canApproveBreakGlass: false,
    requiresMfa: true,
    allowedScopes: ['providers:kyc_review', 'documents:verify', 'facilities:inspect'],
  },
  {
    code: 'catalog_manager',
    title: 'Catalog & Taxonomy Manager',
    department: 'Catalog Operations',
    description: 'Manages master medicine catalog, lab test taxonomies, specialty trees, pricing guardrails, and GST tax codes.',
    canApproveBreakGlass: false,
    requiresMfa: false,
    allowedScopes: ['catalog:write', 'taxonomies:manage', 'pricing:guardrails'],
  },
  {
    code: 'moderator',
    title: 'Community & Reviews Moderator',
    department: 'Trust & Safety',
    description: 'Moderates public ratings, doctor reviews, patient feedback flags, and community Q&A against abuse and defamation.',
    canApproveBreakGlass: false,
    requiresMfa: false,
    allowedScopes: ['reviews:moderate', 'feedback:triage', 'abuse:flag'],
  },
  {
    code: 'support_l1',
    title: 'Frontline Support Specialist (L1)',
    department: 'Customer Support',
    description: 'Handles order tracking, appointment rescheduling, and payment status checks. PII is strictly masked; clinical data inaccessible.',
    canApproveBreakGlass: false,
    requiresMfa: true,
    allowedScopes: ['tickets:l1', 'orders:read_metadata', 'support:assist_otp'],
  },
  {
    code: 'support_l2',
    title: 'Senior Escalations Lead (L2)',
    department: 'Customer Support',
    description: 'Resolves complex disputes, partial refunds, provider no-shows, and delivery escalations. OTP assist required to unmask contact.',
    canApproveBreakGlass: false,
    requiresMfa: true,
    allowedScopes: ['tickets:l2', 'refunds:process_capped', 'disputes:adjudicate', 'assist_session:create'],
  },
  {
    code: 'finance_admin',
    title: 'Settlements & Finance Admin',
    department: 'Finance & Treasury',
    description: 'Processes provider weekly payouts, rider settlements, gateway reconciliation, TDS deductions, and GST invoices.',
    canApproveBreakGlass: false,
    requiresMfa: true,
    allowedScopes: ['finance:payouts', 'reconciliation:run', 'tax:reports', 'invoices:read'],
  },
  {
    code: 'city_manager',
    title: 'City Operations Manager',
    department: 'Regional Operations',
    description: 'Monitors city-level supply, appointment fulfilment velocity, rider fleet availability, and hyper-local tie-ups.',
    canApproveBreakGlass: false,
    requiresMfa: true,
    allowedScopes: ['city:metrics', 'supply:monitor', 'partners:regional'],
  },
  {
    code: 'medical_reviewer',
    title: 'Medical Director / Clinical Auditor',
    department: 'Clinical Governance',
    description: 'Audits anonymized provider clinical quality, oversees clinical SOP compliance, and reviews doctor credential appeals.',
    canApproveBreakGlass: true,
    requiresMfa: true,
    allowedScopes: ['clinical:audit_anonymized', 'credentials:peer_review'],
  },
  {
    code: 'clinical_safety',
    title: 'Pharmacovigilance & Safety Lead',
    department: 'Clinical Governance',
    description: 'Investigates adverse drug reactions, counterfeit reports, and clinical safety incidents. Eligible for emergency break-glass.',
    canApproveBreakGlass: true,
    requiresMfa: true,
    allowedScopes: ['safety:incident_response', 'breakglass:request', 'adverse_events:investigate'],
  },
  {
    code: 'dpo',
    title: 'Data Protection Officer (DPO)',
    department: 'Legal & Compliance',
    description: 'Guarantees DPDP Act compliance, manages patient data erasure / portability requests, reviews consent logs, approves break-glass.',
    canApproveBreakGlass: true,
    requiresMfa: true,
    allowedScopes: ['privacy:dpo', 'erasure:process', 'consent:audit', 'breakglass:approve'],
  },
  {
    code: 'security_admin',
    title: 'Security & IAM Administrator',
    department: 'InfoSec',
    description: 'Monitors audit logs, investigates intrusion attempts, manages admin MFA, rotates API keys, and audits break-glass executions.',
    canApproveBreakGlass: true,
    requiresMfa: true,
    allowedScopes: ['security:iam', 'audit:immutable_read', 'waf:configure', 'sessions:revoke'],
  },
  {
    code: 'auditor',
    title: 'External / Internal Compliance Auditor',
    department: 'Compliance / Risk',
    description: 'Read-only access to anonymized reports, financial balance sheets, and security certifications. Absolute zero PII/PHI access.',
    canApproveBreakGlass: false,
    requiresMfa: true,
    allowedScopes: ['reports:anonymized_read', 'compliance:checklists'],
  },
];

export const DATA_ACCESS_MATRIX: DataAccessMatrixRow[] = [
  {
    category: 'Provider KYC & Credentials',
    superadmin: 'Full',
    kyc_reviewer: 'Full',
    support_l1: 'None',
    support_l2: 'Limited',
    finance_admin: 'Limited (Bank info)',
    dpo: 'Full',
    clinical_safety: 'Limited',
  },
  {
    category: 'Provider Financials & Bank Details',
    superadmin: 'Full',
    kyc_reviewer: 'None',
    support_l1: 'None',
    support_l2: 'None',
    finance_admin: 'Full',
    dpo: 'Audit Only',
    clinical_safety: 'None',
  },
  {
    category: 'Order / Booking Metadata (IDs, Times, Status)',
    superadmin: 'Full',
    kyc_reviewer: 'None',
    support_l1: 'Full',
    support_l2: 'Full',
    finance_admin: 'Full',
    dpo: 'Audit Only',
    clinical_safety: 'Full',
  },
  {
    category: 'Patient Identity & Contact PII',
    superadmin: 'Masked',
    kyc_reviewer: 'None',
    support_l1: 'Masked',
    support_l2: 'Masked (OTP Reveal)',
    finance_admin: 'Masked',
    dpo: 'Unmask via DPDP Request',
    clinical_safety: 'Masked',
  },
  {
    category: 'General Clinical Records & Prescriptions',
    superadmin: 'Break-Glass Only',
    kyc_reviewer: 'None',
    support_l1: 'None',
    support_l2: 'None',
    finance_admin: 'None',
    dpo: 'Break-Glass Only',
    clinical_safety: 'Break-Glass Only',
  },
  {
    category: 'Mental & Sexual Health Sensitive Clinical Data',
    superadmin: 'Dual-Approval Break-Glass',
    kyc_reviewer: 'None',
    support_l1: 'None',
    support_l2: 'None',
    finance_admin: 'None',
    dpo: 'Dual-Approval Break-Glass',
    clinical_safety: 'Dual-Approval Break-Glass',
  },
  {
    category: 'Platform Audit & Access Logs',
    superadmin: 'Read-Only',
    kyc_reviewer: 'None',
    support_l1: 'None',
    support_l2: 'None',
    finance_admin: 'Financial Logs Only',
    dpo: 'Full Read-Only',
    clinical_safety: 'Incident Logs Only',
  },
];

export const BREAK_GLASS_POLICY: BreakGlassPolicy = {
  maxDurationMinutes: 60,
  minJustificationLength: 20,
  reasons: [
    {
      code: 'LEGAL_COURT_ORDER',
      label: 'Formal Court Order / Police Subpoena',
      description: 'Production order issued under CrPC / BNSS / IT Act by competent judicial magistrate or cyber cell.',
      requiresDualApproval: false,
      requiresCaseNumber: true,
    },
    {
      code: 'CLINICAL_EMERGENCY',
      label: 'Life-or-Death Clinical Emergency',
      description: 'Hospital emergency room requires unblocked historical allergy/medication records for unconscious patient.',
      requiresDualApproval: false,
      requiresCaseNumber: true,
    },
    {
      code: 'FATAL_ADVERSE_EVENT',
      label: 'Fatal Adverse Drug Reaction / Counterfeit Alert',
      description: 'Regulatory or internal investigation into batch contamination or life-threatening medication error.',
      requiresDualApproval: true,
      requiresCaseNumber: true,
    },
    {
      code: 'MALICIOUS_TAMPERING_AUDIT',
      label: 'Suspected Record Tampering / Cyber Breach',
      description: 'Forensic integrity verification following an unauthorized database modification alert.',
      requiresDualApproval: true,
      requiresCaseNumber: true,
    },
    {
      code: 'DPDP_RIGHT_TO_CORRECTION_DISPUTE',
      label: 'Contested DPDP Erasure / Correction Appeal',
      description: 'Resolution of an escalated data rectification dispute requiring source document inspection.',
      requiresDualApproval: false,
      requiresCaseNumber: true,
    },
  ],
  sensitiveCategoriesRequiringDualApproval: [
    'mental_health',
    'psychiatry_therapy',
    'sexual_reproductive_health',
    'hiv_oncology_stigma',
  ],
  approverRoles: ['dpo', 'security_admin', 'superadmin', 'medical_reviewer'],
};

export const MASKING_CONFIG = {
  name: {
    pattern: 'Show first name, mask subsequent words',
    example: 'Rahul Kumar Sharma -> Rahul K*** S***',
  },
  phone: {
    pattern: 'Mask middle 5 digits, retain country code and last 3 digits',
    example: '+91 98765 43210 -> +91 98*****210',
  },
  email: {
    pattern: 'Mask intermediate username chars, keep first & last char and domain',
    example: 'rahul.kumar@gmail.com -> r***r@gmail.com',
  },
  address: {
    pattern: 'Mask street address and house number, retain city and pincode',
    example: 'Flat 402, Green Valley, Jabalpur 482001 -> ***, Jabalpur 482001',
  },
  assistSessionTtlMinutes: 15,
};

export const ADMIN_SIDEBAR_SPEC: AdminSidebarItem[] = [
  {
    id: 'kyc_command',
    title: 'KYC & Provider Onboarding',
    action: 'KEEP_AS_IS',
    allowedRoles: ['superadmin', 'kyc_reviewer', 'city_manager'],
    reason: 'Essential supply verification. No patient clinical data is present.',
  },
  {
    id: 'all_facilities',
    title: 'Facilities & Clinic Management',
    action: 'KEEP_AS_IS',
    allowedRoles: ['superadmin', 'platform_admin', 'kyc_reviewer', 'city_manager'],
    reason: 'Operational listings, branch coordinates, bed counts, and operating hours.',
  },
  {
    id: 'support_tickets',
    title: 'Support & Escalation Desk',
    action: 'RESTRICT_ACCESS',
    allowedRoles: ['superadmin', 'support_l1', 'support_l2'],
    reason: 'Must enforce dynamic PII masking by default. Unmasking requires patient-consented OTP assist session.',
  },
  {
    id: 'disputes_refunds',
    title: 'Disputes & Refund Adjudication',
    action: 'RESTRICT_ACCESS',
    allowedRoles: ['superadmin', 'support_l2', 'finance_admin'],
    reason: 'Strictly limited to billing metadata, order IDs, and delivery proofs. Clinical notes redacted.',
  },
  {
    id: 'user_management',
    title: 'User Management Directory',
    action: 'RESTRICT_ACCESS',
    allowedRoles: ['superadmin', 'dpo', 'security_admin'],
    reason: 'Remove open patient browsing. Restrict searches to explicit Ticket ID or anonymized User UUID.',
  },
  {
    id: 'data_export',
    title: 'Data Export Engine',
    action: 'RESTRICT_ACCESS',
    allowedRoles: ['superadmin', 'dpo'],
    reason: 'Clinical PHI export permanently disabled. All exports cryptographically watermarked and audit-logged.',
  },
  {
    id: 'break_glass_console',
    title: 'Break-Glass Emergency Console',
    action: 'ADD_NEW',
    allowedRoles: ['superadmin', 'dpo', 'security_admin', 'clinical_safety'],
    reason: 'Strict workflow for time-boxed, reason-justified, and dual-approved clinical investigations.',
  },
  {
    id: 'dpo_privacy_hub',
    title: 'DPDP Privacy & Consent Hub',
    action: 'ADD_NEW',
    allowedRoles: ['superadmin', 'dpo'],
    reason: 'Tracks patient consent logs, right-to-erasure workflows, data portability, and grievance SLA timers.',
  },
  {
    id: 'raw_clinical_browser',
    title: 'Raw Patient Clinical Records Viewer',
    action: 'REMOVE_OR_REPLACE',
    allowedRoles: [],
    reason: 'Permanently prohibited in superadmin. Clinical browsing by platform operators violates medical ethics and privacy laws.',
  },
];

export const PRIVACY_GUARANTEES: PrivacyGuarantee[] = [
  {
    num: 1,
    title: 'Zero Clinical Browsing by Default',
    detail: 'Platform operators cannot browse doctor consultation notes, lab reports, or prescriptions without an active break-glass grant.',
  },
  {
    num: 2,
    title: 'Dual-Approval for Sensitive Specialties',
    detail: 'Access to mental health, psychiatry therapy, and sexual health records requires two independent designated approvers.',
  },
  {
    num: 3,
    title: 'Time-Boxed Emergency Leases (≤ 60 Min)',
    detail: 'All break-glass permissions automatically self-destruct after the approved lease period (maximum 60 minutes).',
  },
  {
    num: 4,
    title: 'Cryptographic Audit Trail',
    detail: 'Every break-glass query, record view, and field unmasking is logged with immutable IP, admin UUID, and justification hash.',
  },
  {
    num: 5,
    title: 'Dynamic Frontline Masking',
    detail: 'Support agents see masked names, phone numbers, and addresses. Full contact details never appear in raw ticket lists.',
  },
  {
    num: 6,
    title: 'Patient-Consented Support Assist (OTP-Gated)',
    detail: 'Frontline agents can only view unmasked contact info after a patient validates a short-lived 6-digit SMS/WhatsApp OTP.',
  },
  {
    num: 7,
    title: 'Principle of Least Privilege (14 Scoped Roles)',
    detail: 'Replaced monolithic God-Mode superadmin with granular functional roles (KYC, Catalog, Support, Finance, Safety, DPO).',
  },
  {
    num: 8,
    title: 'Permanent Export Hardening',
    detail: 'Superadmin bulk exports exclude medical files, embed recipient watermarks, and alert the InfoSec channel upon execution.',
  },
  {
    num: 9,
    title: 'DPDP Act & DISHA Compliance Engine',
    detail: 'Automated 72-hour grievance resolution tracking, audit-ready consent receipts, and verifiable data erasure workflows.',
  },
  {
    num: 10,
    title: 'Visual Break-Glass Banner',
    detail: 'Any active break-glass session displays a high-visibility amber/red banner with a real-time countdown timer across all views.',
  },
];

export interface PatientData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  [key: string]: any;
}

export function maskPatientPii(patient: PatientData = {}): PatientData {
  if (!patient || typeof patient !== 'object') return {};

  const maskName = (name?: string) => {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      const p = parts[0];
      return p.length <= 2 ? p : `${p.slice(0, 2)}***`;
    }
    return parts
      .map((part, idx) => (idx === 0 ? part : `${part.charAt(0)}***`))
      .join(' ');
  };

  const maskPhone = (phone?: string) => {
    if (!phone || typeof phone !== 'string') return '';
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.length < 8) return '****';
    const last3 = cleaned.slice(-3);
    const prefix = cleaned.startsWith('+') ? cleaned.slice(0, 3) : cleaned.slice(0, 2);
    return `${prefix}*****${last3}`;
  };

  const maskEmail = (email?: string) => {
    if (!email || typeof email !== 'string' || !email.includes('@')) return '';
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `*@${domain}`;
    return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
  };

  const maskAddress = (addr?: string) => {
    if (!addr || typeof addr !== 'string') return '';
    const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) return '***';
    const cityOrPin = parts[parts.length - 1];
    return `***, ${cityOrPin}`;
  };

  return {
    ...patient,
    name: maskName(patient.name),
    phone: maskPhone(patient.phone),
    email: maskEmail(patient.email),
    address: maskAddress(patient.address),
    isMasked: true,
  };
}

export interface BreakGlassValidationResult {
  valid: boolean;
  errors: string[];
  requiresDualApproval: boolean;
  maxDurationMinutes: number;
}

export function validateBreakGlassRequest(request: {
  requesterId?: string;
  reasonCode?: string;
  justification?: string;
  caseOrTicketId?: string;
  durationMinutes?: number;
  isSensitiveCategory?: boolean;
  approverIds?: string[];
} = {}): BreakGlassValidationResult {
  const errors: string[] = [];
  const {
    requesterId,
    reasonCode,
    justification,
    caseOrTicketId,
    durationMinutes,
    isSensitiveCategory,
    approverIds = [],
  } = request;

  if (!requesterId) {
    errors.push('Requester ID is mandatory.');
  }

  const validReasons = BREAK_GLASS_POLICY.reasons.map((r) => r.code);
  if (!reasonCode || !validReasons.includes(reasonCode)) {
    errors.push(`Invalid reason code. Must be one of: ${validReasons.join(', ')}.`);
  }

  if (!justification || typeof justification !== 'string' || justification.trim().length < BREAK_GLASS_POLICY.minJustificationLength) {
    errors.push(`Justification must be at least ${BREAK_GLASS_POLICY.minJustificationLength} characters explaining the emergency.`);
  }

  if (!caseOrTicketId || typeof caseOrTicketId !== 'string' || !caseOrTicketId.trim()) {
    errors.push('Legal case number, FIR ID, or customer dispute ticket ID is mandatory.');
  }

  const duration = Number(durationMinutes);
  if (!duration || duration <= 0 || duration > BREAK_GLASS_POLICY.maxDurationMinutes) {
    errors.push(`Duration must be between 1 and ${BREAK_GLASS_POLICY.maxDurationMinutes} minutes.`);
  }

  const matchedReason = BREAK_GLASS_POLICY.reasons.find((r) => r.code === reasonCode);
  const requiresDual = isSensitiveCategory || (matchedReason && matchedReason.requiresDualApproval);

  if (requiresDual) {
    if (!Array.isArray(approverIds) || approverIds.length < 2) {
      errors.push('Dual approval required: At least 2 independent authorized approvers must sign off for sensitive or high-risk records.');
    }
    if (approverIds.includes(requesterId!)) {
      errors.push('Self-approval prohibited: Requester cannot act as one of the approvers.');
    }
  } else {
    if (!Array.isArray(approverIds) || approverIds.length < 1) {
      errors.push('At least 1 authorized approver sign-off is required.');
    }
    if (approverIds.includes(requesterId!)) {
      errors.push('Self-approval prohibited: Requester cannot act as an approver.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    requiresDualApproval: !!requiresDual,
    maxDurationMinutes: BREAK_GLASS_POLICY.maxDurationMinutes,
  };
}
