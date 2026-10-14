/**
 * RIS / PACS Dashboard Master Specification (Frontend Client)
 *
 * Single Source of Truth for the Complete Radiology / Imaging Management System (RIS/PACS)
 * Architecture covering 41 Sections, 8 Imaging Modalities, and 32 Role Dashboards:
 *
 * Modalities:
 * 1. MRI (Magnetic Resonance Imaging)
 * 2. X-Ray (Digital Radiography)
 * 3. CT Scan (Computed Tomography)
 * 4. Ultrasound (Sonography)
 * 5. Doppler (Vascular flow)
 * 6. Mammography (Breast imaging & BI-RADS)
 * 7. OPG / Dental Imaging (Panoramic & CBCT)
 * 8. Fluoroscopy / Contrast studies
 */

export interface RisKpi {
  label: string;
  value: string;
  hint: string;
}

export interface RisQuickAction {
  label: string;
  route: string;
}

export interface RisAlert {
  level: 'info' | 'warning' | 'danger';
  message: string;
}

export interface RisDomainModule {
  id: string;
  name: string;
  route: string;
}

export interface RisRoleSpec {
  roleKey: string;
  title: string;
  subtitle: string;
  permissions: string[];
  sidebarSections: string[];
  kpis: RisKpi[];
  workQueues: string[];
  quickActions: RisQuickAction[];
  alerts: RisAlert[];
  domainModules: RisDomainModule[];
}

export const RIS_MODALITIES = {
  MRI: { id: 'MRI', name: 'Magnetic Resonance Imaging', code: 'MRI', description: 'Multi-planar high-contrast soft tissue imaging, neuro, musculoskeletal, cardiac & abdominal scans' },
  XRAY: { id: 'X-Ray', name: 'Digital Radiography (X-Ray)', code: 'RAD', description: 'Chest radiography, skeletal trauma, abdominal flat plate, spine & pediatric views' },
  CT_SCAN: { id: 'CT Scan', name: 'Computed Tomography (CT Scan)', code: 'CT', description: 'Multislice helical CT, trauma CT, angiography, contrast studies & HRCT chest' },
  ULTRASOUND: { id: 'Ultrasound', name: 'Ultrasound & Sonography', code: 'US', description: 'Abdominal, pelvic, obstetric 4D, small parts & musculoskeletal ultrasound' },
  DOPPLER: { id: 'Doppler', name: 'Color Doppler & Vascular Imaging', code: 'DOP', description: 'Carotid, peripheral arterial, venous duplex, portal flow & renal Doppler studies' },
  MAMMOGRAPHY: { id: 'Mammography', name: 'Digital Mammography & Tomosynthesis', code: 'MAMMO', description: 'Bilateral screening, diagnostic localized magnification, breast tomosynthesis & BI-RADS scoring' },
  OPG: { id: 'OPG/CBCT', name: 'Orthopantomogram & Dental CBCT', code: 'OPG', description: 'Panoramic full-jaw dental imaging, cephalometry & 3D cone-beam volumetric scans' },
  FLUOROSCOPY: { id: 'Fluoroscopy', name: 'Fluoroscopy & Dynamic Contrast', code: 'FLUORO', description: 'Continuous X-ray guidance, barium swallow, meal, enema, HSG & ERCP imaging' },
};

