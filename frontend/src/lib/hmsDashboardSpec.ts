/**
 * HMS Dashboard Blueprint Master Specification (Frontend)
 *
 * 6-Layer, 50+ Role Dashboard Architecture for Complete HMS/HIS
 * Compatible with RoleDashboardShell.tsx and typed for Vite / React.
 */
import type { RoleDashboardConfig, Kpi, TaskItem, AlertItem, DomainModule } from '@/pages/dashboards/RoleDashboardShell';

export interface HmsDashboardConfig extends RoleDashboardConfig {
  layer: 1 | 2 | 3 | 4 | 5 | 6;
  layerName: string;
  sidebarSections: string[];
  workQueues: string[];
  quickActions: string[];
}

export const HMS_LAYERS = {
  LAYER_1_EXECUTIVE: { id: 1, name: 'Executive Dashboards', description: 'Governance, strategic oversight, multi-tenant SaaS & hospital leadership' },
  LAYER_2_CLINICAL: { id: 2, name: 'Clinical Dashboards', description: 'Direct patient care, attending consultants, residents & ward nursing' },
  LAYER_3_CRITICAL_CARE: { id: 3, name: 'Critical Care & Procedure Dashboards', description: 'Emergency/Trauma, ICU, Operation Theatres & specialized procedures' },
  LAYER_4_DIAGNOSTICS: { id: 4, name: 'Diagnostic & Treatment Support', description: 'Pathology laboratory, radiology/PACS, pharmacy & blood bank' },
  LAYER_5_BUSINESS_OPERATIONS: { id: 5, name: 'Business & Operations', description: 'Front desk, admissions, bed board, billing, cashiers, TPA/claims & supply chain' },
  LAYER_6_FACILITY_QUALITY_DIGITAL: { id: 6, name: 'Facility, Quality & Digital', description: 'Housekeeping, CSSD, maintenance, safety, infection control, portals & MIS' },
} as const;

