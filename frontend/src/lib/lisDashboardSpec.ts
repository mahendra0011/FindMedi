/**
 * LIS Dashboard Master Specification (Frontend Client)
 *
 * Pathology & Laboratory Management System (LIS)
 * Single Source of Truth for 46 Sections, 8 Laboratory Departments, and 20+ Role Dashboards.
 */

export interface LisKpi {
  label: string;
  value: string;
  hint: string;
}

export interface LisQuickAction {
  label: string;
  route: string;
}

export interface LisAlert {
  level: 'info' | 'warning' | 'danger';
  message: string;
}

export interface LisDomainModule {
  id: string;
  name: string;
  route: string;
}

export interface LisTaskItem {
  id: string;
  text: string;
  done?: boolean;
  dueTime?: string;
}

export interface LisRoleSpec {
  roleKey: string;
  title: string;
  subtitle: string;
  layer?: string;
  tasks?: LisTaskItem[];
  permissions: string[];
  sidebarSections: string[];
  kpis: LisKpi[];
  workQueues: string[];
  quickActions: (LisQuickAction | string)[];
  alerts: (LisAlert | { id?: string; level?: string; message?: string; text?: string })[];
  domainModules: LisDomainModule[];
}

export const LIS_SECTIONS = {
  BIOCHEMISTRY: { id: 'Biochemistry', name: 'Clinical Biochemistry', code: 'BIO' },
  HEMATOLOGY: { id: 'Hematology', name: 'Hematology & Hemostasis', code: 'HEM' },
  CLINICAL_PATHOLOGY: { id: 'Clinical Pathology', name: 'Clinical Pathology', code: 'CP' },
  MICROBIOLOGY: { id: 'Microbiology', name: 'Microbiology & Infectious Diseases', code: 'MIC' },
  HISTOPATHOLOGY: { id: 'Histopathology', name: 'Histopathology & Surgical Biopsy', code: 'HISTO' },
  CYTOLOGY: { id: 'Cytology', name: 'Cytopathology (FNAC & Exfoliative)', code: 'CYTO' },
  SEROLOGY: { id: 'Serology', name: 'Serology & Clinical Immunology', code: 'SERO' },
  MOLECULAR: { id: 'Molecular', name: 'Molecular Diagnostics & RT-PCR', code: 'MOL' },
};

export const LIS_MODULES_46 = [
  { id: 'LIS-01', code: 'LAB_OVERVIEW', name: 'Pathology Main Operations', category: 'Executive', path: '/lab' },
  { id: 'LIS-02', code: 'LAB_ADMIN', name: 'Laboratory Setup & Administration', category: 'Administration', path: '/lab/admin' },
  { id: 'LIS-03', code: 'LAB_RECEPTION', name: 'Reception & Patient Registration', category: 'FrontDesk', path: '/lab/reception' },
  { id: 'LIS-04', code: 'PATIENT_360', name: 'Patient Profile & Cumulative History', category: 'FrontDesk', path: '/patients' },
  { id: 'LIS-05', code: 'ORDER_MGMT', name: 'Lab Order Lifecycle Management', category: 'Orders', path: '/lab/orders' },
  { id: 'LIS-06', code: 'TEST_MASTER', name: 'Test Catalog & Reference Range Master', category: 'Catalog', path: '/admin/test-catalog' },
  { id: 'LIS-07', code: 'PKG_MASTER', name: 'Health Package & Profile Master', category: 'Catalog', path: '/lab/packages' },
  { id: 'LIS-08', code: 'PHLEBOTOMY', name: 'Phlebotomy & Sample Collection', category: 'Sampling', path: '/lab/collection' },
  { id: 'LIS-09', code: 'SAMPLE_RECEIVING', name: 'Sample Intake, Accession & Rejection', category: 'Sampling', path: '/lab/receiving' },
  { id: 'LIS-10', code: 'SAMPLE_TRACKING', name: 'Chain of Custody & Sample Tracking', category: 'Sampling', path: '/lab/tracking' },
  { id: 'LIS-11', code: 'LAB_WORKBENCH', name: 'General Lab Workbench', category: 'Workbench', path: '/lab/workbench' },
  { id: 'LIS-12', code: 'SEC_BIOCHEM', name: 'Biochemistry Workbench', category: 'Workbench', path: '/lab/worklist/Biochemistry' },
  { id: 'LIS-13', code: 'SEC_HEMATOLOGY', name: 'Hematology Workbench', category: 'Workbench', path: '/lab/worklist/Hematology' },
  { id: 'LIS-14', code: 'SEC_CLINICAL_PATH', name: 'Clinical Pathology Workbench', category: 'Workbench', path: '/lab/worklist/Clinical Pathology' },
  { id: 'LIS-15', code: 'SEC_MICROBIO', name: 'Microbiology & AST Workbench', category: 'Workbench', path: '/lab/worklist/Microbiology' },
  { id: 'LIS-16', code: 'SEC_HISTOPATH', name: 'Histopathology Biopsy Workbench', category: 'Workbench', path: '/lab/worklist/Histopathology' },
  { id: 'LIS-17', code: 'SEC_CYTOLOGY', name: 'Cytology Screening Workbench', category: 'Workbench', path: '/lab/worklist/Cytology' },
  { id: 'LIS-18', code: 'SEC_SEROLOGY', name: 'Serology & Immunoassay Workbench', category: 'Workbench', path: '/lab/worklist/Serology' },
  { id: 'LIS-19', code: 'SEC_MOLECULAR', name: 'Molecular Diagnostics & RT-PCR', category: 'Workbench', path: '/lab/worklist/Molecular' },
  { id: 'LIS-20', code: 'PATHOLOGIST_VERIFY', name: 'Pathologist Verification & Signing', category: 'Clinical', path: '/lab/verify' },
  { id: 'LIS-21', code: 'LAB_SUPERVISOR', name: 'Supervisor Operations & TAT Monitoring', category: 'Operations', path: '/lab/ops' },
  { id: 'LIS-22', code: 'LAB_QUALITY_QC', name: 'Quality Control & Levey-Jennings', category: 'Quality', path: '/lab/qc' },
  { id: 'LIS-23', code: 'ANALYZER_EMULATOR', name: 'Analyzer Interfacing & ASTM/HL7 Feeds', category: 'Engineering', path: '/hospital/analyzer-emulator' },
  { id: 'LIS-24', code: 'REAGENT_INVENTORY', name: 'Reagents & Lab Store Inventory', category: 'Supply', path: '/inventory' },
  { id: 'LIS-25', code: 'LAB_PURCHASE', name: 'Purchase Indents & PO Requisitions', category: 'Supply', path: '/purchase-center' },
  { id: 'LIS-26', code: 'VENDOR_MGMT', name: 'Vendor & Manufacturer Management', category: 'Supply', path: '/hospital/enterprise' },
  { id: 'LIS-27', code: 'LAB_BILLING', name: 'Pathology Billing & Counter Cashier', category: 'Finance', path: '/billing' },
  { id: 'LIS-28', code: 'LAB_FINANCE', name: 'Finance, Ledger & Expense Audit', category: 'Finance', path: '/hospital/trial-balance' },
  { id: 'LIS-29', code: 'HOME_COLLECTION', name: 'Home Sample Collection Logistics', category: 'Logistics', path: '/lab/home-collection' },
  { id: 'LIS-30', code: 'OUTSOURCE_DESK', name: 'Reference Lab Outsourcing Desk', category: 'Logistics', path: '/lab/outsource' },
  { id: 'LIS-31', code: 'REPORT_CENTER', name: 'Report Center & Versioned Delivery', category: 'Reporting', path: '/lab/reports' },
  { id: 'LIS-32', code: 'PATIENT_PORTAL', name: 'Patient Online Diagnostic Portal', category: 'Portal', path: '/patient/reports' },
  { id: 'LIS-33', code: 'DOCTOR_PORTAL', name: 'Referring Physician Consultation Portal', category: 'Portal', path: '/doctor/reports' },
  { id: 'LIS-34', code: 'LAB_STAFF', name: 'Lab Staff Roster & Competency', category: 'Administration', path: '/hr/roster' },
  { id: 'LIS-35', code: 'EQUIPMENT_MAINT', name: 'Analyzer Maintenance & Biomedical AMC', category: 'Engineering', path: '/hospital/biomedical' },
  { id: 'LIS-36', code: 'CRITICAL_ALERTS', name: 'Critical Value Alert & Communication Log', category: 'Clinical', path: '/hospital/safety' },
  { id: 'LIS-37', code: 'LAB_SEARCH', name: 'Pathology Universal Search Engine', category: 'Search', path: '/search' },
  { id: 'LIS-38', code: 'LAB_AUDIT', name: 'Pathology Audit Log & Compliance Trail', category: 'Compliance', path: '/audit-logs' },
  { id: 'LIS-39', code: 'LAB_ANALYTICS', name: 'MIS Reports & Diagnostic Analytics', category: 'Analytics', path: '/lab/analytics' },
  { id: 'LIS-40', code: 'LAB_COMMON_UI', name: 'Pathology Unified Layout System', category: 'System', path: '/lab' },
  { id: 'LIS-41', code: 'ROLE_SIDEBAR', name: 'Role-Based Navigation Sidebar', category: 'System', path: '/lab' },
  { id: 'LIS-42', code: 'RBAC_PERMISSIONS', name: 'Laboratory RBAC Security System', category: 'Security', path: '/access-control' },
  { id: 'LIS-43', code: 'WORKFLOW_ENGINE', name: '10-Step Specimen Workflow Tracker', category: 'System', path: '/lab/tracking' },
  { id: 'LIS-44', code: 'DATA_MODELS', name: 'LIS Mongoose Data Model Integrity', category: 'System', path: '/hospital/masters' },
  { id: 'LIS-45', code: 'SIDEBAR_TREE', name: 'Canonical Pathology Navigation Tree', category: 'System', path: '/lab' },
  { id: 'LIS-46', code: 'ENTERPRISE_QA', name: 'Enterprise Accreditation & NABL Standards', category: 'Quality', path: '/hospital/quality' },
];