export const RIS_MODULES_41 = [
  { id: 'RIS-01', code: 'RAD_OVERVIEW', name: 'Radiology Main Department Operations', category: 'Executive', path: '/radiology' },
  { id: 'RIS-02', code: 'RAD_ADMIN', name: 'Radiology Administration & Setup', category: 'Administration', path: '/radiology/dashboard' },
  { id: 'RIS-03', code: 'RAD_RECEPTION', name: 'Reception & Imaging Patient Desk', category: 'FrontDesk', path: '/radiology/reception' },
  { id: 'RIS-04', code: 'RAD_PATIENT_360', name: 'Radiology Patient Profile & Imaging History', category: 'FrontDesk', path: '/patients' },
  { id: 'RIS-05', code: 'RAD_ORDERS', name: 'Imaging Order Lifecycle Management', category: 'Orders', path: '/radiology' },
  { id: 'RIS-06', code: 'MODALITY_MASTER', name: 'Modality & Equipment Configuration Master', category: 'Catalog', path: '/radiology/modalities' },
  { id: 'RIS-07', code: 'SCHEDULING', name: 'Appointment Calendar & Slot Allocation', category: 'Scheduling', path: '/radiology/scheduling' },
  { id: 'RIS-08', code: 'MRI_MGMT', name: 'MRI Unit & Protocol Management', category: 'Modality', path: '/radiology/mri' },
  { id: 'RIS-09', code: 'XRAY_MGMT', name: 'Digital Radiography (X-Ray) Unit', category: 'Modality', path: '/radiology/xray' },
  { id: 'RIS-10', code: 'CT_MGMT', name: 'CT Scanner & Contrast Management', category: 'Modality', path: '/radiology/ct' },
  { id: 'RIS-11', code: 'US_MGMT', name: 'Ultrasound Examination Unit', category: 'Modality', path: '/radiology/ultrasound' },
  { id: 'RIS-12', code: 'DOPPLER_MGMT', name: 'Color Doppler & Flow Study Unit', category: 'Modality', path: '/radiology/doppler' },
  { id: 'RIS-13', code: 'MAMMO_MGMT', name: 'Mammography & Breast Health Unit', category: 'Modality', path: '/radiology/mammography' },
  { id: 'RIS-14', code: 'OTHER_MODALITIES', name: 'OPG, CBCT & Fluoroscopy Unit', category: 'Modality', path: '/radiology/modalities' },
  { id: 'RIS-15', code: 'PREP_QUEUE', name: 'Patient Preparation & Safety Screening', category: 'Safety', path: '/radiology/preparation' },
  { id: 'RIS-16', code: 'TECH_WORKLIST', name: 'Radiology Technician Acquisition Worklist', category: 'Acquisition', path: '/radiology' },
  { id: 'RIS-17', code: 'RADIOLOGIST_WORKBENCH', name: 'Radiologist Diagnostic Workspace', category: 'Clinical', path: '/radiology/reports' },
  { id: 'RIS-18', code: 'REPORTING_ASSISTANT', name: 'Transcription & Draft Formatting Desk', category: 'Reporting', path: '/radiology/reports' },
  { id: 'RIS-19', code: 'PACS_DICOM', name: 'DICOM Archive & PACS Management', category: 'PACS', path: '/radiology/pacs' },
  { id: 'RIS-20', code: 'REPORT_CENTER', name: 'Radiology Report Center & Verification', category: 'Reporting', path: '/radiology/reports' },
  { id: 'RIS-21', code: 'CRITICAL_FINDINGS', name: 'Critical Findings Escalation & Communication', category: 'Clinical', path: '/radiology/critical' },
  { id: 'RIS-22', code: 'RAD_BILLING', name: 'Radiology Invoicing & Cashier Desk', category: 'Finance', path: '/billing' },
  { id: 'RIS-23', code: 'INSURANCE_PREAUTH', name: 'Insurance Authorization & Corporate Claims', category: 'Finance', path: '/insurance' },
  { id: 'RIS-24', code: 'BIOMEDICAL_EQUIPMENT', name: 'Scanner Biomedical AMC & Maintenance', category: 'Engineering', path: '/hospital/biomedical' },
  { id: 'RIS-25', code: 'CONTRAST_INVENTORY', name: 'Contrast Agents & Consumables Store', category: 'Supply', path: '/inventory' },
  { id: 'RIS-26', code: 'PURCHASE_DESK', name: 'Imaging Supplies Purchase Management', category: 'Supply', path: '/purchase-center' },
  { id: 'RIS-27', code: 'QUALITY_ASSURANCE', name: 'Radiology QA, AERB & Repeat Analysis', category: 'Quality', path: '/hospital/quality' },
  { id: 'RIS-28', code: 'STAFF_ROSTER', name: 'Radiology Staff Scheduling & Duty Roster', category: 'Administration', path: '/hr/roster' },
  { id: 'RIS-29', code: 'PATIENT_PORTAL', name: 'Patient Online Imaging & Report Portal', category: 'Portal', path: '/patient/reports' },
  { id: 'RIS-30', code: 'DOCTOR_PORTAL', name: 'Referring Physician Imaging Access', category: 'Portal', path: '/doctor/reports' },
  { id: 'RIS-31', code: 'NOTIFICATIONS', name: 'Department Notification Dispatcher', category: 'System', path: '/notifications' },
  { id: 'RIS-32', code: 'UNIVERSAL_SEARCH', name: 'Radiology Universal Search Engine', category: 'Search', path: '/search' },
  { id: 'RIS-33', code: 'RAD_AUDIT', name: 'Radiology Audit Log & Access Monitoring', category: 'Compliance', path: '/audit-logs' },
  { id: 'RIS-34', code: 'RAD_MIS', name: 'Radiology MIS Reports & Analytics', category: 'Analytics', path: '/radiology/mis' },
  { id: 'RIS-35', code: 'COMMON_LAYOUT', name: 'Radiology Modern Responsive Shell', category: 'System', path: '/radiology' },
  { id: 'RIS-36', code: 'ROLE_SIDEBAR', name: 'Role-Based Navigation System', category: 'System', path: '/radiology' },
  { id: 'RIS-37', code: 'RBAC_SECURITY', name: 'Radiology RBAC Security Matrix', category: 'Security', path: '/access-control' },
  { id: 'RIS-38', code: 'WORKFLOW_ENGINE', name: '10-Step Imaging Pipeline Engine', category: 'System', path: '/radiology' },
  { id: 'RIS-39', code: 'DATA_MODELS', name: 'RIS Mongoose Relational Integrity', category: 'System', path: '/hospital/masters' },
  { id: 'RIS-40', code: 'SIDEBAR_TREE', name: 'Canonical Radiology Navigation Tree', category: 'System', path: '/radiology' },
  { id: 'RIS-41', code: 'ENTERPRISE_RIS', name: 'Multi-Branch & Enterprise Teleradiology', category: 'Enterprise', path: '/superadmin' },
];

