/**
 * CMS Dashboard Blueprint Master Specification (Backend)
 *
 * Single Source of Truth for the Complete Clinic Management System (CMS)
 * implementing the 70-Module, 24-Role Blueprint:
 *
 * 1. Admin, Users & Master Setup (Modules 1-2, 50, 56, 65, 66)
 * 2. Patient Identity & 360° Profile (Modules 3-5, 46-48)
 * 3. Appointments, Walk-in, Token & Queue (Modules 6-10)
 * 4. OPD, EMR & Clinical Workstation (Modules 11-16, 34-35)
 * 5. Diagnostics: Lab & Imaging (Modules 17-18)
 * 6. Procedures & Vaccinations (Modules 19-20)
 * 7. Pharmacy, Consumables & Inventory (Modules 21-24, 62)
 * 8. Billing, Cashier, Payments & Insurance (Modules 25-31, 39)
 * 9. Continuity of Care: Follow-up, Recall & CRM (Modules 32-33, 57-59)
 * 10. Finance, Doctor Settlements & Approvals (Modules 40-41, 61)
 * 11. HR, Roster, Payroll & Tasks (Modules 42-45, 60)
 * 12. Reports, Analytics & Audit Intelligence (Modules 51-54, 63-64, 67)
 */

export const CMS_CATEGORIES = {
  CAT_1_ADMIN_MASTERS: { id: 1, name: 'Admin, Users & Masters', description: 'Clinic configuration, roles, multi-branch, security & permissions' },
  CAT_2_PATIENT_IDENTITY: { id: 2, name: 'Patient Identity & 360° Profile', description: 'UHID registration, demographic records, family groups & consents' },
  CAT_3_APPOINTMENTS_QUEUE: { id: 3, name: 'Appointments & Queue Management', description: 'Doctor schedules, walk-ins, digital tokens & waiting room TV displays' },
  CAT_4_OPD_EMR: { id: 4, name: 'OPD, EMR & Clinical Workstation', description: 'Doctor workspace, vitals, ICD-10 diagnosis, e-prescriptions & telemedicine' },
  CAT_5_DIAGNOSTICS: { id: 5, name: 'Pathology & Diagnostic Imaging', description: 'Lab sample tracking, barcode accessioning, imaging worklist & reports' },
  CAT_6_PROCEDURES_VACCINES: { id: 6, name: 'Procedures & Immunization', description: 'Minor OT procedures, injections, dressings, wound care & vaccine schedules' },
  CAT_7_PHARMACY_INVENTORY: { id: 7, name: 'Pharmacy & Medical Store', description: 'Prescription dispensing, batch expiry, reorder thresholds & consumables' },
  CAT_8_BILLING_PAYMENTS: { id: 8, name: 'Billing, Cashier & Payments', description: 'Invoicing, split payments, UPI dynamic QR, receipts, insurance & packages' },
  CAT_9_CONTINUITY_CRM: { id: 9, name: 'Continuity of Care & CRM', description: 'Follow-ups, automated recall SMS/WhatsApp, feedback & referrals' },
  CAT_10_FINANCE_SETTLEMENTS: { id: 10, name: 'Accounts & Doctor Settlements', description: 'Day book, fee share splits, multi-level approvals & P&L statements' },
  CAT_11_HR_STAFF: { id: 11, name: 'HR, Staff Roster & Tasks', description: 'Employee records, biometric attendance, shift rosters & staff task queues' },
  CAT_12_ANALYTICS_AUDIT: { id: 12, name: 'Analytics, MIS & Audit Trails', description: 'Executive dashboards, compliance logs, asset tracking & automation triggers' },
};