export const HMS_ROLE_SPECS: Record<string, HmsDashboardConfig> = {
  // ==========================================
  // LAYER 1: EXECUTIVE DASHBOARDS
  // ==========================================
  superadmin: {
    roleKey: 'superadmin',
    layer: 1,
    layerName: 'Executive',
    title: 'Super Admin Dashboard',
    subtitle: 'Multi-hospital SaaS governance, global metrics, tenant health & subscriptions',
    permissions: ['admin:manage', 'hospitals:manage', 'subscriptions:manage', 'users:manage', 'audit:read'],
    sidebarSections: ['Dashboard', 'Hospitals', 'Subscriptions', 'Users', 'System Health', 'Logs', 'Global Settings'],
    kpis: [
      { label: 'Registered Hospitals', value: '14', hint: 'Total active tenants' },
      { label: 'Platform Doctors', value: '428', hint: 'Credentialed physicians' },
      { label: 'Active Subscriptions', value: '12', hint: 'Paid MRR plans' },
      { label: 'System Uptime', value: '99.98%', hint: 'Cluster health' },
    ],
    tasks: [
      { id: 't1', text: 'Review pending hospital onboarding verifications' },
      { id: 't2', text: 'Audit multi-tenant cross-boundary isolation logs' },
      { id: 't3', text: 'Verify automated off-site database snapshot backups' },
    ],
    alerts: [
      { id: 'a1', text: '2 hospital subscription renewals due in 48 hours', level: 'info' },
      { id: 'a2', text: 'No critical security anomalies reported in last 24h', level: 'info' },
    ],
    workQueues: ['Pending Hospital Approvals', 'Active Tenants', 'Failed Subscription Payments', 'System Incident Logs'],
    quickActions: ['Add Hospital Tenant', 'Create Subscription Plan', 'Audit Global Access Logs', 'Check Server Health'],
    domainModules: [
      { key: 'hospitals', emoji: '🏥', label: 'Hospital Tenants', description: 'Manage branches, buildings, wings and tenant licensing.', ctaLabel: 'View Hospitals', ctaHref: '/superadmin' },
      { key: 'security', emoji: '🛡️', label: 'Security & IAM', description: 'Super-admin role bindings, session policies and encryption.', ctaLabel: 'Access Control', ctaHref: '/admin/access-control' },
    ],
  },

  hospital_owner: {
    roleKey: 'hospital_owner',
    layer: 1,
    layerName: 'Executive',
    title: 'Hospital Owner / Director Dashboard',
    subtitle: 'Comprehensive financial health, patient census, bed occupancy & institutional KPIs',
    permissions: ['reports:read', 'billing:read', 'operations:read', 'staff:manage'],
    sidebarSections: ['Dashboard', 'Hospital Overview', 'Revenue', 'Departments', 'Occupancy', 'Performance', 'Reports'],
    kpis: [
      { label: "Today's OPD", value: '386', hint: 'Outpatient census' },
      { label: 'Current IPD', value: '142', hint: 'Active admissions' },
      { label: 'Bed Occupancy', value: '78%', hint: 'Total occupied / total' },
      { label: "Today's Collection", value: '₹17.9L', hint: 'Gross cash & digital' },
    ],
    tasks: [
      { id: 't1', text: 'Review executive monthly profit & loss comparison' },
      { id: 't2', text: 'Examine high outstanding claims pending with TPAs' },
      { id: 't3', text: 'Inspect department-wise patient satisfaction indices' },
    ],
    alerts: [
      { id: 'a1', text: 'ICU capacity running above 85% utilization', level: 'warn' },
      { id: 'a2', text: '3 corporate credit claims exceeded 60-day ageing', level: 'info' },
    ],
    workQueues: ['Executive Census', 'Revenue Split by Department', 'Corporate Receivables', 'Staffing Index'],
    quickActions: ['Generate MIS Executive Brief', 'Review Departmental P&L', 'Inspect Bed Board', 'Review Approvals'],
    domainModules: [
      { key: 'revenue', emoji: '📈', label: 'Revenue Cycle MIS', description: 'Department-wise billing, cash collection and TPA settlement.', ctaLabel: 'Open Revenue', ctaHref: '/hospital/rcm' },
      { key: 'occupancy', emoji: '🛏️', label: 'Institutional Census', description: 'Real-time ward, ICU, and room occupancy rates.', ctaLabel: 'Bed Heatmap', ctaHref: '/hospital/beds' },
    ],
  },

  hospital_admin: {
    roleKey: 'hospital_admin',
    layer: 1,
    layerName: 'Executive',
    title: 'Hospital Administrator Dashboard',
    subtitle: 'Day-to-day hospital operations, ward statuses, staff rosters & master approvals',
    permissions: ['admin:manage', 'operations:manage', 'beds:manage', 'billing:manage', 'staff:manage'],
    sidebarSections: ['Dashboard', 'Patients', 'Admissions', 'Departments', 'Beds', 'Staff', 'Billing Overview', 'Approvals', 'Reports'],
    kpis: [
      { label: "Today's Patients", value: '585', hint: 'OPD + IPD + ER' },
      { label: 'Active Admissions', value: '142', hint: 'Admitted patients' },
      { label: 'Discharges Due', value: '18', hint: 'Pending clearance' },
      { label: 'Staff Present', value: '168/180', hint: 'On-duty personnel' },
    ],
    tasks: [
      { id: 't1', text: 'Approve vendor purchase requisitions above threshold' },
      { id: 't2', text: 'Resolve pending patient billing discount requests' },
      { id: 't3', text: 'Verify duty roster compliance for night shifts' },
    ],
    alerts: [
      { id: 'a1', text: '5 beds awaiting housekeeping clearance >45 min', level: 'warn' },
      { id: 'a2', text: '2 pending refund approvals require administrative signoff', level: 'info' },
    ],
    workQueues: ['Administrative Approvals', 'Bed Turnover Queue', 'Shift Exceptions', 'Incident Log'],
    quickActions: ['Authorize Refund / Waiver', 'Assign Staff Shift', 'Review Bed Board', 'Manage Masters'],
    domainModules: [
      { key: 'admin-ops', emoji: '⚙️', label: 'Operations Strip', description: 'Hospital-wide cross-departmental operations status.', ctaLabel: 'Operations', ctaHref: '/hospital/dashboard' },
      { key: 'approvals', emoji: '✅', label: 'Administrative Approvals', description: 'Discounts, refunds, purchase requests and gate passes.', ctaLabel: 'Approvals', ctaHref: '/admin/approvals' },
    ],
  },

  // ==========================================
  // LAYER 2: CLINICAL DASHBOARDS
  // ==========================================
  medical_superintendent: {
    roleKey: 'medical_superintendent',
    layer: 2,
    layerName: 'Clinical',
    title: 'Medical Superintendent Dashboard',
    subtitle: 'Clinical governance, patient safety, mortality reviews & medical audit',
    permissions: ['clinical:manage', 'records:read', 'quality:manage', 'reports:read'],
    sidebarSections: ['Dashboard', 'Clinical Operations', 'Departments', 'Emergency', 'ICU', 'Quality', 'Clinical Reports'],
    kpis: [
      { label: 'Bed Occupancy', value: '78%', hint: 'Clinical wards' },
      { label: 'Critical Alert Count', value: '4', hint: 'Unacknowledged vitals/labs' },
      { label: 'Average LOS', value: '4.2d', hint: 'Length of stay (days)' },
      { label: 'Discharge Summaries Due', value: '6', hint: 'Awaiting doctor signoff' },
    ],
    tasks: [
      { id: 't1', text: 'Convene weekly morbidity & mortality clinical review' },
      { id: 't2', text: 'Examine high-risk antibiotic stewardship reports' },
      { id: 't3', text: 'Review delayed discharge summaries exceeding 24 hours' },
    ],
    alerts: [
      { id: 'a1', text: 'Critical lab panic values pending verification', level: 'urgent' },
      { id: 'a2', text: 'Emergency waiting time exceeded target in Triage Yellow', level: 'warn' },
    ],
    workQueues: ['Clinical Audits', 'Delayed Discharge Summaries', 'Critical Results Review', 'Safety Incidents'],
    quickActions: ['Initiate Clinical Audit', 'Review Incident Report', 'Inspect ICU Census', 'Review Mortality Records'],
    domainModules: [
      { key: 'clinical-gov', emoji: '🩺', label: 'Clinical Governance', description: 'Clinical protocols, compliance and doctor productivity.', ctaLabel: 'Clinical Governance', ctaHref: '/hospital/quality' },
    ],
  },

  hod: {
    roleKey: 'hod',
    layer: 2,
    layerName: 'Clinical',
    title: 'Department Head (HOD) Dashboard',
    subtitle: 'Specialty census, faculty duty schedules, procedural throughput & clinical KPIs',
    permissions: ['clinical:manage', 'appointments:read', 'staff:read', 'reports:read'],
    sidebarSections: ['Dashboard', 'Department Patients', 'Doctors', 'Roster', 'Procedures', 'Department Reports'],
    kpis: [
      { label: 'Active Faculty', value: '18', hint: 'Consultants & residents' },
      { label: 'Department OPD', value: '94', hint: 'Specialty consultations' },
      { label: 'IPD Inpatients', value: '38', hint: 'Under department care' },
      { label: 'Procedures Scheduled', value: '7', hint: 'Planned today' },
    ],
    tasks: [
      { id: 't1', text: 'Finalize consultant clinical call roster for next month' },
      { id: 't2', text: 'Review complex clinical referral cases requiring multidisciplinary review' },
      { id: 't3', text: 'Review specialty-specific diagnostic turnaround times' },
    ],
    alerts: [
      { id: 'a1', text: '1 resident doctor absent on duty roster without replacement', level: 'warn' },
    ],
    workQueues: ['Specialty Patient Queue', 'Resident Duty Handover', 'Procedural Schedule', 'Cross-Consults'],
    quickActions: ['Review Department Queue', 'Manage Call Roster', 'Review Protocol Compliance', 'Sign Reports'],
    domainModules: [
      { key: 'dept-queue', emoji: '👥', label: 'Specialty Queue', description: 'Patient queue and triage specific to department consultations.', ctaLabel: 'View Queue', ctaHref: '/hospital/queue' },
    ],
  },

  doctor: {
    roleKey: 'doctor',
    layer: 2,
    layerName: 'Clinical',
    title: 'Doctor Consultation Dashboard',
    subtitle: 'OPD queue, active consultation workspace, electronic prescriptions & lab orders',
    permissions: ['consultation:write', 'prescriptions:write', 'records:read', 'records:write', 'appointments:read'],
    sidebarSections: ['Dashboard', 'My Queue', 'Appointments', 'Patients', 'EMR', 'Prescription', 'Orders', 'IPD', 'Reports'],
    kpis: [
      { label: "Today's Appointments", value: '28', hint: 'Scheduled visits' },
      { label: 'Patients Waiting', value: '5', hint: 'In OPD queue' },
      { label: 'Inpatients (IPD)', value: '12', hint: 'Assigned ward patients' },
      { label: 'Pending Rx/Orders', value: '2', hint: 'Requiring signoff' },
    ],
    tasks: [
      { id: 't1', text: 'Complete clinical notes for morning OPD consultations' },
      { id: 't2', text: 'Conduct afternoon ward rounds for assigned inpatients' },
      { id: 't3', text: 'Sign off digital discharge summaries for cleared patients' },
    ],
    alerts: [
      { id: 'a1', text: '2 lab test results ready for review in patient portal', level: 'info' },
      { id: 'a2', text: '1 drug-allergy contraindication flagged on active Rx', level: 'urgent' },
    ],
    workQueues: ['Waiting OPD Patients', 'Assigned Inpatients', 'Completed Consults', 'Telemedicine Queue'],
    quickActions: ['Start Next Consultation', 'Write Prescription', 'Order Lab Investigation', 'Sign Discharge Summary'],
    domainModules: [
      { key: 'emr', emoji: '📋', label: 'Patient EMR Workspace', description: 'Longitudinal clinical history, diagnoses and past visits.', ctaLabel: 'Open EMR', ctaHref: '/doctor/consultation' },
      { key: 'rounds', emoji: '🏥', label: 'Inpatient Rounds', description: 'IPD ward patient progress notes and daily treatment plans.', ctaLabel: 'IPD Rounds', ctaHref: '/ipd' },
    ],
  },

  resident_doctor: {
    roleKey: 'resident_doctor',
    layer: 2,
    layerName: 'Clinical',
    title: 'Resident / Duty Doctor Dashboard',
    subtitle: 'Ward rounds, inpatient progress notes, emergency consults & shift handover',
    permissions: ['records:write', 'records:read', 'orders:write', 'vitals:read'],
    sidebarSections: ['Dashboard', 'Assigned Patients', 'Admissions', 'Rounds', 'Orders', 'Handover'],
    kpis: [
      { label: 'Duty This Week', value: '4 Shifts', hint: 'Assigned ward shifts' },
      { label: 'Assigned Inpatients', value: '18', hint: 'Under active monitoring' },
      { label: 'New Admissions', value: '4', hint: 'Last 12 hours' },
      { label: 'Pending Reviews', value: '3', hint: 'Vitals/labs check due' },
    ],
    tasks: [
      { id: 't1', text: 'Record morning progress notes for all Ward-2 inpatients' },
      { id: 't2', text: 'Review abnormal vitals flagged by nursing staff' },
      { id: 't3', text: 'Prepare structured SBAR shift handover report' },
    ],
    alerts: [
      { id: 'a1', text: 'Bed 204 systolic blood pressure dropped below 90 mmHg', level: 'urgent' },
    ],
    workQueues: ['Ward Inpatient List', 'Urgent Reviews Due', 'Pending Investigations', 'Shift Handover Notes'],
    quickActions: ['Record Ward Progress Note', 'Add Clinical Order', 'Escalate to Consultant', 'Submit Handover'],
    domainModules: [
      { key: 'handover', emoji: '🔄', label: 'SBAR Handover', description: 'Structured shift handover for continuous inpatient care.', ctaLabel: 'Handover Tool', ctaHref: '/ipd' },
    ],
  },

  nurse: {
    roleKey: 'nurse',
    layer: 2,
    layerName: 'Clinical',
    title: 'Ward Nursing Dashboard',
    subtitle: 'Bedside monitoring, vitals charts, Medication Administration Record (MAR) & nursing care plans',
    permissions: ['nursing:write', 'nursing:read', 'vitals:write', 'records:read', 'beds:read'],
    sidebarSections: ['Dashboard', 'Assigned Patients', 'Vitals', 'Medication', 'Nursing Notes', 'Tasks', 'Handover'],
    kpis: [
      { label: 'Assigned Beds', value: '6 Beds', hint: 'Patients on shift' },
      { label: 'Vitals Due', value: '2 Overdue', hint: 'Overdue monitoring' },
      { label: 'Medications Due', value: '4 Due', hint: 'Scheduled in next hour' },
      { label: 'Completed Care Tasks', value: '18 Done', hint: 'Dressings & lines' },
    ],
    tasks: [
      { id: 't1', text: 'Administer 12:00 PM antibiotic IV infusions as per MAR' },
      { id: 't2', text: 'Record 2-hourly post-op vitals for Bed 308' },
      { id: 't3', text: 'Document fluid intake and output chart before shift end' },
    ],
    alerts: [
      { id: 'a1', text: 'Bed 102 insulin dose due in 15 minutes', level: 'warn' },
      { id: 'a2', text: 'Bed 115 fall-risk assessment overdue', level: 'info' },
    ],
    workQueues: ['Assigned Ward Patients', 'Medication Due Queue', 'Pending Vitals', 'Pending Handover'],
    quickActions: ['Record Patient Vitals', 'Log Medication Administration', 'Add Nursing Note', 'Request Doctor Review'],
    domainModules: [
      { key: 'nursing-chart', emoji: '📊', label: 'Nursing Flowsheet', description: 'Vitals, pain score, fluid balance and fall risk.', ctaLabel: 'Open Charts', ctaHref: '/hospital/nursing' },
      { key: 'mar', emoji: '💊', label: 'MAR (Medication Admin)', description: 'Barcode-scanned medication administration record.', ctaLabel: 'Open MAR', ctaHref: '/hospital/nursing' },
    ],
  },

  // ==========================================
  // LAYER 3: CRITICAL CARE & PROCEDURE DASHBOARDS
  // ==========================================
  emergency: {
    roleKey: 'emergency',
    layer: 3,
    layerName: 'Critical Care & Procedures',
    title: 'Emergency / Casualty Dashboard',
    subtitle: 'Triage prioritization (Red/Yellow/Green), Medico-Legal Cases (MLC) & rapid resuscitation',
    permissions: ['emergency:manage', 'clinical:write', 'records:write', 'admissions:write'],
    sidebarSections: ['Dashboard', 'Emergency Queue', 'Triage', 'Clinical Records', 'Orders', 'Transfers'],
    kpis: [
      { label: 'Patients in ER', value: '16', hint: 'Active in casualty' },
      { label: 'Red (Priority 1)', value: '1 Resus', hint: 'Immediate resuscitation' },
      { label: 'Yellow (Priority 2)', value: '5 Urgent', hint: 'Urgent evaluation' },
      { label: 'Green (Priority 3)', value: '10 Stable', hint: 'Non-urgent ambulatory' },
    ],
    tasks: [
      { id: 't1', text: 'Complete trauma triage assessment for incoming ambulance patient' },
      { id: 't2', text: 'Dispatch MLC documentation and police intimation for RTA case' },
      { id: 't3', text: 'Fast-track emergency IPD admission request for coronary patient' },
    ],
    alerts: [
      { id: 'a1', text: 'Code Blue triggered in Resuscitation Bay 1', level: 'urgent' },
      { id: 'a2', text: 'Emergency bed occupancy reached 90%', level: 'warn' },
    ],
    workQueues: ['Triage Waiting Queue', 'Active Resuscitation Cases', 'MLC Register', 'Pending Ward/ICU Transfers'],
    quickActions: ['Rapid Patient Triage', 'Initiate Code Blue', 'Register Emergency MLC', 'Request Urgent ICU Bed'],
    domainModules: [
      { key: 'triage', emoji: '🚨', label: 'Emergency Triage', description: 'Standardized Manchester/ESI emergency triage system.', ctaLabel: 'Open Triage', ctaHref: '/hospital/emergency' },
      { key: 'mlc', emoji: '⚖️', label: 'MLC Documentation', description: 'Medico-legal documentation, police intimation and injury records.', ctaLabel: 'MLC Register', ctaHref: '/hospital/emergency' },
    ],
  },

  icu_doctor: {
    roleKey: 'icu_doctor',
    layer: 3,
    layerName: 'Critical Care & Procedures',
    title: 'ICU Intensivist Dashboard',
    subtitle: 'Real-time ventilator monitoring, vasopressor charts, SOFA scoring & hemodynamic tracking',
    permissions: ['icu:manage', 'clinical:write', 'records:write', 'orders:write'],
    sidebarSections: ['Dashboard', 'ICU Patients', 'Rounds', 'Clinical Notes', 'Orders', 'Critical Alerts'],
    kpis: [
      { label: 'Active ICU Beds', value: '10/12', hint: 'Current occupancy' },
      { label: 'Ventilated Patients', value: '6 Patients', hint: 'Invasive / NIV' },
      { label: 'High Vasopressor Support', value: '4 Cases', hint: 'Inotrope infusions' },
      { label: 'Available ICU Beds', value: '2 Beds', hint: 'Free for emergencies' },
    ],
    tasks: [
      { id: 't1', text: 'Perform morning multi-system intensivist rounds across ICU beds' },
      { id: 't2', text: 'Review arterial blood gas (ABG) and adjust ventilator PEEP' },
      { id: 't3', text: 'Evaluate weaning criteria for extubation on Bed 4' },
    ],
    alerts: [
      { id: 'a1', text: 'Bed 2 lactate level increased to 4.2 mmol/L', level: 'urgent' },
      { id: 'a2', text: 'Central line duration reached Day 7 for Bed 5', level: 'warn' },
    ],
    workQueues: ['ICU Bed Board', 'Ventilator Weaning Queue', 'ABG / Metabolic Panels', 'Family Counselling Notes'],
    quickActions: ['Review ICU Patient Chart', 'Order Critical Infusion', 'Record Procedure Note (Central Line)', 'Plan Ward Step-Down'],
    domainModules: [
      { key: 'icu-chart', emoji: '🫁', label: 'ICU Flowsheet', description: 'Arterial line, CVP, ventilator waveforms and inotropes.', ctaLabel: 'ICU Charts', ctaHref: '/hospital/icu' },
    ],
  },

  icu_nurse: {
    roleKey: 'icu_nurse',
    layer: 3,
    layerName: 'Critical Care & Procedures',
    title: 'ICU Bedside Nurse Dashboard',
    subtitle: '1:1 / 1:2 intensive nursing, infusion pumps, line maintenance & hourly observations',
    permissions: ['nursing:write', 'icu:write', 'vitals:write', 'records:read'],
    sidebarSections: ['Dashboard', 'ICU Beds', 'Monitoring', 'Medication', 'Infusions', 'Nursing Notes'],
    kpis: [
      { label: 'Assigned ICU Beds', value: '2 Beds', hint: '1:1 or 1:2 critical ratio' },
      { label: 'Active Infusions', value: '5 Pumps', hint: 'Syringe / IV pumps' },
      { label: 'Hourly Vitals Due', value: 'Due in 10m', hint: 'Hemodynamic logs' },
      { label: 'Critical Alarms (Shift)', value: '3 Handled', hint: 'Physiological triggers' },
    ],
    tasks: [
      { id: 't1', text: 'Log hourly hemodynamics, Glasgow Coma Scale (GCS) and urine output' },
      { id: 't2', text: 'Verify syringe pump rates for Noradrenaline and Fentanyl' },
      { id: 't3', text: 'Perform endotracheal suctioning and aseptic oral hygiene' },
    ],
    alerts: [
      { id: 'a1', text: 'Bed 3 MAP below 65 mmHg — notify intensivist immediately', level: 'urgent' },
    ],
    workQueues: ['Hourly Monitoring Log', 'Continuous Infusions Tracker', 'Line / Tube Site Care', 'Shift Handover'],
    quickActions: ['Log Hourly ICU Vitals', 'Document Infusion Rate Change', 'Record Endotracheal Care', 'Acknowledge Monitor Alarm'],
    domainModules: [
      { key: 'icu-monitor', emoji: '📈', label: 'Hemodynamic Monitoring', description: 'Intensive hemodynamic parameter records.', ctaLabel: 'Open Monitor', ctaHref: '/hospital/icu' },
    ],
  },

  ot_coordinator: {
    roleKey: 'ot_coordinator',
    layer: 3,
    layerName: 'Critical Care & Procedures',
    title: 'Operation Theatre (OT) Coordinator Dashboard',
    subtitle: 'Surgical scheduling, theatre availability, pre-op fitness clearance & PACU recovery',
    permissions: ['ot:manage', 'operations:manage', 'records:read', 'staff:read'],
    sidebarSections: ['Dashboard', 'OT Schedule', 'Surgeries', 'Checklists', 'Equipment', 'Recovery'],
    kpis: [
      { label: 'Surgeries Scheduled', value: '9 Cases', hint: 'Elective + Emergency' },
      { label: 'Surgeries In Progress', value: '4 Theatres', hint: 'Active theatres' },
      { label: 'OT Rooms Available', value: '2 Ready', hint: 'Cleaned & ready' },
      { label: 'PACU Recovery Beds', value: '5/6 Full', hint: 'Post-anesthesia care' },
    ],
    tasks: [
      { id: 't1', text: 'Verify surgical safety checklists and PAC fitness clearances' },
      { id: 't2', text: 'Coordinate emergency laparotomy slot allocation with Surgeon on call' },
      { id: 't3', text: 'Verify sterile surgical tray dispatch from CSSD for Theatre 3' },
    ],
    alerts: [
      { id: 'a1', text: 'Theatre 2 delayed by 35 minutes due to extended procedure', level: 'warn' },
      { id: 'a2', text: 'PACU bed shortage flagged — 4 patients ready for transfer', level: 'warn' },
    ],
    workQueues: ['Daily OT Board', 'Pre-Op Checklist Clearance', 'Intra-Op Tracking', 'PACU Recovery Queue'],
    quickActions: ['Schedule New Surgery', 'Assign OT Room & Team', 'Verify WHO Surgical Checklist', 'Mark Theatre Available'],
    domainModules: [
      { key: 'ot-board', emoji: '🔪', label: 'OT Live Board', description: 'Real-time theatre occupation, surgeon and anesthesiologist view.', ctaLabel: 'Live OT Board', ctaHref: '/hospital/ot' },
    ],
  },

  surgeon: {
    roleKey: 'surgeon',
    layer: 3,
    layerName: 'Critical Care & Procedures',
    title: 'Consultant Surgeon Dashboard',
    subtitle: 'Elective & emergency surgery list, operative notes, surgical consent & post-op orders',
    permissions: ['ot:write', 'clinical:write', 'records:write', 'records:read'],
    sidebarSections: ['Dashboard', 'Surgery Schedule', 'Patients', 'Pre-op', 'Operative Notes', 'Post-op'],
    kpis: [
      { label: 'Today Surgeries', value: '3 Cases', hint: 'Assigned list' },
      { label: 'Operative Notes Pending', value: '1 Pending', hint: 'Awaiting completion' },
      { label: 'Pre-Op Clearance Due', value: '0 Ready', hint: 'PAC fitness pending' },
      { label: 'PACU Inpatients', value: '2 Patients', hint: 'Under recovery review' },
    ],
    tasks: [
      { id: 't1', text: 'Review pre-operative imaging and informed consent for 10:00 AM cholecystectomy' },
      { id: 't2', text: 'Dictate and digitally sign operative note including implant serial numbers' },
      { id: 't3', text: 'Formulate post-operative recovery orders and pain management plan' },
    ],
    alerts: [
      { id: 'a1', text: 'Informed surgical consent missing for patient UHID 10842', level: 'urgent' },
    ],
    workQueues: ['My Surgery Schedule', 'Pre-Operative Assessment Queue', 'Operative Notes Pending', 'Post-Op Rounds'],
    quickActions: ['Start Operative Note', 'Verify Pre-Op Consent', 'Enter Post-Op Orders', 'Check PAC Clearance'],
    domainModules: [
      { key: 'op-notes', emoji: '📝', label: 'Operative Notes', description: 'Digital operative documentation, implant barcodes and specimen logs.', ctaLabel: 'Write Note', ctaHref: '/hospital/ot' },
    ],
  },

  anaesthetist: {
    roleKey: 'anaesthetist',
    layer: 3,
    layerName: 'Critical Care & Procedures',
    title: 'Anaesthesiologist Dashboard',
    subtitle: 'Pre-Anaesthesia Checkups (PAC), airway scores, intra-op monitoring & PACU discharge',
    permissions: ['ot:write', 'clinical:write', 'records:read'],
    sidebarSections: ['Dashboard', 'Assessments', 'Surgery Schedule', 'Anaesthesia Records', 'Recovery'],
    kpis: [
      { label: 'Cases on Schedule', value: '4 Cases', hint: 'Today surgical cases' },
      { label: 'PAC Pending', value: '2 Due', hint: 'Pre-op evaluations' },
      { label: 'Active In-Theatre Cases', value: '1 Active', hint: 'Currently monitored' },
      { label: 'PACU Clearance Pending', value: '1 Ready', hint: 'Aldrete score >= 9' },
    ],
    tasks: [
      { id: 't1', text: 'Conduct pre-anaesthetic evaluation and Mallampati airway classification' },
      { id: 't2', text: 'Record intra-operative anesthetic agent delivery and vital trends' },
      { id: 't3', text: 'Verify modified Aldrete recovery score before PACU discharge to ward' },
    ],
    alerts: [
      { id: 'a1', text: 'Pre-op NPO status confirmation pending for Case 3', level: 'warn' },
    ],
    workQueues: ['Pre-Anaesthesia Checkup Queue', 'Intra-Op Monitoring Log', 'PACU Recovery List'],
    quickActions: ['Complete Pre-Anaesthesia PAC', 'Start Intra-Op Log', 'Discharge from PACU', 'Flag Difficult Airway'],
    domainModules: [
      { key: 'pac', emoji: '💉', label: 'PAC Evaluations', description: 'Pre-anaesthesia checkup forms, ASA physical status and airway.', ctaLabel: 'Open PAC', ctaHref: '/hospital/ot' },
    ],
  },

  dialysis_admin: {
    roleKey: 'dialysis_admin',
    layer: 3,
    layerName: 'Critical Care & Procedures',
    title: 'Dialysis Department Dashboard',
    subtitle: 'Hemodialysis station scheduling, dialyzer reuse cycles, pre/post vitals & machine logs',
    permissions: ['dialysis:manage', 'operations:read', 'records:write'],
    sidebarSections: ['Dashboard', 'Sessions', 'Machines', 'Patients', 'Session Records'],
    kpis: [
      { label: 'Active Hemodialysis Stations', value: '6 Stations', hint: 'Machines running' },
      { label: "Today's Dialysis Sessions", value: '18 Sessions', hint: 'Planned treatments' },
      { label: 'Completed Sessions', value: '12 Done', hint: 'Discharged today' },
      { label: 'Available Machines', value: '2 Ready', hint: 'Sanitized & ready' },
    ],
    tasks: [
      { id: 't1', text: 'Record pre-dialysis weight, standing/sitting BP and vascular access check' },
      { id: 't2', text: 'Monitor transmembrane pressure (TMP) and heparin infusion rate' },
      { id: 't3', text: 'Execute chemical disinfection cycle on Station 4 between shifts' },
    ],
    alerts: [
      { id: 'a1', text: 'Vascular access bruit absent in pre-dialysis check on Station 2', level: 'urgent' },
    ],
    workQueues: ['Station Live Board', 'Patient Dialysis Schedule', 'Machine Maintenance Log'],
    quickActions: ['Start Dialysis Session', 'Log Intra-Dialytic Vitals', 'Complete Session & Billing', 'Report Machine Fault'],
    domainModules: [
      { key: 'dialysis-ops', emoji: '🩸', label: 'Dialysis Sessions', description: 'Real-time station monitoring, dialyzer reuse and ultrafiltration.', ctaLabel: 'Dialysis Units', ctaHref: '/hospital/dialysis' },
    ],
  },

  // ==========================================
  // LAYER 4: DIAGNOSTIC & TREATMENT SUPPORT
  // ==========================================
  lab_technician: {
    roleKey: 'lab_technician',
    layer: 4,
    layerName: 'Diagnostic & Treatment Support',
    title: 'Pathology Lab Technician Dashboard',
    subtitle: 'Sample collection barcoding, automated analyzer interfaces, result entry & quality control',
    permissions: ['lab:enter_result', 'lab:manage_samples', 'lab:read', 'reports:read'],
    sidebarSections: ['Dashboard', 'Lab Orders', 'Samples', 'Workbench', 'QC', 'Results'],
    kpis: [
      { label: 'Samples Pending Collection', value: '24 Samples', hint: 'OPD / Ward accession' },
      { label: 'Samples in Processing', value: '18 Runs', hint: 'Running on analyzers' },
      { label: 'Results Pending Entry', value: '12 Tests', hint: 'Manual / Auto-calc' },
      { label: 'Rejected / Recollect', value: '2 Samples', hint: 'Hemolyzed or clotted' },
    ],
    tasks: [
      { id: 't1', text: 'Scan barcodes and accept morning ward phlebotomy sample batches' },
      { id: 't2', text: 'Perform two-level internal quality control (QC) on hematology analyzer' },
      { id: 't3', text: 'Enter biochemical test results and submit for pathologist verification' },
    ],
    alerts: [
      { id: 'a1', text: '3 critical panic results flagged (Troponin I, Potassium 6.8)', level: 'urgent' },
      { id: 'a2', text: 'Reagent low on automated chemistry analyzer (Creatinine pack)', level: 'warn' },
    ],
    workQueues: ['Accession & Barcode Queue', 'Processing Workbench', 'QC Calibration Log', 'Results Awaiting Review'],
    quickActions: ['Accept Sample Batch', 'Enter Test Results', 'Import Analyzer File', 'Flag Panic Value'],
    domainModules: [
      { key: 'lab-ops', emoji: '🔬', label: 'Lab Workbench', description: 'Sample tracking, accession numbers, delta checks and QC.', ctaLabel: 'Open Workbench', ctaHref: '/hospital/lab' },
    ],
  },

  pathologist: {
    roleKey: 'pathologist',
    layer: 4,
    layerName: 'Diagnostic & Treatment Support',
    title: 'Pathologist / Lab In-Charge Dashboard',
    subtitle: 'Result validation, critical panic alerts, histopathology reporting & digital signatures',
    permissions: ['lab:verify', 'lab:read', 'reports:read', 'records:read'],
    sidebarSections: ['Dashboard', 'Result Verification', 'Critical Results', 'Reports', 'QC'],
    kpis: [
      { label: 'Awaiting Verification', value: '28 Reports', hint: 'Pending signoff' },
      { label: 'Critical Panic Alerts', value: '3 Panic', hint: 'Require immediate telephonic intimation' },
      { label: 'Verified Reports Today', value: '384 Signed', hint: 'Released to portal' },
      { label: 'Average Turnaround (TAT)', value: '72 min', hint: 'Sample-to-report minutes' },
    ],
    tasks: [
      { id: 't1', text: 'Review and verify abnormal CBC and metabolic profiles' },
      { id: 't2', text: 'Validate and verbally communicate critical panic lab values to attending physician' },
      { id: 't3', text: 'Examine histological tissue biopsy sections and dictate diagnosis' },
    ],
    alerts: [
      { id: 'a1', text: 'Unacknowledged critical panic value: Potassium 2.4 mmol/L for Bed 201', level: 'urgent' },
    ],
    workQueues: ['Pending Verification Queue', 'Critical Panic Queue', 'Histopathology Bench', 'Amended Reports Log'],
    quickActions: ['Verify & Sign Selected Reports', 'Log Panic Value Intimation', 'Request Specimen Recollection', 'Review Levey-Jennings QC'],
    domainModules: [
      { key: 'path-verify', emoji: '🩺', label: 'Pathologist Verification', description: 'Batch verification, delta-check comparison and digital signoff.', ctaLabel: 'Verify Reports', ctaHref: '/hospital/lab' },
    ],
  },

  radiology_technician: {
    roleKey: 'radiology_technician',
    layer: 4,
    layerName: 'Diagnostic & Treatment Support',
    title: 'Radiology Technician Dashboard',
    subtitle: 'Imaging appointments, modality worklists (X-Ray, CT, MRI, USG), patient screening & DICOM transfer',
    permissions: ['radiology:write', 'radiology:read', 'operations:read'],
    sidebarSections: ['Dashboard', 'Imaging Queue', 'Studies', 'Preparation', 'Equipment'],
    kpis: [
      { label: "Today's Imaging Orders", value: '86 Studies', hint: 'All modalities' },
      { label: 'Patients in Waiting Area', value: '7 Waiting', hint: 'Ready for scan' },
      { label: 'Studies In Progress', value: '3 Active', hint: 'Currently scanning' },
      { label: 'Completed Studies Today', value: '76 Pushed', hint: 'Transferred to PACS' },
    ],
    tasks: [
      { id: 't1', text: 'Perform MRI safety screening check (metal implants, pacemaker)' },
      { id: 't2', text: 'Acquire high-resolution chest CT scan protocol with contrast' },
      { id: 't3', text: 'Push acquired DICOM image series to centralized hospital PACS' },
    ],
    alerts: [
      { id: 'a1', text: 'Emergency trauma polytrauma CT ordered from casualty', level: 'urgent' },
    ],
    workQueues: ['Modality Worklist Queue', 'Contrast Safety Checklists', 'PACS Push Status Log'],
    quickActions: ['Start Imaging Study', 'Complete DICOM Transfer', 'Log Contrast Administration', 'Report Tube Fault'],
    domainModules: [
      { key: 'modality', emoji: '🩻', label: 'Modality Worklist', description: 'X-Ray, CT, MRI and Ultrasound daily study queues.', ctaLabel: 'Modality Queue', ctaHref: '/hospital/radiology' },
    ],
  },

  radiologist: {
    roleKey: 'radiologist',
    layer: 4,
    layerName: 'Diagnostic & Treatment Support',
    title: 'Consultant Radiologist Dashboard',
    subtitle: 'PACS viewer integration, diagnostic reporting, voice dictation & emergency findings',
    permissions: ['radiology:verify', 'radiology:read', 'records:read'],
    sidebarSections: ['Dashboard', 'Studies', 'Reporting', 'Final Reports', 'Amendments'],
    kpis: [
      { label: 'Studies Awaiting Report', value: '14 Scans', hint: 'Unread scans' },
      { label: 'Stat / Emergency Scans', value: '2 Urgent', hint: 'Trauma & stroke protocols' },
      { label: 'Reports Finalized Today', value: '68 Signed', hint: 'Signed & delivered' },
      { label: 'Average Diagnostic TAT', value: '45 min', hint: 'Scan-to-report turnaround' },
    ],
    tasks: [
      { id: 't1', text: 'Prioritize and interpret urgent non-contrast head CT for stroke rule-out' },
      { id: 't2', text: 'Dictate musculoskeletal MRI findings comparing with prior study' },
      { id: 't3', text: 'Digitally sign off finalized diagnostic radiology reports' },
    ],
    alerts: [
      { id: 'a1', text: 'Emergency chest X-ray demonstrates tension pneumothorax — alert ER', level: 'urgent' },
    ],
    workQueues: ['PACS Unread Queue', 'Stat / Urgent Studies', 'Voice Dictation Queue', 'Finalized Reports'],
    quickActions: ['Launch Web PACS Viewer', 'Dictate Radiology Report', 'Sign & Release Diagnostic Report', 'Flag Urgent Finding'],
    domainModules: [
      { key: 'pacs', emoji: '🖥️', label: 'Hospital PACS', description: 'DICOM web viewer, multi-planar reconstruction and measurements.', ctaLabel: 'Open PACS', ctaHref: '/hospital/radiology' },
    ],
  },

  pharmacist: {
    roleKey: 'pharmacist',
    layer: 4,
    layerName: 'Diagnostic & Treatment Support',
    title: 'Hospital Pharmacist Dashboard',
    subtitle: 'Prescription dispensing (OPD/IPD), batch & expiry management, narcotics register & drug alerts',
    permissions: ['pharmacy:dispense', 'pharmacy:manage', 'inventory:read', 'billing:read'],
    sidebarSections: ['Dashboard', 'Prescriptions', 'Dispensing', 'Pharmacy Sales', 'Returns', 'Inventory'],
    kpis: [
      { label: 'Pending Dispensing', value: '18 Orders', hint: 'OPD + Ward indents' },
      { label: 'Completed Dispensing', value: '246 Filled', hint: 'Dispensed today' },
      { label: 'Near-Expiry Items', value: '12 Batches', hint: 'Expiring in <= 60 days' },
      { label: 'Low Stock Alerts', value: '8 SKUs', hint: 'Below reorder point' },
    ],
    tasks: [
      { id: 't1', text: 'Fulfill urgent Ward-3 IPD medication indent request' },
      { id: 't2', text: 'Verify batch numbers and dispense OPD digital prescription' },
      { id: 't3', text: 'Reconcile Schedule X controlled narcotics register at shift handover' },
    ],
    alerts: [
      { id: 'a1', text: 'Prescription flagged for duplicate therapeutic agent interaction', level: 'warn' },
      { id: 'a2', text: '12 essential antibiotic batches reaching expiry this month', level: 'info' },
    ],
    workQueues: ['OPD Dispensing Queue', 'IPD Ward Indents', 'Controlled Substances Register', 'Stock Return Requests'],
    quickActions: ['Dispense Digital Prescription', 'Fulfill Ward Indent', 'Scan Medicine Barcode', 'Generate Pharmacy Bill'],
    domainModules: [
      { key: 'pharmacy-pos', emoji: '💊', label: 'Pharmacy POS & Indents', description: 'Dispensing counters, batch tracking, GST invoices and inventory.', ctaLabel: 'Open Pharmacy', ctaHref: '/hospital/pharmacy' },
    ],
  },

  blood_bank_admin: {
    roleKey: 'blood_bank_admin',
    layer: 4,
    layerName: 'Diagnostic & Treatment Support',
    title: 'Blood Bank Dashboard',
    subtitle: 'Donor registry, component separation (PRBC, FFP, Platelets), cross-matching & transfusion safety',
    permissions: ['bloodbank:manage', 'operations:read', 'records:read'],
    sidebarSections: ['Dashboard', 'Donors', 'Inventory', 'Requests', 'Cross-match', 'Issue'],
    kpis: [
      { label: 'Total Units in Stock', value: '84 Units', hint: 'All blood groups' },
      { label: 'PRBC Units Available', value: '46 Units', hint: 'Packed red blood cells' },
      { label: 'Platelet Concentrates', value: '12 Units', hint: 'Short 5-day shelf life' },
      { label: 'Pending Cross-Matches', value: '5 Requests', hint: 'OT & ICU requisitions' },
    ],
    tasks: [
      { id: 't1', text: 'Process blood grouping and viral serology screening on new donor units' },
      { id: 't2', text: 'Perform cross-match compatibility testing for Emergency OT case' },
      { id: 't3', text: 'Inspect platelet agitator temperature and expiry logs' },
    ],
    alerts: [
      { id: 'a1', text: 'O-negative emergency blood supply critically low (2 units remaining)', level: 'urgent' },
    ],
    workQueues: ['Donor Screening Queue', 'Component Requisition Queue', 'Cross-Match Workbench', 'Transfusion Logs'],
    quickActions: ['Register Voluntary Donor', 'Issue Cross-Matched Unit', 'Log Component Separation', 'Record Transfusion Reaction'],
    domainModules: [
      { key: 'blood-bank-ops', emoji: '🩸', label: 'Blood Bank Inventory', description: 'Component stock, cross-matching, donor records and traceability.', ctaLabel: 'Blood Bank', ctaHref: '/hospital/bloodbank' },
    ],
  },

  // ==========================================
  // LAYER 5: BUSINESS & OPERATIONS
  // ==========================================
  receptionist: {
    roleKey: 'receptionist',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Reception / Front Desk Dashboard',
    subtitle: 'Patient registration, UHID issuance, walk-in token generation, appointments & consultation fees',
    permissions: ['patients:create', 'patients:read', 'appointments:create', 'appointments:read', 'billing:create'],
    sidebarSections: ['Dashboard', 'Registration', 'Patients', 'Appointments', 'Check-in', 'Queue', 'OPD Billing'],
    kpis: [
      { label: 'New Registrations', value: '42 UHIDs', hint: 'UHIDs generated today' },
      { label: 'Walk-in Tokens Issued', value: '186 Tokens', hint: 'OPD queue entries' },
      { label: 'Checked-in Patients', value: '28 Waiting', hint: 'Waiting in lobby' },
      { label: "Today's Counter Collections", value: '₹1.24L', hint: 'Consultation & reg fees' },
    ],
    tasks: [
      { id: 't1', text: 'Register walk-in patient with demographic deduplication check' },
      { id: 't2', text: 'Issue department queue token and print barcode wristband' },
      { id: 't3', text: 'Collect consultation fee and print standard tax receipt' },
    ],
    alerts: [
      { id: 'a1', text: 'Dr. Sharma Cardiology clinic running 30 minutes behind schedule', level: 'info' },
    ],
    workQueues: ['Front Desk Check-in Queue', 'New Patient Registrations', 'Doctor Availability Board', 'Fee Receipts'],
    quickActions: ['Register New Patient (UHID)', 'Book OPD Appointment', 'Issue Queue Token', 'Print OPD Slip / Barcode'],
    domainModules: [
      { key: 'front-desk-reg', emoji: '🪪', label: 'Patient Registration', description: 'UHID creation, Aadhaar/ID capture and queue tokens.', ctaLabel: 'Register Patient', ctaHref: '/hospital/frontdesk' },
    ],
  },

  opd_coordinator: {
    roleKey: 'opd_coordinator',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'OPD Coordinator Dashboard',
    subtitle: 'Multi-specialty clinic scheduling, doctor consultation slots, queue flow & wait-time monitoring',
    permissions: ['appointments:manage', 'appointments:read', 'staff:read', 'operations:read'],
    sidebarSections: ['Dashboard', 'Appointments', 'Doctors', 'Schedules', 'Queue', 'Follow-ups'],
    kpis: [
      { label: 'In Queue Now', value: '48 Patients', hint: 'Across all OPDs' },
      { label: 'Doctors Available', value: '14 Active', hint: 'Active in consultation rooms' },
      { label: 'Average Waiting Time', value: '22 min', hint: 'Token-to-consult minutes' },
      { label: 'Appointments Booked', value: '386 Visits', hint: 'Scheduled for today' },
    ],
    tasks: [
      { id: 't1', text: 'Monitor specialty waiting times and redirect overflow patients' },
      { id: 't2', text: 'Handle consultant leave notifications and reschedule affected appointments' },
      { id: 't3', text: 'Broadcast queue audio announcements for waiting halls' },
    ],
    alerts: [
      { id: 'a1', text: 'Orthopedics queue waiting time exceeded 45 minutes', level: 'warn' },
    ],
    workQueues: ['Clinic Floor Queue Status', 'Doctor Schedule Calendar', 'Rescheduled Appointments', 'No-Show Follow-up'],
    quickActions: ['Reassign Patient to Alternate Doctor', 'Block Doctor Slot for Emergency', 'Send SMS Queue Update', 'Display Public Token TV'],
    domainModules: [
      { key: 'opd-queue-mgmt', emoji: '⏱️', label: 'Queue Management', description: 'Live token displays, audio announcements and wait-time analytics.', ctaLabel: 'OPD Queue', ctaHref: '/hospital/queue' },
    ],
  },

  admission_coordinator: {
    roleKey: 'admission_coordinator',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Admission Coordinator Dashboard',
    subtitle: 'IPD admission requests, ward/bed reservations, initial deposit collections & TPA pre-auth check',
    permissions: ['admissions:manage', 'beds:read', 'insurance:read', 'billing:create'],
    sidebarSections: ['Dashboard', 'Admission Requests', 'Patient Registration', 'Bed Requests', 'Transfers'],
    kpis: [
      { label: 'Pending Pre-Auth', value: '4 Requests', hint: 'TPA approval awaited' },
      { label: 'Admissions Today', value: '21 Admitted', hint: 'Processed & admitted' },
      { label: 'Patients Awaiting Beds', value: '3 Patients', hint: 'ER / OPD admitted' },
      { label: 'Available Beds', value: '42 Beds', hint: 'General, Semi-Private, Deluxe' },
    ],
    tasks: [
      { id: 't1', text: 'Process admission request from OPD doctor and allocate preferred bed' },
      { id: 't2', text: 'Collect inpatient advance admission deposit via payment gateway / POS' },
      { id: 't3', text: 'Generate admission kit, patient wristband and notify ward nursing station' },
    ],
    alerts: [
      { id: 'a1', text: '3 patients waiting for bed allocation > 30 minutes in ER', level: 'warn' },
    ],
    workQueues: ['Pending Admission Requests', 'Bed Allocation Queue', 'Advance Deposit Receipts', 'Ward Transfers'],
    quickActions: ['Create IPD Admission', 'Allocate Bed & Room', 'Record Admission Deposit', 'Print Inpatient Wristband'],
    domainModules: [
      { key: 'admission-desk', emoji: '🏥', label: 'Admission Desk', description: 'Patient IPD admission, tariff selection and ward dispatch.', ctaLabel: 'Open Admissions', ctaHref: '/hospital/admissions' },
    ],
  },

  bed_manager: {
    roleKey: 'bed_manager',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Bed Manager Dashboard',
    subtitle: 'Real-time hospital bed board, ward occupancy, housekeeping cleaning SLAs & blocked beds',
    permissions: ['beds:manage', 'beds:read', 'housekeeping:read', 'reports:read'],
    sidebarSections: ['Dashboard', 'Bed Board', 'Wards', 'Availability', 'Allocation', 'Cleaning Status'],
    kpis: [
      { label: 'Total Beds', value: '180 Beds', hint: 'All operational categories' },
      { label: 'Occupied', value: '142 (78%)', hint: 'Current inpatients' },
      { label: 'Available', value: '33 Ready', hint: 'Cleaned & ready' },
      { label: 'Under Cleaning', value: '5 Rooms', hint: 'Housekeeping turnaround' },
    ],
    tasks: [
      { id: 't1', text: 'Release beds marked cleaned and verified by housekeeping supervisor' },
      { id: 't2', text: 'Review beds blocked for maintenance with biomedical team' },
      { id: 't3', text: 'Reserve isolation beds for anticipated infectious admissions' },
    ],
    alerts: [
      { id: 'a1', text: 'Hospital occupancy reached 88% — activate surge protocol', level: 'warn' },
      { id: 'a2', text: 'Bed 302 cleaning turnaround exceeded 45-minute SLA', level: 'info' },
    ],
    workQueues: ['Hospital Bed Board', 'Turnaround / Cleaning Queue', 'Maintenance Blocked Beds', 'Ward Allocation Map'],
    quickActions: ['Transfer Patient Bed', 'Request Housekeeping Cleaning', 'Block Bed for Maintenance', 'View Ward Heatmap'],
    domainModules: [
      { key: 'bed-board-mgmt', emoji: '🛏️', label: 'Hospital Bed Board', description: 'Live floor-wise status with vacant, occupied and cleaning states.', ctaLabel: 'Open Bed Board', ctaHref: '/hospital/beds' },
    ],
  },

  billing_executive: {
    roleKey: 'billing_executive',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Billing Executive Dashboard',
    subtitle: 'OPD/IPD charge capture, provisional estimates, tariff rules, packages & final discharge bills',
    permissions: ['billing:manage', 'billing:create', 'billing:read', 'discounts:request'],
    sidebarSections: ['Dashboard', 'Invoices', 'Estimates', 'Charges', 'Advances', 'Refund Requests'],
    kpis: [
      { label: 'Invoices Generated Today', value: '142 Bills', hint: 'OPD + IPD' },
      { label: 'Unbilled Service Orders', value: '18 Orders', hint: 'Lab, Radiology, OT' },
      { label: 'Pending Discharge Bills', value: '7 Bills', hint: 'Final settlement' },
      { label: 'Total Billed Amount', value: '₹17.9L', hint: 'Gross invoice value' },
    ],
    tasks: [
      { id: 't1', text: 'Consolidate pharmacy, lab, OT and bed charges for final IPD discharge bill' },
      { id: 't2', text: 'Apply health package tariff rules for scheduled normal delivery case' },
      { id: 't3', text: 'Submit authorized managerial discount request for indigent patient' },
    ],
    alerts: [
      { id: 'a1', text: 'Unbilled OT consumable charges found for discharged patient', level: 'warn' },
    ],
    workQueues: ['Pending Discharge Bills', 'Provisional Estimates', 'Unbilled Charges', 'Refund / Credit Note Requests'],
    quickActions: ['Generate Final IPD Bill', 'Create Treatment Estimate', 'Add Clinical Service Charge', 'Print Tax Invoice'],
    domainModules: [
      { key: 'billing-engine', emoji: '🧾', label: 'Hospital Billing Engine', description: 'Comprehensive IPD/OPD invoice creation, package billing and GST.', ctaLabel: 'Open Billing', ctaHref: '/hospital/billing' },
    ],
  },

  cashier: {
    roleKey: 'cashier',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Cashier Desk Dashboard',
    subtitle: 'Point-of-Sale (POS) collections, cash/UPI/card split, shift opening/closing & till reconciliation',
    permissions: ['payments:collect', 'billing:read', 'cash:reconcile'],
    sidebarSections: ['Dashboard', 'Payments', 'Receipts', 'Refunds', 'Cash Closing'],
    kpis: [
      { label: "Today's Till Collection", value: '₹3.42L', hint: 'All payment modes' },
      { label: 'Cash in Hand', value: '₹48,500', hint: 'Physical currency in till' },
      { label: 'Digital / UPI / Cards', value: '₹2.93L', hint: 'Electronic settlements' },
      { label: 'Refunds Processed', value: '₹2,400', hint: 'Authorized returns' },
    ],
    tasks: [
      { id: 't1', text: 'Collect patient invoice payment with multi-mode split (Cash + UPI)' },
      { id: 't2', text: 'Generate duplicate signed payment receipt upon customer request' },
      { id: 't3', text: 'Execute shift cash-closing count and handover to finance vault' },
    ],
    alerts: [
      { id: 'a1', text: 'Cash balance in till exceeded ₹50,000 threshold — request vault transfer', level: 'info' },
    ],
    workQueues: ['Unpaid Invoices Queue', 'Today Collected Receipts', 'Authorized Refund Vouchers', 'Shift Closing Ledger'],
    quickActions: ['Collect Payment', 'Print Official Receipt', 'Initiate Shift Cash Closing', 'Scan UPI Dynamic QR'],
    domainModules: [
      { key: 'cashier-till', emoji: '💵', label: 'Cashier Till & POS', description: 'Split payment handling, digital receipt issuance and cash balancing.', ctaLabel: 'Open Cashier', ctaHref: '/hospital/billing' },
    ],
  },

  tpa_agent: {
    roleKey: 'tpa_agent',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Insurance & TPA Cashless Desk Dashboard',
    subtitle: 'Pre-authorization requests, queries & clarifications, claim enhancements & final settlements',
    permissions: ['insurance:manage', 'billing:read', 'records:read', 'claims:manage'],
    sidebarSections: ['Dashboard', 'Pre-auth', 'Claims', 'Queries', 'Discharge Approval', 'Settlements'],
    kpis: [
      { label: 'Pending Pre-Auth Requests', value: '6 Requests', hint: 'Awaiting TPA initial response' },
      { label: 'Approved Cashless Cases', value: '24 Cases', hint: 'Active inpatient approvals' },
      { label: 'Queries Requiring Response', value: '3 Queries', hint: 'Medical justification needed' },
      { label: 'Pending Final Claim Settlement', value: '₹14.8L', hint: 'Post-discharge claims' },
    ],
    tasks: [
      { id: 't1', text: 'Submit digital pre-auth cashless form with initial doctor clinical notes' },
      { id: 't2', text: 'Upload intermediate hospital bills for cashless enhancement request' },
      { id: 't3', text: 'Follow up on pending TPA discharge approval for cleared patient' },
    ],
    alerts: [
      { id: 'a1', text: 'TPA query received for patient UHID 10492 — response due within 2 hours', level: 'warn' },
      { id: 'a2', text: 'Cashless deduction disputed on final settlement for Bill #4019', level: 'info' },
    ],
    workQueues: ['Pre-Authorization Queue', 'TPA Queries Tracker', 'Discharge Approval Requests', 'A/R Claims Ledger'],
    quickActions: ['Submit New Pre-Auth Request', 'Respond to TPA Query', 'Request Limit Enhancement', 'Submit Final Claim Dossier'],
    domainModules: [
      { key: 'tpa-desk', emoji: '📑', label: 'Insurance & TPA Desk', description: 'Pre-auth workflow, query management and cashless settlement tracking.', ctaLabel: 'Open TPA Desk', ctaHref: '/hospital/insurance' },
    ],
  },

  corporate_admin: {
    roleKey: 'corporate_admin',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Corporate Billing Dashboard',
    subtitle: 'Corporate empanelment agreements, agreed tariff contracts, credit billing & corporate A/R',
    permissions: ['corporate:manage', 'billing:manage', 'reports:read'],
    sidebarSections: ['Dashboard', 'Corporate Patients', 'Contracts', 'Invoices', 'Outstanding'],
    kpis: [
      { label: 'Active Corporate Accounts', value: '38 Corporates', hint: 'Empaneled companies' },
      { label: 'Credit Outstanding', value: '₹22.4L', hint: 'Awaiting corporate remittance' },
      { label: 'Corporate Patients Today', value: '14 Patients', hint: 'Beneficiaries admitted' },
      { label: 'Invoices Pending Submission', value: '6 Invoices', hint: 'Signed bills ready' },
    ],
    tasks: [
      { id: 't1', text: 'Verify corporate employee authorization letter and eligible room category' },
      { id: 't2', text: 'Dispatch monthly consolidated credit invoice package to client HR' },
      { id: 't3', text: 'Reconcile corporate NEFT bank remittance against outstanding ledger' },
    ],
    alerts: [
      { id: 'a1', text: 'Corporate client XYZ Corp exceeded approved credit limit threshold', level: 'warn' },
    ],
    workQueues: ['Corporate Beneficiary Admissions', 'Credit Invoices Awaiting Dispatch', 'Overdue Corporate A/R Ledger'],
    quickActions: ['Verify Corporate Eligibility', 'Generate Corporate Monthly Invoice', 'Record Corporate Remittance', 'Update Rate Contract'],
    domainModules: [
      { key: 'corporate-billing', emoji: '🏢', label: 'Corporate Empanelment', description: 'Corporate contracts, credit ceilings, credit billing and statements.', ctaLabel: 'Corporate Billing', ctaHref: '/hospital/billing' },
    ],
  },

  accountant: {
    roleKey: 'accountant',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Hospital Finance & Accounts Dashboard',
    subtitle: 'General ledger, accounts receivable/payable, bank reconciliations, TDS/GST & trial balance',
    permissions: ['accounts:manage', 'finance:read', 'billing:read', 'reports:read'],
    sidebarSections: ['Dashboard', 'Accounts', 'Expenses', 'Receivables', 'Payables', 'Banking', 'Financial Reports'],
    kpis: [
      { label: 'Monthly Revenue', value: '₹1.42 Cr', hint: 'Accrued across all depts' },
      { label: 'Accounts Receivable', value: '₹37.2L', hint: 'Outstanding TPA + Corporate' },
      { label: 'Accounts Payable', value: '₹18.6L', hint: 'Vendor invoices due' },
      { label: 'Bank Reconciliation Variance', value: '₹0', hint: 'Unmatched statements' },
    ],
    tasks: [
      { id: 't1', text: 'Perform daily bank statement reconciliation against payment gateway UTRs' },
      { id: 't2', text: 'Review and approve accounts payable vendor invoices for medical supplies' },
      { id: 't3', text: 'Prepare monthly GST and TDS withholding tax returns' },
    ],
    alerts: [
      { id: 'a1', text: 'Unreconciled payment gateway settlement batch detected', level: 'warn' },
    ],
    workQueues: ['Bank Reconciliation Queue', 'Pending Vendor Payments', 'Doctor Revenue Share Settlements', 'Tax Ledger'],
    quickActions: ['Record Journal Voucher', 'Run Bank Reconciliation', 'Approve Vendor Payment', 'Export Trial Balance'],
    domainModules: [
      { key: 'finance-gl', emoji: '📊', label: 'Hospital Accounting ERP', description: 'Double-entry ledger, P&L statements, payables and balance sheet.', ctaLabel: 'Open Finance', ctaHref: '/hospital/finance' },
    ],
  },

  store_keeper: {
    roleKey: 'store_keeper',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Inventory & Store Manager Dashboard',
    subtitle: 'Multi-store inventory (Medical, Surgical, General), department indents, reorder levels & batch expiry',
    permissions: ['inventory:manage', 'inventory:read', 'operations:read'],
    sidebarSections: ['Dashboard', 'Items', 'Stock', 'Indents', 'Transfers', 'Expiry', 'Stock Reports'],
    kpis: [
      { label: 'Total Catalog SKUs', value: '1,280 SKUs', hint: 'Active inventory items' },
      { label: 'Low Stock Alerts', value: '14 Items', hint: 'Below reorder threshold' },
      { label: 'Pending Dept Indents', value: '8 Indents', hint: 'Ward & OT requisition' },
      { label: 'Total Stock Valuation', value: '₹48.6L', hint: 'Warehouse inventory value' },
    ],
    tasks: [
      { id: 't1', text: 'Fulfill surgical consumables indent for Operation Theatre Complex' },
      { id: 't2', text: 'Generate low-stock purchase requisition for critical consumables' },
      { id: 't3', text: 'Conduct routine physical cycle count for high-value implants' },
    ],
    alerts: [
      { id: 'a1', text: 'Sterile surgical gloves size 7.5 reached critical reorder point', level: 'warn' },
      { id: 'a2', text: 'Damaged item return request submitted by Ward 4', level: 'info' },
    ],
    workQueues: ['Department Indent Requisitions', 'Low Stock Reorder List', 'Near-Expiry Stock Ledger', 'Goods Receipt (GRN) Inward'],
    quickActions: ['Issue Stock to Department', 'Create Purchase Requisition', 'Record Stock Adjustment', 'Scan Inward Barcode'],
    domainModules: [
      { key: 'inventory-ops', emoji: '📦', label: 'Inventory Management', description: 'Multi-warehouse stock, batches, indents and barcode scanning.', ctaLabel: 'Open Inventory', ctaHref: '/hospital/inventory' },
    ],
  },

  purchase_officer: {
    roleKey: 'purchase_officer',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Purchase & Procurement Dashboard',
    subtitle: 'Purchase requisitions, Request for Quotation (RFQ), comparative vendor statements, POs & GRN matching',
    permissions: ['procurement:manage', 'inventory:read', 'operations:read'],
    sidebarSections: ['Dashboard', 'Indents', 'Vendors', 'Quotations', 'Purchase Orders', 'GRN'],
    kpis: [
      { label: 'Pending Indent Requests', value: '8 Indents', hint: 'Awaiting purchase order' },
      { label: 'Open Purchase Orders', value: '12 Orders', hint: 'Sent to vendors' },
      { label: 'Deliveries Expected Today', value: '3 Shipments', hint: 'Scheduled GRN inward' },
      { label: 'Pending GRN Approvals', value: '2 Pending', hint: 'Quality inspection due' },
    ],
    tasks: [
      { id: 't1', text: 'Generate competitive vendor comparative statement for medical gas supplier' },
      { id: 't2', text: 'Draft and release approved purchase order for laboratory test reagents' },
      { id: 't3', text: 'Perform 3-way match: Purchase Order vs. Goods Receipt vs. Vendor Invoice' },
    ],
    alerts: [
      { id: 'a1', text: 'Purchase Order #849 delivery delayed by 3 days by supplier', level: 'warn' },
    ],
    workQueues: ['Purchase Requisitions Queue', 'Vendor Quotations to Compare', 'Pending Purchase Orders', 'GRN Inward Inspection'],
    quickActions: ['Create Purchase Order', 'Request Quotation (RFQ)', 'Verify Goods Receipt Note (GRN)', 'Add Approved Vendor'],
    domainModules: [
      { key: 'procurement-cycle', emoji: '🛒', label: 'Procurement Cycle', description: 'Indent → RFQ → Quotation → PO → GRN → Invoice matching.', ctaLabel: 'Open Procurement', ctaHref: '/hospital/inventory' },
    ],
  },

  hr_manager: {
    roleKey: 'hr_manager',
    layer: 5,
    layerName: 'Business & Operations',
    title: 'Hospital HR & Staff Dashboard',
    subtitle: 'Employee records, biometric attendance, shift rostering, leave approvals, council registrations & payroll',
    permissions: ['staff:manage', 'hr:manage', 'payroll:read', 'reports:read'],
    sidebarSections: ['Dashboard', 'Employees', 'Attendance', 'Leaves', 'Roster', 'Payroll'],
    kpis: [
      { label: 'Total Hospital Staff', value: '210 Staff', hint: 'Doctors, nurses & staff' },
      { label: 'Present Today', value: '184 (88%)', hint: 'Biometric / face check-in' },
      { label: 'Pending Leave Requests', value: '6 Requests', hint: 'Awaiting approval' },
      { label: 'Expiring Registrations', value: '2 Council', hint: 'Medical council licenses' },
    ],
    tasks: [
      { id: 't1', text: 'Approve pending nurse annual leave requests with roster coverage check' },
      { id: 't2', text: 'Audit expiring doctor state medical council registration renewals' },
      { id: 't3', text: 'Review biometric late arrival and overtime calculations for payroll run' },
    ],
    alerts: [
      { id: 'a1', text: '2 staff clinical licenses expire within 15 days', level: 'warn' },
    ],
    workQueues: ['Leave Approval Queue', 'Staff Credentialing Verification', 'Attendance Exception Log', 'Monthly Payroll Batch'],
    quickActions: ['Onboard New Staff Member', 'Approve Leave Request', 'Publish Shift Duty Roster', 'Generate Monthly Payslips'],
    domainModules: [
      { key: 'hr-staff', emoji: '👥', label: 'Hospital HR & Roster', description: 'Staff directory, duty rosters, biometric attendance and compliance.', ctaLabel: 'Open HR', ctaHref: '/hospital/staff' },
    ],
  },

  // ==========================================
  // LAYER 6: FACILITY, QUALITY & DIGITAL
  // ==========================================
  housekeeping_supervisor: {
    roleKey: 'housekeeping_supervisor',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Housekeeping & Sanitization Dashboard',
    subtitle: 'Bed turnaround, ward cleaning requests, terminal infection disinfection & cleaning SLA tracking',
    permissions: ['housekeeping:manage', 'housekeeping:read', 'beds:read'],
    sidebarSections: ['Dashboard', 'Cleaning Requests', 'Bed Cleaning', 'Ward Cleaning', 'Tasks'],
    kpis: [
      { label: 'Pending Cleaning Requests', value: '5 Rooms', hint: 'Beds vacated / requests' },
      { label: 'Cleaning In Progress', value: '3 Active', hint: 'Staff active in rooms' },
      { label: 'Completed Today', value: '26 Verified', hint: 'Verified & released' },
      { label: 'Average Turnaround (min)', value: '34 min', hint: 'SLA target: 45 min' },
    ],
    tasks: [
      { id: 't1', text: 'Assign cleaner to Bed 204 vacated upon discharge' },
      { id: 't2', text: 'Inspect and verify terminal cleaning checklist for ICU Isolation Room' },
      { id: 't3', text: 'Verify biohazard bin collection across all inpatient wards' },
    ],
    alerts: [
      { id: 'a1', text: 'Bed 108 cleaning overdue (>45 min) — bed manager waiting', level: 'warn' },
    ],
    workQueues: ['Bed Cleaning Queue', 'Routine Ward Cleaning Tasks', 'Terminal Infection Disinfection Log', 'Staff Deployment Board'],
    quickActions: ['Assign Cleaning Task', 'Verify & Release Clean Bed', 'Log Biohazard Disinfection', 'Report Plumbing/AC Fault'],
    domainModules: [
      { key: 'housekeeping-ops', emoji: '🧹', label: 'Housekeeping Desk', description: 'Discharge-triggered cleaning, checklists and supervisor signoffs.', ctaLabel: 'Open Housekeeping', ctaHref: '/housekeeping' },
    ],
  },

  cssd_technician: {
    roleKey: 'cssd_technician',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Central Sterile Supply Department (CSSD) Dashboard',
    subtitle: 'Surgical instrument tracking, autoclave sterilization cycles, biological indicators & sterile pack expiry',
    permissions: ['cssd:manage', 'operations:read', 'ot:read'],
    sidebarSections: ['Dashboard', 'Instruments', 'Trays', 'Sterilization', 'Cycles', 'Dispatch'],
    kpis: [
      { label: 'Active Autoclave Cycles', value: '2 Running', hint: 'Sterilization in progress' },
      { label: 'Sterile Trays Ready', value: '34 Packs', hint: 'Available for OT' },
      { label: 'Pending Decontamination', value: '6 Trays', hint: 'Returned soiled sets' },
      { label: 'Near-Expiry Sterile Packs', value: '2 Packs', hint: 'Exceeding validity window' },
    ],
    tasks: [
      { id: 't1', text: 'Load and initiate 134°C vacuum autoclave cycle for Orthopedic Tray Set B' },
      { id: 't2', text: 'Record biological and chemical spore indicator test verification' },
      { id: 't3', text: 'Dispatch requested sterile laparoscopy sets to Theatre 4' },
    ],
    alerts: [
      { id: 'a1', text: 'Biological indicator test reading required for Autoclave 2', level: 'warn' },
    ],
    workQueues: ['Soiled Receiving Queue', 'Active Autoclave Cycles', 'Sterile Storage Inventory', 'OT Dispatch Log'],
    quickActions: ['Log Autoclave Cycle Start', 'Record Chemical Indicator Result', 'Issue Sterile Tray to OT', 'Receive Soiled Instrument Set'],
    domainModules: [
      { key: 'cssd-ops', emoji: '🧼', label: 'CSSD Sterilization', description: 'Autoclave cycle logs, tray barcodes, indicators and sterile dispatch.', ctaLabel: 'Open CSSD', ctaHref: '/hospital/cssd' },
    ],
  },

  diet_kitchen_admin: {
    roleKey: 'diet_kitchen_admin',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Diet Kitchen & Nutrition Dashboard',
    subtitle: 'Therapeutic meal preparation, diabetic/salt-restricted diets, NPO flags & ward meal tray delivery',
    permissions: ['diet:manage', 'operations:read', 'records:read'],
    sidebarSections: ['Dashboard', 'Patient Diet', 'Diet Orders', 'Assessments', 'Meal Status'],
    kpis: [
      { label: 'Active Meal Plans', value: '124 Plans', hint: 'Inpatients enrolled' },
      { label: 'Special / Diabetic Diets', value: '38 Special', hint: 'Therapeutic requirements' },
      { label: 'NPO (Nil By Mouth) Patients', value: '9 NPO Holds', hint: 'Surgery pre-op holds' },
      { label: 'Trays Dispatched', value: '118 Served', hint: 'Delivered to wards' },
    ],
    tasks: [
      { id: 't1', text: 'Cross-check surgical NPO status list before dispatching lunch trays' },
      { id: 't2', text: 'Prepare renal low-potassium therapeutic meals for Ward-3 inpatients' },
      { id: 't3', text: 'Record kitchen food preparation temperature safety audit' },
    ],
    alerts: [
      { id: 'a1', text: 'Patient on Bed 112 changed to NPO 10 minutes ago — hold tray', level: 'urgent' },
    ],
    workQueues: ['Ward Diet Distribution List', 'Therapeutic Diet Modifications', 'NPO Surgical Hold Queue'],
    quickActions: ['Confirm Meal Tray Delivery', 'Update Patient Diet Prescription', 'Record Kitchen Food Hygiene Audit', 'Print Ward Diet Slips'],
    domainModules: [
      { key: 'diet-kitchen-ops', emoji: '🥗', label: 'Diet Kitchen', description: 'Diet schedules, therapeutic modifications and delivery tracking.', ctaLabel: 'Open Diet Kitchen', ctaHref: '/hospital/diet' },
    ],
  },

  dietitian: {
    roleKey: 'dietitian',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Clinical Dietitian Dashboard',
    subtitle: 'Nutritional assessments, enteral/parenteral nutrition plans, patient allergies & diet counseling',
    permissions: ['diet:manage', 'records:read', 'clinical:write'],
    sidebarSections: ['Dashboard', 'Assessments', 'Diet Plans', 'Consultations', 'Ward Rounds'],
    kpis: [
      { label: 'Nutritional Assessments Due', value: '6 Due', hint: 'Newly admitted patients' },
      { label: 'Active Therapeutic Plans', value: '42 Active', hint: 'Prescribed diets' },
      { label: 'Critical ICU Feeds', value: '8 Enteral', hint: 'Enteral / Ryle tube' },
      { label: 'OPD Diet Consultations', value: '12 Consults', hint: 'Scheduled today' },
    ],
    tasks: [
      { id: 't1', text: 'Perform comprehensive nutritional risk screening for Bed 305' },
      { id: 't2', text: 'Formulate caloric and protein targets for ICU enteral feeding plan' },
      { id: 't3', text: 'Conduct discharge diabetic dietary counselling for patient and family' },
    ],
    alerts: [
      { id: 'a1', text: 'Patient allergy documented: Gluten / Peanut allergy for Bed 210', level: 'warn' },
    ],
    workQueues: ['Nutritional Screening Queue', 'Enteral / Parenteral Feed Plans', 'Dietary Consultations'],
    quickActions: ['Create Nutrition Assessment', 'Prescribe Therapeutic Diet', 'Log Enteral Feed Plan', 'Print Diet Chart'],
    domainModules: [
      { key: 'clinical-diet', emoji: '🍏', label: 'Clinical Nutrition', description: 'Nutritional assessment forms, calorie calculators and diet charts.', ctaLabel: 'Open Nutrition', ctaHref: '/hospital/diet' },
    ],
  },

  biomedical_engineer: {
    roleKey: 'biomedical_engineer',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Biomedical Engineering Dashboard',
    subtitle: 'Medical equipment registry, preventive maintenance, calibration due, breakdown tickets & downtime',
    permissions: ['biomedical:manage', 'operations:read', 'operations:manage'],
    sidebarSections: ['Dashboard', 'Equipment', 'Maintenance', 'Calibration', 'Work Orders'],
    kpis: [
      { label: 'Total Medical Equipment', value: '342 Assets', hint: 'Tracked asset inventory' },
      { label: 'Open Breakdown Tickets', value: '3 Open', hint: 'Requiring immediate repair' },
      { label: 'Preventive Maintenance Due', value: '8 Scheduled', hint: 'Scheduled this week' },
      { label: 'Equipment Availability Rate', value: '98.4%', hint: 'Uptime percentage' },
    ],
    tasks: [
      { id: 't1', text: 'Respond to urgent breakdown ticket: ICU Ventilator #4 flow sensor error' },
      { id: 't2', text: 'Perform monthly calibration verification on Dialysis Machine Station 2' },
      { id: 't3', text: 'Inspect and certify electrical safety leakage current on defibrillators' },
    ],
    alerts: [
      { id: 'a1', text: 'Emergency breakdown ticket logged for OT-2 Anesthesia Workstation', level: 'urgent' },
    ],
    workQueues: ['Active Breakdown Work Orders', 'Calibration Schedule Calendar', 'AMC/CMC Warranty Tracking'],
    quickActions: ['Log Breakdown Work Order', 'Record Equipment Calibration', 'Release Equipment to Clinical Service', 'Schedule Preventive Service'],
    domainModules: [
      { key: 'biomed-ops', emoji: '🔬', label: 'Biomedical Assets', description: 'Equipment asset registry, preventive maintenance and AMC tracking.', ctaLabel: 'Open Biomedical', ctaHref: '/hospital/biomedical' },
    ],
  },

  facility_manager: {
    roleKey: 'facility_manager',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Facility & Maintenance Dashboard',
    subtitle: 'HVAC, electrical generators, medical gas pipeline systems (MGPS), plumbing & infrastructure work orders',
    permissions: ['maintenance:manage', 'operations:read', 'operations:manage'],
    sidebarSections: ['Dashboard', 'Maintenance', 'Work Orders', 'Utilities', 'Equipment Issues'],
    kpis: [
      { label: 'Open Tickets', value: '6 Tickets', hint: 'Facility maintenance' },
      { label: 'Medical Gas Pressure', value: '4.2 Bar', hint: 'O2, N2O, Medical Air' },
      { label: 'Backup Generators', value: 'Ready 100%', hint: 'Auto-transfer ready' },
      { label: 'HVAC Filter Replacements Due', value: '2 HEPA Due', hint: 'OT & ICU HEPA' },
    ],
    tasks: [
      { id: 't1', text: 'Inspect central liquid medical oxygen (LMO) tank level and manifold pressure' },
      { id: 't2', text: 'Check differential pressure gauges across OT positive-pressure air handling units' },
      { id: 't3', text: 'Resolve plumbing repair ticket for Ward-2 patient washroom' },
    ],
    alerts: [
      { id: 'a1', text: 'Secondary oxygen manifold pressure dropped 5% below standard', level: 'warn' },
    ],
    workQueues: ['Facility Work Orders', 'Medical Gas System Logs', 'Power & Generator Readiness Log', 'Preventive Maintenance'],
    quickActions: ['Create Maintenance Work Order', 'Log Medical Gas Reading', 'Record Generator Test Run', 'Close Maintenance Ticket'],
    domainModules: [
      { key: 'facility-ops', emoji: '🏢', label: 'Facility Maintenance', description: 'Work orders, utility logs, medical gas and environmental checks.', ctaLabel: 'Open Facility', ctaHref: '/hospital/facility' },
    ],
  },

  ambulance: {
    roleKey: 'ambulance',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Ambulance & Transport Dashboard',
    subtitle: 'Fleet readiness (BLS/ALS), emergency dispatch, GPS vehicle tracking, oxygen equipment & trip billing',
    permissions: ['ambulance:manage', 'operations:read', 'emergency:read'],
    sidebarSections: ['Dashboard', 'Trips', 'Ambulances', 'Drivers', 'Transfers'],
    kpis: [
      { label: 'Ambulances on Duty', value: '4 Vehicles', hint: 'Staffed & ready' },
      { label: 'Trips in Progress', value: '1 En Route', hint: 'Active patient transport' },
      { label: 'Completed Trips Today', value: '8 Completed', hint: 'Dispatches completed' },
      { label: 'Average Dispatch Response', value: '6.4 min', hint: 'Call-to-rollout minutes' },
    ],
    tasks: [
      { id: 't1', text: 'Perform start-of-shift vehicle inspection: Oxygen cylinder pressure and AED battery' },
      { id: 't2', text: 'Dispatch Advanced Life Support (ALS) vehicle to emergency trauma accident site' },
      { id: 't3', text: 'Complete patient handover trip log and calculate standard mileage billing' },
    ],
    alerts: [
      { id: 'a1', text: 'Emergency SOS pickup request received for patient in acute respiratory distress', level: 'urgent' },
    ],
    workQueues: ['Active Dispatches', 'Pending Pickup Requests', 'Vehicle Maintenance & Fuel Log', 'Completed Trip Logs'],
    quickActions: ['Dispatch Emergency Ambulance', 'Log Vehicle Inspection Checklist', 'Complete Trip & Generate Bill', 'Mark Vehicle Available'],
    domainModules: [
      { key: 'ambulance-fleet', emoji: '🚑', label: 'Ambulance Dispatch', description: 'Fleet GPS location, dispatch logs, equipment checklists and trips.', ctaLabel: 'Open Ambulance', ctaHref: '/hospital/ambulance' },
    ],
  },

  quality_officer: {
    roleKey: 'quality_officer',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Quality & Patient Safety Dashboard',
    subtitle: 'NABH/JCI quality indicators, incident reports, medication errors, patient falls & Corrective Actions (CAPA)',
    permissions: ['quality:manage', 'audit:read', 'operations:read', 'clinical:read'],
    sidebarSections: ['Dashboard', 'Incidents', 'Audits', 'Corrective Actions', 'Quality Reports'],
    kpis: [
      { label: 'Open Incident Reports', value: '3 Reports', hint: 'Falls, errors, near-misses' },
      { label: 'CAPA Pending Actions', value: '5 Pending', hint: 'Corrective actions due' },
      { label: 'NABH Quality KPIs Tracked', value: '18 Metric', hint: 'Mandatory clinical metrics' },
      { label: 'Clinical Audits Completed', value: '12 Audits', hint: 'Internal quality rounds' },
    ],
    tasks: [
      { id: 't1', text: 'Investigate reported near-miss medication dispensing incident' },
      { id: 't2', text: 'Conduct root cause analysis (RCA) on inpatient bed fall incident' },
      { id: 't3', text: 'Compile monthly institutional quality indicator dashboard for board review' },
    ],
    alerts: [
      { id: 'a1', text: 'Sentinel event logged: Unplanned return to OT within 24 hours', level: 'urgent' },
    ],
    workQueues: ['Patient Safety Incident Reports', 'Root Cause Analyses (RCA)', 'CAPA Action Item Tracker', 'Accreditation Evidence Files'],
    quickActions: ['Log Patient Safety Incident', 'Initiate Root Cause Analysis', 'Assign Corrective Action (CAPA)', 'Export NABH Quality Report'],
    domainModules: [
      { key: 'quality-safety', emoji: '🏅', label: 'Quality & Patient Safety', description: 'Incident management, RCA, CAPA and accreditation compliance.', ctaLabel: 'Open Quality', ctaHref: '/hospital/quality' },
    ],
  },

  infection_control_nurse: {
    roleKey: 'infection_control_nurse',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Infection Control Dashboard',
    subtitle: 'HAI surveillance (CLABSI, CAUTI, SSI, VAP), isolation room audits, hand hygiene & Bio-Medical Waste (BMW)',
    permissions: ['quality:manage', 'operations:read', 'clinical:read'],
    sidebarSections: ['Dashboard', 'Infection Incidents', 'Isolation', 'Audits', 'Surveillance'],
    kpis: [
      { label: 'Patients in Isolation', value: '4 Isolated', hint: 'Contact / Airborne' },
      { label: 'Active HAI Surveillance', value: '28 Lines', hint: 'Central lines, catheters' },
      { label: 'Hand Hygiene Compliance', value: '92%', hint: 'Audit score (%)' },
      { label: 'BMW Daily Generation (kg)', value: '142 kg', hint: 'Color-coded waste log' },
    ],
    tasks: [
      { id: 't1', text: 'Conduct prospective surveillance rounds for Ventilator-Associated Pneumonia (VAP)' },
      { id: 't2', text: 'Perform observational hand hygiene compliance audit in Intensive Care Unit' },
      { id: 't3', text: 'Verify barcoded color-coded biomedical waste handover to authorized vendor' },
    ],
    alerts: [
      { id: 'a1', text: 'Multidrug-resistant organism (MDRO) culture flagged by microbiology lab', level: 'urgent' },
    ],
    workQueues: ['HAI Surveillance Registry', 'Isolation Room Active Cohort', 'Hand Hygiene Observation Log', 'Biomedical Waste Manifests'],
    quickActions: ['Place Patient on Isolation Protocol', 'Record Hand Hygiene Audit', 'Log HAI Infection Event', 'Generate BMW Waste Manifest'],
    domainModules: [
      { key: 'infection-control-ops', emoji: '🦠', label: 'Infection Control', description: 'HAI tracking, hand hygiene compliance, isolation and BMW logs.', ctaLabel: 'Infection Control', ctaHref: '/hospital/quality' },
    ],
  },

  patient_relations: {
    roleKey: 'patient_relations',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Patient Relations & Feedback Dashboard',
    subtitle: 'Patient grievances, real-time feedback, Net Promoter Score (NPS), post-discharge courtesy calls & resolution',
    permissions: ['support:manage', 'operations:read', 'patients:read'],
    sidebarSections: ['Dashboard', 'Complaints', 'Feedback', 'Follow-ups', 'Resolution'],
    kpis: [
      { label: 'NPS Score', value: '+74', hint: 'Net promoter index' },
      { label: 'Open Complaints', value: '2 Open', hint: 'Pending resolution' },
      { label: 'Feedback Forms Today', value: '42 Forms', hint: 'Digital / paper submissions' },
      { label: 'Post-Discharge Calls Due', value: '8 Calls', hint: 'Day-3 courtesy calls' },
    ],
    tasks: [
      { id: 't1', text: 'Contact patient regarding billing wait-time grievance and resolve dispute' },
      { id: 't2', text: 'Execute post-discharge courtesy calls for patients discharged 48 hours ago' },
      { id: 't3', text: 'Review ward service feedback ratings and escalate kitchen complaints' },
    ],
    alerts: [
      { id: 'a1', text: 'Unresolved patient complaint escalated: Ward-3 nursing response delay', level: 'warn' },
    ],
    workQueues: ['Grievance Escalation Queue', 'Digital Feedback Submissions', 'Post-Discharge Courtesy Call List'],
    quickActions: ['Log Patient Grievance', 'Record Follow-up Call Note', 'Close Complaint with Resolution', 'Generate NPS Report'],
    domainModules: [
      { key: 'crm-feedback', emoji: '🤝', label: 'Patient Relations & CRM', description: 'Grievance ticketing, feedback surveys and courtesy call logs.', ctaLabel: 'Open Relations', ctaHref: '/hospital/crm' },
    ],
  },

  security: {
    roleKey: 'security',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Hospital Security & Visitor Dashboard',
    subtitle: 'Visitor passes, attendant wristbands, restricted area access control & hospital security incident tracking',
    permissions: ['security:manage', 'security:read', 'operations:read'],
    sidebarSections: ['Dashboard', 'Visitors', 'Passes', 'Incidents', 'Entry / Exit'],
    kpis: [
      { label: 'Visitors Inside', value: '78 Visitors', hint: 'Active passes' },
      { label: 'Passes Issued Today', value: '210 Passes', hint: 'Visitor registrations' },
      { label: 'Attendant Badges Active', value: '142 Badges', hint: 'IPD patient attendants' },
      { label: 'Security Incidents', value: '0 Open', hint: 'Logged this month' },
    ],
    tasks: [
      { id: 't1', text: 'Issue barcode visitor pass for evening IPD visiting hours' },
      { id: 't2', text: 'Enforce single-attendant restriction in Intensive Care Unit' },
      { id: 't3', text: 'Verify perimeter CCTV surveillance feed and emergency exit clearances' },
    ],
    alerts: [
      { id: 'a1', text: 'Unauthorized badge attempt logged at Pharmacy Narcotics Store door', level: 'urgent' },
    ],
    workQueues: ['Visitor Check-In / Out Log', 'Active Attendant Passes', 'Security Incident Reports', 'Parking Slot Status'],
    quickActions: ['Issue Visitor Pass', 'Scan Visitor Exit', 'Log Security Incident', 'Revoke Access Badge'],
    domainModules: [
      { key: 'security-desk', emoji: '🛡️', label: 'Security & Access', description: 'Visitor management, attendant passes, gate logs and incidents.', ctaLabel: 'Open Security', ctaHref: '/hospital/security' },
    ],
  },

  discharge_coordinator: {
    roleKey: 'discharge_coordinator',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Patient Discharge Desk Dashboard',
    subtitle: 'Multi-department clearance tracking (Pharmacy return, Nursing clear, Billing, TPA approval, Doctor summary)',
    permissions: ['discharges:manage', 'operations:read', 'billing:read', 'records:read'],
    sidebarSections: ['Dashboard', 'Discharges', 'Clearances', 'Bills', 'Summaries', 'Pending Tasks'],
    kpis: [
      { label: 'Discharge Orders Today', value: '18 Orders', hint: 'Doctor advice entered' },
      { label: 'Clearances In Progress', value: '6 In Flight', hint: 'Pharmacy, billing, nursing' },
      { label: 'Insurance Approvals Pending', value: '3 Pending', hint: 'Awaiting TPA final nod' },
      { label: 'Discharges Completed', value: '12 Cleared', hint: 'Patient handed over' },
    ],
    tasks: [
      { id: 't1', text: 'Track pharmacy medicine return and nursing discharge clearance for Bed 214' },
      { id: 't2', text: 'Verify finalized doctor discharge summary and follow-up appointment booking' },
      { id: 't3', text: 'Release patient discharge folder and trigger housekeeping bed cleaning request' },
    ],
    alerts: [
      { id: 'a1', text: 'Discharge delayed by > 3 hours awaiting TPA final claim approval', level: 'warn' },
    ],
    workQueues: ['Multi-Stage Discharge Clearance Board', 'Pending Pharmacy Returns', 'Awaiting TPA Final Approval', 'Ready for Exit'],
    quickActions: ['Check Clearance Status', 'Notify Pharmacy / Billing', 'Print Discharge Folder', 'Mark Discharge Completed'],
    domainModules: [
      { key: 'discharge-desk', emoji: '🚪', label: 'Discharge Coordination', description: 'Step-by-step discharge workflow: Doctor → Pharmacy → Billing → Exit.', ctaLabel: 'Discharge Desk', ctaHref: '/hospital/discharges' },
    ],
  },

  mortuary_attendant: {
    roleKey: 'mortuary_attendant',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Mortuary & Death Records Dashboard',
    subtitle: 'Deceased patient intake, cold-storage compartment allocation, death certification & authorized release',
    permissions: ['mortuary:manage', 'records:read', 'operations:read'],
    sidebarSections: ['Dashboard', 'Death Records', 'Mortuary Beds', 'Release Status', 'Police NOC'],
    kpis: [
      { label: 'Mortuary Cold Chambers', value: '8 Chambers', hint: 'Total storage capacity' },
      { label: 'Chambers Occupied', value: '2 Occupied', hint: 'Deceased in custody' },
      { label: 'Bodies Awaiting Release', value: '1 Awaiting', hint: 'Documentation in progress' },
      { label: 'MLC / Autopsy Cases', value: '1 Police NOC', hint: 'Police intimation required' },
    ],
    tasks: [
      { id: 't1', text: 'Verify death certificate and identity wristband upon receiving body from Ward' },
      { id: 't2', text: 'Allocate clean mortuary cold chamber cabinet and log storage temperature' },
      { id: 't3', text: 'Verify family identity, police NOC for MLC case, and complete release handover' },
    ],
    alerts: [
      { id: 'a1', text: 'Mortuary chamber storage duration exceeded 72 hours without claimant', level: 'warn' },
    ],
    workQueues: ['Mortuary Chamber Status Board', 'Deceased Intake Log', 'Pending Body Release Handover', 'MLC Police Clearances'],
    quickActions: ['Log Deceased Intake', 'Allocate Storage Cabinet', 'Verify Release Documentation', 'Complete Handover'],
    domainModules: [
      { key: 'mortuary-desk', emoji: '🕊️', label: 'Mortuary Operations', description: 'Deceased registration, cold storage allocation, MLC release and audit logs.', ctaLabel: 'Mortuary Records', ctaHref: '/hospital/mortuary' },
    ],
  },

  it_admin: {
    roleKey: 'it_admin',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Hospital IT Admin & Systems Dashboard',
    subtitle: 'Device connectivity, LIS/PACS bridges, barcode printers, account security & system uptime',
    permissions: ['admin:manage', 'system:manage', 'audit:read'],
    sidebarSections: ['Dashboard', 'Users', 'Devices', 'Integrations', 'Logs', 'Backups', 'IT Tickets'],
    kpis: [
      { label: 'Connected Medical Devices', value: '48 Online', hint: 'Analyzers, monitors, PACS' },
      { label: 'Active User Sessions', value: '124 Users', hint: 'Hospital-wide logins' },
      { label: 'Open IT Support Tickets', value: '3 Tickets', hint: 'Printer, network, login' },
      { label: 'Automated Backup Status', value: 'Success (02:00)', hint: 'Point-in-time snapshot' },
    ],
    tasks: [
      { id: 't1', text: 'Resolve thermal barcode printer communication error at Emergency Reception' },
      { id: 't2', text: 'Verify HL7/DICOM PACS interface router gateway message throughput' },
      { id: 't3', text: 'Review failed login attempt alerts and unlock legitimate staff account' },
    ],
    alerts: [
      { id: 'a1', text: 'Lab analyzer HL7 bi-directional bridge connection disconnected', level: 'urgent' },
    ],
    workQueues: ['Internal IT Helpdesk Tickets', 'HL7 / LIS Integration Bridges', 'Active Device Connections', 'System Audit Trail'],
    quickActions: ['Unlock Staff User Account', 'Restart HL7 Gateway Bridge', 'Run On-Demand DB Snapshot', 'Test Network Printer'],
    domainModules: [
      { key: 'it-admin-ops', emoji: '🖥️', label: 'Hospital IT Infrastructure', description: 'Device bridges, printer configurations, access control and audit logs.', ctaLabel: 'IT Infrastructure', ctaHref: '/admin' },
    ],
  },

  auditor: {
    roleKey: 'auditor',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Hospital Auditor Dashboard',
    subtitle: 'Clinical record audits, billing accuracy, prescription reviews & regulatory compliance inspection',
    permissions: ['audit:read', 'reports:read', 'records:read'],
    sidebarSections: ['Dashboard', 'Audit Plan', 'Findings', 'Access Logs', 'Corrective Actions'],
    kpis: [
      { label: 'Audit Events (24h)', value: '1,420 Events', hint: 'System-wide transactions' },
      { label: 'Open Audit Findings', value: '4 Findings', hint: 'Non-conformances noted' },
      { label: 'Clinical Documentation Audits', value: '25 Sampled', hint: 'Random sample reviews' },
      { label: 'Billing Discrepancies', value: '1 Resolved', hint: 'Investigated and closed' },
    ],
    tasks: [
      { id: 't1', text: 'Perform random retrospective audit on 20 completed IPD discharge billing records' },
      { id: 't2', text: 'Examine electronic medical record access logs for sensitive VIP patient' },
      { id: 't3', text: 'Review pharmacy inventory reconciliation logs for controlled narcotics' },
    ],
    alerts: [
      { id: 'a1', text: 'Significant billing discrepancy noted on Surgery Implant Bill #3094', level: 'warn' },
    ],
    workQueues: ['Scheduled Audit Engagements', 'Audit Non-Conformance Findings', 'System Access Audit Trail'],
    quickActions: ['Open New Audit Finding', 'Export Comprehensive Audit Log', 'Sample IPD Patient Records', 'Submit Audit Summary'],
    domainModules: [
      { key: 'audit-inspection', emoji: '🔍', label: 'Hospital Audit Center', description: 'Multi-department audit plans, evidence logs and compliance tracking.', ctaLabel: 'Open Audit', ctaHref: '/hospital/audit' },
    ],
  },

  mis_reporting: {
    roleKey: 'mis_reporting',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Hospital MIS & Analytics Dashboard',
    subtitle: 'Executive intelligence, clinical KPI dashboards, bed turnover, revenue analytics & doctor productivity',
    permissions: ['reports:read', 'billing:read', 'operations:read', 'clinical:read'],
    sidebarSections: ['Dashboard', 'Patient Reports', 'Clinical KPIs', 'Financial Analytics', 'Department MIS'],
    kpis: [
      { label: 'Hospital Census', value: '585 Total', hint: 'Total patients under care' },
      { label: 'Average Bed Turnover', value: '4.8 Beds/mo', hint: 'Admissions per bed per month' },
      { label: 'Gross Hospital Revenue', value: '₹17.9L Today', hint: 'MTD collection index' },
      { label: 'Clinical Turnaround Index', value: '94% On-Time', hint: 'TAT target adherence' },
    ],
    tasks: [
      { id: 't1', text: 'Generate daily institutional management census report for board briefing' },
      { id: 't2', text: 'Analyze specialty-wise revenue contribution vs operating cost index' },
      { id: 't3', text: 'Model emergency department arrival trends for nurse staffing optimization' },
    ],
    alerts: [
      { id: 'a1', text: 'Laboratory turnaround time (TAT) degraded by 12% over last 7 days', level: 'warn' },
    ],
    workQueues: ['Scheduled MIS Reports', 'Doctor Productivity Analytics', 'Department Financial Comparison', 'Accreditation Metrics'],
    quickActions: ['Export Daily Operations Summary', 'Generate Monthly Financial P&L', 'Analyze Bed Occupancy Trends', 'Schedule Automated Report'],
    domainModules: [
      { key: 'mis-analytics', emoji: '📊', label: 'Management Information System', description: 'Cross-functional BI dashboards, trend forecasting and analytics.', ctaLabel: 'Open MIS', ctaHref: '/hospital/reports' },
    ],
  },

  patient: {
    roleKey: 'patient',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Patient Portal Dashboard',
    subtitle: 'Personal health record, appointments, digital prescriptions, lab reports, discharge summaries & payments',
    permissions: ['records:read:own', 'appointments:create', 'payments:collect'],
    sidebarSections: ['Dashboard', 'Appointments', 'Health Records', 'Reports', 'Bills', 'Payments', 'Family'],
    kpis: [
      { label: 'Upcoming Appointment', value: 'Tomorrow 10:30', hint: 'Scheduled doctor visit' },
      { label: 'Active Prescriptions', value: '3 Medicines', hint: 'Medicines & doses' },
      { label: 'New Lab Reports Ready', value: '2 Reports', hint: 'Downloadable PDF' },
      { label: 'Outstanding Balance', value: '₹0 Paid', hint: 'Online payment enabled' },
    ],
    tasks: [
      { id: 't1', text: 'View instructions for upcoming fasting blood sugar diagnostic test' },
      { id: 't2', text: 'Pay pending consultation or investigation bill via UPI / Card' },
      { id: 't3', text: 'Download signed doctor digital discharge summary document' },
    ],
    alerts: [
      { id: 'a1', text: 'Appointment reminder: Dr. Sharma at 10:30 AM tomorrow', level: 'info' },
    ],
    workQueues: ['My Upcoming Appointments', 'Diagnostic Reports Archive', 'Past Hospital Visits', 'Family Member Records'],
    quickActions: ['Book Doctor Consultation', 'Download Lab Report PDF', 'Pay Outstanding Bill', 'Request Teleconsultation'],
    domainModules: [
      { key: 'patient-portal-phr', emoji: '📁', label: 'My Health Record (PHR)', description: 'Longitudinal personal health timeline, prescriptions and reports.', ctaLabel: 'Open Portal', ctaHref: '/patient/dashboard' },
    ],
  },

  doctor_portal: {
    roleKey: 'doctor_portal',
    layer: 6,
    layerName: 'Facility, Quality & Digital',
    title: 'Doctor Mobile / Remote Portal',
    subtitle: 'Remote access, teleconsultation video queue, quick clinical rounds, order entries & signoffs',
    permissions: ['consultation:write', 'records:read', 'prescriptions:write'],
    sidebarSections: ['Dashboard', 'My Schedule', 'Teleconsult Queue', 'Inpatients', 'Signoffs', 'Messages'],
    kpis: [
      { label: 'Teleconsults Waiting', value: '3 Waiting', hint: 'Video call queue' },
      { label: 'Assigned Inpatients', value: '12 Patients', hint: 'Ward & ICU rounds' },
      { label: 'Pending Digital Signoffs', value: '4 Signoffs', hint: 'Rx & summaries' },
      { label: 'Critical Results Alerted', value: '1 Alert', hint: 'Urgent attention' },
    ],
    tasks: [
      { id: 't1', text: 'Connect to scheduled video teleconsultation with remote patient' },
      { id: 't2', text: 'Review and approve pending laboratory results for Ward-2 inpatients' },
      { id: 't3', text: 'Electronically sign off finalized discharge summaries from mobile' },
    ],
    alerts: [
      { id: 'a1', text: 'Teleconsult patient joined video room: Rahul Verma', level: 'info' },
    ],
    workQueues: ['Telemedicine Video Room', 'Inpatient Quick Rounds', 'Critical Results Awaiting Review', 'Signoff Queue'],
    quickActions: ['Launch Video Consultation', 'Write e-Prescription', 'Approve Test Result', 'Sign Discharge Summary'],
    domainModules: [
      { key: 'telemed-remote', emoji: '📱', label: 'Telemedicine & Rounds', description: 'Remote video consults, mobile EMR and quick orders.', ctaLabel: 'Doctor Portal', ctaHref: '/doctor/dashboard' },
    ],
  },
};

