import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Stethoscope, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, PhoneCall, Filter, ExternalLink, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner';

export interface WorkQueueItem {
  id: string;
  name: string;
  meta: string;
  detail: string;
  timeOrWait: string;
  status: string;
  statusColor: 'urgent' | 'warn' | 'info' | 'success';
  primaryActionLabel: string;
  primaryActionRoute?: string;
  onPrimaryAction?: () => void;
}

export interface WorkQueueTableProps {
  roleKey: string;
  workQueues: string[];
}

// Role-specific datasets providing genuine clinical & operational depth
const ROLE_QUEUE_DATA: Record<string, Record<string, WorkQueueItem[]>> = {
  doctor: {
    'Waiting OPD Patients': [
      { id: 'TK-01', name: 'Aarav Sharma', meta: '34y · Male · UHID-9041', detail: 'Fever & persistent dry cough (3 days)', timeOrWait: '15 min wait', status: 'Urgent Triage', statusColor: 'urgent', primaryActionLabel: 'Start Consult', primaryActionRoute: '/doctor/consultation' },
      { id: 'TK-02', name: 'Meera Patel', meta: '28y · Female · UHID-8842', detail: 'Routine 2nd trimester antenatal checkup', timeOrWait: '22 min wait', status: 'Scheduled', statusColor: 'info', primaryActionLabel: 'Start Consult', primaryActionRoute: '/doctor/consultation' },
      { id: 'TK-03', name: 'Rajesh Verma', meta: '58y · Male · UHID-7910', detail: 'Hypertension follow-up & BP review (160/95 mmHg)', timeOrWait: '30 min wait', status: 'Priority Review', statusColor: 'warn', primaryActionLabel: 'Start Consult', primaryActionRoute: '/doctor/consultation' },
      { id: 'TK-04', name: 'Sunita Devi', meta: '46y · Female · UHID-9214', detail: 'Type 2 Diabetes HbA1c review & fatigue', timeOrWait: '38 min wait', status: 'Waiting', statusColor: 'info', primaryActionLabel: 'Start Consult', primaryActionRoute: '/doctor/consultation' },
      { id: 'TK-05', name: 'Vikram Malhotra', meta: '52y · Male · UHID-6119', detail: 'Atypical chest tightness / ECG within normal limits', timeOrWait: '5 min wait', status: 'Immediate Attention', statusColor: 'urgent', primaryActionLabel: 'Start Consult', primaryActionRoute: '/doctor/consultation' },
    ],
    'Assigned Inpatients': [
      { id: 'BED-201', name: 'Kavita Reddy', meta: '41y · Female · IPD-1092', detail: 'Post-op Day 2 Laparoscopic Cholecystectomy', timeOrWait: 'Vitals Stable', status: 'Ward 2 (General)', statusColor: 'info', primaryActionLabel: 'Rounds Note', primaryActionRoute: '/ipd' },
      { id: 'BED-204', name: 'Mohammad Tariq', meta: '65y · Male · IPD-1088', detail: 'COPD Exacerbation on O2 2L/min nasal cannula', timeOrWait: 'Rounds Due', status: 'Step-Down HDU', statusColor: 'warn', primaryActionLabel: 'Rounds Note', primaryActionRoute: '/ipd' },
      { id: 'BED-209', name: 'Anita Desai', meta: '32y · Female · IPD-1104', detail: 'Acute Pyelonephritis on IV Ceftriaxone', timeOrWait: 'Afebrile 24h', status: 'Ward 2 (General)', statusColor: 'success', primaryActionLabel: 'Rounds Note', primaryActionRoute: '/ipd' },
    ],
    'Completed Consults': [
      { id: 'TK-91', name: 'Deepak Joshi', meta: '39y · Male · UHID-9011', detail: 'Acute viral bronchitis · Rx issued for 5 days', timeOrWait: '10:15 AM', status: 'Discharged / Rx Given', statusColor: 'success', primaryActionLabel: 'View Rx', primaryActionRoute: '/prescriptions' },
      { id: 'TK-92', name: 'Pooja Nair', meta: '24y · Female · UHID-9014', detail: 'Migraine with aura · Non-contrast CT advised', timeOrWait: '10:45 AM', status: 'Investigation Ordered', statusColor: 'info', primaryActionLabel: 'View Orders', primaryActionRoute: '/hospital/lab' },
    ],
    'Telemedicine Queue': [
      { id: 'VID-01', name: 'Suresh Menon', meta: '45y · Male · UHID-5921', detail: 'Cardiology lipid profile review via Video', timeOrWait: '11:30 AM', status: 'Patient In Waiting Room', statusColor: 'warn', primaryActionLabel: 'Join Video Room', primaryActionRoute: '/doctor/consultation' },
      { id: 'VID-02', name: 'Neha Chawla', meta: '31y · Female · UHID-6012', detail: 'Thyroid dosage adjustment (TSH 6.8)', timeOrWait: '12:00 PM', status: 'Confirmed Booking', statusColor: 'info', primaryActionLabel: 'Patient File', primaryActionRoute: '/doctor/consultation' },
    ],
  },
  hospital_admin: {
    'Administrative Approvals': [
      { id: 'APP-101', name: 'Ramesh Pharmacy Requisition', meta: 'Dept: Central Pharmacy · Value: ₹1,45,000', detail: 'Bulk purchase of IV Paracetamol and Meropenem stocks', timeOrWait: 'Pending 3h', status: 'High Value PO', statusColor: 'warn', primaryActionLabel: 'Review & Authorize', primaryActionRoute: '/hospital/rcm?tab=refunds' },
      { id: 'APP-102', name: 'Patient Billing Waiver Request', meta: 'UHID-8924 · Amount: ₹12,500', detail: 'BPL Card Holder emergency concession recommended by MS', timeOrWait: 'Pending 1h', status: 'Concession Request', statusColor: 'urgent', primaryActionLabel: 'Approve Waiver', primaryActionRoute: '/hospital/rcm?tab=refunds' },
    ],
    'Bed Turnover Queue': [
      { id: 'BD-104', name: 'Bed 104 (Ward 1)', meta: 'Discharged at 09:30 AM', detail: 'Housekeeping cleaning SLA exceeded (48 min)', timeOrWait: 'Overdue 18m', status: 'Cleaning Delayed', statusColor: 'urgent', primaryActionLabel: 'Escalate Cleaning', primaryActionRoute: '/housekeeping' },
      { id: 'BD-308', name: 'Bed 308 (Deluxe)', meta: 'Discharged at 10:15 AM', detail: 'Sanitization in progress by Housekeeping Team B', timeOrWait: 'In Progress', status: 'Sanitizing', statusColor: 'info', primaryActionLabel: 'View Status', primaryActionRoute: '/hospital/beds' },
    ],
    'Shift Exceptions': [
      { id: 'SH-01', name: 'Night Roster ICU-3', meta: 'Duty Date: Tonight', detail: 'Staff Nurse Swap requested without supervisor approval', timeOrWait: 'Action Needed', status: 'Roster Conflict', statusColor: 'warn', primaryActionLabel: 'Resolve Roster', primaryActionRoute: '/hr/roster' },
    ],
    'Incident Log': [
      { id: 'INC-24', name: 'Equipment Glitch (X-Ray 2)', meta: 'Radiology Wing B', detail: 'Sensor calibration variance noted during morning QA', timeOrWait: 'Reported 2h ago', status: 'Biomedical Assigned', statusColor: 'warn', primaryActionLabel: 'View Incident', primaryActionRoute: '/admin/settings' },
    ],
  },
  nurse: {
    'Assigned Ward Patients': [
      { id: 'BED-301', name: 'Pramod Gupta', meta: '54y · Male · Dr. Mehta', detail: 'Post coronary stenting Day 1 · Telemetry monitoring', timeOrWait: 'Vitals at 11:00 AM', status: 'Stable', statusColor: 'info', primaryActionLabel: 'Log Vitals', primaryActionRoute: '/hospital/nursing?tab=vitals' },
      { id: 'BED-302', name: 'Shanti Lal', meta: '71y · Female · Dr. Rao', detail: 'Severe Bronchopneumonia · Strict fluid balance', timeOrWait: 'O2 Sat 92%', status: 'High Vigilance', statusColor: 'urgent', primaryActionLabel: 'Chart O2/Vitals', primaryActionRoute: '/hospital/nursing?tab=vitals' },
    ],
    'Medication Due Queue': [
      { id: 'MED-01', name: 'Bed 301 · Pramod Gupta', meta: 'Tab Clopidogrel 75mg', detail: 'Post-PCI dual antiplatelet scheduled dose', timeOrWait: 'Due in 15m', status: 'Scheduled 11:00 AM', statusColor: 'warn', primaryActionLabel: 'Administer (MAR)', primaryActionRoute: '/hospital/nursing?tab=mar' },
      { id: 'MED-02', name: 'Bed 302 · Shanti Lal', meta: 'Inj Piperacillin-Tazobactam 4.5g IV', detail: 'Antibiotic infusion over 30 minutes', timeOrWait: 'Due Now', status: 'Stat Admin', statusColor: 'urgent', primaryActionLabel: 'Administer (MAR)', primaryActionRoute: '/hospital/nursing?tab=mar' },
    ],
    'Pending Vitals': [
      { id: 'VIT-01', name: 'Bed 304 · Mohan Lal', meta: 'q2h post-op vitals', detail: 'Blood pressure and pulse check overdue by 12 mins', timeOrWait: 'Overdue 12m', status: 'Observation Due', statusColor: 'urgent', primaryActionLabel: 'Record Vitals', primaryActionRoute: '/hospital/nursing?tab=vitals' },
    ],
    'Pending Handover': [
      { id: 'HND-01', name: 'Ward 3 Shift SBAR Report', meta: 'Morning to Afternoon Shift', detail: '6 patients reviewed · 1 transfer to ICU scheduled at 02:00 PM', timeOrWait: 'Signoff Needed', status: 'Draft Ready', statusColor: 'info', primaryActionLabel: 'Complete Handover', primaryActionRoute: '/hospital/nursing?tab=notes' },
    ],
  },
  emergency: {
    'Triage Waiting Queue': [
      { id: 'ER-01', name: 'Unknown Male (Trauma)', meta: 'Approx 35y · RTA Case', detail: 'Blunt thoracic trauma, tachycardia (HR 130), hypotensive (BP 85/55)', timeOrWait: 'Resus Bay 1', status: 'Red (Priority 1)', statusColor: 'urgent', primaryActionLabel: 'Resuscitation Flow', primaryActionRoute: '/hospital/emergency?tab=triage' },
      { id: 'ER-02', name: 'Geeta Kumari', meta: '48y · Female · Walk-in', detail: 'Acute severe epigastric pain radiating to back, sweating', timeOrWait: '8 min wait', status: 'Yellow (Priority 2)', statusColor: 'warn', primaryActionLabel: 'Triage Evaluation', primaryActionRoute: '/hospital/emergency?tab=triage' },
      { id: 'ER-03', name: 'Akash Jain', meta: '22y · Male · Sports Injury', detail: 'Right ankle sprain with moderate edema, ambulating with support', timeOrWait: '18 min wait', status: 'Green (Priority 3)', statusColor: 'info', primaryActionLabel: 'Fast-Track OPD', primaryActionRoute: '/hospital/emergency?tab=triage' },
    ],
    'Active Resuscitation Cases': [
      { id: 'ER-RES-1', name: 'Bay 1: RTA Polytrauma', meta: 'Under active resuscitation', detail: 'Intubation performed · Cervical collar in place · 2 large-bore IV lines', timeOrWait: 'In Resus Bay', status: 'Code Red Active', statusColor: 'urgent', primaryActionLabel: 'Record Resus Vitals', primaryActionRoute: '/hospital/emergency?tab=triage' },
    ],
    'MLC Register': [
      { id: 'MLC-882', name: 'RTA Case #ER-01', meta: 'Police Station: Civil Lines', detail: 'Intimation letter dispatched · Injury sheet documented by MO', timeOrWait: 'Intimated', status: 'MLC Open', statusColor: 'warn', primaryActionLabel: 'MLC Document', primaryActionRoute: '/hospital/emergency?tab=mlc' },
    ],
    'Pending Ward/ICU Transfers': [
      { id: 'TR-10', name: 'Geeta Kumari (Acute Abdomen)', meta: 'Recommended: ICU Bed', detail: 'Awaiting bed allocation from Central Bed Manager desk', timeOrWait: '25m waiting bed', status: 'Transfer Pending', statusColor: 'warn', primaryActionLabel: 'Expedite ICU Bed', primaryActionRoute: '/hospital/beds?ward=icu' },
    ],
  },
  receptionist: {
    'Front Desk Check-in Queue': [
      { id: 'REG-101', name: 'Harish Chandra', meta: 'Phone: 98124-XXXXX', detail: 'New walk-in patient requesting Cardiology consultation', timeOrWait: '2 min in lobby', status: 'Token Issued', statusColor: 'info', primaryActionLabel: 'Register UHID', primaryActionRoute: '/hospital/frontdesk?tab=register' },
      { id: 'REG-102', name: 'Priyanka Sen', meta: 'UHID-4921 · Appt #204', detail: 'Pre-booked online appointment with Dr. Sharma (11:00 AM)', timeOrWait: 'Arrived on-time', status: 'Check-in Awaiting', statusColor: 'success', primaryActionLabel: 'Mark Checked-In', primaryActionRoute: '/hospital/frontdesk?tab=book' },
    ],
    'New Patient Registrations': [
      { id: 'UHID-NEW-1', name: 'Manish Rawat', meta: 'Govt ID: Aadhaar Verified', detail: 'Demographic deduplication check passed · Card printed', timeOrWait: 'Just now', status: 'UHID Generated', statusColor: 'success', primaryActionLabel: 'Print OPD Slip', primaryActionRoute: '/hospital/frontdesk?tab=slips' },
    ],
    'Doctor Availability Board': [
      { id: 'DOC-01', name: 'Dr. Ramesh Sharma (Cardio)', meta: 'Room 104 · Floor 1', detail: 'Active in consultation · 8 patients in queue', timeOrWait: 'On Duty', status: 'Available', statusColor: 'success', primaryActionLabel: 'Issue Slot Token', primaryActionRoute: '/hospital/queue?action=issue' },
      { id: 'DOC-02', name: 'Dr. Sunita Rao (Ortho)', meta: 'Room 108 · Floor 1', detail: 'Active in consultation · 12 patients in queue', timeOrWait: 'Running 15m delay', status: 'High Load', statusColor: 'warn', primaryActionLabel: 'Issue Slot Token', primaryActionRoute: '/hospital/queue?action=issue' },
    ],
    'Fee Receipts': [
      { id: 'RCT-8841', name: 'Harish Chandra (Consultation Fee)', meta: 'Amount: ₹800', detail: 'Mode: UPI / QR Code · Payment Confirmed', timeOrWait: 'Paid', status: 'Receipt Ready', statusColor: 'success', primaryActionLabel: 'Print Receipt', primaryActionRoute: '/hospital/frontdesk?tab=slips' },
    ],
  },
  bed_manager: {
    'Bed Turnover Queue': [
      { id: 'BM-01', name: 'Ward 2 · Bed 204', meta: 'Vacated by discharge at 09:45 AM', detail: 'Housekeeping cleaning request sent automatically', timeOrWait: '35m turnaround', status: 'Cleaning In-Progress', statusColor: 'warn', primaryActionLabel: 'Mark Cleaned', primaryActionRoute: '/hospital/beds?action=release' },
      { id: 'BM-02', name: 'Ward 3 · Bed 312', meta: 'Vacated by transfer at 10:20 AM', detail: 'Linen change completed · Sanitization underway', timeOrWait: '15m turnaround', status: 'Cleaning In-Progress', statusColor: 'info', primaryActionLabel: 'Mark Cleaned', primaryActionRoute: '/hospital/beds?action=release' },
    ],
    'Cleaning SLA Alerts': [
      { id: 'SLA-01', name: 'Ward 1 · Bed 108', meta: 'Exceeded 45-minute cleaning SLA threshold', detail: 'Urgent bed allocation requested by Emergency Casualty', timeOrWait: 'Overdue 20m', status: 'SLA Breach', statusColor: 'urgent', primaryActionLabel: 'Escalate Housekeeping', primaryActionRoute: '/housekeeping?tab=beds' },
    ],
    'Blocked Beds': [
      { id: 'BLK-01', name: 'ICU Bed 6', meta: 'Reason: Ventilator calibration & filter change', detail: 'Biomedical engineering team on site', timeOrWait: 'Est. release 01:00 PM', status: 'Maintenance Block', statusColor: 'warn', primaryActionLabel: 'Inspect Block', primaryActionRoute: '/hospital/beds?action=release' },
    ],
    'Ward Allocation Queue': [
      { id: 'ALC-01', name: 'Patient UHID-9041 (Emergency Admission)', meta: 'Requested: Male Medical Ward', detail: 'Admission approved by Emergency Medical Officer', timeOrWait: 'Waiting 18m', status: 'Bed Assigned: Bed 206', statusColor: 'success', primaryActionLabel: 'Confirm Allocation', primaryActionRoute: '/hospital/beds?action=allocate' },
    ],
  },
  cashier: {
    'Pending Bill Clearances': [
      { id: 'BIL-9921', name: 'Suman Lata (OPD Pharmacy & Lab)', meta: 'Amount Due: ₹3,450', detail: 'Doctor prescription verified · Counter 3', timeOrWait: 'Waiting 5m', status: 'Unpaid Bill', statusColor: 'warn', primaryActionLabel: 'Collect Cash / POS', primaryActionRoute: '/hospital/cashier?action=settle' },
      { id: 'BIL-9922', name: 'Ravi Teja (IPD Interim Billing)', meta: 'Amount Due: ₹24,800', detail: 'Advance top-up required prior to procedure', timeOrWait: 'Waiting 10m', status: 'Deposit Due', statusColor: 'urgent', primaryActionLabel: 'Accept Deposit', primaryActionRoute: '/hospital/cashier?tab=advance' },
    ],
    'Daily Till Register': [
      { id: 'TIL-01', name: 'Shift A Till Balance', meta: 'Cashier Desk 1', detail: 'Cash: ₹42,300 · Card/POS: ₹84,200 · UPI: ₹58,000', timeOrWait: 'Balanced', status: 'Register Active', statusColor: 'success', primaryActionLabel: 'Reconcile Till', primaryActionRoute: '/hospital/cashier?tab=reconcile' },
    ],
    'Unsettled Advances': [
      { id: 'ADV-10', name: 'Patient IPD-1088 (Mohammad Tariq)', meta: 'Advance Deposited: ₹50,000', detail: 'Current billed expenditure: ₹38,400 · Surplus: ₹11,600', timeOrWait: 'Active IPD', status: 'Healthy Deposit', statusColor: 'info', primaryActionLabel: 'View Statement', primaryActionRoute: '/hospital/cashier?action=receipt' },
    ],
    'Refund Approvals': [
      { id: 'REF-02', name: 'Overpaid Lab Charge (UHID-7812)', meta: 'Refund Amount: ₹1,200', detail: 'Cancelled Thyroid Profile test · Approved by Admin', timeOrWait: 'Approved', status: 'Ready to Disburse', statusColor: 'success', primaryActionLabel: 'Disburse Refund', primaryActionRoute: '/hospital/cashier?action=settle' },
    ],
  },
  lab_technician: {
    'Accession & Barcode Queue': [
      { id: 'ACC-819', name: 'Aarav Sharma (Blood Sample)', meta: 'Test: Complete Blood Count (CBC) + ESR', detail: 'Barcoded purple EDTA vial · Ward 2 collection', timeOrWait: 'Received 10m ago', status: 'Sample Accepted', statusColor: 'info', primaryActionLabel: 'Load on Analyzer', primaryActionRoute: '/hospital/lab?tab=results' },
      { id: 'ACC-820', name: 'Sunita Devi (Serum Sample)', meta: 'Test: HbA1c + Lipid Profile', detail: 'Barcoded yellow SST tube · Fasting verified', timeOrWait: 'Received 20m ago', status: 'Sample Accepted', statusColor: 'info', primaryActionLabel: 'Load on Analyzer', primaryActionRoute: '/hospital/lab?tab=results' },
    ],
    'Processing Workbench': [
      { id: 'RUN-14', name: 'Sysmex XN-550 Hematology Batch', meta: 'Batch: 8 samples in run', detail: 'QC Passed · Automated differential count in progress', timeOrWait: 'ETA 8 mins', status: 'Analyzer Running', statusColor: 'warn', primaryActionLabel: 'View Analyzer Logs', primaryActionRoute: '/hospital/lab?tab=qc' },
    ],
    'QC Calibration Log': [
      { id: 'QC-01', name: 'Bio-Rad Lyphochek Level 1 & 2', meta: 'Hematology & Biochemistry', detail: 'All standard deviations within +/- 2 SD limits', timeOrWait: '08:00 AM Today', status: 'QC 100% Passed', statusColor: 'success', primaryActionLabel: 'View Levey-Jennings', primaryActionRoute: '/hospital/lab?tab=qc' },
    ],
    'Results Awaiting Review': [
      { id: 'RES-401', name: 'Mohan Lal (Emergency Troponin I)', meta: 'Result: 0.84 ng/mL (High / Panic)', detail: 'Critical alert telephoned to ER Doctor on duty', timeOrWait: 'Panic Flagged', status: 'Critical Value Flagged', statusColor: 'urgent', primaryActionLabel: 'Sign & Release', primaryActionRoute: '/hospital/lab?tab=critical' },
    ],
  },
  radiology_technician: {
    'Modality Worklist Queue': [
      { id: 'RAD-101', name: 'Vikram Malhotra (Chest X-Ray PA)', meta: 'Modality: Digital X-Ray Room 1', detail: 'Rule out pneumonia / consolidation · Patient ready', timeOrWait: 'Waiting 10m', status: 'Patient Ready', statusColor: 'info', primaryActionLabel: 'Acquire Image', primaryActionRoute: '/hospital/radiology?tab=worklist' },
      { id: 'RAD-102', name: 'Emergency Polytrauma (CT Whole Body)', meta: 'Modality: 128-Slice CT Scanner', detail: 'Trauma protocol non-contrast head + chest/abdomen contrast', timeOrWait: 'Urgent Stat', status: 'Urgent Modality Call', statusColor: 'urgent', primaryActionLabel: 'Start CT Protocol', primaryActionRoute: '/hospital/radiology?tab=worklist' },
    ],
    'Contrast Safety Checklists': [
      { id: 'CHK-01', name: 'Emergency Polytrauma Contrast Consent', meta: 'Serum Creatinine: 0.9 mg/dL (Normal)', detail: 'eGFR: >90 · Allergy screening signed by radiologist', timeOrWait: 'Cleared', status: 'Safety Cleared', statusColor: 'success', primaryActionLabel: 'Log Injection', primaryActionRoute: '/hospital/radiology?tab=safety' },
    ],
    'PACS Push Status Log': [
      { id: 'DICOM-88', name: 'Series: Vikram Malhotra Chest X-Ray', meta: 'Images: 2 DICOM frames', detail: 'Pushed to Hospital PACS server · Ready for radiologist reporting', timeOrWait: 'Transferred', status: 'PACS Synced ✅', statusColor: 'success', primaryActionLabel: 'Open in PACS', primaryActionRoute: '/hospital/radiology?tab=pacs' },
    ],
  },
  pharmacist: {
    'OPD Dispensing Queue': [
      { id: 'RX-901', name: 'Aarav Sharma (Prescription)', meta: 'Prescribed by: Dr. Sharma · 3 Items', detail: 'Tab Amoxiclav 625mg (10 tabs) · Paracetamol 650mg (15 tabs) · Cetirizine 10mg (10 tabs)', timeOrWait: '5m waiting', status: 'Awaiting Dispense', statusColor: 'warn', primaryActionLabel: 'Dispense & Scan Barcode', primaryActionRoute: '/hospital/pharmacy?tab=dispense' },
      { id: 'RX-902', name: 'Sunita Devi (Prescription)', meta: 'Prescribed by: Dr. Sharma · 2 Items', detail: 'Tab Metformin 500mg SR (30 tabs) · Tab Glimepiride 1mg (30 tabs)', timeOrWait: '8m waiting', status: 'Awaiting Dispense', statusColor: 'info', primaryActionLabel: 'Dispense & Scan Barcode', primaryActionRoute: '/hospital/pharmacy?tab=dispense' },
    ],
    'IPD Ward Indents': [
      { id: 'IND-401', name: 'Ward 2 Morning Replenishment Indent', meta: 'Requested by: Staff Nurse Ward 2 · 14 SKUs', detail: 'IV Normal Saline 500ml (20 bottles) · Disposable Syringes 5ml (50 pcs) · IV Cannula 20G', timeOrWait: 'Pending Packing', status: 'Pack & Dispatch', statusColor: 'warn', primaryActionLabel: 'Fulfill Indent', primaryActionRoute: '/hospital/pharmacy?tab=indents' },
    ],
    'Controlled Substances Register': [
      { id: 'NAR-01', name: 'Inj Fentanyl 100mcg (Schedule X)', meta: 'OT Requisition · Theatre 2', detail: 'Signed by Consultant Anaesthetist · Stock Balance: 18 ampoules', timeOrWait: 'Verified', status: 'Narcotics Audited', statusColor: 'success', primaryActionLabel: 'View Register', primaryActionRoute: '/hospital/pharmacy?tab=pos' },
    ],
    'Stock Return Requests': [
      { id: 'RET-14', name: 'Ward 1 Unused Medication Return', meta: 'Discharged patient return credit', detail: 'Inj Pantoprazole 40mg (2 vials intact) · Verified unexpired', timeOrWait: 'Ready', status: 'Credit Approved', statusColor: 'success', primaryActionLabel: 'Process Credit', primaryActionRoute: '/hospital/pharmacy?tab=billing' },
    ],
  },
};