export const LIS_ROLE_SPECS: Record<string, LisRoleSpec> = {
  // ── 1. Lab Manager / Lab Owner ──
  lab_manager: {
    roleKey: 'lab_manager',
    title: 'Pathology Admin / Lab Manager',
    subtitle: 'Comprehensive diagnostic laboratory operations, section workload, financials & quality oversight',
    permissions: ['lab:manage', 'lab:read', 'lab:book', 'lab:verify', 'reports:read', 'billing:read', 'inventory:manage'],
    sidebarSections: ['Dashboard', 'Orders', 'Samples', 'Workbenches', 'Verification', 'Quality', 'Inventory', 'Billing', 'Staff', 'MIS'],
    kpis: [
      { label: "Today's Patient Census", value: '142', hint: 'Total footfall today' },
      { label: 'Samples Collected', value: '198', hint: 'In-house + home collection' },
      { label: 'Processing in Lab', value: '45', hint: 'Active on analyzers' },
      { label: 'Reports Awaiting Sign-off', value: '18', hint: 'Pending pathologist verification' },
      { label: 'Critical Value Alerts', value: '3', hint: 'Stat clinician notification needed' },
      { label: 'Average TAT', value: '2.4 hrs', hint: 'Within 3.0 hr target' },
      { label: "Today's Revenue", value: '₹94,500', hint: 'Cash, UPI & Corporate' },
      { label: 'Sample Rejection Rate', value: '0.8%', hint: 'Well below 2.0% SLA' },
    ],
    workQueues: [
      'Critical Values Escalation',
      'TAT SLA Breach Queue',
      'Reports Awaiting Pathologist Sign-off',
      'Sample Rejections & Recollections',
      'Low Reagent Stock Thresholds',
      'Equipment Calibration & QC Due',
    ],
    quickActions: [
      { label: 'Register Patient', route: '/lab/reception' },
      { label: 'Book Lab Test', route: '/lab/reception' },
      { label: 'Collect Sample', route: '/lab/collection' },
      { label: 'Verify Reports', route: '/lab/verify' },
      { label: 'QC Workbench', route: '/lab/qc' },
      { label: 'Reagent Store', route: '/inventory' },
      { label: 'Daily Collection', route: '/billing' },
      { label: 'MIS Analytics', route: '/lab/analytics' },
    ],
    alerts: [
      { level: 'danger', message: '3 Critical Panic Values detected — Dr. Sharma notified by phlebotomy desk' },
      { level: 'warning', message: 'Biochemistry Analyzer (Cobas 6000) calibration expires in 4 hours' },
      { level: 'info', message: '12 Home collection samples arriving via Runner #3 at 11:30 AM' },
    ],
    domainModules: [
      { id: 'LIS-01', name: 'Pathology Main Operations', route: '/lab' },
      { id: 'LIS-20', name: 'Pathologist Verification', route: '/lab/verify' },
      { id: 'LIS-22', name: 'Quality Control (QC)', route: '/lab/qc' },
      { id: 'LIS-39', name: 'Diagnostic MIS Analytics', route: '/lab/analytics' },
    ],
  },

  // ── 2. Laboratory Administrator ──
  lab_admin: {
    roleKey: 'lab_admin',
    title: 'Laboratory Administrator',
    subtitle: 'Daily administration, section coordination, schedule approvals & operational configuration',
    permissions: ['lab:manage', 'lab:read', 'lab:cancel', 'lab:receive', 'inventory:manage', 'staff:manage', 'billing:read'],
    sidebarSections: ['Dashboard', 'Staff', 'Test Catalog', 'Packages', 'Workflows', 'Approvals', 'Settings', 'MIS'],
    kpis: [
      { label: 'Staff Present on Duty', value: '18 / 20', hint: '2 on approved leave' },
      { label: 'Orders Pending Collection', value: '14', hint: 'Patients in phlebotomy queue' },
      { label: 'Samples in Processing', value: '52', hint: 'Across all 8 sections' },
      { label: 'Reports Pending Delivery', value: '29', hint: 'Ready for print / SMS' },
      { label: 'Pending Discount Approvals', value: '4', hint: 'Awaiting administrative sign' },
      { label: 'Active Reagent Indents', value: '6', hint: 'Sent to purchase officer' },
    ],
    workQueues: [
      'Pending Administrative Approvals',
      'Test Cancellation Requests',
      'Technician Duty Shift Exceptions',
      'Reagent Indent Authorization',
      'Refund & Discount Approvals',
    ],
    quickActions: [
      { label: 'Assign Staff Shifts', route: '/hr/roster' },
      { label: 'Manage Test Catalog', route: '/admin/test-catalog' },
      { label: 'Approve Indents', route: '/purchase-center' },
      { label: 'Review Cancellations', route: '/lab/orders' },
      { label: 'View Daily Register', route: '/lab' },
    ],
    alerts: [
      { level: 'warning', message: '4 High-discount bill requests pending administrator approval' },
      { level: 'info', message: 'Morning shift duty handover completed successfully at 08:00 AM' },
    ],
    domainModules: [
      { id: 'LIS-02', name: 'Laboratory Setup & Admin', route: '/lab/admin' },
      { id: 'LIS-06', name: 'Test Catalog Master', route: '/admin/test-catalog' },
      { id: 'LIS-07', name: 'Health Package Master', route: '/lab/packages' },
      { id: 'LIS-34', name: 'Staff Roster & Attendance', route: '/hr/roster' },
    ],
  },

  // ── 3. Pathology Receptionist ──
  lab_receptionist: {
    roleKey: 'lab_receptionist',
    title: 'Pathology Receptionist',
    subtitle: 'Patient intake, test requisition booking, collection coordination & invoice billing',
    permissions: ['lab:read', 'lab:book', 'patients:read', 'patients:write', 'billing:read', 'billing:write'],
    sidebarSections: ['Dashboard', 'Patients', 'Test Booking', 'Appointments', 'Billing', 'Receipts', 'Report Delivery'],
    kpis: [
      { label: "Today's Registrations", value: '68', hint: 'New & returning patients' },
      { label: 'Waiting in Phlebotomy', value: '8', hint: 'Lobby queue count' },
      { label: 'Home Collections Booked', value: '14', hint: 'Scheduled for today' },
      { label: 'Reports Ready for Pickup', value: '31', hint: 'Printed / Counter ready' },
      { label: 'Pending Billing Balances', value: '₹4,200', hint: 'Counter collections due' },
      { label: 'Avg Registration Time', value: '2.1 min', hint: 'SLA target: < 3 min' },
    ],
    workQueues: [
      'Front Desk Patient Queue',
      'Test Requisition Booking Queue',
      'Patients Waiting for Sample Collection',
      'Printed Reports Counter Pickup',
      'Pending Cash / UPI Invoice Receipts',
    ],
    quickActions: [
      { label: 'Register New Patient', route: '/lab/reception' },
      { label: 'Book Diagnostic Test', route: '/lab/reception' },
      { label: 'Search Patient History', route: '/patients' },
      { label: 'Generate Invoice', route: '/billing' },
      { label: 'Print Patient Receipt', route: '/billing' },
      { label: 'Check Report Status', route: '/lab/reports' },
    ],
    alerts: [
      { level: 'info', message: '8 patients waiting at phlebotomy counter — Phlebotomist Bay 2 active' },
      { level: 'warning', message: 'Fasting-status verbal verification pending on 2 morning collections' },
    ],
    domainModules: [
      { id: 'LIS-03', name: 'Reception & Registration', route: '/lab/reception' },
      { id: 'LIS-05', name: 'Lab Order Management', route: '/lab/orders' },
      { id: 'LIS-27', name: 'Counter Billing & Invoices', route: '/billing' },
      { id: 'LIS-31', name: 'Report Handover Counter', route: '/lab/reports' },
    ],
  },

  // ── 4. Phlebotomist / Sample Collector ──
  phlebotomist: {
    roleKey: 'phlebotomist',
    title: 'Phlebotomist / Sample Collector',
    subtitle: 'Venipuncture, specimen collection, barcode labeling & cold-chain transit handover',
    permissions: ['lab:read', 'lab:book', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Collection Queue', 'Sample Collection', 'Barcodes', 'Handover', 'Issues'],
    kpis: [
      { label: 'Patients in Waiting Area', value: '6', hint: 'Active phlebotomy token' },
      { label: 'Samples Collected Today', value: '54', hint: 'Vacutainers & containers' },
      { label: 'Urgent STAT Collections', value: '2', hint: 'Emergency bay priority' },
      { label: 'Home Visits Completed', value: '8', hint: 'Field collections finished' },
      { label: 'Recollection Requests', value: '1', hint: 'Clotted sample flagged' },
      { label: 'Collection Handover Due', value: '18', hint: 'Ready for accession desk' },
    ],
    workQueues: [
      'Phlebotomy Patient Waiting Queue',
      'STAT Emergency Collection Queue',
      'Barcoding & Label Verification List',
      'Sample Handover to Receiving Desk',
      'Recollection Exception Worklist',
    ],
    quickActions: [
      { label: 'Call Next Patient', route: '/lab/collection' },
      { label: 'Print Sample Barcode', route: '/lab/collection' },
      { label: 'Confirm Sample Collected', route: '/lab/collection' },
      { label: 'Submit Batch to Receiving', route: '/lab/receiving' },
      { label: 'Record Collection Issue', route: '/lab/collection' },
    ],
    alerts: [
      { level: 'danger', message: 'STAT blood sample required for ICU Bed 204 (Troponin-I)' },
      { level: 'info', message: 'Tube stock alert: Purple EDTA vials buffer at 25 tubes' },
    ],
    domainModules: [
      { id: 'LIS-08', name: 'Phlebotomy & Sample Collection', route: '/lab/collection' },
      { id: 'LIS-09', name: 'Batch Handover Desk', route: '/lab/receiving' },
      { id: 'LIS-10', name: 'Specimen Barcode Tracking', route: '/lab/tracking' },
    ],
  },

  // ── 5. Sample Receiving & Accession Staff ──
  lab_receiving: {
    roleKey: 'lab_receiving',
    title: 'Sample Receiving & Accession Desk',
    subtitle: 'Physical specimen intake, barcode accession, acceptance/rejection triage & section routing',
    permissions: ['lab:read', 'lab:receive', 'lab:cancel', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Incoming Samples', 'Acceptance', 'Rejections', 'Recollections', 'Section Routing'],
    kpis: [
      { label: 'Samples Awaiting Intake', value: '16', hint: 'From collection bays' },
      { label: 'Samples Accepted Today', value: '182', hint: 'Routed to testing racks' },
      { label: 'Samples Rejected', value: '2', hint: 'Hemolyzed / Clotted' },
      { label: 'Recollections Dispatched', value: '2', hint: 'Phlebotomy notified' },
      { label: 'STAT Urgent Samples', value: '3', hint: 'Immediate section delivery' },
      { label: 'Accession Accuracy', value: '99.8%', hint: 'Zero barcode mismatches' },
    ],
    workQueues: [
      'Incoming Specimen Accession Queue',
      'Rejected Sample & Recollection Dispatch',
      'Section Routing Worklist (Biochem/Hem/Micro)',
      'Home Collection Inward Batch Intake',
      'External Reference Lab Transit Batch',
    ],
    quickActions: [
      { label: 'Scan Accession Barcode', route: '/lab/receiving' },
      { label: 'Accept & Route Sample', route: '/lab/receiving' },
      { label: 'Reject Specimen', route: '/lab/receiving' },
      { label: 'Dispatch Recollection', route: '/lab/receiving' },
      { label: 'View Sample History', route: '/lab/tracking' },
    ],
    alerts: [
      { level: 'danger', message: 'Sample #ACC-8812 hemolyzed — rejected and recollection dispatch created' },
      { level: 'info', message: 'Batch of 14 home collection tubes received from Runner #2' },
    ],
    domainModules: [
      { id: 'LIS-09', name: 'Sample Receiving & Accession', route: '/lab/receiving' },
      { id: 'LIS-10', name: 'Chain of Custody Tracking', route: '/lab/tracking' },
      { id: 'LIS-11', name: 'Section Dispatch Router', route: '/lab/workbench' },
    ],
  },

  // ── 6. Lab Technician (General / Section Head) ──
  lab_technician: {
    roleKey: 'lab_technician',
    title: 'Laboratory Medical Technician',
    subtitle: 'Test processing, automated analyzer feeds, manual technical entry & quality control validation',
    permissions: ['lab:read', 'lab:enter_result', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Worklist', 'Processing', 'Result Entry', 'Analyzer Feeds', 'QC Checks'],
    kpis: [
      { label: 'Assigned Worklist Samples', value: '28', hint: 'Pending analysis today' },
      { label: 'Tests In-Progress', value: '14', hint: 'Running on analyzers' },
      { label: 'Results Ready for Validation', value: '22', hint: 'Awaiting technician submit' },
      { label: 'Abnormal High/Low Flags', value: '7', hint: 'Require technical re-check' },
      { label: 'Repeat Tests Triggered', value: '2', hint: 'Auto-dilution / rerun' },
      { label: 'Daily QC Runs Passed', value: '8 / 8', hint: 'All channels in range' },
    ],
    workQueues: [
      'Active Laboratory Processing Worklist',
      'Abnormal Flag Review & Repeat Worklist',
      'Analyzer Auto-Import Results Staging',
      'Manual Test Parameters Entry Desk',
      'Submitted for Pathologist Verification',
    ],
    quickActions: [
      { label: 'Open Processing Worklist', route: '/lab/workbench' },
      { label: 'Enter Test Results', route: '/lab/workbench' },
      { label: 'Import Analyzer Run', route: '/hospital/analyzer-emulator' },
      { label: 'Trigger Repeat Test', route: '/lab/workbench' },
      { label: 'Submit to Pathologist', route: '/lab/verify' },
      { label: 'Check Daily QC Status', route: '/lab/qc' },
    ],
    alerts: [
      { level: 'warning', message: 'HbA1c value 12.8% exceeds critical limit — repeat run advised' },
      { level: 'info', message: 'Analyzer interface online — 48 results imported in last hour' },
    ],
    domainModules: [
      { id: 'LIS-11', name: 'General Lab Workbench', route: '/lab/workbench' },
      { id: 'LIS-20', name: 'Submit for Verification', route: '/lab/verify' },
      { id: 'LIS-22', name: 'Internal Quality Control (QC)', route: '/lab/qc' },
      { id: 'LIS-23', name: 'Analyzer Interfacing', route: '/hospital/analyzer-emulator' },
    ],
  },

  // ── 7. Biochemistry Technician ──
  biochem_tech: {
    roleKey: 'biochem_tech',
    title: 'Biochemistry Medical Technician',
    subtitle: 'Automated chemistry analyzers, metabolic panels, LFT/KFT, cardiac enzymes & diabetic markers',
    permissions: ['lab:read', 'lab:enter_result', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Biochemistry Worklist', 'Analyzers', 'Result Entry', 'QC Runs', 'Repeats'],
    kpis: [
      { label: 'Biochemistry Samples', value: '42', hint: 'Serum / Plasma specimens' },
      { label: 'LFT Panels Pending', value: '11', hint: 'Enzymes & Bilirubin' },
      { label: 'KFT / Renal Tests', value: '14', hint: 'Urea, Creatinine, Electrolytes' },
      { label: 'Critical Glucose Alerts', value: '2', hint: 'Fasting < 50 or > 400 mg/dL' },
      { label: 'Chemistry Analyzers Active', value: '2 / 2', hint: 'Fully operational' },
      { label: 'Reagent Pack Integrity', value: 'Good', hint: 'All channels above 15%' },
    ],
    workQueues: [
      'Biochemistry Batch Analysis Queue',
      'Critical Electrolyte & Glucose Alerts',
      'Dilution & Repeat Testing List',
      'Daily Chemistry QC Chart Review',
      'Verified Results Staged for Signing',
    ],
    quickActions: [
      { label: 'Open Biochem Worklist', route: '/lab/worklist/Biochemistry' },
      { label: 'Review Analyzer Run', route: '/hospital/analyzer-emulator' },
      { label: 'Dilute & Re-run Sample', route: '/lab/worklist/Biochemistry' },
      { label: 'Record Internal QC', route: '/lab/qc' },
      { label: 'Submit to Pathologist', route: '/lab/verify' },
    ],
    alerts: [
      { level: 'danger', message: 'Serum Potassium 6.8 mEq/L (Panic High) detected on Patient Aarav Verma' },
      { level: 'info', message: 'Calibration on Electrolyte Module ISE verified OK' },
    ],
    domainModules: [
      { id: 'LIS-12', name: 'Biochemistry Workbench', route: '/lab/worklist/Biochemistry' },
      { id: 'LIS-22', name: 'Chemistry Quality Control', route: '/lab/qc' },
      { id: 'LIS-23', name: 'Analyzer Data Feed', route: '/hospital/analyzer-emulator' },
    ],
  },

  // ── 8. Hematology Technician ──
  hematology_tech: {
    roleKey: 'hematology_tech',
    title: 'Hematology Medical Technician',
    subtitle: 'Cell counter automation, complete blood counts (CBC), peripheral smears & coagulation profiles',
    permissions: ['lab:read', 'lab:enter_result', 'notifications:read'],
    sidebarSections: ['Dashboard', 'CBC Worklist', 'Smear Reviews', 'Coagulation', 'Result Entry', 'QC Checks'],
    kpis: [
      { label: 'CBC Profiles Today', value: '58', hint: '5-part differential' },
      { label: 'Peripheral Smear Reviews', value: '9', hint: 'Manual microscopy due' },
      { label: 'Coagulation PT / INR', value: '12', hint: 'Citrate plasma tubes' },
      { label: 'Severe Thrombocytopenia', value: '2', hint: 'Platelets < 20,000 /uL' },
      { label: 'Hematology Analyzer Status', value: 'Online', hint: 'Cell Counter Sysmex XN' },
      { label: 'Smear Staining Quality', value: 'Pass', hint: 'Leishman / Giemsa checked' },
    ],
    workQueues: [
      'CBC Automated Analyzer Worklist',
      'Manual Peripheral Smear Review Queue',
      'Critical Platelet / Hemoglobin Worklist',
      'Coagulation PT / aPTT Test Queue',
      'Results Staged for Pathologist Review',
    ],
    quickActions: [
      { label: 'Open Hematology Worklist', route: '/lab/worklist/Hematology' },
      { label: 'Record Smear Morphology', route: '/lab/worklist/Hematology' },
      { label: 'Verify Coagulation Timing', route: '/lab/worklist/Hematology' },
      { label: 'Rerun Cell Counter', route: '/hospital/analyzer-emulator' },
      { label: 'Submit to Pathologist', route: '/lab/verify' },
    ],
    alerts: [
      { level: 'danger', message: 'Platelet count 14,000/uL on Patient Meera Devi — manual smear confirm initiated' },
      { level: 'warning', message: 'Automated flag: Blast cells suspected on sample #ACC-9014' },
    ],
    domainModules: [
      { id: 'LIS-13', name: 'Hematology Workbench', route: '/lab/worklist/Hematology' },
      { id: 'LIS-20', name: 'Smear Sign-off Queue', route: '/lab/verify' },
      { id: 'LIS-22', name: 'Hematology Quality Control', route: '/lab/qc' },
    ],
  },

  // ── 9. Clinical Pathology Technician ──
  clinical_pathology_tech: {
    roleKey: 'clinical_pathology_tech',
    title: 'Clinical Pathology Technician',
    subtitle: 'Urinalysis, body fluids analysis, stool examination, parasitology & semen analysis',
    permissions: ['lab:read', 'lab:enter_result', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Urinalysis', 'Fluid Analysis', 'Stool Exam', 'Microscopy', 'Results'],
    kpis: [
      { label: 'Urine Routine & Microscopy', value: '38', hint: 'Dipstick + sediment' },
      { label: 'Stool Routine & Occult Blood', value: '12', hint: 'Microscopic ova/cyst' },
      { label: 'Pleural / Ascitic Fluid Runs', value: '3', hint: 'Cell count & bio-chemistry' },
      { label: 'Semen Analysis Appointments', value: '2', hint: 'WHO 6th edition guidelines' },
      { label: 'Microscopic Casts Detected', value: '4', hint: 'Granular/RBC casts flagged' },
    ],
    workQueues: [
      'Urine Chemistry & Sediment Worklist',
      'Body Fluid Cytochemistry Worklist',
      'Stool Examination & Occult Blood Queue',
      'Semen Morphology & Motility Worklist',
      'Verified Results Staged for Signing',
    ],
    quickActions: [
      { label: 'Open Clin-Path Worklist', route: '/lab/worklist/Clinical Pathology' },
      { label: 'Enter Microscopic Findings', route: '/lab/worklist/Clinical Pathology' },
      { label: 'Record Fluid Protein/Cells', route: '/lab/worklist/Clinical Pathology' },
      { label: 'Submit to Pathologist', route: '/lab/verify' },
    ],
    alerts: [
      { level: 'warning', message: 'Gross hematuria (Packed RBCs) observed in Urine Sample #ACC-8910' },
      { level: 'info', message: 'Ascitic fluid cell count: 1,400 WBCs/cu.mm — Peritonitis alert' },
    ],
    domainModules: [
      { id: 'LIS-14', name: 'Clinical Pathology Workbench', route: '/lab/worklist/Clinical Pathology' },
      { id: 'LIS-20', name: 'Pathologist Verification', route: '/lab/verify' },
    ],
  },

  // ── 10. Microbiology Technician ──
  microbiology_tech: {
    roleKey: 'microbiology_tech',
    title: 'Microbiology Medical Technician',
    subtitle: 'Bacterial cultures, Gram staining, automated organism identification & antibiotic susceptibility (AST)',
    permissions: ['lab:read', 'lab:enter_result', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Cultures In-Progress', 'Gram Stains', 'Organism ID', 'AST Antibiograms', 'Results'],
    kpis: [
      { label: 'Active Culture Plates', value: '44', hint: 'Blood, Urine, Sputum, Pus' },
      { label: 'Cultures in Incubation', value: '28', hint: '24h / 48h reading due' },
      { label: 'Organism ID Pending', value: '8', hint: 'VITEK / Biochemical testing' },
      { label: 'AST Sensitivity Testing', value: '6', hint: 'Antibiograms in setup' },
      { label: 'Positive Blood Cultures', value: '2', hint: 'Flagged by BacT/ALERT' },
      { label: 'Preliminary Reports Issued', value: '14', hint: 'Gram stain released' },
    ],
    workQueues: [
      'Day-1 / Day-2 Culture Plate Reading List',
      'Positive Blood Culture Critical Alerts',
      'Automated VITEK Organism ID Worklist',
      'Antibiotic Susceptibility (AST) Panel Queue',
      'Preliminary & Final Microbiology Reports',
    ],
    quickActions: [
      { label: 'Open Microbiology Worklist', route: '/lab/worklist/Microbiology' },
      { label: 'Record Gram Stain Result', route: '/lab/worklist/Microbiology' },
      { label: 'Enter Organism Identification', route: '/lab/worklist/Microbiology' },
      { label: 'Input Antibiogram (AST)', route: '/lab/worklist/Microbiology' },
      { label: 'Submit to Microbiologist', route: '/lab/verify' },
    ],
    alerts: [
      { level: 'danger', message: 'Blood culture Bottle #BC-109 signaled POSITIVE at 02:15 AM — Gram negative bacilli seen' },
      { level: 'warning', message: 'MRSA isolated on Surgical Wound Swab #ACC-7890' },
    ],
    domainModules: [
      { id: 'LIS-15', name: 'Microbiology Workbench', route: '/lab/worklist/Microbiology' },
      { id: 'LIS-20', name: 'Pathologist Sign-off', route: '/lab/verify' },
      { id: 'LIS-36', name: 'Critical Culture Alerts', route: '/hospital/safety' },
    ],
  },

  // ── 11. Histopathology Staff ──
  histopathology_tech: {
    roleKey: 'histopathology_tech',
    title: 'Histopathology & Biopsy Staff',
    subtitle: 'Surgical specimen grossing, paraffin tissue block processing, microtomy & H&E staining',
    permissions: ['lab:read', 'lab:enter_result', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Specimens', 'Grossing Queue', 'Blocks & Cassettes', 'Slide Microtomy', 'Staining'],
    kpis: [
      { label: 'Biopsy Specimens Received', value: '14', hint: 'Surgical resections & biopsies' },
      { label: 'Grossing Pending', value: '5', hint: 'Awaiting pathologist gross room' },
      { label: 'Tissue Blocks Processing', value: '32', hint: 'Automated tissue processor' },
      { label: 'Slides Prepared & Stained', value: '48', hint: 'H&E / Special stains' },
      { label: 'Microscopy Reporting Due', value: '9', hint: 'Mounted slides with pathologist' },
      { label: 'Avg Biopsy TAT', value: '48 hrs', hint: 'Target: < 72 hrs' },
    ],
    workQueues: [
      'Surgical Specimen Grossing Worklist',
      'Tissue Processing & Embedding Blocks',
      'Microtomy Sectioning & Slide Staining',
      'Special Stains (PAS, ZN, Silver) Worklist',
      'Slide Trays Delivered to Pathologist',
    ],
    quickActions: [
      { label: 'Accession Biopsy Specimen', route: '/lab/worklist/Histopathology' },
      { label: 'Record Gross Examination', route: '/lab/worklist/Histopathology' },
      { label: 'Generate Block Barcodes', route: '/lab/worklist/Histopathology' },
      { label: 'Log Slide Staining Quality', route: '/lab/worklist/Histopathology' },
      { label: 'Handover Slide Tray', route: '/lab/verify' },
    ],
    alerts: [
      { level: 'info', message: 'Frozen section request received from OT-2 for intra-operative margin check' },
      { level: 'warning', message: 'Tissue processor reagent rotation scheduled for tonight at 20:00' },
    ],
    domainModules: [
      { id: 'LIS-16', name: 'Histopathology Biopsy Workbench', route: '/lab/worklist/Histopathology' },
      { id: 'LIS-20', name: 'Pathologist Diagnostic Sign-off', route: '/lab/verify' },
    ],
  },

  // ── 12. Cytology Staff ──
  cytology_tech: {
    roleKey: 'cytology_tech',
    title: 'Cytopathology Staff',
    subtitle: 'Pap smears, FNAC smears, effusion fluid centrifugation, cell blocks & staining',
    permissions: ['lab:read', 'lab:enter_result', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Pap Smears', 'FNAC Aspirates', 'Fluid Cytology', 'Cell Blocks', 'Results'],
    kpis: [
      { label: 'Pap Smears in Staining', value: '18', hint: 'Liquid-based & conventional' },
      { label: 'FNAC Smears Prepared', value: '6', hint: 'Aspiration clinics' },
      { label: 'Body Fluid Cell Blocks', value: '4', hint: 'Peritoneal / Pleural effusions' },
      { label: 'Adequacy Verified', value: '100%', hint: 'Zero inadequate aspirates' },
    ],
    workQueues: [
      'Pap Smear Screening Worklist',
      'FNAC Smear Fixation & Staining Queue',
      'Body Fluid Cytocentrifugation Worklist',
      'Cytology Slides Staged for Pathologist',
    ],
    quickActions: [
      { label: 'Open Cytology Worklist', route: '/lab/worklist/Cytology' },
      { label: 'Prepare Fluid Cell Block', route: '/lab/worklist/Cytology' },
      { label: 'Deliver Slide Trays', route: '/lab/verify' },
    ],
    alerts: [
      { level: 'info', message: 'FNAC clinic outpatient scheduled at 11:00 AM (Thyroid nodule)' },
    ],
    domainModules: [
      { id: 'LIS-17', name: 'Cytology Workbench', route: '/lab/worklist/Cytology' },
      { id: 'LIS-20', name: 'Pathologist Sign-off', route: '/lab/verify' },
    ],
  },

  // ── 12B. Serology & Clinical Immunology Technician ──
  serology_tech: {
    roleKey: 'serology_tech',
    title: 'Serology & Immunology Technician',
    subtitle: 'Automated chemiluminescence (CLIA), ELISA plates, infectious disease viral markers & autoimmune assays',
    permissions: ['lab:read', 'lab:write', 'lab:results', 'inventory:read'],
    sidebarSections: ['Dashboard', 'Serology Workbench', 'Viral Markers', 'Autoimmune Antibodies', 'QC & Controls'],
    kpis: [
      { label: 'ELISA Plates in Incubation', value: '3', hint: 'Dengue, HIV, HBsAg, HCV' },
      { label: 'Chemiluminescence Runs', value: '42', hint: 'CLIA thyroid & fertility' },
      { label: 'Reactive Serology Positives', value: '4', hint: 'Confirmation titration due' },
      { label: 'Calibrator Validation', value: '100%', hint: 'Cut-off index (COI) valid' },
    ],
    workQueues: [
      'Serology & Immunoassay Worklist',
      'Viral Marker Screening',
      'Autoimmune Antibody Panel',
      'Dilution Titre Verification',
    ],
    quickActions: [
      { label: 'Open Serology Worklist', route: '/lab/worklist/Serology' },
      { label: 'Start ELISA Plate Reader', route: '/lab/worklist/Serology' },
      { label: 'Flag Viral Positive', route: '/lab/verify' },
      { label: 'Log Control Optical Density', route: '/lab/qc' },
    ],
    alerts: [
      { level: 'danger', message: 'HBsAg Reactive (COI 48.2) on Specimen #SER-9941 — Repeat in duplicate and flag for verification' },
    ],
    domainModules: [
      { id: 'LIS-18', name: 'Serology & Immunoassay Workbench', route: '/lab/worklist/Serology' },
      { id: 'LIS-20', name: 'Pathologist Verification', route: '/lab/verify' },
      { id: 'LIS-22', name: 'Quality Control & QC Charts', route: '/lab/qc' },
    ],
  },

  // ── 12C. Molecular Diagnostics Technician ──
  molecular_tech: {
    roleKey: 'molecular_tech',
    title: 'Molecular Diagnostics Technician',
    subtitle: 'Real-time PCR (RT-PCR), automated nucleic acid extraction, viral load quantification & gene sequencing',
    permissions: ['lab:read', 'lab:write', 'lab:results', 'inventory:read'],
    sidebarSections: ['Dashboard', 'Molecular Workbench', 'Nucleic Extraction', 'RT-PCR Amplification', 'Clean Room Logs'],
    kpis: [
      { label: 'Nucleic Extractions Ready', value: '24', hint: 'Magnetic bead robot' },
      { label: 'Thermal Cycler Runs', value: '2', hint: '96-well fast optical plates' },
      { label: 'High Viral Loads Flagged', value: '3', hint: 'HCV / HBV / HIV-1 RNA' },
      { label: 'Negative Template Control', value: '100% Clean', hint: 'No amplification baseline' },
    ],
    workQueues: [
      'RT-PCR Extraction & Amplification Queue',
      'Viral Load Quantification',
      'Thermal Cycler Runs',
      'Contamination Control Log',
    ],
    quickActions: [
      { label: 'Open Molecular Worklist', route: '/lab/worklist/Molecular' },
      { label: 'Load Extraction Plate', route: '/lab/worklist/Molecular' },
      { label: 'Review Amplification Curves', route: '/lab/worklist/Molecular' },
      { label: 'Flag High Viral Load', route: '/lab/verify' },
    ],
    alerts: [
      { level: 'warning', message: 'Thermal Cycler 2 run completing in 18 minutes — Prepare Ct value review' },
    ],
    domainModules: [
      { id: 'LIS-19', name: 'Molecular Diagnostics & RT-PCR', route: '/lab/worklist/Molecular' },
      { id: 'LIS-20', name: 'Pathologist Verification', route: '/lab/verify' },
      { id: 'LIS-22', name: 'Quality Control & Validation', route: '/lab/qc' },
    ],
  },

  // ── 13. Pathologist (Consultant / Chief) ──
  pathologist: {
    roleKey: 'pathologist',
    title: 'Consultant Pathologist',
    subtitle: 'Professional diagnostic interpretation, correlation, critical values sign-off & report release',
    permissions: ['lab:read', 'lab:verify', 'lab:correct', 'lab:finalize', 'reports:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Verification Queue', 'Critical Values', 'Histopathology', 'Cytology', 'Amended Reports', 'QC Review'],
    kpis: [
      { label: 'Reports Awaiting Verification', value: '24', hint: 'Biochem, Hem, Micro, Hist' },
      { label: 'Critical Values Awaiting Sign', value: '3', hint: 'Stat immediate escalation' },
      { label: 'Biopsy Reports to Dictate', value: '7', hint: 'Microscopic diagnostic review' },
      { label: 'Amended Reports Requested', value: '1', hint: 'Addendum needed' },
      { label: 'Reports Released Today', value: '128', hint: 'Signed with digital stamp' },
      { label: 'Verification SLA Compliance', value: '98.4%', hint: 'Within 45 min target' },
    ],
    workQueues: [
      'Critical Values Immediate Verification Queue',
      'High/Low Abnormal Test Results Worklist',
      'Surgical Histopathology & Biopsy Sign-off',
      'Cytopathology & Pap Smear Diagnostic Queue',
      'Microbiology Antibiogram Release Worklist',
      'Report Addendum & Correction Reviews',
    ],
    quickActions: [
      { label: 'Open Verification Queue', route: '/lab/verify' },
      { label: 'Review Critical Values', route: '/lab/verify' },
      { label: 'Dictate Biopsy Diagnosis', route: '/lab/worklist/Histopathology' },
      { label: 'Approve & Release Report', route: '/lab/verify' },
      { label: 'Return for Technical Rerun', route: '/lab/workbench' },
      { label: 'Review Monthly Levey-Jennings', route: '/lab/qc' },
    ],
    alerts: [
      { level: 'danger', message: 'Stat Troponin-I: 14.2 ng/mL (High Alert) on Patient Vikram Malhotra — Verify & call cardiologist' },
      { level: 'warning', message: 'Biopsy Histology #BX-2026-44 slides ready on microscope bench' },
    ],
    domainModules: [
      { id: 'LIS-20', name: 'Pathologist Verification & Signing', route: '/lab/verify' },
      { id: 'LIS-16', name: 'Histopathology Biopsy Workbench', route: '/lab/worklist/Histopathology' },
      { id: 'LIS-22', name: 'Laboratory Quality Control', route: '/lab/qc' },
      { id: 'LIS-36', name: 'Critical Value Communication', route: '/hospital/safety' },
    ],
  },

  // ── 14. Lab Supervisor ──
  lab_supervisor: {
    roleKey: 'lab_supervisor',
    title: 'Pathology Lab Supervisor',
    subtitle: 'Section workload balancing, technical QA escalation, turnaround time enforcement & analyzer uptime',
    permissions: ['lab:manage', 'lab:read', 'lab:assign', 'lab:cancel', 'reports:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Workload Balancing', 'TAT Monitoring', 'QC Alerts', 'Equipment Status', 'Delays', 'Staff Logs'],
    kpis: [
      { label: 'Active Samples in Sections', value: '62', hint: 'Processing pipeline' },
      { label: 'TAT Target Breaches', value: '1', hint: 'Biochem run delayed' },
      { label: 'Equipment Availability', value: '98.5%', hint: '1 analyzer in rinse' },
      { label: 'Daily QC Out-of-Control', value: '0', hint: 'All channels compliant' },
      { label: 'Sample Recollection Rate', value: '0.6%', hint: 'Well within quality target' },
    ],
    workQueues: [
      'TAT Escalation & Delayed Processing Queue',
      'QC Out-of-Range Violation Alerts',
      'Section Workload Reassignment Queue',
      'Analyzer Maintenance & Rinse Logs',
      'Sample Rejection Quality Investigation',
    ],
    quickActions: [
      { label: 'Rebalance Section Workload', route: '/lab/ops' },
      { label: 'Investigate TAT Delays', route: '/lab/ops' },
      { label: 'Escalate QC Deviation', route: '/lab/qc' },
      { label: 'Trigger Maintenance Ticket', route: '/hospital/biomedical' },
      { label: 'View Section Worklists', route: '/lab/workbench' },
    ],
    alerts: [
      { level: 'warning', message: 'Biochemistry section running at 94% capacity — consider routing to secondary analyzer' },
      { level: 'info', message: 'Morning shift maintenance and calibration checks logged OK' },
    ],
    domainModules: [
      { id: 'LIS-21', name: 'Supervisor Operations & TAT', route: '/lab/ops' },
      { id: 'LIS-22', name: 'Quality Control Compliance', route: '/lab/qc' },
      { id: 'LIS-23', name: 'Analyzer Interfacing', route: '/hospital/analyzer-emulator' },
    ],
  },

  // ── 15. Quality Manager (Lab Quality / NABL) ──
  lab_quality_mgr: {
    roleKey: 'lab_quality_mgr',
    title: 'Pathology Quality Manager',
    subtitle: 'Internal QC compliance, Westgard multirules, proficiency testing (EQA), NABL 112 & ISO 15189',
    permissions: ['lab:read', 'reports:read', 'audit:read', 'operations:read', 'quality:read'],
    sidebarSections: ['Dashboard', 'Levey-Jennings QC', 'EQA / PT Surveys', 'Calibration', 'Incidents', 'CAPA', 'Audits'],
    kpis: [
      { label: 'Internal QC Compliance', value: '99.4%', hint: 'Monthly average' },
      { label: 'Westgard 1-3s Violations', value: '1', hint: 'Resolved with fresh calibrator' },
      { label: 'Calibrations Due This Week', value: '3', hint: 'Electrolytes & Coagulation' },
      { label: 'EQA Proficiency Surveys', value: '100% Pass', hint: 'CMC Vellore / Bio-Rad' },
      { label: 'Open Quality Incidents', value: '2', hint: 'Pre-analytical hemolyzed sample' },
      { label: 'NABL SOP Revisions Due', value: '4', hint: 'Document control review' },
    ],
    workQueues: [
      'Levey-Jennings QC Deviation Queue',
      'Corrective & Preventive Action (CAPA) Log',
      'Equipment Calibration Due Schedule',
      'External Quality Assessment (EQA) Entries',
      'Pre-Analytical Quality Incident Investigations',
    ],
    quickActions: [
      { label: 'Review Levey-Jennings Charts', route: '/lab/qc' },
      { label: 'Log Quality Incident', route: '/hospital/quality' },
      { label: 'Assign Corrective Action (CAPA)', route: '/hospital/quality' },
      { label: 'Verify Calibration Certificate', route: '/hospital/biomedical' },
      { label: 'Generate Quality MIS Report', route: '/lab/analytics' },
    ],
    alerts: [
      { level: 'warning', message: 'Westgard rule 2-2s flagged on Triglycerides Level 2 QC — recalibration recommended' },
      { level: 'info', message: 'Annual NABL surveillance audit scheduled in 45 days' },
    ],
    domainModules: [
      { id: 'LIS-22', name: 'Quality Control (QC)', route: '/lab/qc' },
      { id: 'LIS-38', name: 'Pathology Audit Log', route: '/audit-logs' },
      { id: 'LIS-46', name: 'NABL / ISO Standards Compliance', route: '/hospital/quality' },
    ],
  },

  // ── 16. Analyzer / Instrument Staff ──
  analyzer_staff: {
    roleKey: 'analyzer_staff',
    title: 'Analyzer / Instrument Staff',
    subtitle: 'Machine connectivity, HL7/ASTM middleware, sample rack loaders & preventive maintenance',
    permissions: ['lab:read', 'lab:enter_result', 'equipment:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Analyzers', 'Connectivity', 'Workloads', 'Error Logs', 'Maintenance', 'Reagents'],
    kpis: [
      { label: 'Connected Analyzers', value: '6 / 6', hint: 'Bi-directional HL7 online' },
      { label: 'Results Imported Today', value: '412', hint: 'Zero manual transcription' },
      { label: 'Failed Query Messages', value: '0', hint: 'ASTM parser healthy' },
      { label: 'Reagent Onboard Level', value: 'Optimal', hint: 'Average 68% volume' },
      { label: 'Daily Preventive Rinse', value: 'Complete', hint: 'Logged at 07:30 AM' },
    ],
    workQueues: [
      'Analyzer Interface Connectivity Status',
      'Unmatched Result Query Staging',
      'Preventive Maintenance Work Order List',
      'Reagent Loading & Waste Drainage Queue',
      'Instrument Error & Alarm Log',
    ],
    quickActions: [
      { label: 'Ping Analyzer Interfaces', route: '/hospital/analyzer-emulator' },
      { label: 'Review HL7 Message Stream', route: '/hospital/analyzer-emulator' },
      { label: 'Record Machine Maintenance', route: '/hospital/biomedical' },
      { label: 'Load Reagent Pack', route: '/inventory' },
    ],
    alerts: [
      { level: 'info', message: 'Automated wash cycle completed on Hematology Sysmex Cell Counter' },
    ],
    domainModules: [
      { id: 'LIS-23', name: 'Analyzer Interfacing & ASTM/HL7', route: '/hospital/analyzer-emulator' },
      { id: 'LIS-35', name: 'Biomedical Maintenance', route: '/hospital/biomedical' },
    ],
  },

  // ── 17. Lab Inventory / Store Manager ──
  lab_inventory_mgr: {
    roleKey: 'lab_inventory_mgr',
    title: 'Lab Inventory & Store Manager',
    subtitle: 'Reagents, test kits, vacutainer tubes, cold-chain supplies, lot numbers & expiry control',
    permissions: ['inventory:read', 'inventory:manage', 'lab:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Items', 'Reagents', 'Batches & Expiry', 'Stock Movements', 'Indents', 'Vendors'],
    kpis: [
      { label: 'Total Lab Inventory Items', value: '284', hint: 'Reagents & consumables' },
      { label: 'Items Below Reorder Level', value: '4', hint: 'Immediate PO recommended' },
      { label: 'Batches Expiring in 30 Days', value: '2', hint: 'Quarantine or priority use' },
      { label: 'Pending Store Indents', value: '5', hint: 'From testing sections' },
      { label: 'Total Store Valuation', value: '₹4,85,000', hint: 'Onboard + cold-room stock' },
    ],
    workQueues: [
      'Reagents Below Minimum Buffer Stock',
      'Near-Expiry Batches (30-Day Alert)',
      'Department Indent Fulfillment Queue',
      'Goods Received (GRN) Inward Inspection',
      'Physical Stock Count & Reconciliations',
    ],
    quickActions: [
      { label: 'Raise Purchase Indent', route: '/purchase-center' },
      { label: 'Issue Reagents to Section', route: '/inventory' },
      { label: 'Record Stock Inward (GRN)', route: '/inventory' },
      { label: 'Quarantine Expired Lot', route: '/inventory' },
      { label: 'View Stock Ledger', route: '/inventory' },
    ],
    alerts: [
      { level: 'danger', message: 'Lipid Profile Reagent Kit Lot #LP-244 below minimum safety stock (3 packs left)' },
      { level: 'warning', message: 'Urine Dipstick Strip Box #UR-88 expires at end of month' },
    ],
    domainModules: [
      { id: 'LIS-24', name: 'Reagents & Lab Store Inventory', route: '/inventory' },
      { id: 'LIS-25', name: 'Purchase Indents & POs', route: '/purchase-center' },
    ],
  },

  // ── 18. Home Sample Collection Staff ──
  home_collection_staff: {
    roleKey: 'home_collection_staff',
    title: 'Home Sample Collection Runner',
    subtitle: 'Doorstep phlebotomy, cold-chain transport box management, mobile barcode sync & sample intake',
    permissions: ['lab:read', 'lab:book', 'lab:visit', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Assigned Visits', 'Upcoming Slots', 'Collected Samples', 'Handover', 'Route Map'],
    kpis: [
      { label: "Today's Assigned Bookings", value: '12', hint: 'Doorstep visits' },
      { label: 'Visits Completed', value: '7', hint: 'Samples in coolbox' },
      { label: 'Visits In-Transit', value: '2', hint: 'En route to patient' },
      { label: 'Cash / UPI Collected', value: '₹6,400', hint: 'Doorstep billing' },
      { label: 'Cold-Chain Box Temp', value: '4.2 °C', hint: 'Target: 2 - 8 °C compliant' },
    ],
    workQueues: [
      'Home Visit Appointment Route Queue',
      'Specimens in Cold-Chain Coolbox',
      'Laboratory Inward Handover Queue',
      'Doorstep Payment Receipt Ledger',
    ],
    quickActions: [
      { label: 'Start Route Navigation', route: '/lab/home-collection' },
      { label: 'Scan Patient Barcode', route: '/lab/home-collection' },
      { label: 'Confirm Home Collection', route: '/lab/home-collection' },
      { label: 'Handover Batch at Lab', route: '/lab/receiving' },
    ],
    alerts: [
      { level: 'info', message: 'Upcoming visit in 20 min: Rajesh Patel (Fasting Blood Sugar + Lipid Profile)' },
    ],
    domainModules: [
      { id: 'LIS-29', name: 'Home Sample Collection Logistics', route: '/lab/home-collection' },
      { id: 'LIS-08', name: 'Phlebotomy Standards', route: '/lab/collection' },
    ],
  },

  // ── 19. Report Coordinator ──
  report_coordinator: {
    roleKey: 'report_coordinator',
    title: 'Diagnostic Report Coordinator',
    subtitle: 'Final report dispatch, thermal/laser printing, SMS/WhatsApp delivery, correction addendums & archives',
    permissions: ['lab:read', 'lab:finalize', 'lab:correct', 'lab:print', 'lab:export', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Reports Pending Delivery', 'Dispatched Reports', 'Amended Reports', 'Failed Dispatches', 'Print Queue'],
    kpis: [
      { label: 'Reports Released by Pathologist', value: '128', hint: 'Today' },
      { label: 'Delivered via WhatsApp / SMS', value: '112', hint: 'Instant digital dispatch' },
      { label: 'Printed for Counter Pickup', value: '16', hint: 'Waiting at reception' },
      { label: 'Delivery Failures', value: '1', hint: 'Invalid mobile number' },
      { label: 'Amended Reports Logged', value: '1', hint: 'Version 2 released' },
    ],
    workQueues: [
      'Counter Physical Print Queue',
      'Digital SMS / WhatsApp Dispatch Queue',
      'Failed Notification Resend Worklist',
      'Amended & Corrected Report Delivery',
    ],
    quickActions: [
      { label: 'Batch Print Reports', route: '/lab/reports' },
      { label: 'Resend Digital Report SMS', route: '/lab/reports' },
      { label: 'Issue Amended Version', route: '/lab/reports' },
      { label: 'Verify Report QR Code', route: '/lab/reports' },
    ],
    alerts: [
      { level: 'warning', message: 'Report delivery failed for 1 queued SMS (gateway bounced) — verify contact number' },
    ],
    domainModules: [
      { id: 'LIS-31', name: 'Report Center & Versioned Delivery', route: '/lab/reports' },
      { id: 'LIS-32', name: 'Patient Online Portal', route: '/patient/reports' },
    ],
  },
};

export function getLisDashboardSpec(roleKey?: string): LisRoleSpec {
  if (!roleKey) return enrichLisSpec(LIS_ROLE_SPECS.lab_manager, 'lab_manager');
  const key = String(roleKey).toLowerCase().trim();
  let spec = LIS_ROLE_SPECS[key];

  // Role alias mappings for LIS
  if (!spec) {
    if (key === 'lab_owner' || key === 'laboratory_director') spec = { ...LIS_ROLE_SPECS.lab_manager, roleKey: key };
    else if (key === 'lab_technician' || key === 'technician') spec = { ...LIS_ROLE_SPECS.lab_technician, roleKey: key };
    else if (key === 'phlebotomy_staff') spec = { ...LIS_ROLE_SPECS.phlebotomist, roleKey: key };
    else if (key === 'lab_biochemist' || key === 'biochemist') spec = { ...LIS_ROLE_SPECS.biochem_tech, roleKey: key };
    else if (key === 'microbiologist') spec = { ...LIS_ROLE_SPECS.microbiology_tech, roleKey: key };
    else if (key === 'histopathologist') spec = { ...LIS_ROLE_SPECS.histopathology_tech, roleKey: key };
    else if (key === 'cytopathologist') spec = { ...LIS_ROLE_SPECS.cytology_tech, roleKey: key };
    else if (key === 'serologist') spec = { ...LIS_ROLE_SPECS.serology_tech, roleKey: key };
    else if (key === 'molecular_biologist') spec = { ...LIS_ROLE_SPECS.molecular_tech, roleKey: key };
    else if (key === 'quality_manager' || key === 'quality_officer') spec = { ...LIS_ROLE_SPECS.lab_quality_mgr, roleKey: key };
    else if (key === 'instrument_engineer') spec = { ...LIS_ROLE_SPECS.analyzer_staff, roleKey: key };
    else if (key.startsWith('lab_')) spec = { ...LIS_ROLE_SPECS.lab_manager, roleKey: key };
    else spec = LIS_ROLE_SPECS.lab_manager;
  }

  return enrichLisSpec(spec, key);
}

function enrichLisSpec(spec: LisRoleSpec, roleKey: string): LisRoleSpec {
  return {
    ...spec,
    layer: 'Pathology & Laboratory Information System (LIS)',
    tasks: spec.tasks || [
      { id: `${roleKey}-t1`, text: 'Daily bench calibration & control verification', done: false, dueTime: '09:00 AM' },
      { id: `${roleKey}-t2`, text: 'Process high-priority STAT specimen orders', done: false, dueTime: '10:30 AM' },
      { id: `${roleKey}-t3`, text: 'Perform critical delta-check review & escalation', done: false, dueTime: '01:00 PM' },
      { id: `${roleKey}-t4`, text: 'End-of-shift reagent log and handover checklist', done: false, dueTime: '05:00 PM' },
    ],
  };
}

export function getAllLisRoles(): string[] {
  return Object.keys(LIS_ROLE_SPECS);
}