export const RIS_ROLE_SPECS: Record<string, RisRoleSpec> = {
  // ── 1. Radiology Manager / Imaging HOD ──
  radiology_manager: {
    roleKey: 'radiology_manager',
    title: 'Radiology Manager / Imaging HOD',
    subtitle: 'Overall imaging department leadership, modality utilization, reporting TAT, PACS health & QA oversight',
    permissions: ['radiology:read', 'radiology:write', 'radiology:cancel', 'equipment:read', 'reports:read', 'billing:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Orders', 'Scheduling', 'Modalities', 'Reporting Queue', 'PACS / DICOM', 'Equipment', 'Quality', 'MIS'],
    kpis: [
      { label: "Today's Imaging Patients", value: '86', hint: 'Across all modalities' },
      { label: 'Scans Completed', value: '72', hint: 'Acquired & in PACS' },
      { label: 'Reports Pending Sign-off', value: '14', hint: 'With attending radiologists' },
      { label: 'Critical Findings Flagged', value: '2', hint: 'Stat communication active' },
      { label: 'Scanner Fleet Uptime', value: '98.8%', hint: '7 / 7 machines online' },
      { label: 'Average Reporting TAT', value: '1.8 hrs', hint: 'Target: < 2.5 hrs' },
      { label: "Today's Imaging Revenue", value: '₹2,14,000', hint: 'MRI, CT & Ultrasound' },
      { label: 'Repeat Study Rate', value: '0.4%', hint: 'Well within AERB standards' },
    ],
    workQueues: [
      'Critical Findings Immediate Communication',
      'Reporting TAT SLA Breach Queue',
      'Unreported Urgent / STAT Scans',
      'Scanner Maintenance & Downtime Alerts',
      'Failed DICOM Image Transfer Queue',
      'Pending Study Cancellation Requests',
    ],
    quickActions: [
      { label: 'Book Imaging Study', route: '/radiology/scheduling' },
      { label: 'View Modality Worklists', route: '/radiology' },
      { label: 'Open PACS DICOM Viewer', route: '/radiology/pacs' },
      { label: 'Critical Findings Console', route: '/radiology/critical' },
      { label: 'Report Verification Desk', route: '/radiology/reports' },
      { label: 'Equipment Master', route: '/radiology/modalities' },
      { label: 'Department MIS Analytics', route: '/radiology/mis' },
    ],
    alerts: [
      { level: 'danger', message: 'Critical finding: Acute Subdural Hematoma on CT Brain #STU-9912 — Dr. Kapoor notified' },
      { level: 'warning', message: 'MRI 1.5T Scanner cold-head compressor pressure check due today' },
      { level: 'info', message: 'STAT Polytrauma CT scan incoming from Emergency Resuscitation Bay 1' },
    ],
    domainModules: [
      { id: 'RIS-01', name: 'Radiology Main Department', route: '/radiology' },
      { id: 'RIS-07', name: 'Appointment Scheduling', route: '/radiology/scheduling' },
      { id: 'RIS-19', name: 'PACS / DICOM Management', route: '/radiology/pacs' },
      { id: 'RIS-21', name: 'Critical Findings Console', route: '/radiology/critical' },
      { id: 'RIS-34', name: 'Radiology MIS Analytics', route: '/radiology/mis' },
    ],
  },

  // ── 2. Radiology Administrator ──
  radiology_admin: {
    roleKey: 'radiology_admin',
    title: 'Radiology Administrator',
    subtitle: 'Daily operations, machine scheduling rules, radiographer shifts, pricing & administrative approvals',
    permissions: ['radiology:read', 'radiology:write', 'radiology:cancel', 'equipment:read', 'equipment:manage', 'reports:read', 'billing:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Staff', 'Modalities', 'Pricing', 'Workflows', 'Approvals', 'Settings', 'MIS'],
    kpis: [
      { label: 'Radiology Staff on Duty', value: '16 / 18', hint: 'Full floor coverage' },
      { label: 'Awaiting Slot Scheduling', value: '11', hint: 'Confirmed orders' },
      { label: 'Studies In Progress', value: '6', hint: 'Active on tables' },
      { label: 'Pending Refund Requests', value: '2', hint: 'Cancelled scans' },
      { label: 'Contrast Stock Alerts', value: '1', hint: 'Isovue 370 buffer low' },
      { label: 'Daily Collection', value: '₹1,86,500', hint: 'Counter receipts' },
    ],
    workQueues: [
      'Pending Study Scheduling Requests',
      'Order Cancellation & Refund Approvals',
      'Radiologist Duty Shift Roster Exceptions',
      'Modality Maintenance Work Order Approvals',
      'Insurance Pre-Auth Clearance Queue',
    ],
    quickActions: [
      { label: 'Configure Modalities', route: '/radiology/modalities' },
      { label: 'Update Slot Schedules', route: '/radiology/scheduling' },
      { label: 'Approve Cancellations', route: '/radiology' },
      { label: 'Manage Staff Roster', route: '/hr/roster' },
      { label: 'View Collection Ledger', route: '/billing' },
    ],
    alerts: [
      { level: 'warning', message: '2 Imaging order refund requests awaiting administrative authorization' },
      { level: 'info', message: 'Afternoon radiologist coverage confirmed: Dr. Ananya Sen taking 14:00 - 20:00 shift' },
    ],
    domainModules: [
      { id: 'RIS-02', name: 'Radiology Admin Setup', route: '/radiology/dashboard' },
      { id: 'RIS-06', name: 'Modality Configuration', route: '/radiology/modalities' },
      { id: 'RIS-28', name: 'Staff Roster & Scheduling', route: '/hr/roster' },
    ],
  },

  // ── 3. Radiology Receptionist ──
  radiology_receptionist: {
    roleKey: 'radiology_receptionist',
    title: 'Radiology Receptionist',
    subtitle: 'Imaging patient check-in, walk-in registration, token calling, billing estimates & appointment slips',
    permissions: ['radiology:read', 'radiology:write', 'patients:read', 'patients:write', 'billing:read', 'billing:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Patients', 'Registration', 'Appointments', 'Orders', 'Check-In', 'Billing', 'Receipts'],
    kpis: [
      { label: "Today's Appointments", value: '74', hint: 'Booked across modalities' },
      { label: 'Patients Arrived & Checked-In', value: '48', hint: 'In preparation waiting' },
      { label: 'Walk-in Registrations', value: '18', hint: 'Chest X-ray / USG' },
      { label: 'Reports Ready for Handover', value: '26', hint: 'Printed / Counter pickup' },
      { label: 'Pending Billing Collections', value: '₹8,500', hint: 'Counter dues' },
      { label: 'Avg Check-In Time', value: '1.9 min', hint: 'Target: < 3.0 min' },
    ],
    workQueues: [
      'Front Desk Check-in Queue',
      'Arrived Patients Awaiting Preparation',
      'Walk-In Requisition Entry Worklist',
      'Printed Films & Reports Handover Queue',
      'Counter Invoice Payment Collection',
    ],
    quickActions: [
      { label: 'Register Imaging Patient', route: '/radiology/reception' },
      { label: 'Book Imaging Appointment', route: '/radiology/scheduling' },
      { label: 'Confirm Patient Arrival', route: '/radiology/reception' },
      { label: 'Generate Imaging Invoice', route: '/billing' },
      { label: 'Print Appointment Slip', route: '/radiology/reception' },
      { label: 'Check Report Status', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'info', message: 'Patient Meera Patel checked in for MRI Brain (11:00 AM slot) — sent to preparation area' },
      { level: 'warning', message: 'Patient Harish Chandra requires fasting confirmation before Abdomen Ultrasound' },
    ],
    domainModules: [
      { id: 'RIS-03', name: 'Reception & Patient Desk', route: '/radiology/reception' },
      { id: 'RIS-07', name: 'Appointment Calendar', route: '/radiology/scheduling' },
      { id: 'RIS-22', name: 'Counter Invoicing & Billing', route: '/billing' },
      { id: 'RIS-20', name: 'Report Handover Desk', route: '/radiology/reports' },
    ],
  },

  // ── 4. Appointment Scheduler / Coordinator ──
  radiology_scheduler: {
    roleKey: 'radiology_scheduler',
    title: 'Imaging Appointment Scheduler',
    subtitle: 'Modality slot management, machine calendars, emergency buffer slots & conflict-free scheduling',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Calendar', 'MRI Schedule', 'CT Schedule', 'X-Ray Schedule', 'Ultrasound Schedule', 'Rescheduling'],
    kpis: [
      { label: 'Confirmed Bookings Today', value: '74', hint: 'All scanners' },
      { label: 'Emergency Reserve Slots Open', value: '6', hint: 'Trauma / Stroke' },
      { label: 'Tomorrow Advance Bookings', value: '62', hint: '84% capacity booked' },
      { label: 'Rescheduled Requests', value: '3', hint: 'Patient initiated' },
      { label: 'Scanner Slot Utilization', value: '92.4%', hint: 'Optimal throughput' },
    ],
    workQueues: [
      'Pending Appointment Confirmation Queue',
      'Emergency / STAT Add-on Slot Requests',
      'Patient Reschedule & Cancellation Queue',
      'Overdue Patient Reminder Worklist',
      'Machine Slot Conflict Review',
    ],
    quickActions: [
      { label: 'Open Scheduling Calendar', route: '/radiology/scheduling' },
      { label: 'Reserve Scanner Slot', route: '/radiology/scheduling' },
      { label: 'Reschedule Appointment', route: '/radiology/scheduling' },
      { label: 'Send Automated Reminder', route: '/notifications' },
    ],
    alerts: [
      { level: 'info', message: 'MRI 1.5T calendar booked to 95% capacity for today — emergency buffer remaining' },
    ],
    domainModules: [
      { id: 'RIS-07', name: 'Appointment Scheduling', route: '/radiology/scheduling' },
      { id: 'RIS-08', name: 'MRI Unit Schedule', route: '/radiology/mri' },
      { id: 'RIS-10', name: 'CT Unit Schedule', route: '/radiology/ct' },
    ],
  },

  // ── 5. Patient Preparation Staff ──
  radiology_prep_staff: {
    roleKey: 'radiology_prep_staff',
    title: 'Radiology Preparation & Safety Staff',
    subtitle: 'Patient verification, MRI metal screening questionnaire, CT contrast prep & kidney eGFR clearance',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Preparation Queue', 'MRI Screening', 'CT Contrast Checks', 'Consent Records', 'Readiness'],
    kpis: [
      { label: 'Patients in Preparation', value: '8', hint: 'Changing / Screening' },
      { label: 'MRI Safety Questionnaires Cleared', value: '18', hint: 'Zero ferrous risk' },
      { label: 'CT Contrast Consents Verified', value: '12', hint: 'Creatinine checked' },
      { label: 'Patients Held (Safety Alert)', value: '1', hint: 'Retained metal foreign body' },
      { label: 'Cleared & Ready for Table', value: '6', hint: 'Notified to technician' },
    ],
    workQueues: [
      'Patient Preparation Intake Queue',
      'MRI Safety Metal Screening Worklist',
      'CT Contrast Allergy & Creatinine Review',
      'Signed Informed Consent Verification',
      'Patients Cleared for Scanner Gantry',
    ],
    quickActions: [
      { label: 'Open Preparation Queue', route: '/radiology/preparation' },
      { label: 'Complete MRI Safety Form', route: '/radiology/preparation' },
      { label: 'Verify Serum Creatinine / GFR', route: '/radiology/preparation' },
      { label: 'Record Patient Consent', route: '/radiology/preparation' },
      { label: 'Mark Patient Ready for Scan', route: '/radiology/preparation' },
    ],
    alerts: [
      { level: 'danger', message: 'HOLD: Patient Ramesh Kumar for MRI Brain has cardiac stent implanted in 2021 — safety card needed' },
      { level: 'info', message: 'CT Abdomen patient Sunita Devi: Serum Creatinine 0.9 mg/dL (Normal) — contrast cleared' },
    ],
    domainModules: [
      { id: 'RIS-15', name: 'Patient Preparation & Safety', route: '/radiology/preparation' },
      { id: 'RIS-08', name: 'MRI Safety Screening', route: '/radiology/mri' },
      { id: 'RIS-10', name: 'CT Contrast Screening', route: '/radiology/ct' },
    ],
  },

  // ── 6. Radiology Technician / Radiographer (General) ──
  radiology_technician: {
    roleKey: 'radiology_technician',
    title: 'Radiology Technician / Radiographer',
    subtitle: 'Imaging study acquisition, gantry positioning, scan parameter execution & DICOM image transfer',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Worklist', 'Active Studies', 'Image Transfer', 'Equipment Status', 'Technical Notes'],
    kpis: [
      { label: 'Assigned Studies Today', value: '24', hint: 'Across modalities' },
      { label: 'Scans In-Progress', value: '3', hint: 'On imaging tables' },
      { label: 'Completed Acquisitions', value: '19', hint: 'Transferred to PACS' },
      { label: 'DICOM Uploads Pending', value: '1', hint: 'Auto-syncing series' },
      { label: 'Repeat Exposures', value: '0', hint: 'Zero motion artifact today' },
      { label: 'Avg Acquisition Duration', value: '12 min', hint: 'Within standard protocol' },
    ],
    workQueues: [
      'Active Modality Worklist (MWL)',
      'Patients Ready in Gantry Antechamber',
      'DICOM Study Transfer & PACS Sync Queue',
      'Technical Acquisition Notes Entry',
      'Repeat Study Documentation Worklist',
    ],
    quickActions: [
      { label: 'Open Acquisition Worklist', route: '/radiology' },
      { label: 'Start Imaging Procedure', route: '/radiology' },
      { label: 'Complete Scan & Transfer', route: '/radiology' },
      { label: 'View DICOM Study in PACS', route: '/radiology/pacs' },
      { label: 'Log Technical Note', route: '/radiology' },
      { label: 'Forward to Radiologist', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'info', message: 'X-Ray Chest PA for Bed 301 acquired — 2 DICOM instances transferred to PACS' },
      { level: 'warning', message: 'Verify patient positioning: Thoracic spine study #STU-9021 requires swimmer view' },
    ],
    domainModules: [
      { id: 'RIS-16', name: 'Technician Worklist', route: '/radiology' },
      { id: 'RIS-19', name: 'PACS Image Verification', route: '/radiology/pacs' },
      { id: 'RIS-24', name: 'Scanner Biomedical Status', route: '/hospital/biomedical' },
    ],
  },

  // ── 7. MRI Technician ──
  mri_technician: {
    roleKey: 'mri_technician',
    title: 'MRI Specialist Radiographer',
    subtitle: '1.5T / 3.0T MRI acquisition, coil selection, T1/T2/FLAIR/DWI sequences & artifact mitigation',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'MRI Worklist', 'Appointments', 'Safety Screening', 'Sequences', 'PACS Transfer'],
    kpis: [
      { label: 'MRI Scans Scheduled Today', value: '14', hint: 'Brain, Spine, Joints, Abd' },
      { label: 'Patients Cleared by Prep', value: '3', hint: 'In changing cubicle' },
      { label: 'Scans Completed', value: '9', hint: 'All sequences acquired' },
      { label: 'Average Scan Duration', value: '26 min', hint: 'Multi-parametric protocol' },
      { label: 'Cryogen Helium Pressure', value: '100% OK', hint: 'Zero boil-off variance' },
    ],
    workQueues: [
      'MRI Modality Worklist (MWL)',
      'Safety Cleared Patients Ready for Gantry',
      'DICOM Multi-Sequence PACS Push Queue',
      'Contrast MRI Injection Log Worklist',
      'Urgent Stroke Protocol MRI Queue',
    ],
    quickActions: [
      { label: 'Open MRI Worklist', route: '/radiology/mri' },
      { label: 'Verify Ferrous Metal Clearance', route: '/radiology/preparation' },
      { label: 'Start MRI Protocol', route: '/radiology/mri' },
      { label: 'Transfer DICOM Series to PACS', route: '/radiology/pacs' },
      { label: 'Forward for Reporting', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'danger', message: 'Emergency Stroke MRI Brain (DWI + MRA) requested from ER — Priority Table 1' },
      { level: 'info', message: 'Head/Neck 16-channel Neurovascular coil sanitized and ready' },
    ],
    domainModules: [
      { id: 'RIS-08', name: 'MRI Unit Management', route: '/radiology/mri' },
      { id: 'RIS-15', name: 'MRI Safety Screening Queue', route: '/radiology/preparation' },
      { id: 'RIS-19', name: 'PACS DICOM Linkage', route: '/radiology/pacs' },
    ],
  },

  // ── 8. X-Ray Technician ──
  xray_technician: {
    roleKey: 'xray_technician',
    title: 'Digital X-Ray Radiographer',
    subtitle: 'Skeletal radiography, chest views, portable mobile X-rays, radiation collimation & exposure control',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'X-Ray Worklist', 'Walk-Ins', 'Portable Requests', 'PACS Transfer', 'QA Retakes'],
    kpis: [
      { label: 'X-Ray Studies Scheduled', value: '38', hint: 'Chest, Extremities, Spine' },
      { label: 'Walk-In Patients in Lobby', value: '6', hint: 'Avg wait: 7 min' },
      { label: 'Portable ICU Requests', value: '2', hint: 'Bedside Mobile DR' },
      { label: 'Exposures Completed', value: '28', hint: 'Transferred to PACS' },
      { label: 'Repeat Exposure Count', value: '0', hint: 'Zero retakes today' },
    ],
    workQueues: [
      'General OPD X-Ray Worklist',
      'Stat Emergency Trauma X-Ray Queue',
      'Portable Bedside ICU X-Ray Requests',
      'PACS DICOM Push & Verification',
    ],
    quickActions: [
      { label: 'Open X-Ray Queue', route: '/radiology/xray' },
      { label: 'Acquire Exposure', route: '/radiology/xray' },
      { label: 'Push Images to PACS', route: '/radiology/pacs' },
      { label: 'Log Portable ICU Scan', route: '/radiology/xray' },
    ],
    alerts: [
      { level: 'info', message: 'Portable X-ray requested for ICU Bed 201 (Post-Op Day 1)' },
    ],
    domainModules: [
      { id: 'RIS-09', name: 'X-Ray Unit Management', route: '/radiology/xray' },
      { id: 'RIS-19', name: 'PACS Image Verification', route: '/radiology/pacs' },
    ],
  },

  // ── 9. CT Scan Technician ──
  ct_technician: {
    roleKey: 'ct_technician',
    title: 'CT Scan Specialist Radiographer',
    subtitle: 'Helical multislice CT, automated power injector setup, contrast bolus tracking & 3D reformat',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'CT Worklist', 'Contrast Timing', 'Reconstructions', 'PACS Transfer', 'Consumables'],
    kpis: [
      { label: 'CT Scans Scheduled Today', value: '22', hint: 'Head, Chest, Abdo-Pelvis' },
      { label: 'Contrast Studies Cleared', value: '11', hint: 'IV Cannula 18G & GFR OK' },
      { label: 'Non-Contrast Scans Finished', value: '9', hint: 'NCCT Head / KUB' },
      { label: 'Trauma Whole-Body Scans', value: '2', hint: 'Emergency polytrauma' },
      { label: 'Power Injector Status', value: 'Ready', hint: 'Dual-head MEDRAD calibrated' },
    ],
    workQueues: [
      'CT Scanner Acquisition Worklist',
      'IV Contrast Bolus Injection Queue',
      'Emergency Polytrauma Fast-Track CT',
      'Multi-Planar Reconstruction (MPR) Queue',
      'DICOM PACS Batch Push Verification',
    ],
    quickActions: [
      { label: 'Open CT Scanner Queue', route: '/radiology/ct' },
      { label: 'Verify Contrast Clearance', route: '/radiology/preparation' },
      { label: 'Start CT Protocol', route: '/radiology/ct' },
      { label: 'Transfer 3D Series to PACS', route: '/radiology/pacs' },
      { label: 'Forward to Radiologist', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'danger', message: 'Urgent CT Pulmonary Angiogram requested: Rule out PE on 48y female' },
      { level: 'info', message: 'Dual-head injector syringe packs restocked' },
    ],
    domainModules: [
      { id: 'RIS-10', name: 'CT Scan Management', route: '/radiology/ct' },
      { id: 'RIS-15', name: 'Contrast Safety Screening', route: '/radiology/preparation' },
      { id: 'RIS-19', name: 'PACS DICOM Linkage', route: '/radiology/pacs' },
    ],
  },

  // ── 10. Ultrasound / Doppler Staff ──
  us_technician: {
    roleKey: 'us_technician',
    title: 'Sonography / Doppler Coordinator',
    subtitle: 'Ultrasound examination coordination, transducer management, clip association & sonologist assistance',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Ultrasound Worklist', 'Doppler Queue', 'Patient Intake', 'Image Clips', 'Reporting Queue'],
    kpis: [
      { label: 'Ultrasound Appointments', value: '26', hint: 'Abdomen, Pelvis, KUB' },
      { label: 'Color Doppler Studies', value: '6', hint: 'Carotid & Venous' },
      { label: 'Full Bladder Patients Waiting', value: '4', hint: 'Ready for scanning' },
      { label: 'Examinations Completed', value: '18', hint: 'Images saved in archive' },
      { label: 'Transducer Probes Active', value: '3', hint: 'Curvilinear, Linear, TVS' },
    ],
    workQueues: [
      'Ultrasound Patient Examination Queue',
      'Color Doppler Flow Study Worklist',
      'Full Bladder Hydration Readiness Queue',
      'Images & Loop Clips PACS Export',
    ],
    quickActions: [
      { label: 'Open Ultrasound Queue', route: '/radiology/ultrasound' },
      { label: 'Open Doppler Worklist', route: '/radiology/doppler' },
      { label: 'Confirm Bladder Hydration', route: '/radiology/ultrasound' },
      { label: 'Associate Image Clips', route: '/radiology/pacs' },
      { label: 'Forward to Sonologist', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'info', message: 'Patient Pooja Nair full bladder confirmed — ready in Ultrasound Room 2' },
    ],
    domainModules: [
      { id: 'RIS-11', name: 'Ultrasound Examination Unit', route: '/radiology/ultrasound' },
      { id: 'RIS-12', name: 'Color Doppler Unit', route: '/radiology/doppler' },
    ],
  },

  // ── 11. Mammography Technician ──
  mammo_technician: {
    roleKey: 'mammo_technician',
    title: 'Mammography Specialist Radiographer',
    subtitle: 'Bilateral digital mammography, localized spot compression, tomosynthesis & patient comfort',
    permissions: ['radiology:read', 'radiology:write', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Mammography Queue', 'Appointments', 'Positioning QA', 'Prior Scans', 'PACS Push'],
    kpis: [
      { label: 'Mammograms Scheduled Today', value: '8', hint: 'Screening & diagnostic' },
      { label: 'Prior Scans Retrieved', value: '6', hint: 'For comparison' },
      { label: 'Tomosynthesis 3D Runs', value: '4', hint: 'High-density tissue' },
      { label: 'Completed Studies in PACS', value: '5', hint: 'CC and MLO views' },
    ],
    workQueues: [
      'Mammography Patient Appointment Queue',
      'Prior Mammogram Retrieval & Linking',
      'Tomosynthesis Acquisition Worklist',
      'DICOM PACS Image Transfer Queue',
    ],
    quickActions: [
      { label: 'Open Mammography Queue', route: '/radiology/mammography' },
      { label: 'Retrieve Prior Mammogram', route: '/radiology/pacs' },
      { label: 'Complete Acquisition', route: '/radiology/mammography' },
      { label: 'Forward for BI-RADS Report', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'info', message: 'Patient Sunita Devi 2024 prior mammogram linked for radiologist comparison' },
    ],
    domainModules: [
      { id: 'RIS-13', name: 'Mammography Unit', route: '/radiology/mammography' },
      { id: 'RIS-19', name: 'PACS Prior Image Linking', route: '/radiology/pacs' },
    ],
  },

  // ── 12. Consultant Radiologist ──
  radiologist: {
    roleKey: 'radiologist',
    title: 'Consultant Radiologist',
    subtitle: 'Diagnostic image interpretation, cross-sectional reporting, structured impressions & critical finding alerts',
    permissions: ['radiology:read', 'radiology:write', 'radiology:amend', 'reports:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Reporting Worklist', 'PACS Viewer', 'Critical Findings', 'MRI Reports', 'CT Reports', 'Amendments'],
    kpis: [
      { label: 'Studies Awaiting Reporting', value: '18', hint: 'MRI, CT, X-Ray, USG' },
      { label: 'STAT Urgent Studies', value: '2', hint: 'Emergency bay priority' },
      { label: 'Critical Findings Flagged', value: '2', hint: 'Physician notified' },
      { label: 'Reports Finalized Today', value: '56', hint: 'Signed with digital stamp' },
      { label: 'Report Amendments Requested', value: '1', hint: 'Addendum needed' },
      { label: 'Avg Reading Turnaround', value: '28 min', hint: 'Well within SLA' },
    ],
    workQueues: [
      'STAT Emergency & Critical Reporting Queue',
      'MRI Cross-Sectional Diagnostic Worklist',
      'Multislice CT Protocol Reporting Queue',
      'Digital Radiography (X-Ray) Batch Worklist',
      'Ultrasound & Doppler Sonography Queue',
      'Report Amendments & Correction Reviews',
    ],
    quickActions: [
      { label: 'Open Diagnostic Reporting Queue', route: '/radiology/reports' },
      { label: 'Launch PACS DICOM Viewer', route: '/radiology/pacs' },
      { label: 'Flag Critical Red-Alert Finding', route: '/radiology/critical' },
      { label: 'Sign & Release Radiology Report', route: '/radiology/reports' },
      { label: 'Compare with Prior Imaging', route: '/radiology/pacs' },
      { label: 'Issue Report Addendum', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'danger', message: 'CRITICAL: Acute ischemic stroke on MRI DWI #STU-9904 — Read & notify Neurologist immediately' },
      { level: 'warning', message: 'Tension pneumothorax suspected on Chest X-Ray #STU-9918 (Bay 2)' },
    ],
    domainModules: [
      { id: 'RIS-17', name: 'Radiologist Diagnostic Workspace', route: '/radiology/reports' },
      { id: 'RIS-19', name: 'PACS Web DICOM Viewer', route: '/radiology/pacs' },
      { id: 'RIS-21', name: 'Critical Findings Communication', route: '/radiology/critical' },
      { id: 'RIS-20', name: 'Final Report Sign-off', route: '/radiology/reports' },
    ],
  },

  // ── 13. Reporting Assistant / Transcriptionist ──
  reporting_assistant: {
    roleKey: 'reporting_assistant',
    title: 'Radiology Reporting Assistant',
    subtitle: 'Audio dictation transcription, structured template selection, preliminary formatting & radiologist handover',
    permissions: ['radiology:read', 'reports:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Dictation Queue', 'Transcription', 'Draft Reports', 'Template Setup', 'Pending Signatures'],
    kpis: [
      { label: 'Dictated Audio Tapes in Queue', value: '8', hint: 'Awaiting transcription' },
      { label: 'Draft Reports Formatted', value: '34', hint: 'Transcribed today' },
      { label: 'Drafts Awaiting Radiologist Signature', value: '12', hint: 'Ready for final sign' },
      { label: 'Missing Clinical Info Flags', value: '1', hint: 'Indication needed' },
    ],
    workQueues: [
      'Voice Dictation Audio Transcription Queue',
      'Draft Radiology Report Formatting Worklist',
      'Missing Clinical History Validation Queue',
      'Formatted Drafts Staged for Radiologist Signature',
    ],
    quickActions: [
      { label: 'Open Transcription Desk', route: '/radiology/reports' },
      { label: 'Select Structured Template', route: '/radiology/reports' },
      { label: 'Submit Draft to Radiologist', route: '/radiology/reports' },
    ],
    alerts: [
      { level: 'info', message: '4 Voice dictations uploaded by Dr. Sen for CT Abdomen series' },
    ],
    domainModules: [
      { id: 'RIS-18', name: 'Transcription & Draft Desk', route: '/radiology/reports' },
      { id: 'RIS-20', name: 'Report Center', route: '/radiology/reports' },
    ],
  },

  // ── 14. PACS Administrator ──
  pacs_admin: {
    roleKey: 'pacs_admin',
    title: 'PACS & DICOM Systems Administrator',
    subtitle: 'DICOM connectivity, PACS archive integrity, C-STORE transfers, storage volume & unlinked study matching',
    permissions: ['radiology:read', 'equipment:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'DICOM Studies', 'Transfer Queue', 'Unlinked Studies', 'PACS Archive', 'Storage Health', 'Logs'],
    kpis: [
      { label: 'DICOM Studies Stored Today', value: '74', hint: 'All modalities' },
      { label: 'Active PACS Storage Used', value: '4.2 TB / 10 TB', hint: '42% capacity' },
      { label: 'Failed DICOM C-STORE Transfers', value: '0', hint: '100% transfer success' },
      { label: 'Unlinked / Orphan Studies', value: '1', hint: 'Manual accession match' },
      { label: 'PACS Node Ping Latency', value: '2 ms', hint: 'Local GigE LAN' },
      { label: 'Offsite Cloud Backup Sync', value: 'Syncd', hint: 'Last snapshot 15m ago' },
    ],
    workQueues: [
      'Failed DICOM Transfer Retry Queue',
      'Orphaned / Unlinked Study Association List',
      'Storage Tiering & Archival Migration Worklist',
      'DICOM Modality Worklist (MWL) Ping Status',
      'Integration Error & Communication Log',
    ],
    quickActions: [
      { label: 'Review PACS Dashboard', route: '/radiology/pacs' },
      { label: 'Link Orphan Study to Order', route: '/radiology/pacs' },
      { label: 'Retry Failed Image Transfer', route: '/radiology/pacs' },
      { label: 'Ping DICOM AE Nodes', route: '/radiology/pacs' },
      { label: 'View Storage Health Graph', route: '/radiology/pacs' },
    ],
    alerts: [
      { level: 'warning', message: '1 Unlinked DICOM study received from Portable X-Ray: Patient Name "EMERGENCY_TRAUMA_01"' },
      { level: 'info', message: 'Nightly optical storage compression run cleared 420 GB space' },
    ],
    domainModules: [
      { id: 'RIS-19', name: 'PACS / DICOM Management', route: '/radiology/pacs' },
      { id: 'RIS-33', name: 'PACS Audit & Storage Logs', route: '/audit-logs' },
    ],
  },

  // ── 15. Radiology Billing Executive ──
  radiology_billing_executive: {
    roleKey: 'radiology_billing_executive',
    title: 'Radiology Billing Executive',
    subtitle: 'Imaging tariff computation, contrast agent surcharge invoicing, corporate discounts & estimate generation',
    permissions: ['billing:read', 'billing:write', 'radiology:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Invoices', 'Estimates', 'Modality Charges', 'Insurance Pre-Auth', 'Payments', 'Receipts'],
    kpis: [
      { label: 'Invoices Generated Today', value: '82', hint: 'Cash, UPI, TPA' },
      { label: 'Total Invoiced Value', value: '₹2,14,000', hint: 'Gross billing' },
      { label: 'Pending Payment Approvals', value: '6', hint: 'Awaiting scheduling' },
      { label: 'TPA Pre-Authorizations Cleared', value: '14', hint: 'Cashless scans' },
      { label: 'Refund Requests Pending', value: '2', hint: 'Approved by admin' },
    ],
    workQueues: [
      'Unbilled Imaging Orders Queue',
      'TPA Pre-Authorization Document Verification',
      'Pending Advance / Split Settle Counter Queue',
      'Cancelled Scan Refund Processing Worklist',
    ],
    quickActions: [
      { label: 'Generate Imaging Invoice', route: '/billing' },
      { label: 'Verify Insurance Eligibility', route: '/insurance' },
      { label: 'Process Approved Refund', route: '/billing' },
      { label: 'Print Billing Receipt', route: '/billing' },
    ],
    alerts: [
      { level: 'info', message: 'Pre-auth cashless clearance received for TPA Claim #TPA-9912 (MRI Knee)' },
    ],
    domainModules: [
      { id: 'RIS-22', name: 'Radiology Invoicing & Cashier', route: '/billing' },
      { id: 'RIS-23', name: 'Insurance & Corporate Claims', route: '/insurance' },
    ],
  },

  // ── 16. Biomedical / Equipment Manager ──
  equipment_manager: {
    roleKey: 'equipment_manager',
    title: 'Biomedical & Equipment Manager',
    subtitle: 'MRI/CT scanner uptime, preventive maintenance, AERB radiation checks, breakdown work orders & AMC contracts',
    permissions: ['equipment:read', 'equipment:manage', 'inventory:read', 'notifications:read'],
    sidebarSections: ['Dashboard', 'Equipment Master', 'Maintenance Schedules', 'Breakdown Tickets', 'Calibration', 'AMC / CMC', 'Downtime'],
    kpis: [
      { label: 'Total Scanners & Modalities', value: '14', hint: 'MRI, CT, DR, USG, OPG' },
      { label: 'Machines Fully Operational', value: '13', hint: '93% operational' },
      { label: 'Under Preventive Maintenance', value: '1', hint: 'X-Ray Tube Calibration' },
      { label: 'Open Breakdown Tickets', value: '0', hint: 'Zero critical downtime' },
      { label: 'AERB Radiation QA Status', value: '100% Compliant', hint: 'All lead aprons checked' },
      { label: 'AMCs Expiring in 60 Days', value: '2', hint: 'Vendor renewal active' },
    ],
    workQueues: [
      'Preventive Maintenance Work Orders',
      'Scanner Breakdown Incident Tickets',
      'Equipment Calibration Due Schedule',
      'AERB QA Survey & Dosimetry Logs',
      'Expiring Vendor Service Contracts (AMC)',
    ],
    quickActions: [
      { label: 'Log Equipment Maintenance', route: '/hospital/biomedical' },
      { label: 'Create Breakdown Service Ticket', route: '/hospital/biomedical' },
      { label: 'Record Calibration Certificate', route: '/hospital/biomedical' },
      { label: 'Check Scanner Availability', route: '/radiology/modalities' },
    ],
    alerts: [
      { level: 'warning', message: 'Annual AERB radiation survey due next month for Digital Radiography Room 1' },
      { level: 'info', message: 'CT Scanner monthly calibration completed successfully at 06:30 AM' },
    ],
    domainModules: [
      { id: 'RIS-24', name: 'Biomedical & Equipment Maintenance', route: '/hospital/biomedical' },
      { id: 'RIS-06', name: 'Modality Asset Master', route: '/radiology/modalities' },
    ],
  },
};

export function getRisDashboardSpec(roleKey) {
  if (!roleKey) return RIS_ROLE_SPECS.radiology_manager;
  const key = String(roleKey).toLowerCase().trim();
  if (RIS_ROLE_SPECS[key]) return RIS_ROLE_SPECS[key];

  // Role alias mappings for RIS
  if (key === 'radiology_admin' || key === 'imaging_director') return { ...RIS_ROLE_SPECS.radiology_admin, roleKey: key };
  if (key === 'radiology_scheduler' || key === 'imaging_coordinator') return { ...RIS_ROLE_SPECS.radiology_scheduler, roleKey: key };
  if (key === 'radiology_prep_staff' || key === 'imaging_nurse') return { ...RIS_ROLE_SPECS.radiology_prep_staff, roleKey: key };
  if (key === 'radiology_technician' || key === 'radiographer') return { ...RIS_ROLE_SPECS.radiology_technician, roleKey: key };
  if (key === 'mri_tech') return { ...RIS_ROLE_SPECS.mri_technician, roleKey: key };
  if (key === 'xray_tech') return { ...RIS_ROLE_SPECS.xray_technician, roleKey: key };
  if (key === 'ct_tech') return { ...RIS_ROLE_SPECS.ct_technician, roleKey: key };
  if (key === 'ultrasound_staff' || key === 'sonologist') return { ...RIS_ROLE_SPECS.us_technician, roleKey: key };
  if (key === 'mammo_tech') return { ...RIS_ROLE_SPECS.mammo_technician, roleKey: key };
  if (key === 'radiologist' || key === 'attending_radiologist') return { ...RIS_ROLE_SPECS.radiologist, roleKey: key };
  if (key === 'transcriptionist') return { ...RIS_ROLE_SPECS.reporting_assistant, roleKey: key };
  if (key === 'pacs_admin' || key === 'pacs_engineer') return { ...RIS_ROLE_SPECS.pacs_admin, roleKey: key };
  if (key === 'radiology_cashier') return { ...RIS_ROLE_SPECS.radiology_billing_executive, roleKey: key };
  if (key === 'biomedical_engineer') return { ...RIS_ROLE_SPECS.equipment_manager, roleKey: key };

  // Fallback to Radiology Manager if role starts with radiology_ or ends with _technician
  if (key.startsWith('radiology_')) return { ...RIS_ROLE_SPECS.radiology_manager, roleKey: key };
  return null;
}

export function getAllRisRoles() {
  return Object.keys(RIS_ROLE_SPECS);
}