export default function WorkQueueTable({ roleKey, workQueues }: WorkQueueTableProps) {
  const navigate = useNavigate();
  const roleData = ROLE_QUEUE_DATA[roleKey] || {};
  const activeQueues = workQueues && workQueues.length > 0 ? workQueues : Object.keys(roleData);
  const [selectedQueue, setSelectedQueue] = useState<string>(activeQueues[0] || 'Waiting OPD Patients');
  const [searchFilter, setSearchFilter] = useState('');

  // Fallback items if role queue data is not customized
  const rawItems: WorkQueueItem[] = roleData[selectedQueue] || [
    {
      id: 'REC-01',
      name: 'Sample Patient Record',
      meta: 'UHID-1001 · Priority Care',
      detail: 'Operational record item synchronized with clinical system.',
      timeOrWait: 'Live Sync',
      status: 'Active',
      statusColor: 'info',
      primaryActionLabel: 'Open Record',
      primaryActionRoute: '/hospital/dashboard',
    },
    {
      id: 'REC-02',
      name: 'Secondary Review Item',
      meta: 'UHID-1002 · Standard SLA',
      detail: 'Pending department verification and clearance.',
      timeOrWait: '10 min wait',
      status: 'In Queue',
      statusColor: 'warn',
      primaryActionLabel: 'Review',
      primaryActionRoute: '/hospital/dashboard',
    },
  ];

  const filteredItems = rawItems.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.detail.toLowerCase().includes(q) ||
      item.meta.toLowerCase().includes(q)
    );
  });

  const handleAction = (item: WorkQueueItem) => {
    if (item.onPrimaryAction) {
      item.onPrimaryAction();
      return;
    }
    if (item.primaryActionRoute) {
      toast.info(`Opening ${item.primaryActionLabel} for ${item.name}...`);
      navigate(item.primaryActionRoute);
    } else {
      toast.success(`${item.primaryActionLabel} completed for ${item.name}`);
    }
  };

  return (
    <section data-testid="role-work-queue-table" className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      {/* Header and Queue Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base flex items-center gap-1.5">
              <span>📋</span> Live Work Queue
            </h2>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {filteredItems.length} Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time departmental patient and operational task roster
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter queue by name, ID..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="text-xs pl-8 pr-3 py-1.5 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-52"
          />
        </div>
      </div>

      {/* Queue Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {activeQueues.map((q) => {
          const isSelected = selectedQueue === q;
          const count = (roleData[q] || []).length;
          return (
            <button
              key={q}
              type="button"
              onClick={() => setSelectedQueue(q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              <span>📋 {q}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Real Queue Data Table */}
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
            <tr>
              <th className="py-2.5 px-3">Token / ID</th>
              <th className="py-2.5 px-3">Patient / Subject</th>
              <th className="py-2.5 px-3">Clinical / Task Detail</th>
              <th className="py-2.5 px-3">Time / Wait</th>
              <th className="py-2.5 px-3">Status / Priority</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                  {item.id}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-foreground">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground">{item.meta}</div>
                </td>
                <td className="py-2.5 px-3 max-w-xs truncate text-muted-foreground">
                  {item.detail}
                </td>
                <td className="py-2.5 px-3 font-medium whitespace-nowrap text-foreground flex items-center gap-1 mt-2 sm:mt-0">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span>{item.timeOrWait}</span>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    item.statusColor === 'urgent'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      : item.statusColor === 'warn'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      : item.statusColor === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                  }`}>
                    {item.statusColor === 'urgent' ? '🔴' : item.statusColor === 'warn' ? '🟡' : '🔵'} {item.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAction(item)}
                      className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <span>{item.primaryActionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info(`Calling patient: ${item.name} (${item.id})`)}
                      title="Audio Call Token"
                      className="p-1 rounded border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <PhoneCall className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  <p className="font-semibold text-xs text-foreground">Queue is clear</p>
                  <p className="text-[11px]">No active items matching your current filters in {selectedQueue}.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
