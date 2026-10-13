/**
 * File 25 §5: Fine-grained IAM Action Catalog (~120 actions).
 * Categorized by module and sensitivity class.
 *
 * Sensitivity classes:
 *  - standard: general operations (OPD queues, basic demographics, inventory)
 *  - sensitive: clinical diagnostic data, prescriptions, medical records
 *  - restricted: psych/mental health, HIV/STD, substance use, sexual health (requires reason + step-up)
 *  - financial: invoices, pricing, refunds, insurance claims, TPA
 *  - hr_sensitive: staff personal profiles, attendance, salary/payroll
 *  - admin_critical: IAM policy changes, role assignments, API keys, exports
 */

export const SENSITIVITY_CLASSES = [
  'standard',
  'sensitive',
  'restricted',
  'financial',
  'hr_sensitive',
  'admin_critical',
];

export const ACTION_CATALOG = [
  // ── 1. Patients & Demographics ──
  { action: 'patients:demographics:read', module: 'patients', sensitivity: 'standard', label: 'Read Patient Demographics' },
  { action: 'patients:demographics:write', module: 'patients', sensitivity: 'standard', label: 'Create/Edit Patient Demographics' },
  { action: 'patients:profile:read', module: 'patients', sensitivity: 'standard', label: 'View Basic Patient Summary' },
  { action: 'patients:contact:read', module: 'patients', sensitivity: 'sensitive', label: 'View Patient Phone & Email' },
  { action: 'patients:insurance:read', module: 'patients', sensitivity: 'financial', label: 'View Patient Policy & TPA ID' },
  { action: 'patients:merge', module: 'patients', sensitivity: 'admin_critical', label: 'Merge Duplicate Patient Records' },
  { action: 'patients:export', module: 'patients', sensitivity: 'admin_critical', label: 'Export Patient Lists (Capped)' },

  // ── 2. Appointments & OPD Queue ──
  { action: 'appointments:schedule:read', module: 'appointments', sensitivity: 'standard', label: 'View Doctor/OPD Schedule' },
  { action: 'appointments:book', module: 'appointments', sensitivity: 'standard', label: 'Book Appointment' },
  { action: 'appointments:reschedule', module: 'appointments', sensitivity: 'standard', label: 'Reschedule Appointment Slot' },
  { action: 'appointments:cancel', module: 'appointments', sensitivity: 'standard', label: 'Cancel Appointment' },
  { action: 'appointments:noshow:mark', module: 'appointments', sensitivity: 'standard', label: 'Mark Patient No-Show' },
  { action: 'queue:manage', module: 'appointments', sensitivity: 'standard', label: 'Manage Waiting Queue & Room Calls' },
  { action: 'queue:call:next', module: 'appointments', sensitivity: 'standard', label: 'Call Next Token to Consultation Room' },
  { action: 'queue:transfer', module: 'appointments', sensitivity: 'standard', label: 'Transfer Patient between OPD Queues' },
  { action: 'token:issue', module: 'appointments', sensitivity: 'standard', label: 'Issue Walk-in OPD Token' },

  // ── 3. Clinical Records (EMR / EHR) ──
  { action: 'records:summary:read', module: 'records', sensitivity: 'sensitive', label: 'Read Patient Summary / Problem List' },
  { action: 'records:clinical:read', module: 'records', sensitivity: 'sensitive', label: 'Read Consultation Notes & History' },
  { action: 'records:clinical:write', module: 'records', sensitivity: 'sensitive', label: 'Write New Encounter Progress Note' },
  { action: 'records:diagnosis:add', module: 'records', sensitivity: 'sensitive', label: 'Assign ICD-10 Diagnosis' },
  { action: 'records:allergy:update', module: 'records', sensitivity: 'sensitive', label: 'Update Patient Known Allergies' },
  { action: 'records:clinical:amend', module: 'records', sensitivity: 'restricted', label: 'Amend Signed Medical Record (Step-up)' },
  { action: 'records:restricted:read', module: 'records', sensitivity: 'restricted', label: 'Read Psych, HIV, Substance Records (Reason Required)' },
  { action: 'records:attachments:read', module: 'records', sensitivity: 'sensitive', label: 'View Scanned Documents & External Files' },
  { action: 'records:discharge:draft', module: 'records', sensitivity: 'sensitive', label: 'Draft IPD Discharge Summary' },
  { action: 'records:discharge:sign', module: 'records', sensitivity: 'sensitive', label: 'Sign & Finalize Discharge Summary' },
  { action: 'records:consent:verify', module: 'records', sensitivity: 'sensitive', label: 'Verify ABDM / Treatment Consent' },
  { action: 'records:print', module: 'records', sensitivity: 'sensitive', label: 'Print Physical Medical Summary' },

  // ── 4. Prescriptions & Medication Orders ──
  { action: 'prescriptions:read', module: 'prescriptions', sensitivity: 'sensitive', label: 'View Medication Orders & History' },
  { action: 'prescriptions:write', module: 'prescriptions', sensitivity: 'sensitive', label: 'Draft Medication Order' },
  { action: 'prescriptions:sign', module: 'prescriptions', sensitivity: 'sensitive', label: 'Digitally Sign Prescription' },
  { action: 'prescriptions:cancel', module: 'prescriptions', sensitivity: 'sensitive', label: 'Void / Cancel Active Prescription' },
  { action: 'prescriptions:refill:approve', module: 'prescriptions', sensitivity: 'sensitive', label: 'Approve Medication Refill Request' },
  { action: 'prescriptions:ddi:override', module: 'prescriptions', sensitivity: 'restricted', label: 'Override Severe DDI Interaction Warning' },
  { action: 'prescriptions:dispense:check', module: 'prescriptions', sensitivity: 'sensitive', label: 'Clinical Pharmacist Pre-dispense Check' },

  // ── 5. Pathology / Lab Diagnostics ──
  { action: 'lab:order:read', module: 'lab', sensitivity: 'sensitive', label: 'View Lab Test Orders' },
  { action: 'lab:order:write', module: 'lab', sensitivity: 'sensitive', label: 'Create Laboratory Test Order' },
  { action: 'lab:sample:collect', module: 'lab', sensitivity: 'standard', label: 'Mark Sample Collected / Barcode Scan' },
  { action: 'lab:sample:reject', module: 'lab', sensitivity: 'standard', label: 'Reject Hemolyzed/Clotted Sample' },
  { action: 'lab:result:enter', module: 'lab', sensitivity: 'sensitive', label: 'Enter Technical Lab Test Results' },
  { action: 'lab:result:verify', module: 'lab', sensitivity: 'sensitive', label: 'Verify & Sign Lab Report (Pathologist)' },
  { action: 'lab:result:release', module: 'lab', sensitivity: 'sensitive', label: 'Release Lab Report to Patient/Doctor' },
  { action: 'lab:critical:notify', module: 'lab', sensitivity: 'sensitive', label: 'Acknowledge Critical Panic Value Alert' },
  { action: 'lab:catalog:manage', module: 'lab', sensitivity: 'standard', label: 'Manage Test Catalog & Reference Ranges' },
  { action: 'lab:qc:run', module: 'lab', sensitivity: 'standard', label: 'Log Daily Quality Control & Levey-Jennings' },
  { action: 'lab:instrument:calibrate', module: 'lab', sensitivity: 'standard', label: 'Calibrate Analyzer & Interface Status' },

  // ── 6. Radiology / Imaging (RIS/PACS) ──
  { action: 'radiology:order:read', module: 'radiology', sensitivity: 'sensitive', label: 'View Imaging Orders' },
  { action: 'radiology:order:write', module: 'radiology', sensitivity: 'sensitive', label: 'Place Radiology Requisition' },
  { action: 'radiology:modality:schedule', module: 'radiology', sensitivity: 'standard', label: 'Schedule MRI/CT/X-Ray Modality Slot' },
  { action: 'radiology:image:view', module: 'radiology', sensitivity: 'sensitive', label: 'Open DICOM Studies in Web Viewer' },
  { action: 'radiology:dose:log', module: 'radiology', sensitivity: 'sensitive', label: 'Log Radiation Exposure Dose (AERB)' },
  { action: 'radiology:report:write', module: 'radiology', sensitivity: 'sensitive', label: 'Draft Imaging Report' },
  { action: 'radiology:report:verify', module: 'radiology', sensitivity: 'sensitive', label: 'Sign & Finalize Imaging Report' },
  { action: 'radiology:report:amend', module: 'radiology', sensitivity: 'restricted', label: 'Amend Signed Diagnostic Imaging Report' },

  // ── 7. Pharmacy & Dispensing ──
  { action: 'pharmacy:stock:read', module: 'pharmacy', sensitivity: 'standard', label: 'View Pharmacy Inventory & Batch Expiries' },
  { action: 'pharmacy:stock:write', module: 'pharmacy', sensitivity: 'standard', label: 'Update Stock Levels & Receive Goods' },
  { action: 'pharmacy:dispense', module: 'pharmacy', sensitivity: 'sensitive', label: 'Dispense Medicine against Prescription' },
  { action: 'pharmacy:rx:verify', module: 'pharmacy', sensitivity: 'sensitive', label: 'Pharmacist Prescription Verification' },
  { action: 'pharmacy:h1register:write', module: 'pharmacy', sensitivity: 'restricted', label: 'Record Schedule H1/Narcotic Register' },
  { action: 'pharmacy:narcotic:audit', module: 'pharmacy', sensitivity: 'restricted', label: 'Audit NDPS Double-Lock Vault Balances' },
  { action: 'pharmacy:indent:approve', module: 'pharmacy', sensitivity: 'standard', label: 'Approve Ward Drug Requisition Indent' },
  { action: 'pharmacy:return', module: 'pharmacy', sensitivity: 'standard', label: 'Process Medication Returns & Restock' },

  // ── 8. Inpatient (IPD), Wards, OT & Nursing ──
  { action: 'ipd:admit', module: 'ipd', sensitivity: 'sensitive', label: 'Admit Patient to IPD Ward / Room' },
  { action: 'ipd:discharge', module: 'ipd', sensitivity: 'sensitive', label: 'Initiate Discharge & Summary Clearance' },
  { action: 'beds:read', module: 'ipd', sensitivity: 'standard', label: 'View Bed Status & Ward Occupancy' },
  { action: 'beds:assign', module: 'ipd', sensitivity: 'standard', label: 'Assign / Transfer Patient Bed' },
  { action: 'ot:schedule', module: 'ipd', sensitivity: 'sensitive', label: 'Schedule Operation Theatre Slot' },
  { action: 'ot:pac:approve', module: 'ipd', sensitivity: 'sensitive', label: 'Approve Pre-Anesthetic Clearance (PAC)' },
  { action: 'ot:checklist:sign', module: 'ipd', sensitivity: 'sensitive', label: 'Sign WHO Surgical Safety Checklist' },
  { action: 'nursing:chart:write', module: 'ipd', sensitivity: 'sensitive', label: 'Write Nursing Flowsheet & Intake/Output' },
  { action: 'nursing:medication:administer', module: 'ipd', sensitivity: 'sensitive', label: 'Record Nurse Medication Administration' },
  { action: 'vitals:read', module: 'ipd', sensitivity: 'standard', label: 'View Patient Vitals History' },
  { action: 'vitals:write', module: 'ipd', sensitivity: 'standard', label: 'Record Temperature, BP, Pulse, SpO2' },
  { action: 'icu:alert:acknowledge', module: 'ipd', sensitivity: 'sensitive', label: 'Acknowledge ICU Early Warning Alert' },

  // ── 9. Billing & Finance ──
  { action: 'billing:invoice:read', module: 'billing', sensitivity: 'financial', label: 'View Invoices & Receipts' },
  { action: 'billing:invoice:write', module: 'billing', sensitivity: 'financial', label: 'Generate Invoice & Collect Counter Payment' },
  { action: 'billing:discount:apply', module: 'billing', sensitivity: 'financial', label: 'Apply Authorized Discount' },
  { action: 'billing:refund:issue', module: 'billing', sensitivity: 'financial', label: 'Authorize & Issue Refund (Step-up)' },
  { action: 'billing:tariff:manage', module: 'billing', sensitivity: 'financial', label: 'Edit Hospital Tariff Master & Service Rates' },
  { action: 'billing:report:read', module: 'billing', sensitivity: 'financial', label: 'View Daily Financial Collections & Daybook' },
  { action: 'billing:daybook:close', module: 'billing', sensitivity: 'financial', label: 'Perform Cashier Day-End Closure' },
  { action: 'billing:insurance:claim', module: 'billing', sensitivity: 'financial', label: 'Generate Itemized Insurance Bill' },

  // ── 10. Insurance & TPA Desk ──
  { action: 'insurance:preauth:read', module: 'insurance', sensitivity: 'financial', label: 'View Pre-authorization Status' },
  { action: 'insurance:preauth:write', module: 'insurance', sensitivity: 'financial', label: 'Draft & Submit Pre-auth Request' },
  { action: 'insurance:query:respond', module: 'insurance', sensitivity: 'financial', label: 'Upload Medical Documents for TPA Query' },
  { action: 'insurance:claim:submit', module: 'insurance', sensitivity: 'financial', label: 'Submit Final TPA Claim & Discharge Bill' },
  { action: 'insurance:settlement:reconcile', module: 'insurance', sensitivity: 'financial', label: 'Reconcile Bank NEFT Settlement Remittance' },

  // ── 11. Inventory & Procurement ──
  { action: 'inventory:read', module: 'inventory', sensitivity: 'standard', label: 'View Stock Quantities & Reorder Levels' },
  { action: 'inventory:write', module: 'inventory', sensitivity: 'standard', label: 'Record Stock Intake & Transfers' },
  { action: 'po:create', module: 'inventory', sensitivity: 'standard', label: 'Create Purchase Order (Indent)' },
  { action: 'po:approve', module: 'inventory', sensitivity: 'financial', label: 'Approve Purchase Order (SoD separated)' },
  { action: 'grn:verify', module: 'inventory', sensitivity: 'standard', label: 'Verify Goods Receipt Note (GRN)' },
  { action: 'stock:audit:reconcile', module: 'inventory', sensitivity: 'standard', label: 'Perform Physical Stock Count Reconciliation' },
  { action: 'stock:expiry:condemn', module: 'inventory', sensitivity: 'standard', label: 'Condemn Expired Medicine & Discard' },
  { action: 'supplier:manage', module: 'inventory', sensitivity: 'standard', label: 'Manage Vendor Records' },

  // ── 12. Staff & HR Management ──
  { action: 'staff:profile:read', module: 'staff', sensitivity: 'standard', label: 'View Staff Roster & Duty Shifts' },
  { action: 'staff:manage', module: 'staff', sensitivity: 'hr_sensitive', label: 'Add/Edit Staff Profiles & Roles' },
  { action: 'staff:salary:read', module: 'staff', sensitivity: 'hr_sensitive', label: 'View Staff Salary & Bank Details' },
  { action: 'attendance:manage', module: 'staff', sensitivity: 'hr_sensitive', label: 'Manage Biometric / Duty Attendance' },
  { action: 'leave:approve', module: 'staff', sensitivity: 'hr_sensitive', label: 'Approve Staff Leave Applications' },
  { action: 'payroll:run', module: 'staff', sensitivity: 'hr_sensitive', label: 'Generate Monthly Payroll & Payslips' },
  { action: 'credential:verify', module: 'staff', sensitivity: 'hr_sensitive', label: 'Verify Doctor NMC / Nursing License' },

  // ── 13. Reports & MIS ──
  { action: 'reports:operational:read', module: 'reports', sensitivity: 'standard', label: 'View Operational OPD/IPD Footfall MIS' },
  { action: 'reports:financial:read', module: 'reports', sensitivity: 'financial', label: 'View Revenue & Departmental MIS' },
  { action: 'reports:clinical:read', module: 'reports', sensitivity: 'sensitive', label: 'View De-identified Clinical Morbidity Data' },
  { action: 'reports:nabh:export', module: 'reports', sensitivity: 'standard', label: 'Export NABH Quality Indicator Metrics' },
  { action: 'reports:statutory:generate', module: 'reports', sensitivity: 'sensitive', label: 'Generate Form-4 Birth/Death Registry' },
  { action: 'export:identified', module: 'reports', sensitivity: 'admin_critical', label: 'Export Identified Patient/Financial Data (Step-up)' },

  // ── 14. Communication & Messaging ──
  { action: 'chat:read', module: 'communication', sensitivity: 'standard', label: 'View Clinical Team Internal Chat' },
  { action: 'chat:write', module: 'communication', sensitivity: 'standard', label: 'Send Messages in Patient Care Thread' },
  { action: 'notifications:send', module: 'communication', sensitivity: 'standard', label: 'Trigger Automated Patient Reminders' },
  { action: 'broadcast:send', module: 'communication', sensitivity: 'standard', label: 'Send Departmental Operational Broadcast' },
  { action: 'sms:campaign:send', module: 'communication', sensitivity: 'standard', label: 'Send Public Health Camp SMS Alert' },

  // ── 15. Settings & Administration ──
  { action: 'settings:manage', module: 'iam', sensitivity: 'admin_critical', label: 'Manage Hospital Master Configuration' },
  { action: 'iam:user:invite', module: 'iam', sensitivity: 'admin_critical', label: 'Invite New Hospital Staff Member' },
  { action: 'iam:role:create', module: 'iam', sensitivity: 'admin_critical', label: 'Create Custom Access Roles' },
  { action: 'iam:role:delete', module: 'iam', sensitivity: 'admin_critical', label: 'Archive/Delete Custom Access Roles' },
  { action: 'iam:policy:create', module: 'iam', sensitivity: 'admin_critical', label: 'Create Custom Policy Statements' },
  { action: 'iam:policy:attach', module: 'iam', sensitivity: 'admin_critical', label: 'Attach / Modify Access Policies' },
  { action: 'iam:grant:approve', module: 'iam', sensitivity: 'admin_critical', label: 'Approve Staff Access Requests (Maker-checker)' },
  { action: 'apikey:manage', module: 'iam', sensitivity: 'admin_critical', label: 'Generate / Revoke API Keys & Service Accounts' },
  { action: 'apikey:rotate', module: 'iam', sensitivity: 'admin_critical', label: 'Rotate Service Account Credentials' },

  // ── 16. Security Audit & Governance ──
  { action: 'audit:read', module: 'audit', sensitivity: 'admin_critical', label: 'Read Immutable Security & Access Audit Log' },
  { action: 'audit:export', module: 'audit', sensitivity: 'admin_critical', label: 'Export Security Audit Trail' },
  { action: 'accessreview:run', module: 'audit', sensitivity: 'admin_critical', label: 'Initiate Periodic Access Certification' },
  { action: 'accessreview:certify', module: 'audit', sensitivity: 'admin_critical', label: 'Sign Off Access Certification Cycle' },

  // ── 17. Emergency & Break-Glass ──
  { action: 'emergency:access:breakglass', module: 'emergency', sensitivity: 'restricted', label: 'Invoke 30-min Tenant Break-Glass Emergency Access' },
  { action: 'emergency:code:broadcast', module: 'emergency', sensitivity: 'standard', label: 'Broadcast Code Blue / Hospital Emergency' },
];