export const CMS_MODULES_70 = [
  { id: 1, category: 1, name: 'Login + User Management', code: 'CMS-01', features: ['Multi-role login', 'Screen permissions', 'Session control', '2FA', 'Audit log'] },
  { id: 2, category: 1, name: 'Clinic Master Setup', code: 'CMS-02', features: ['Clinic profile', 'Rooms/Locations', 'Medical masters', 'Price tariff', 'Letterhead'] },
  { id: 3, category: 2, name: 'Patient Registration', code: 'CMS-03', features: ['Auto UHID', 'Demographics', 'Photo & QR Code', 'Duplicate detection', 'Merge'] },
  { id: 4, category: 2, name: 'Patient Profile (360°)', code: 'CMS-04', features: ['Allergies', 'Vitals history', 'Past prescriptions', 'Lab reports', 'Timeline'] },
  { id: 5, category: 2, name: 'Family / Dependent Management', code: 'CMS-05', features: ['Family account', 'Shared address', 'Family appointments', 'Consolidated billing'] },
  { id: 6, category: 3, name: 'Appointment Management', code: 'CMS-06', features: ['Doctor calendar', 'Slot duration', 'Holiday / Leave blocking', 'Overbooking', 'Reschedule'] },
  { id: 7, category: 3, name: 'Online Appointment', code: 'CMS-07', features: ['Web booking portal', 'Pre-payment', 'Instant confirmation', 'Cancellation & refund'] },
  { id: 8, category: 3, name: 'Walk-in Management', code: 'CMS-08', features: ['Quick walk-in check-in', 'Doctor selection', 'Instant token generation', 'Queue placement'] },
  { id: 9, category: 3, name: 'Token / Queue Management', code: 'CMS-09', features: ['Auto token counter', 'Doctor queue', 'Room queue', 'Priority token', 'TV Display screen'] },
  { id: 10, category: 3, name: 'Reception / Front Desk', code: 'CMS-10', features: ['Daily census', 'Doctor availability', 'OPD slip print', 'Collection shortcut'] },
  { id: 11, category: 4, name: 'OPD / Consultation Management', code: 'CMS-11', features: ['Patient examination', 'Clinical notes', 'Assessment', 'Treatment plan', 'Encounter lifecycle'] },
  { id: 12, category: 4, name: 'EMR / EHR', code: 'CMS-12', features: ['Chief complaint', 'Present illness', 'Medical history', 'Specialty templates', 'Digital signature'] },
  { id: 13, category: 4, name: 'Vitals Management', code: 'CMS-13', features: ['BP', 'Pulse', 'Temperature', 'SpO2', 'Resp Rate', 'Weight', 'Height', 'BMI', 'Blood Sugar'] },
  { id: 14, category: 4, name: 'Diagnosis Management', code: 'CMS-14', features: ['ICD-10 search', 'Provisional vs Final', 'Favorite diagnosis', 'Diagnostic history'] },
  { id: 15, category: 4, name: 'Prescription Management', code: 'CMS-15', features: ['Dosage, frequency, duration', 'Drug allergy alert', 'DDI interaction check', 'e-Rx PDF / WhatsApp'] },
  { id: 16, category: 4, name: 'Investigation / Test Ordering', code: 'CMS-16', features: ['Pathology order', 'Radiology order', 'Priority marking', 'Clinical requisition notes'] },
  { id: 17, category: 5, name: 'Lab Management', code: 'CMS-17', features: ['Accession barcode', 'Sample collection', 'Result entry', 'Reference ranges', 'Pathologist signoff'] },
  { id: 18, category: 5, name: 'Radiology / Diagnostic Imaging', code: 'CMS-18', features: ['Modality scheduling', 'DICOM viewer link', 'Radiologist report', 'Urgent study flag'] },
  { id: 19, category: 6, name: 'Procedure Management', code: 'CMS-19', features: ['Injection room', 'Dressing & suturing', 'Nebulization', 'Consumable deduction', 'Procedure note'] },
  { id: 20, category: 6, name: 'Vaccination Management', code: 'CMS-20', features: ['Immunization schedule', 'Batch & expiry tracking', 'Vaccination certificate', 'Due alerts'] },
  { id: 21, category: 7, name: 'Pharmacy Management', code: 'CMS-21', features: ['e-Rx dispensing', 'Batch selection', 'Expiry guard', 'Generic substitution', 'Sales return'] },
  { id: 22, category: 7, name: 'Inventory / Store Management', code: 'CMS-22', features: ['Item master', 'SKU barcodes', 'Stock ledger', 'Min/Max reorder', 'Wastage & adjustment'] },
  { id: 23, category: 7, name: 'Purchase Management', code: 'CMS-23', features: ['Indent creation', 'Vendor RFQ', 'Purchase Order (PO)', 'Goods Received Note (GRN)', 'Invoice matching'] },
  { id: 24, category: 7, name: 'Vendor Management', code: 'CMS-24', features: ['Vendor directory', 'GST/PAN details', 'Credit terms', 'Outstanding ledger', 'Payment history'] },
  { id: 25, category: 8, name: 'Billing Management', code: 'CMS-25', features: ['Consultation fee', 'Procedure billing', 'Pharmacy bill', 'Lab charges', 'Discount & waiver rules'] },
  { id: 26, category: 8, name: 'Payment Management', code: 'CMS-26', features: ['Cash, Card, UPI', 'Split payment', 'Part payment', 'Official receipt', 'Shift reconciliation'] },
  { id: 27, category: 8, name: 'Payment Gateway', code: 'CMS-27', features: ['Dynamic UPI QR', 'Payment links', 'Webhook auto-verification', 'Instant settlement reconciliation'] },
  { id: 28, category: 8, name: 'Insurance / Corporate Billing', code: 'CMS-28', features: ['TPA pre-auth', 'Corporate credit policy', 'Claim filing', 'Deduction tracking', 'Copay'] },
  { id: 29, category: 8, name: 'Package Management', code: 'CMS-29', features: ['Health checkup packages', 'Bundled lab & consult', 'Package validity', 'Corporate discounts'] },
  { id: 30, category: 8, name: 'Price / Tariff Management', code: 'CMS-30', features: ['Doctor-wise fee', 'Service rate master', 'Corporate tariff', 'Effective date versioning'] },
  { id: 31, category: 8, name: 'Membership Management', code: 'CMS-31', features: ['Clinic loyalty card', 'Free consults quota', 'Discount benefits', 'Renewal reminders'] },
  { id: 32, category: 9, name: 'Follow-up Management', code: 'CMS-32', features: ['Target follow-up date', 'Free follow-up window', 'Doctor instructions', 'Auto appointment booking'] },
  { id: 33, category: 9, name: 'Recall / Patient Reminder', code: 'CMS-33', features: ['Vaccine recalls', 'Chronic care reminders', 'Medicine refills', 'Annual health checkups'] },
  { id: 34, category: 4, name: 'Home Visit Management', code: 'CMS-34', features: ['Home visit dispatch', 'Clinician assignment', 'Mobile vitals entry', 'Travel charge billing'] },
  { id: 35, category: 4, name: 'Telemedicine', code: 'CMS-35', features: ['Encrypted video call', 'Waiting room', 'Instant e-Prescription', 'Chat & file upload'] },
  { id: 36, category: 2, name: 'Patient Portal', code: 'CMS-36', features: ['Patient dashboard', 'Download prescriptions', 'View lab reports', 'Book slots', 'Payment history'] },
  { id: 37, category: 4, name: 'Doctor Portal', code: 'CMS-37', features: ['Consultation workstation', 'Live queue', 'EMR notes', 'Order investigation', 'Earnings overview'] },
  { id: 38, category: 3, name: 'Reception Dashboard', code: 'CMS-38', features: ['Walk-ins vs Appointments', 'Waiting count', 'Doctor rooms', 'Fast check-in', 'Token desk'] },
  { id: 39, category: 8, name: 'Cashier Management', code: 'CMS-39', features: ['Shift opening float', 'Cash drawer reconciliation', 'Receipt generator', 'Daily cash handover'] },
  { id: 40, category: 10, name: 'Accounts / Finance', code: 'CMS-40', features: ['Chart of accounts', 'Day book', 'Income vs Expenses', 'Trial balance', 'GST summary'] },
  { id: 41, category: 10, name: 'Doctor Settlement', code: 'CMS-41', features: ['Consultation revenue share', 'Procedure split', 'Monthly statement', 'Paid vs Outstanding'] },
  { id: 42, category: 11, name: 'Staff Management', code: 'CMS-42', features: ['Employee directory', 'Department allocation', 'Credential documents', 'Employment status'] },
  { id: 43, category: 11, name: 'Attendance Management', code: 'CMS-43', features: ['Check-in / Check-out', 'Biometric / Device sync', 'Late arrival flag', 'Attendance correction'] },
  { id: 44, category: 11, name: 'Shift / Roster Management', code: 'CMS-44', features: ['Morning/Evening/Night shifts', 'Doctor duty roster', 'Weekly offs', 'Conflict detection'] },
  { id: 45, category: 11, name: 'Payroll', code: 'CMS-45', features: ['Salary structure', 'Incentives & overtime', 'Statutory deductions (PF/ESI/TDS)', 'Payslip generation'] },
  { id: 46, category: 2, name: 'Document Management', code: 'CMS-46', features: ['ID proof scans', 'External medical records', 'Clinical photos', 'Version control', 'Access audit'] },
  { id: 47, category: 2, name: 'Consent Management', code: 'CMS-47', features: ['Procedure consent', 'Injection consent', 'Digital patient signature', 'Witness sign', 'Audit trail'] },
  { id: 48, category: 2, name: 'Medical Certificate Management', code: 'CMS-48', features: ['Fitness certificate', 'Sick leave note', 'Treatment cert', 'Referral letter', 'QR verification'] },
  { id: 49, category: 9, name: 'Notification Management', code: 'CMS-49', features: ['SMS templates', 'WhatsApp API integration', 'Email dispatch', 'Appointment confirmation alerts'] },
  { id: 50, category: 1, name: 'Template Management', code: 'CMS-50', features: ['Rx templates', 'Letterhead customization', 'Invoice templates', 'Clinical note shortcuts'] },
  { id: 51, category: 12, name: 'Global Search', code: 'CMS-51', features: ['Instant multi-entity search: UHID, Mobile, Invoice #, Prescription #, Token #'] },
  { id: 52, category: 12, name: 'Audit Log', code: 'CMS-52', features: ['Immutable audit trail', 'Who + What + When', 'Old vs New diffs', 'Compliance export'] },
  { id: 53, category: 12, name: 'Reporting / MIS', code: 'CMS-53', features: ['Daily census report', 'Doctor productivity', 'Department revenue', 'Inventory stock report', 'TAT'] },
  { id: 54, category: 12, name: 'Clinic Dashboard', code: 'CMS-54', features: ['Executive overview', 'Daily footfall', 'Live queue counter', 'Revenue splits', 'Urgent alerts'] },
  { id: 55, category: 1, name: 'Multi-Doctor Management', code: 'CMS-55', features: ['Doctor-wise rooms', 'Separate schedules', 'Specialty fee structures', 'Individual queue management'] },
  { id: 56, category: 1, name: 'Multi-Branch Management', code: 'CMS-56', features: ['Organization hierarchy', 'Branch-wise billing', 'Inter-branch patient transfer', 'Central admin'] },
  { id: 57, category: 9, name: 'CRM / Patient Relations', code: 'CMS-57', features: ['Patient interaction log', 'Missed appointment follow-up', 'Retention tracking', 'Loyalty tags'] },
  { id: 58, category: 9, name: 'Patient Feedback', code: 'CMS-58', features: ['Post-visit star rating', 'Doctor feedback', 'Waiting time rating', 'Complaint escalation'] },
  { id: 59, category: 9, name: 'Referral Management', code: 'CMS-59', features: ['Referring doctors directory', 'Referral source tracking', 'Incentive calculation', 'Referral report'] },
  { id: 60, category: 11, name: 'Task / Work Management', code: 'CMS-60', features: ['Staff task assignment', 'Sample collection tasks', 'Report upload reminders', 'Status tracking'] },
  { id: 61, category: 10, name: 'Approval System', code: 'CMS-61', features: ['Discount approval', 'Refund authorization', 'Stock adjustment approval', 'Multi-level workflow'] },
  { id: 62, category: 7, name: 'Inventory Barcode / QR', code: 'CMS-62', features: ['Scan-to-receive', 'Scan-to-dispense', 'Physical audit scanner', 'Batch barcode labeling'] },
  { id: 63, category: 12, name: 'Asset Management', code: 'CMS-63', features: ['Medical equipment registry', 'Asset tags', 'Serial numbers', 'Warranty & AMC tracking'] },
  { id: 64, category: 12, name: 'Maintenance Management', code: 'CMS-64', features: ['Breakdown service tickets', 'Preventive maintenance schedule', 'Calibration logs', 'Equipment downtime'] },
  { id: 65, category: 1, name: 'Backup / Security', code: 'CMS-65', features: ['Encrypted DB backups', 'Role-based access control', 'Session timeout', 'Disaster recovery drill'] },
  { id: 66, category: 1, name: 'API / Integration', code: 'CMS-66', features: ['ABDM M1-M3 integration', 'Payment gateway webhooks', 'LIS/Analyzer bridges', 'WhatsApp Cloud API'] },
  { id: 67, category: 12, name: 'Webhook / Automation Engine', code: 'CMS-67', features: ['Event triggers', 'Booking -> WhatsApp reminder', 'Payment -> Receipt generation', 'Low stock alerts'] },
  { id: 68, category: 4, name: 'Patient Journey (Start to End)', code: 'CMS-68', features: ['Complete 10-step clinical flow from registration to complete medical history'] },
  { id: 69, category: 1, name: 'Clinic Admin Dashboard', code: 'CMS-69', features: ['Complete clinic operational cockpit with footfall, billing, staff, queue & alerts'] },
  { id: 70, category: 1, name: 'Complete Clinic System Structure', code: 'CMS-70', features: ['End-to-end multi-tenant polyclinic architecture with unified central data models'] },
];