/**
 * Helper to fetch a spec by role key (with alias fallback)
 */
export function getHmsDashboardSpec(roleKey: string | undefined): HmsDashboardConfig | undefined {
  if (!roleKey) return undefined;
  const key = String(roleKey).toLowerCase();
  if (HMS_ROLE_SPECS[key]) return HMS_ROLE_SPECS[key];

  const aliases: Record<string, string> = {
    cmo: 'medical_superintendent',
    medical_director: 'hospital_owner',
    ward_nurse: 'nurse',
    clinic_nurse: 'nurse',
    nursing_supervisor: 'nurse',
    matron: 'nurse',
    front_desk: 'receptionist',
    clinic_receptionist: 'receptionist',
    insurance_desk: 'tpa_agent',
    store_manager: 'store_keeper',
    maintenance: 'facility_manager',
    quality_manager: 'quality_officer',
    infection_control: 'infection_control_nurse',
    dietician_head: 'dietitian',
    kitchen_staff: 'diet_kitchen_admin',
    auditor_officer: 'auditor',
    compliance_officer: 'auditor',
    mis_admin: 'mis_reporting',
    casualty: 'emergency',
  };

  const aliasedKey = aliases[key];
  if (aliasedKey && HMS_ROLE_SPECS[aliasedKey]) {
    return { ...HMS_ROLE_SPECS[aliasedKey], roleKey: key };
  }

  return undefined;
}

/**
 * Returns all configured HMS canonical roles
 */
export function getAllHmsRoles(): string[] {
  return Object.keys(HMS_ROLE_SPECS);
}

/**
 * Returns roles grouped by architectural layer (1-6)
 */
export function getHmsRolesByLayer(layer: 1 | 2 | 3 | 4 | 5 | 6): HmsDashboardConfig[] {
  return Object.values(HMS_ROLE_SPECS).filter((r) => r.layer === layer);
}