/**
 * Backward compatibility mapping from coarse permissions to fine-grained actions.
 */
export const COARSE_TO_FINE_MAP = {
  'records:read': ['records:summary:read', 'records:clinical:read', 'records:attachments:read'],
  'records:write': ['records:clinical:write'],
  'billing:read': ['billing:invoice:read', 'billing:report:read'],
  'billing:write': ['billing:invoice:write', 'billing:discount:apply'],
  'staff:manage': ['staff:profile:read', 'staff:manage', 'attendance:manage'],
  'lab:read': ['lab:order:read'],
  'lab:enter_result': ['lab:result:enter'],
  'lab:verify': ['lab:result:verify'],
  'pharmacy:read': ['pharmacy:stock:read'],
  'pharmacy:dispense': ['pharmacy:dispense'],
  'vitals:read': ['vitals:read'],
  'vitals:write': ['vitals:write'],
  'beds:read': ['beds:read'],
  'beds:manage': ['beds:assign', 'ipd:admit', 'ipd:discharge'],
};

/**
 * Check if a fine-grained action is permitted for a provider tier.
 * T1 (Clinical): all permitted.
 * T2 (Health-adjacent): clinical diagnoses restricted.
 * T3 (Wellness/Store/Gym): NO clinical or diagnostic actions ever allowed.
 */
export function isActionAllowedForTier(tier, action) {
  if (tier === 'T1' || !tier) return true;
  const item = ACTION_CATALOG.find((a) => a.action === action);
  if (!item) return false;
  if (tier === 'T3') {
    return ['patients', 'appointments', 'inventory', 'staff', 'billing', 'communication'].includes(item.module) &&
      item.sensitivity !== 'sensitive' && item.sensitivity !== 'restricted';
  }
  if (tier === 'T2') {
    return item.sensitivity !== 'restricted';
  }
  return true;
}