export const CMS_ROLE_SPECS = {
  // 1. Super Admin
  super_admin: {
    roleKey: 'super_admin',
    category: 1,
    title: 'Super Admin Dashboard',
    subtitle: 'SaaS multi-clinic platform governance, subscription billing & system health',
    permissions: ['platform:manage', 'clinics:manage', 'subscriptions:manage', 'users:manage', 'audit:read'],
    sidebarSections: ['Dashboard', 'Clinics', 'Subscriptions', 'Users', 'System Health', 'Logs', 'Global Settings'],
    kpis: [
      { label: 'Registered Clinics', value: '48', hint: 'Active SaaS tenants' },
      { label: 'Platform Doctors', value: '312', hint: 'Licensed practitioners' },
      { label: 'MRR Subscriptions', value: '₹4,80,000', hint: 'Monthly recurring revenue' },
      { label: 'System Health', value: '99.98%', hint: 'API & cluster uptime' },
    ],
    tasks: [
      { id: 'sa-1', text: 'Approve new clinic onboarding verification for Apollo Polyclinic' },
      { id: 'sa-2', text: 'Review cross-tenant isolation security audit report' },
      { id: 'sa-3', text: 'Verify automated encrypted offsite backup sync' },
    ],
    alerts: [
      { id: 'sa-a1', text: '3 clinic subscription renewals due this week', level: 'info' },
      { id: 'sa-a2', text: 'All microservices & payment webhooks operational', level: 'info' },
    ],
    workQueues: ['Pending Clinic Onboarding', 'Active Subscriptions', 'Failed Webhook Events', 'Security Audit Logs'],
    quickActions: ['Add New Clinic', 'Create Subscription Plan', 'Audit Access Logs', 'Check Server Health'],
  },

  // 2. Clinic Owner / Admin
  clinic_admin: {
    roleKey: 'clinic_admin',
    category: 1,
    title: 'Clinic Owner / Admin Dashboard',
    subtitle: 'Daily operations, patient footfall, doctor availability, revenue & inventory',
    permissions: ['clinic:manage', 'billing:manage', 'staff:manage', 'reports:read', 'settings:manage'],
    sidebarSections: ['Dashboard', 'Patients', 'Appointments', 'Doctors', 'Staff', 'Services', 'Billing', 'Reports', 'Settings'],
    kpis: [
      { label: "Today's Footfall", value: '82', hint: '65 appointments + 17 walk-ins' },
      { label: 'Waiting in Queue', value: '9', hint: 'Across all consulting rooms' },
      { label: 'Completed OPD', value: '64', hint: 'Consultations finished' },
      { label: "Today's Revenue", value: '₹98,500', hint: 'Consult + Lab + Rx + Proc' },
    ],
    tasks: [
      { id: 'ca-1', text: 'Review daily revenue collection breakdown vs cashier drawer' },
      { id: 'ca-2', text: 'Authorize 2 pending discount waiver requests from reception' },
      { id: 'ca-3', text: 'Review monthly doctor fee share settlement statement' },
    ],
    alerts: [
      { id: 'ca-a1', text: '3 medicines below minimum reorder threshold in pharmacy', level: 'warning' },
      { id: 'ca-a2', text: 'Dr. Vivek Verma arriving 20 mins late for evening OPD', level: 'info' },
    ],
    workQueues: ['Today Consultation Census', 'Pending Bill Settlements', 'Inventory Reorder Alerts', 'Staff Duty Status'],
    quickActions: ['Register Patient (UHID)', 'Book Walk-in Slot', 'Generate Invoice', 'Add Doctor Schedule', 'View MIS Report'],
  },

  // 3. Branch Manager
  clinic_branch_manager: {
    roleKey: 'clinic_branch_manager',
    category: 1,
    title: 'Branch Manager Dashboard',
    subtitle: 'Branch-level patient flow, doctor room allocation, staff attendance & daily closing',
    permissions: ['branch:manage', 'staff:manage', 'billing:read', 'queue:manage'],
    sidebarSections: ['Dashboard', 'Appointments', 'Patients', 'Doctors', 'Staff', 'Operations', 'Billing Summary', 'Reports'],
    kpis: [
      { label: 'Branch Footfall', value: '38', hint: 'South City Branch' },
      { label: 'Doctors On-Duty', value: '4 / 5', hint: 'Consulting rooms 1-4 active' },
      { label: 'Avg Waiting Time', value: '14 min', hint: 'Below 20m SLA target' },
      { label: 'Branch Collection', value: '₹46,200', hint: 'Cash + UPI + Card' },
    ],
    tasks: [
      { id: 'bm-1', text: 'Inspect consulting room #3 sanitization & equipment readiness' },
      { id: 'bm-2', text: 'Verify front-desk cash drawer opening float (₹2,500)' },
      { id: 'bm-3', text: 'Review branch staff evening shift roster assignments' },
    ],
    alerts: [
      { id: 'bm-a1', text: 'Room #2 waiting queue exceeded 6 patients — alert front desk', level: 'warning' },
      { id: 'bm-a2', text: 'All branch laboratory test orders processed on schedule', level: 'info' },
    ],
    workQueues: ['Branch Patient Queue', 'Doctor Room Allocations', 'Daily Cash Closing', 'Staff Attendance Log'],
    quickActions: ['Allocate Doctor Room', 'Check Shift Roster', 'Review Branch Revenue', 'Approve Authorized Discount'],
  },

  // 4. Doctor / Consultant
  clinic_doctor: {
    roleKey: 'clinic_doctor',
    category: 4,
    title: 'Doctor Clinical Workstation',
    subtitle: 'Live patient queue, EMR, vitals, ICD-10 diagnosis, e-prescriptions & test ordering',
    permissions: ['consultation:write', 'records:write', 'prescriptions:write', 'lab:order'],
    sidebarSections: ['Dashboard', 'My Queue', 'Appointments', 'Patients', 'Consultation', 'Prescriptions', 'Investigations', 'Reports', 'Follow-ups'],
    kpis: [
      { label: 'Queue Waiting', value: '6', hint: 'Next: Token #18 (Rahul Sharma)' },
      { label: 'In Consultation', value: '1', hint: 'Token #17 in progress' },
      { label: 'Completed Today', value: '24', hint: 'Signed e-prescriptions' },
      { label: 'Follow-ups Due', value: '8', hint: 'Review visits scheduled' },
    ],
    tasks: [
      { id: 'dr-1', text: 'Start consultation for Token #18 — Acute Bronchitis follow-up' },
      { id: 'dr-2', text: 'Review pathology report for Meena Gupta (CBC + ESR flagged)' },
      { id: 'dr-3', text: 'Sign pending fitness medical certificate for Anil Saxena' },
    ],
    alerts: [
      { id: 'dr-a1', text: 'Patient Token #18 has known Penicillin allergy — flagged on banner', level: 'warning' },
      { id: 'dr-a2', text: 'High BP recorded by nurse (158/96 mmHg) for Token #19', level: 'warning' },
    ],
    workQueues: ['Live Patient Waiting Queue', 'In-Consultation Encounter', 'Pending Lab Results', 'Scheduled Follow-ups'],
    quickActions: ['Call Next Patient', 'Open EMR Workspace', 'Add ICD-10 Diagnosis', 'Write e-Prescription', 'Order Lab Test'],
  },

  // 5. Receptionist / Front Desk
  clinic_receptionist: {
    roleKey: 'clinic_receptionist',
    category: 3,
    title: 'Reception & Front Desk Console',
    subtitle: 'UHID patient registration, walk-in ticketing, appointment check-in & token dispatch',
    permissions: ['patients:write', 'appointments:write', 'tokens:manage', 'billing:collect'],
    sidebarSections: ['Dashboard', 'Patients', 'Appointments', 'Check-in', 'Queue', 'Billing', 'Payments', 'Communication'],
    kpis: [
      { label: "Today's Registrations", value: '19', hint: 'New UHIDs generated' },
      { label: 'Walk-ins Handled', value: '28', hint: 'Direct desk check-ins' },
      { label: 'Active Queue Tokens', value: '14', hint: 'Waiting in reception area' },
      { label: 'Consult Fee Collected', value: '₹14,500', hint: 'Registration desk counter' },
    ],
    tasks: [
      { id: 'rec-1', text: 'Register walk-in patient Sunil Rao and issue Token #22' },
      { id: 'rec-2', text: 'Check-in 10:30 AM appointment for Dr. Priya Patel' },
      { id: 'rec-3', text: 'Print OPD consultation slip and route patient to Vitals station' },
    ],
    alerts: [
      { id: 'rec-a1', text: 'Token #14 waiting time reached 22 mins in Room #1 queue', level: 'warning' },
      { id: 'rec-a2', text: 'Dr. Ramesh Sharma OPD slots 100% booked till 1:00 PM', level: 'info' },
    ],
    workQueues: ['Live Reception Desk Queue', "Today's Appointment Schedule", 'New Patient Registrations', 'Pending Slip Prints'],
    quickActions: ['Register New Patient (UHID)', 'Issue Queue Token', 'Check-in Appointment', 'Print OPD Slip', 'Collect Consult Fee'],
  },

  // 6. Nurse / Medical Assistant
  clinic_nurse: {
    roleKey: 'clinic_nurse',
    category: 4,
    title: 'Nurse & Clinical Support Workstation',
    subtitle: 'Vitals recording, triage assessment, injections, dressings, nebulization & nursing notes',
    permissions: ['vitals:write', 'nursing:write', 'procedures:write'],
    sidebarSections: ['Dashboard', 'Assigned Patients', 'Vitals', 'Tasks', 'Procedures', 'Nursing Notes'],
    kpis: [
      { label: 'Vitals Pending', value: '5', hint: 'Patients checked-in awaiting triage' },
      { label: 'Vitals Recorded', value: '38', hint: 'BP, Pulse, Temp, SpO2 & BMI' },
      { label: 'Procedures Done', value: '12', hint: 'Injections, dressings, neb' },
      { label: 'Abnormal Vitals', value: '3', hint: 'Flagged with clinical alert' },
    ],
    tasks: [
      { id: 'nr-1', text: 'Record pre-consultation vitals for Token #20 (Suresh Kumar)' },
      { id: 'nr-2', text: 'Administer prescribed Tetanus Toxoid (TT) 0.5ml IM in Room B' },
      { id: 'nr-3', text: 'Perform sterile dressing for minor hand laceration (Token #15)' },
    ],
    alerts: [
      { id: 'nr-a1', text: 'Token #20 SpO2 reading is 91% on room air — notify doctor immediately', level: 'warning' },
      { id: 'nr-a2', text: 'Procedure Room nebulizer sterilized and ready for next patient', level: 'info' },
    ],
    workQueues: ['Patients Awaiting Vitals', 'Pending Clinical Procedures', 'Completed Triage Assessments', 'Consumables Checklist'],
    quickActions: ['Record Patient Vitals', 'Perform Injection / Nebulization', 'Add Nursing Note', 'Escalate Abnormal Vital'],
  },

  // 7. Lab Technician
  clinic_lab_tech: {
    roleKey: 'clinic_lab_tech',
    category: 5,
    title: 'Pathology & Diagnostic Laboratory',
    subtitle: 'Sample collection barcodes, accessioning, automated analyzer imports & result verification',
    permissions: ['lab:write', 'lab:read', 'samples:manage'],
    sidebarSections: ['Dashboard', 'Lab Orders', 'Samples', 'Workbench', 'QC', 'Results', 'Equipment'],
    kpis: [
      { label: 'Samples Pending', value: '7', hint: 'Awaiting blood/urine collection' },
      { label: 'In Processing', value: '11', hint: 'On hematology/biochemistry bench' },
      { label: 'Results Entered', value: '29', hint: 'Ready for doctor signoff' },
      { label: 'Panic / Critical Values', value: '1', hint: 'Serum Potassium 6.2 mmol/L' },
    ],
    tasks: [
      { id: 'lab-1', text: 'Draw EDTA blood sample for Token #12 (CBC + HbA1c)' },
      { id: 'lab-2', text: 'Enter biochemistry lipid profile results for LabOrder #882' },
      { id: 'lab-3', text: 'Dispatch verified Dengue NS1 rapid report to patient portal' },
    ],
    alerts: [
      { id: 'lab-a1', text: 'CRITICAL VALUE: Potassium 6.2 on LabOrder #880 — doctor notified', level: 'warning' },
      { id: 'lab-a2', text: 'Hematology analyzer daily calibration & QC passed', level: 'info' },
    ],
    workQueues: ['Sample Collection Queue', 'Active Test Workbench', 'Results Awaiting Verification', 'Critical Value Alerts'],
    quickActions: ['Scan Sample Barcode', 'Enter Test Results', 'Import Analyzer QC Run', 'Notify Critical Panic Value'],
  },

  // 8. Radiology Technician
  clinic_radiology_tech: {
    roleKey: 'clinic_radiology_tech',
    category: 5,
    title: 'Radiology & Imaging Console',
    subtitle: 'X-Ray, Ultrasound, ECG, Echo study scheduling, DICOM transfer & radiologist worklist',
    permissions: ['radiology:write', 'radiology:read'],
    sidebarSections: ['Dashboard', 'Imaging Queue', 'Studies', 'Patient Preparation', 'Equipment', 'Handover'],
    kpis: [
      { label: 'Scans Pending', value: '4', hint: 'Chest X-Ray & Knee PA/Lat' },
      { label: 'In Progress', value: '1', hint: 'X-Ray Room #1 active' },
      { label: 'Completed Studies', value: '14', hint: 'Images uploaded to PACS' },
      { label: 'Reports Ready', value: '12', hint: 'Signed by radiologist' },
    ],
    tasks: [
      { id: 'rad-1', text: 'Perform digital Chest X-Ray PA view for Token #16' },
      { id: 'rad-2', text: 'Upload DICOM study series to Orthanc PACS server' },
      { id: 'rad-3', text: 'Record 12-lead resting ECG for Token #21 (chest pain evaluation)' },
    ],
    alerts: [
      { id: 'rad-a1', text: 'Urgent STAT X-Ray ordered for Token #21 — room prepped', level: 'warning' },
      { id: 'rad-a2', text: 'X-Ray tube temperature normal, lead aprons inspected', level: 'info' },
    ],
    workQueues: ['Imaging Study Worklist', 'DICOM Upload Queue', 'Pending Radiologist Reports', 'Equipment Status Log'],
    quickActions: ['Start Imaging Study', 'Upload DICOM Images', 'Attach Study to EMR', 'Log Equipment Maintenance'],
  },

  // 9. Pharmacist
  clinic_pharmacist: {
    roleKey: 'clinic_pharmacist',
    category: 7,
    title: 'Clinic Pharmacy & Dispensing Station',
    subtitle: 'Digital prescription queue, batch selection, expiry guard, substitution & billing',
    permissions: ['pharmacy:write', 'pharmacy:read', 'inventory:manage'],
    sidebarSections: ['Dashboard', 'Prescriptions', 'Dispensing', 'Sales', 'Returns', 'Inventory', 'Expiry'],
    kpis: [
      { label: 'Pending Dispensing', value: '8', hint: 'Digital e-Rx received from doctors' },
      { label: 'Dispensed Today', value: '46', hint: 'Prescriptions fulfilled' },
      { label: 'Pharmacy Sales', value: '₹28,400', hint: 'Rx + OTC medicine counter' },
      { label: 'Near Expiry (30d)', value: '3', hint: 'Batches flagged for return' },
    ],
    tasks: [
      { id: 'ph-1', text: 'Fulfill digital e-Rx for Token #14 (Amoxicillin-Clav 625mg + Montelukast)' },
      { id: 'ph-2', text: 'Verify batch expiry date for newly received Insulin Glargine vials' },
      { id: 'ph-3', text: 'Record OTC pharmacy sale and print GST tax invoice' },
    ],
    alerts: [
      { id: 'ph-a1', text: 'Low stock warning: Paracetamol 650mg tablets down to 40 strips', level: 'warning' },
      { id: 'ph-a2', text: 'Azithromycin 500mg Batch #AZ-904 expires in 25 days', level: 'info' },
    ],
    workQueues: ['Digital Prescription Queue', 'Counter Dispensing Tasks', 'Near-Expiry Stock Ledger', 'Low Stock Reorder List'],
    quickActions: ['Dispense Digital e-Rx', 'New Pharmacy Sale', 'Scan Medicine Barcode', 'Check Batch Expiry'],
  },

  // 10. Cashier
  clinic_cashier: {
    roleKey: 'clinic_cashier',
    category: 8,
    title: 'Cashier & Invoicing Station',
    subtitle: 'Bill settlements, split payment collection, UPI Dynamic QR, official receipts & till closing',
    permissions: ['billing:collect', 'receipts:manage', 'cashier:manage'],
    sidebarSections: ['Dashboard', 'Invoices', 'Payments', 'Receipts', 'Refund Requests', 'Cash Closing'],
    kpis: [
      { label: 'Shift Collection', value: '₹34,800', hint: 'Current counter till' },
      { label: 'Cash in Drawer', value: '₹12,400', hint: 'Physical currency' },
      { label: 'UPI QR Payments', value: '₹18,200', hint: 'Direct bank settlement' },
      { label: 'Pending Invoices', value: '4', hint: 'Unpaid consult & lab bills' },
    ],
    tasks: [
      { id: 'cs-1', text: 'Collect ₹650 for Invoice #INV-108 (Consultation + Pharmacy bill)' },
      { id: 'cs-2', text: 'Generate Dynamic UPI QR code for Token #19 payment' },
      { id: 'cs-3', text: 'Print official stamped tax receipt for patient reimbursement' },
    ],
    alerts: [
      { id: 'cs-a1', text: '4 invoices pending settlement at counter before patient exit', level: 'warning' },
      { id: 'cs-a2', text: 'Shift cash drawer float balanced with zero discrepancy', level: 'info' },
    ],
    workQueues: ['Pending Bill Settlements', 'Completed Transactions', 'Receipt Print Queue', 'Shift Cash Balance'],
    quickActions: ['Open Invoice Settlement', 'Scan UPI Dynamic QR', 'Print Stamped Receipt', 'Close Shift & Handover'],
  },

  // 11. Accountant / Finance
  clinic_accountant: {
    roleKey: 'clinic_accountant',
    category: 10,
    title: 'Accounts & Financial Management',
    subtitle: 'Chart of accounts, daybook ledger, doctor revenue settlements, expenses & GST returns',
    permissions: ['finance:manage', 'billing:read', 'reports:finance'],
    sidebarSections: ['Dashboard', 'Accounts', 'Expenses', 'Receivables', 'Payables', 'Reconciliation', 'Financial Reports'],
    kpis: [
      { label: "Today's Clinic Revenue", value: '₹98,500', hint: 'Total gross income' },
      { label: 'Operating Expenses', value: '₹14,200', hint: 'Daily utilities & supplies' },
      { label: 'Doctor Payable', value: '₹42,800', hint: 'Consultation fee share' },
      { label: 'Outstanding Balance', value: '₹8,500', hint: 'Corporate / TPA claims' },
    ],
    tasks: [
      { id: 'acc-1', text: 'Reconcile UPI settlement payouts from Razorpay/PayU with bank book' },
      { id: 'acc-2', text: 'Generate monthly doctor consultation share statement for Dr. Sharma' },
      { id: 'acc-3', text: 'Post daily supplier expense vouchers into accounting ledger' },
    ],
    alerts: [
      { id: 'acc-a1', text: 'Vendor payment of ₹18,500 due in 48 hours to MedPlus Distributors', level: 'info' },
      { id: 'acc-a2', text: 'Quarterly GST input credit report ready for download', level: 'info' },
    ],
    workQueues: ['Daily Revenue Reconciliations', 'Doctor Share Statements', 'Vendor Payable Invoices', 'Expense Vouchers'],
    quickActions: ['Record Expense Voucher', 'Generate Doctor Settlement', 'Reconcile Bank Book', 'Export P&L Report'],
  },

  // 12. Store / Inventory Manager
  clinic_inventory_mgr: {
    roleKey: 'clinic_inventory_mgr',
    category: 7,
    title: 'Store & Inventory Management',
    subtitle: 'Consumables, syringes, surgical items, min/max thresholds, batch audit & store issues',
    permissions: ['inventory:manage', 'store:manage'],
    sidebarSections: ['Dashboard', 'Items', 'Stock', 'Transfers', 'Indents', 'Expiry', 'Stock Reports'],
    kpis: [
      { label: 'Total Catalog SKUs', value: '420', hint: 'Medical consumables & drugs' },
      { label: 'Low Stock Alerts', value: '6', hint: 'Below safety reorder level' },
      { label: 'Pending Store Indents', value: '3', hint: 'OPD & Procedure rooms' },
      { label: 'Stock Valuation', value: '₹6,45,000', hint: 'Total inventory in hand' },
    ],
    tasks: [
      { id: 'inv-1', text: 'Issue sterile gloves (size 7.0) and IV cannulas to Procedure Room' },
      { id: 'inv-2', text: 'Perform weekly physical stock count for high-value surgical items' },
      { id: 'inv-3', text: 'Create purchase indent for disposable syringes & cotton rolls' },
    ],
    alerts: [
      { id: 'inv-a1', text: 'Disposable syringe 5ml stock reached reorder point (120 units left)', level: 'warning' },
      { id: 'inv-a2', text: 'All incoming delivery GRNs verified against purchase orders', level: 'info' },
    ],
    workQueues: ['Pending Department Indents', 'Low Stock Reorder List', 'Near Expiry Items', 'Physical Audit Discrepancies'],
    quickActions: ['Receive Stock (GRN)', 'Issue Store Indent', 'Adjust Physical Stock', 'Generate Reorder List'],
  },

  // 13. Purchase Officer
  clinic_purchase_officer: {
    roleKey: 'clinic_purchase_officer',
    category: 7,
    title: 'Procurement & Vendor Orders',
    subtitle: 'Purchase requisitions, vendor RFQs, purchase orders (PO), GRN verification & vendor ledger',
    permissions: ['procurement:manage', 'vendors:manage'],
    sidebarSections: ['Dashboard', 'Indents', 'Vendors', 'Quotations', 'Purchase Orders', 'GRN'],
    kpis: [
      { label: 'Open Indents', value: '5', hint: 'Requisitions awaiting PO' },
      { label: 'Active POs', value: '3', hint: 'Sent to suppliers' },
      { label: 'Expected Deliveries', value: '2', hint: 'Arriving today' },
      { label: 'Monthly Purchases', value: '₹1,24,000', hint: 'Procurement spend' },
    ],
    tasks: [
      { id: 'po-1', text: 'Send RFQ to 3 pharmaceutical distributors for annual vaccine supply' },
      { id: 'po-2', text: 'Approve Purchase Order #PO-2026-88 for surgical sutures' },
      { id: 'po-3', text: 'Match supplier tax invoice with GRN for Medico Surgical Supplies' },
    ],
    alerts: [
      { id: 'po-a1', text: 'Delivery for PO #84 delayed by 24h by supplier — tracked', level: 'warning' },
      { id: 'po-a2', text: 'Best vendor price negotiated: 8% discount on IV fluids', level: 'info' },
    ],
    workQueues: ['Purchase Indents Awaiting PO', 'Vendor Comparative Quotes', 'Expected Goods Inward', 'GRN Pending Matching'],
    quickActions: ['Create Purchase Order', 'Compare Vendor Quotes', 'Log Goods Received (GRN)', 'Add New Vendor'],
  },

  // 14. HR / Staff Admin
  clinic_hr_admin: {
    roleKey: 'clinic_hr_admin',
    category: 11,
    title: 'Human Resources & Staff Administration',
    subtitle: 'Staff master, biometric attendance, duty rosters, leave approvals & payroll calculations',
    permissions: ['hr:manage', 'staff:manage', 'attendance:manage'],
    sidebarSections: ['Dashboard', 'Employees', 'Attendance', 'Leaves', 'Roster', 'Payroll'],
    kpis: [
      { label: 'Total Employees', value: '32', hint: 'Doctors, nurses, admin, tech' },
      { label: 'Present Today', value: '29', hint: 'Biometric verified' },
      { label: 'On Approved Leave', value: '3', hint: 'Planned leave' },
      { label: 'Pending Leave Req', value: '2', hint: 'Awaiting manager signoff' },
    ],
    tasks: [
      { id: 'hr-1', text: 'Review biometrics attendance log for 2 late check-ins' },
      { id: 'hr-2', text: 'Approve casual leave request for Staff Nurse Sunita Roy' },
      { id: 'hr-3', text: 'Publish next week duty roster for front desk and nursing' },
    ],
    alerts: [
      { id: 'hr-a1', text: 'Shift roster conflict: Night duty nurse shortage for Saturday', level: 'warning' },
      { id: 'hr-a2', text: 'Staff credential certificates up-to-date across all departments', level: 'info' },
    ],
    workQueues: ['Pending Leave Requests', 'Daily Attendance Discrepancies', 'Next Week Duty Roster', 'Upcoming Staff Joining'],
    quickActions: ['Publish Shift Roster', 'Approve Staff Leave', 'Adjust Attendance Log', 'Run Monthly Payroll'],
  },

  // 15. Home Collection Staff
  clinic_home_collection: {
    roleKey: 'clinic_home_collection',
    category: 5,
    title: 'Home Sample Collection Console',
    subtitle: 'Field appointments, patient address routing, barcode sample collection & lab handover',
    permissions: ['homecollection:manage', 'samples:write'],
    sidebarSections: ['Dashboard', 'Assigned Visits', 'Collection', 'Samples', 'Handover'],
    kpis: [
      { label: 'Assigned Visits', value: '6', hint: 'Scheduled for today' },
      { label: 'Samples Collected', value: '4', hint: 'Barcoded and stored in cooler' },
      { label: 'Pending Home Visits', value: '2', hint: 'Sector 14 & 22' },
      { label: 'On-Time Completion', value: '100%', hint: 'Within 30m slot' },
    ],
    tasks: [
      { id: 'hc-1', text: 'Navigate to Flat 402, Green Valley Apts for Fasting Blood Sugar sample' },
      { id: 'hc-2', text: 'Scan EDTA barcode #EDTA-904 for patient Smt. Kamla Devi' },
      { id: 'hc-3', text: 'Handover 4 collected samples to central clinic pathology receiving desk' },
    ],
    alerts: [
      { id: 'hc-a1', text: 'Home Visit #3 requested pre-call 15 mins before arrival', level: 'info' },
      { id: 'hc-a2', text: 'Sample transport cold-chain box temperature maintained at 4°C', level: 'info' },
    ],
    workQueues: ['Today Field Collection Schedule', 'Barcoded Samples in Transit', 'Lab Handover Manifest', 'Collection Route Map'],
    quickActions: ['Start Home Visit', 'Scan Sample Barcode', 'Record Collection Time', 'Handover Samples to Lab'],
  },

  // 16. Telemedicine Coordinator
  clinic_telemed_coord: {
    roleKey: 'clinic_telemed_coord',
    category: 4,
    title: 'Telemedicine & Video Consultation Hub',
    subtitle: 'Remote appointment queue, video room verification, meeting links & e-Rx coordination',
    permissions: ['telemed:manage', 'appointments:manage'],
    sidebarSections: ['Dashboard', 'Video Sessions', 'Queue', 'Doctors', 'Tech Support', 'Follow-ups'],
    kpis: [
      { label: 'Video Consults Today', value: '16', hint: 'Scheduled tele-sessions' },
      { label: 'Active Tele-Session', value: '1', hint: 'Dr. Priya Patel consulting' },
      { label: 'Completed Consults', value: '12', hint: 'e-Prescriptions sent' },
      { label: 'Video Call Quality', value: '98%', hint: 'HD WebRTC connections' },
    ],
    tasks: [
      { id: 'tc-1', text: 'Send secure WebRTC video room link via SMS/WhatsApp to patient Rajiv' },
      { id: 'tc-2', text: 'Verify pre-consultation payment receipt before admitting patient to video room' },
      { id: 'tc-3', text: 'Confirm digital e-prescription delivery to patient portal' },
    ],
    alerts: [
      { id: 'tc-a1', text: 'Patient on Token #T-05 audio test failed — assist over phone call', level: 'warning' },
      { id: 'tc-a2', text: 'All video consultation rooms encrypted end-to-end', level: 'info' },
    ],
    workQueues: ['Upcoming Video Appointments', 'Waiting Room Check-ins', 'Pending e-Rx Dispatch', 'Tech Support Tickets'],
    quickActions: ['Send Video Meeting Link', 'Admit Patient to Room', 'Verify Online Payment', 'Dispatch WhatsApp e-Rx'],
  },

  // 17. CRM & Patient Relations
  clinic_crm_staff: {
    roleKey: 'clinic_crm_staff',
    category: 9,
    title: 'CRM & Patient Relations Console',
    subtitle: 'Follow-up calls, recall alerts, patient feedback, NPS satisfaction & complaint resolution',
    permissions: ['crm:manage', 'feedback:manage', 'recall:manage'],
    sidebarSections: ['Dashboard', 'Follow-ups', 'Calls', 'Reminders', 'Feedback', 'Complaints'],
    kpis: [
      { label: 'Follow-ups Due Today', value: '22', hint: 'Post-consult review calls' },
      { label: 'Recall Reminders Sent', value: '45', hint: 'Vaccine, Dental, Refill' },
      { label: 'Patient NPS Score', value: '4.8 / 5', hint: 'Based on 140 ratings' },
      { label: 'Open Complaints', value: '1', hint: 'Under investigation' },
    ],
    tasks: [
      { id: 'crm-1', text: 'Call 5 diabetic patients due for quarterly HbA1c review' },
      { id: 'crm-2', text: 'Trigger automated WhatsApp reminder for pediatric vaccination dose' },
      { id: 'crm-3', text: 'Address waiting time complaint regarding Room #2 morning delay' },
    ],
    alerts: [
      { id: 'crm-a1', text: '1 patient gave 2-star rating citing queue wait — callback scheduled', level: 'warning' },
      { id: 'crm-a2', text: '85% positive feedback received on polite receptionist service', level: 'info' },
    ],
    workQueues: ['Pending Patient Callbacks', 'Automated Recall Outbox', 'Recent Patient Feedback Ratings', 'Complaint Resolution Tickets'],
    quickActions: ['Schedule Follow-up Call', 'Trigger Recall Reminders', 'Log Patient Feedback', 'Resolve Complaint Ticket'],
  },

  // 18. Quality & Audit Manager
  clinic_quality_mgr: {
    roleKey: 'clinic_quality_mgr',
    category: 12,
    title: 'Quality, Compliance & Audit Hub',
    subtitle: 'Clinical documentation audits, prescription safety, incident logs & NABH compliance',
    permissions: ['quality:manage', 'audit:read', 'compliance:manage'],
    sidebarSections: ['Dashboard', 'Incidents', 'Audits', 'Corrective Actions', 'Quality Reports'],
    kpis: [
      { label: 'Clinical Audit Score', value: '96.4%', hint: 'NABH polyclinic standards' },
      { label: 'Prescription Audited', value: '50', hint: 'Zero adverse drug interactions' },
      { label: 'Open Incidents', value: '0', hint: 'No active clinical hazards' },
      { label: 'SOP Compliance', value: '98%', hint: 'Hand hygiene & waste disposal' },
    ],
    tasks: [
      { id: 'qm-1', text: 'Audit 20 random doctor consultation notes for complete chief complaints' },
      { id: 'qm-2', text: 'Verify bio-medical waste segregation bags in procedure rooms' },
      { id: 'qm-3', text: 'Review emergency crash cart medicine expiry checklist' },
    ],
    alerts: [
      { id: 'qm-a1', text: 'All clinical staff completed annual biomedical waste safety training', level: 'info' },
      { id: 'qm-a2', text: 'Monthly water & air microbial culture test results verified negative', level: 'info' },
    ],
    workQueues: ['Clinical Documentation Audits', 'Prescription Legibility Reviews', 'Corrective Action Plan (CAPA)', 'NABH Compliance Tracker'],
    quickActions: ['Start Quality Audit', 'Log Safety Incident', 'Assign Corrective Action', 'Export Compliance Report'],
  },

  // 19. Patient Portal
  clinic_patient_portal: {
    roleKey: 'clinic_patient_portal',
    category: 2,
    title: 'Patient Self-Service Portal',
    subtitle: 'My appointments, digital e-prescriptions, lab test reports, invoices & family health',
    permissions: ['patient:portal'],
    sidebarSections: ['Dashboard', 'Appointments', 'Health Records', 'Reports', 'Bills', 'Payments', 'Family'],
    kpis: [
      { label: 'Upcoming Visit', value: 'Tomorrow 10:30 AM', hint: 'Dr. Ramesh Sharma' },
      { label: 'Latest e-Prescription', value: '12 Oct 2026', hint: 'Signed by Dr. Sharma' },
      { label: 'Lab Reports Ready', value: '3', hint: 'CBC, Lipid, Thyroid' },
      { label: 'Pending Payment', value: '₹0', hint: 'All bills settled' },
    ],
    tasks: [
      { id: 'pt-1', text: 'Confirm appointment for tomorrow at 10:30 AM' },
      { id: 'pt-2', text: 'Download signed e-Prescription PDF for pharmacy refill' },
      { id: 'pt-3', text: 'View verified Blood Sugar lab report and doctor remarks' },
    ],
    alerts: [
      { id: 'pt-a1', text: 'Your follow-up visit with Dr. Ramesh Sharma is due in 3 days', level: 'info' },
      { id: 'pt-a2', text: 'Lab report for Lipid Profile is ready for download', level: 'info' },
    ],
    workQueues: ['My Upcoming Appointments', 'Prescriptions & Medication Advice', 'Diagnostic Test Reports', 'Payment Receipts'],
    quickActions: ['Book New Appointment', 'Download e-Prescription PDF', 'View Lab Report', 'Pay Pending Bill Online'],
  },

  // 20. Clinic Owner Analytics
  clinic_owner_analytics: {
    roleKey: 'clinic_owner_analytics',
    category: 12,
    title: 'Clinic Executive Analytics Cockpit',
    subtitle: 'Revenue trajectories, doctor productivity, footfall conversions & profitability',
    permissions: ['analytics:read', 'finance:read', 'operations:read'],
    sidebarSections: ['Dashboard', 'Executive Summary', 'Revenue Analytics', 'Doctor Productivity', 'Patient Census', 'Profitability'],
    kpis: [
      { label: 'Monthly Revenue', value: '₹14,25,000', hint: '+18% growth vs last month' },
      { label: 'New Patient Ratio', value: '65%', hint: 'Healthy acquisition funnel' },
      { label: 'Doctor Utilization', value: '88%', hint: 'OPD slot booking efficiency' },
      { label: 'Net Profit Margin', value: '32%', hint: 'After doctor shares & overheads' },
    ],
    tasks: [
      { id: 'an-1', text: 'Analyze peak OPD footfall hours (10 AM - 1 PM & 5 PM - 8 PM)' },
      { id: 'an-2', text: 'Evaluate revenue contribution: Consult (42%), Pharmacy (28%), Lab (18%)' },
      { id: 'an-3', text: 'Review repeat patient retention rate across pediatric and ortho clinics' },
    ],
    alerts: [
      { id: 'an-a1', text: 'Saturday evening OPD operating at 102% capacity — consider adding slots', level: 'info' },
      { id: 'an-a2', text: 'Pharmacy generic substitution rate improved by 14%', level: 'info' },
    ],
    workQueues: ['Department Revenue Breakdown', 'Doctor-wise Productivity Rankings', 'Hourly Patient Census Heatmap', 'Service Profitability Analysis'],
    quickActions: ['Export Executive MIS Report', 'Analyze Peak Hour Capacity', 'Review Doctor Fee Splits', 'Compare Month-over-Month'],
  },
};

export const getAllCmsRoles = () => Object.keys(CMS_ROLE_SPECS);
export const getAllCmsModules = () => CMS_MODULES_70;
export const getCmsDashboardSpec = (roleKey) => {
  if (!roleKey) return null;
  const key = String(roleKey).toLowerCase().replace(/[- ]/g, '_');
  if (CMS_ROLE_SPECS[key]) return CMS_ROLE_SPECS[key];
  // Alias checks
  if (key.includes('doctor')) return CMS_ROLE_SPECS.clinic_doctor;
  if (key.includes('reception') || key.includes('front')) return CMS_ROLE_SPECS.clinic_receptionist;
  if (key.includes('nurse')) return CMS_ROLE_SPECS.clinic_nurse;
  if (key.includes('cashier')) return CMS_ROLE_SPECS.clinic_cashier;
  if (key.includes('admin') || key.includes('owner')) return CMS_ROLE_SPECS.clinic_admin;
  if (key.includes('pharma')) return CMS_ROLE_SPECS.clinic_pharmacist;
  if (key.includes('lab')) return CMS_ROLE_SPECS.clinic_lab_tech;
  if (key.includes('radio')) return CMS_ROLE_SPECS.clinic_radiology_tech;
  if (key.includes('account')) return CMS_ROLE_SPECS.clinic_accountant;
  if (key.includes('inventory') || key.includes('store')) return CMS_ROLE_SPECS.clinic_inventory_mgr;
  if (key.includes('purchase')) return CMS_ROLE_SPECS.clinic_purchase_officer;
  if (key.includes('hr')) return CMS_ROLE_SPECS.clinic_hr_admin;
  if (key.includes('home')) return CMS_ROLE_SPECS.clinic_home_collection;
  if (key.includes('telemed')) return CMS_ROLE_SPECS.clinic_telemed_coord;
  if (key.includes('crm')) return CMS_ROLE_SPECS.clinic_crm_staff;
  if (key.includes('quality')) return CMS_ROLE_SPECS.clinic_quality_mgr;
  if (key.includes('patient')) return CMS_ROLE_SPECS.clinic_patient_portal;
  if (key.includes('analytics')) return CMS_ROLE_SPECS.clinic_owner_analytics;
  return null;
};
