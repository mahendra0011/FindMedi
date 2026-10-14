import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Stethoscope, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, PhoneCall, Filter, ExternalLink, RefreshCw, Eye,
  X, Check, Edit3, ShieldAlert, Sparkles
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

// Role-specific datasets providing genuine clinical & operational depth across all 6 layers
export const ROLE_QUEUE_DATA: Record<string, Record<string, WorkQueueItem[]>> = {
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
    'Unpaid Invoices Queue': [
      { id: 'BIL-9921', name: 'Suman Lata (OPD Pharmacy & Lab)', meta: 'Amount Due: ₹3,450 · UHID-8812', detail: 'Prescription verified by pharmacy · Awaiting payment clearance at Counter 1', timeOrWait: 'Waiting 4m', status: 'Unpaid Invoice', statusColor: 'warn', primaryActionLabel: 'Collect Cash / POS', primaryActionRoute: '/hospital/cashier?action=settle' },
      { id: 'BIL-9922', name: 'Ravi Teja (IPD Interim Billing)', meta: 'Amount Due: ₹24,800 · IPD-1090', detail: 'Advance deposit replenishment required prior to operative slot confirmation', timeOrWait: 'Waiting 8m', status: 'Deposit Due', statusColor: 'urgent', primaryActionLabel: 'Accept Deposit', primaryActionRoute: '/hospital/cashier?action=receipt' },
      { id: 'BIL-9923', name: 'Deepak Joshi (Discharge Final Bill)', meta: 'Net Payable: ₹4,200 (After Insurance)', detail: 'Co-pay and non-medical items balance on final discharge statement', timeOrWait: 'Discharge Cutoff', status: 'Final Clearance', statusColor: 'warn', primaryActionLabel: 'Settle Final Bill', primaryActionRoute: '/hospital/cashier?action=settle' },
    ],
    'Today Collected Receipts': [
      { id: 'RCT-101', name: 'Harish Chandra (Consultation Fee)', meta: 'Amount: ₹800 · Mode: UPI Dynamic QR', detail: 'Dr. Mehta OPD Visit · Transaction ID: UPI9921849 · Tax Invoice printed', timeOrWait: '10:15 AM', status: 'Payment Reconciled', statusColor: 'success', primaryActionLabel: 'Print Receipt', primaryActionRoute: '/hospital/cashier?action=receipt' },
      { id: 'RCT-102', name: 'Sunita Devi (Pharmacy Counter Bill)', meta: 'Amount: ₹1,420 · Mode: Visa POS Card', detail: 'Card approval: 894102 · Settled to Hospital Merchant Account', timeOrWait: '10:35 AM', status: 'Payment Reconciled', statusColor: 'success', primaryActionLabel: 'Print Receipt', primaryActionRoute: '/hospital/cashier?action=receipt' },
    ],
    'Authorized Refund Vouchers': [
      { id: 'REF-01', name: 'Lab Overcharge Refund (UHID-7812)', meta: 'Refund Value: ₹1,200 · Approved by MS', detail: 'Cancelled duplicated Thyroid Profile investigation · Cash refund authorized', timeOrWait: 'Approved', status: 'Ready to Disburse', statusColor: 'success', primaryActionLabel: 'Disburse Refund', primaryActionRoute: '/hospital/cashier?action=settle' },
    ],
    'Shift Closing Ledger': [
      { id: 'CLS-01', name: 'Morning Shift Counter 1 Till', meta: 'Cashier: S. Sharma · Shift: 08:00 - 14:00', detail: 'Physical Cash: ₹42,300 · UPI: ₹84,200 · Card: ₹58,000 · Total: ₹1,84,500', timeOrWait: 'Cash Balanced', status: 'Ready for Close', statusColor: 'info', primaryActionLabel: 'Close Shift Till', primaryActionRoute: '/hospital/cashier?tab=reconcile' },
    ],
    // Legacy alias support
    'Pending Bill Clearances': [
      { id: 'BIL-9921', name: 'Suman Lata (OPD Pharmacy & Lab)', meta: 'Amount Due: ₹3,450', detail: 'Doctor prescription verified · Counter 3', timeOrWait: 'Waiting 5m', status: 'Unpaid Bill', statusColor: 'warn', primaryActionLabel: 'Collect Cash / POS', primaryActionRoute: '/hospital/cashier?action=settle' },
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

  radiologist: {
    'PACS Unread Queue': [
      { id: 'PACS-01', name: 'Vikram Malhotra (HRCT Chest)', meta: '128-Slice CT Scanner · 340 Slices', detail: 'Rule out pulmonary embolism and ARDS consolidation · Non-contrast protocol', timeOrWait: 'Ordered 15m ago', status: 'Unread Urgent', statusColor: 'urgent', primaryActionLabel: 'Open Web PACS', primaryActionRoute: '/hospital/radiology?tab=pacs' },
      { id: 'PACS-02', name: 'Sunita Devi (MRI Brain with Contrast)', meta: '3T MRI · T1, T2, FLAIR, DWI series', detail: 'Chronic progressive headache · Exclude mass lesion or infarction', timeOrWait: 'Ordered 40m ago', status: 'Awaiting Report', statusColor: 'warn', primaryActionLabel: 'Dictate Report', primaryActionRoute: '/hospital/radiology?tab=reporting' },
      { id: 'PACS-03', name: 'Pooja Nair (X-Ray Lumbar Spine)', meta: 'Digital Radiography (Room 1)', detail: 'Chronic lower back pain · AP and Lateral standing projections', timeOrWait: 'Ordered 1h ago', status: 'Routine Queue', statusColor: 'info', primaryActionLabel: 'Sign & Release', primaryActionRoute: '/hospital/radiology?tab=signoff' },
    ],
    'Stat / Urgent Studies': [
      { id: 'URG-RAD-01', name: 'Emergency Trauma Patient #1', meta: 'Casualty Trauma Protocol NCCT Head', detail: 'Acute left subdural hematoma 7mm with 4mm midline shift · Neuro alert required', timeOrWait: 'Critical Stat', status: 'Critical Finding Flagged', statusColor: 'urgent', primaryActionLabel: 'Telephone Alert ER', primaryActionRoute: '/hospital/radiology?tab=critical' },
    ],
    'Voice Dictation Queue': [
      { id: 'DICT-01', name: 'Ultrasound Whole Abdomen Batch', meta: '5 Completed Sonography Studies', detail: 'Cholelithiasis and renal calculi cases awaiting speech-to-text report compilation', timeOrWait: '5 in Queue', status: 'Voice Draft Ready', statusColor: 'info', primaryActionLabel: 'Open Dictation', primaryActionRoute: '/hospital/radiology?tab=reporting' },
    ],
    'Finalized Reports': [
      { id: 'FIN-01', name: 'Today Signed Diagnostic Archive', meta: '64 Studies Validated Today', detail: 'All reports electronically signed with digital certificate and delivered to EMR', timeOrWait: '64 Delivered', status: 'EMR Synced ✅', statusColor: 'success', primaryActionLabel: 'View Archive', primaryActionRoute: '/hospital/radiology?tab=pacs' },
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

  icu_doctor: {
    'ICU Bed Board': [
      { id: 'BED-ICU-01', name: 'Vikram Malhotra', meta: '52y · Male · Dr. Mehta', detail: 'Severe Sepsis / ARDS on Mechanical Ventilation (FiO2 60%, PEEP 10) · Vitals: MAP 70', timeOrWait: 'Hourly Check Due', status: 'Critical Vigilance', statusColor: 'urgent', primaryActionLabel: 'Adjust Vent Settings', primaryActionRoute: '/ipd?ward=icu' },
      { id: 'BED-ICU-03', name: 'Shanti Devi', meta: '68y · Female · Dr. Rao', detail: 'ACS s/p CPR · Noradrenaline infusion 0.1 mcg/kg/min · CVP 12', timeOrWait: 'Titration Due', status: 'Hemodynamically Guarded', statusColor: 'urgent', primaryActionLabel: 'Review Infusion', primaryActionRoute: '/hospital/nursing?tab=mar' },
      { id: 'BED-ICU-04', name: 'Mohan Lal', meta: '46y · Male · Dr. Kapoor', detail: 'Acute Pancreatitis · Day 3 ICU · Urine output >0.6 ml/kg/h · Stable', timeOrWait: 'Afebrile 24h', status: 'Step-Down Candidate', statusColor: 'info', primaryActionLabel: 'Plan Step-Down', primaryActionRoute: '/hospital/beds?ward=stepdown' },
    ],
    'Ventilator Weaning Queue': [
      { id: 'BED-ICU-02', name: 'Anita Roy', meta: '58y · Female · Post-CABG', detail: 'Post-op CABG Day 2 · T-piece trial 45 mins · RSBI 62 · PaO2/FiO2 >280', timeOrWait: 'Trial 45m', status: 'Ready for Extubation', statusColor: 'warn', primaryActionLabel: 'Extubation Order', primaryActionRoute: '/ipd?tab=notes' },
    ],
    'ABG / Metabolic Panels': [
      { id: 'ABG-101', name: 'Vikram Malhotra', meta: 'Sample: Radial Arterial Line', detail: 'pH 7.29 · PaCO2 50 · PaO2 82 · HCO3 22 · Lactate 2.4 mmol/L', timeOrWait: 'Reported 12m ago', status: 'Compensated Acidosis', statusColor: 'urgent', primaryActionLabel: 'Order ABG Repeat', primaryActionRoute: '/hospital/lab' },
    ],
    'Family Counselling Notes': [
      { id: 'CNS-01', name: 'Shanti Devi Family Attendant', meta: 'Spouse & Son present', detail: 'Prognosis briefing & DNR discussion scheduled for 12:30 PM in Conference Room A', timeOrWait: 'Scheduled 12:30 PM', status: 'Counselling Scheduled', statusColor: 'info', primaryActionLabel: 'Record Family Note', primaryActionRoute: '/ipd?tab=notes' },
    ],
  },

  icu_nurse: {
    'Hourly Monitoring Log': [
      { id: 'BED-ICU-01', name: 'Vikram Malhotra', meta: 'Bed 1 · GCS E2VTM3', detail: 'Hourly vitals check due: BP, HR, SpO2, EtCO2, CVP and pupil reactivity', timeOrWait: 'Overdue 5m', status: 'Hourly Vitals Due', statusColor: 'urgent', primaryActionLabel: 'Log ICU Vitals', primaryActionRoute: '/hospital/nursing?tab=vitals' },
      { id: 'BED-ICU-02', name: 'Anita Roy', meta: 'Bed 2 · Post-CABG', detail: 'Arterial line waveform damped · Zero calibration and flush test required', timeOrWait: 'Action Needed', status: 'Waveform Check', statusColor: 'warn', primaryActionLabel: 'Flush Line & Zero', primaryActionRoute: '/hospital/nursing?tab=vitals' },
    ],
    'Continuous Infusions Tracker': [
      { id: 'INF-01', name: 'Noradrenaline (4mg/50ml)', meta: 'Patient: Shanti Devi · Bed 3', detail: 'Current rate: 6 ml/hr · Syringe volume: 10 ml remaining (approx 45 min run)', timeOrWait: '10ml Left', status: 'Syringe Reload Due', statusColor: 'urgent', primaryActionLabel: 'Chart Syringe Change', primaryActionRoute: '/hospital/nursing?tab=mar' },
      { id: 'INF-02', name: 'Inj Fentanyl (1000mcg/50ml)', meta: 'Patient: Vikram Malhotra · Bed 1', detail: 'Current rate: 2.5 ml/hr · Target RASS score: -2 to -3 · Syringe volume: 32 ml', timeOrWait: 'Running', status: 'Infusion Active', statusColor: 'info', primaryActionLabel: 'Titrate Sedation', primaryActionRoute: '/hospital/nursing?tab=mar' },
    ],
    'Line / Tube Site Care': [
      { id: 'LIN-01', name: 'Right Internal Jugular CVC', meta: 'Patient: Mohan Lal · Bed 4', detail: 'Triple lumen catheter inserted 4 days ago · Transparent dressing clean and dry', timeOrWait: 'Dressing Day 4', status: 'Site Inspected', statusColor: 'success', primaryActionLabel: 'Document Site Care', primaryActionRoute: '/hospital/nursing?tab=notes' },
    ],
    'Shift Handover': [
      { id: 'HND-ICU', name: 'Morning to Afternoon SBAR', meta: 'ICU Pod A (Beds 1-4)', detail: 'Comprehensive ventilator settings, vasoactive doses, and fluid balance prepared', timeOrWait: 'Signoff Ready', status: 'Handover Drafted', statusColor: 'info', primaryActionLabel: 'Submit Handover', primaryActionRoute: '/hospital/nursing?tab=notes' },
    ],
  },

  ot_coordinator: {
    'Daily OT Board': [
      { id: 'OT-1', name: 'Rajesh Verma · Lap Cholecystectomy', meta: 'Surgeon: Dr. Mehta · Anaesth: Dr. Kapoor', detail: 'Theatre 1 · GA · Laparoscopic tower active · Estimated duration: 90 mins', timeOrWait: 'In Theatre 1', status: 'Surgery In Progress', statusColor: 'urgent', primaryActionLabel: 'Live OT Board', primaryActionRoute: '/ot?tab=rooms' },
      { id: 'OT-2', name: 'Priya Nair · Emergency Appendectomy', meta: 'Surgeon: Dr. Sen · Anaesth: Dr. Roy', detail: 'Theatre 2 · Emergency add-on case · NPO verified 8h · Patient prepped', timeOrWait: 'Call Patient', status: 'Wheel-in Pending', statusColor: 'warn', primaryActionLabel: 'Call Patient to OT', primaryActionRoute: '/ot?action=schedule' },
      { id: 'OT-3', name: 'Kavita Reddy · Total Knee Replacement', meta: 'Surgeon: Dr. Rao · Anaesth: Dr. Kapoor', detail: 'Theatre 3 · Scheduled 01:30 PM · Implant set and sterile power drill verified', timeOrWait: '01:30 PM Slot', status: 'Scheduled Today', statusColor: 'info', primaryActionLabel: 'Verify Sterility Packs', primaryActionRoute: '/cssd' },
    ],
    'Pre-Op Checklist Clearance': [
      { id: 'CHK-01', name: 'Priya Nair (Appendectomy)', meta: 'WHO Checklist Sign-In Phase', detail: 'Patient ID verified · Surgical site marked · Pulse oximeter on and functioning', timeOrWait: 'Cleared', status: 'Pre-Op Cleared', statusColor: 'success', primaryActionLabel: 'Verify Checklist', primaryActionRoute: '/ot?tab=checklist' },
    ],
    'Intra-Op Tracking': [
      { id: 'TRK-01', name: 'Theatre 1: Lap Chole', meta: 'Pneumoperitoneum achieved 10:20 AM', detail: 'Gallbladder dissected · Hemostasis secured · Specimen retrieval in progress', timeOrWait: 'Elapsed: 48m', status: 'Case Near Finish', statusColor: 'info', primaryActionLabel: 'Record Milestone', primaryActionRoute: '/ot?tab=rooms' },
    ],
    'PACU Recovery Queue': [
      { id: 'PACU-01', name: 'Suman Lata (Hernioplasty)', meta: 'Extubated 20 mins ago · Bed PACU-2', detail: 'Aldrete score: 9/10 · Respiration regular · Vitals stable · Pain score: 2/10', timeOrWait: '20 min in PACU', status: 'Ready for Ward', statusColor: 'success', primaryActionLabel: 'Transfer to Ward', primaryActionRoute: '/hospital/beds?action=allocate' },
    ],
  },

  surgeon: {
    'My Surgery Schedule': [
      { id: 'SURG-01', name: 'Rajesh Verma (Lap Chole)', meta: 'OT 1 · Morning Slot 10:00 AM', detail: 'Laparoscopic Cholecystectomy for symptomatic cholelithiasis · In theatre', timeOrWait: 'Underway', status: 'In Theatre', statusColor: 'urgent', primaryActionLabel: 'Operative Findings', primaryActionRoute: '/ot?tab=operative-note' },
      { id: 'SURG-02', name: 'Harish Rawat (Inguinal Hernia)', meta: 'OT 1 · Case 2 (Est 12:30 PM)', detail: 'Right Inguinal Lichtenstein Mesh Repair · Elective admission Bed 206', timeOrWait: 'Case 2', status: 'Prepped & Waiting', statusColor: 'info', primaryActionLabel: 'Review Pre-Op PAC', primaryActionRoute: '/ot?tab=pac' },
    ],
    'Pre-Operative Assessment Queue': [
      { id: 'PRE-01', name: 'Harish Rawat (Hernia Repair)', meta: 'PAC Grade II · Coagulation Normal', detail: 'Informed written consent signed · 2D Echocardiogram normal EF 60%', timeOrWait: 'Cleared', status: 'Ready for Surgery', statusColor: 'success', primaryActionLabel: 'Sign Surgical Consent', primaryActionRoute: '/ot?tab=consent' },
    ],
    'Operative Notes Pending': [
      { id: 'OPNOTE-01', name: 'Deepak Joshi (Perforated Appendix)', meta: 'Emergency Laparotomy · Case Yesterday', detail: 'Post-op note pending final histology specimen documentation and drain details', timeOrWait: 'Action Needed', status: 'Draft Note Pending', statusColor: 'warn', primaryActionLabel: 'Complete Op Note', primaryActionRoute: '/ot?tab=operative-note' },
    ],
    'Post-Op Rounds': [
      { id: 'RND-01', name: 'Kavita Reddy (Ward 2 · Bed 201)', meta: 'Post-op Day 1 Lap Chole', detail: 'Afebrile · Tolerating liquids · Surgical site clean · Voided spontaneously', timeOrWait: 'Rounds Due', status: 'Stable Recovery', statusColor: 'success', primaryActionLabel: 'Post-Op Orders', primaryActionRoute: '/ipd?tab=orders' },
    ],
  },

  anaesthetist: {
    'Pre-Anaesthesia Checkup Queue': [
      { id: 'PAC-101', name: 'Harish Rawat (Inguinal Hernia)', meta: '54y · Male · Mallampati Class II', detail: 'No history of drug allergy · BP 130/80 · Normal airway and cervical spine flexion', timeOrWait: 'PAC Done', status: 'PAC Cleared (ASA II)', statusColor: 'success', primaryActionLabel: 'PAC Clearance', primaryActionRoute: '/ot?tab=pac' },
      { id: 'PAC-102', name: 'Geeta Kumari (Cholelithiasis)', meta: '48y · Female · Mallampati Class III', detail: 'Short neck, BMI 34 · High-risk difficult airway · Video laryngoscope advised', timeOrWait: 'Special Attention', status: 'Difficult Airway Flagged', statusColor: 'urgent', primaryActionLabel: 'Difficult Airway Alert', primaryActionRoute: '/ot?tab=alerts' },
    ],
    'Intra-Op Monitoring Log': [
      { id: 'ANEST-01', name: 'Rajesh Verma (Theatre 1)', meta: 'General Anaesthesia with ETT 8.0', detail: 'Sevoflurane + Fentanyl + Atracurium · EtCO2: 36 mmHg · SpO2: 99% · MAP: 82', timeOrWait: 'Active Monitoring', status: 'Anaesthesia Stable', statusColor: 'info', primaryActionLabel: 'Intra-Op Chart', primaryActionRoute: '/ot?tab=intraop' },
    ],
    'PACU Recovery List': [
      { id: 'PACU-02', name: 'Deepak Joshi (Appendectomy)', meta: 'Extubated 30 mins ago · Aldrete 9/10', detail: 'SpO2 98% on room air · Normotensive · Mild shivering resolved with warming', timeOrWait: '30 min in PACU', status: 'Cleared for Ward', statusColor: 'success', primaryActionLabel: 'Authorize Transfer', primaryActionRoute: '/ot?tab=pacu' },
    ],
  },

  discharge_coordinator: {
    'Multi-Stage Discharge Clearance Board': [
      { id: 'DIS-01', name: 'Kavita Reddy (Bed 201)', meta: 'Post-op Lap Chole · Consultant: Dr. Mehta', detail: 'Medical summary signed ✅ · Nursing chart complete ✅ · Awaiting billing clearance', timeOrWait: 'Billing Pending', status: 'Bill Settle Due', statusColor: 'warn', primaryActionLabel: 'Expedite Billing', primaryActionRoute: '/hospital/cashier' },
      { id: 'DIS-02', name: 'Mohammad Tariq (Bed 204)', meta: 'COPD Exacerbation · Consultant: Dr. Rao', detail: 'TPA Final Approval: Received ₹45,000 ✅ · Pharmacy discharge medicines packing', timeOrWait: 'Pharmacy 10m', status: 'Medication Packing', statusColor: 'info', primaryActionLabel: 'Alert Pharmacy', primaryActionRoute: '/hospital/pharmacy?tab=dispense' },
    ],
    'Pending Pharmacy Returns': [
      { id: 'RET-01', name: 'Bed 201 Unused IV Paracetamol (3 vials)', meta: 'Ward 2 Nursing Return', detail: 'Unbroken seal verified by ward nurse · Return credit slip prepared', timeOrWait: 'Ready', status: 'Credit Approved', statusColor: 'success', primaryActionLabel: 'Confirm Credit', primaryActionRoute: '/hospital/pharmacy?tab=billing' },
    ],
    'Awaiting TPA Final Approval': [
      { id: 'TPA-01', name: 'Star Health Claim #9012 (UHID-7812)', meta: 'Claim Amount: ₹82,000', detail: 'Queries answered regarding ICU stay justification · Awaiting final approval letter', timeOrWait: 'Query Answered', status: 'Awaiting Auth', statusColor: 'warn', primaryActionLabel: 'Check TPA Portal', primaryActionRoute: '/insurance/desk' },
    ],
    'Ready for Exit': [
      { id: 'EXIT-01', name: 'Sunita Devi (Discharge Summary Handed)', meta: 'Bed 308 (Deluxe Ward)', detail: 'Gate pass generated · Discharge summary printed · Follow-up appointment booked', timeOrWait: 'Exit Gate Ready', status: 'Gate Pass Signed', statusColor: 'success', primaryActionLabel: 'Release Bed', primaryActionRoute: '/hospital/beds?action=release' },
    ],
  },

  housekeeping_supervisor: {
    'Bed Cleaning Queue': [
      { id: 'CLN-01', name: 'Ward 2 · Bed 204', meta: 'Vacated at 10:15 AM by Discharge', detail: 'Terminal cleaning required · Biohazard linen strip and hospital-grade sanitization', timeOrWait: 'Turnaround: 25m', status: 'Cleaning In-Progress', statusColor: 'warn', primaryActionLabel: 'Dispatch Attendant', primaryActionRoute: '/housekeeping?tab=tasks' },
      { id: 'CLN-02', name: 'Ward 1 · Bed 108', meta: 'Turnaround SLA: 45 min threshold', detail: 'Emergency casualty has critical admission waiting for this bed', timeOrWait: 'Overdue 12m', status: 'SLA Breach Risk', statusColor: 'urgent', primaryActionLabel: 'Escalate Cleaning', primaryActionRoute: '/housekeeping?tab=tasks' },
    ],
    'Routine Ward Cleaning Tasks': [
      { id: 'ROUT-01', name: 'Intensive Care Unit (Pod A & B)', meta: 'Daily Floor Scrubbing Shift 2', detail: 'Epoxy floor disinfection with 1% Sodium Hypochlorite completed', timeOrWait: 'Signed off', status: 'Floor Disinfected', statusColor: 'success', primaryActionLabel: 'Sign Inspection', primaryActionRoute: '/housekeeping?tab=tasks' },
    ],
    'Terminal Infection Disinfection Log': [
      { id: 'DIS-01', name: 'Isolation Room 4 (Post-MRSA)', meta: 'Airborne/Contact Precautions', detail: 'Hydrogen peroxide vapor dry fogging in progress · Aeration time 45 mins', timeOrWait: 'Aeration 45m', status: 'Fogging Active', statusColor: 'urgent', primaryActionLabel: 'Issue Clearance', primaryActionRoute: '/housekeeping?tab=biohazard' },
    ],
    'Staff Deployment Board': [
      { id: 'STF-01', name: 'Shift B Housekeeping Team (28 Staff)', meta: 'Deployment across OT, ICU, Wards & OPD', detail: 'All 28 attendants checked in on biometric attendance · Equipment trolley assigned', timeOrWait: 'Full Roster', status: '100% Present', statusColor: 'success', primaryActionLabel: 'View Deployment', primaryActionRoute: '/housekeeping?tab=tasks' },
    ],
  },

  biomedical_engineer: {
    'Active Breakdown Work Orders': [
      { id: 'WO-101', name: 'Dialysis Machine #3 (Hemodialysis Unit)', meta: 'Asset ID: HD-003 · Fresenius 4008S', detail: 'Blood leak sensor alarm triggered · Pressure transducer replacement needed', timeOrWait: 'Logged 30m ago', status: 'Engineer On-Site', statusColor: 'urgent', primaryActionLabel: 'Repair & Test', primaryActionRoute: '/biomedical?action=breakdown' },
      { id: 'WO-102', name: 'Defibrillator Zoll R-Series (Emergency Casualty)', meta: 'Asset ID: DEF-002 · Casualty Bay 1', detail: 'Self-test failure: battery impedance high · Replacement battery dispatched from store', timeOrWait: 'Logged 1h ago', status: 'Parts Dispatched', statusColor: 'warn', primaryActionLabel: 'Replace Battery', primaryActionRoute: '/biomedical?action=breakdown' },
    ],
    'Calibration Schedule Calendar': [
      { id: 'CAL-01', name: 'Anesthesia Workstation Draeger Fabius (OT 2)', meta: 'Vaporizer Isoflurane / Sevoflurane', detail: 'Annual ISO 80601-2-13 calibration verification completed · Certificate affixed', timeOrWait: 'Valid 1 Year', status: 'Calibrated ✅', statusColor: 'success', primaryActionLabel: 'Update Certificate', primaryActionRoute: '/biomedical?action=calibrate' },
    ],
    'AMC/CMC Warranty Tracking': [
      { id: 'AMC-01', name: 'Siemens Somatom 128 CT Scanner', meta: 'Vendor: Siemens Healthineers · Comprehensive AMC', detail: 'X-ray tube hour count: 420k scans · Next preventive service due in 14 days', timeOrWait: 'Due in 14d', status: 'AMC Active', statusColor: 'info', primaryActionLabel: 'Schedule Service', primaryActionRoute: '/biomedical?action=pm' },
    ],
  },

  cssd_technician: {
    'Soiled Receiving Queue': [
      { id: 'SOIL-01', name: 'General Laparotomy Set #2 (OT 1)', meta: 'Returned post-op at 11:00 AM', detail: 'Gross decontamination & ultrasonic bath washing complete · Ready for packaging', timeOrWait: 'Washed 10m ago', status: 'Packing Workbench', statusColor: 'info', primaryActionLabel: 'Pack & Label Tray', primaryActionRoute: '/cssd?action=receive' },
    ],
    'Active Autoclave Cycles': [
      { id: 'AUTO-03', name: 'Tuttnauer Horizontal Steam Autoclave #2', meta: 'Cycle 3: Porous Load 134°C · 30 PSI', detail: 'Sterilization phase: 8/15 mins elapsed · Temperature: 134.4°C · Vacuum verified', timeOrWait: 'ETA 18 mins', status: 'Cycle Running', statusColor: 'warn', primaryActionLabel: 'Monitor Autoclave', primaryActionRoute: '/cssd?action=autoclave' },
    ],
    'Sterile Storage Inventory': [
      { id: 'STG-01', name: 'Orthopaedic Total Knee Instrumentation Sets', meta: '3 Double-Wrapped Sets in Sterile Storage', detail: 'Class 5 chemical integrator verified · Expiry date: 30 days · Barcode scanned', timeOrWait: 'Stocked', status: 'Sterile & Ready', statusColor: 'success', primaryActionLabel: 'Audit Storage', primaryActionRoute: '/cssd?action=dispatch' },
    ],
    'OT Dispatch Log': [
      { id: 'DISP-01', name: 'Neurosurgery Craniotomy Set #1', meta: 'Dispatched to OT 3 for Case 2', detail: 'Tray integrity verified by circulating nurse · Handover receipt recorded', timeOrWait: 'Dispatched', status: 'Transferred to OT', statusColor: 'success', primaryActionLabel: 'View Dispatch Note', primaryActionRoute: '/cssd?action=dispatch' },
    ],
  },

  ambulance: {
    'Active Dispatches': [
      { id: 'AMB-01', name: 'Ambulance DL-1Y-4921 (Advanced Cardiac ICU)', meta: 'Driver: Rajesh Singh · EMT: Anil Kumar', detail: 'Dispatched to Sector 14 for suspected Acute Myocardial Infarction · En route', timeOrWait: 'ETA 6 mins', status: 'Emergency En Route', statusColor: 'urgent', primaryActionLabel: 'Live GPS Tracking', primaryActionRoute: '/ambulanceTrips' },
    ],
    'Pending Pickup Requests': [
      { id: 'REQ-01', name: 'Inter-Hospital Transfer: HDU Patient', meta: 'Origin: City Clinic · Destination: FindMedi ICU', detail: 'Patient on non-invasive BIPAP · Doctor escort required · Vehicle prepped', timeOrWait: 'Waiting 12m', status: 'Pickup Scheduled', statusColor: 'warn', primaryActionLabel: 'Assign Ambulance', primaryActionRoute: '/ambulanceTrips' },
    ],
    'Vehicle Maintenance & Fuel Log': [
      { id: 'FLT-02', name: 'Ambulance DL-1Y-8802 (Basic Life Support)', meta: 'O2 Cylinders: 2 Full (150 bar) · Fuel: 90%', detail: 'Daily resuscitation kit checklist signed off by EMT supervisor', timeOrWait: 'Inspected', status: 'Ready on Standby', statusColor: 'success', primaryActionLabel: 'Log Checklist', primaryActionRoute: '/ambulanceTrips' },
    ],
    'Completed Trip Logs': [
      { id: 'TRP-19', name: 'Stroke Golden Hour Fast-Track Transfer', meta: 'Patient: Ram Swaroop · 64y Male', detail: 'Door-to-CT time: 24 mins · Transferred safely to Emergency Casualty Resus Bay', timeOrWait: 'Completed', status: 'Trip Billed', statusColor: 'success', primaryActionLabel: 'View Trip Bill', primaryActionRoute: '/ambulanceTrips' },
    ],
  },

  quality_officer: {
    'Patient Safety Incident Reports': [
      { id: 'INC-88', name: 'Near-Miss Medication Dispensing (Ward 3)', meta: 'Reported by Staff Nurse · Shift A', detail: 'Sound-alike look-alike (LASA) medicine flagged prior to patient administration', timeOrWait: 'Reported Today', status: 'Under Investigation', statusColor: 'urgent', primaryActionLabel: 'Open Incident File', primaryActionRoute: '/hospital/quality' },
    ],
    'Root Cause Analyses (RCA)': [
      { id: 'RCA-04', name: 'Post-Operative Inpatient Bed Fall Incident', meta: 'Location: Male Surgical Ward 2', detail: 'Fishbone diagram and 5-Why analysis drafted · Action items identified', timeOrWait: 'Draft Ready', status: 'Committee Review', statusColor: 'warn', primaryActionLabel: 'Review RCA Findings', primaryActionRoute: '/hospital/quality' },
    ],
    'CAPA Action Item Tracker': [
      { id: 'CAPA-12', name: 'High-Alert Drug Double-Check Protocol', meta: 'Assigned to: Chief Nursing Officer & Pharmacy', detail: 'Barcode verification step enforced in nursing app before IV syringe driver start', timeOrWait: '90% Implemented', status: 'Action Active', statusColor: 'info', primaryActionLabel: 'Verify Compliance', primaryActionRoute: '/hospital/quality' },
    ],
    'Accreditation Evidence Files': [
      { id: 'NABH-05', name: 'NABH 5th Edition Chapter COP & MOM Audit', meta: 'Care of Patients & Medication Management', detail: 'All 24 objective elements audited · Compliance score 96.4% · Evidence uploaded', timeOrWait: 'Audit Passed', status: 'Accreditation Ready', statusColor: 'success', primaryActionLabel: 'Export Evidence Dossier', primaryActionRoute: '/hospital/quality' },
    ],
  },

  infection_control_nurse: {
    'HAI Surveillance Registry': [
      { id: 'HAI-01', name: 'ICU Central Line Associated (CLABSI) Cohort', meta: '18 Active Central Venous Catheter Patients', detail: 'Daily line necessity check documented · Zero CLABSI events past 48 days', timeOrWait: 'Day 48 Streak', status: 'Zero Infection', statusColor: 'success', primaryActionLabel: 'Review Line Bundle', primaryActionRoute: '/hospital/quality' },
      { id: 'HAI-02', name: 'Catheter-Associated UTI (CAUTI) Rounds', meta: 'Ward 2 & Ward 3 Foley Catheters', detail: '1 catheter flagged for early removal in consultation with primary team', timeOrWait: 'Rounds Complete', status: 'Removal Urged', statusColor: 'warn', primaryActionLabel: 'Escalate Removal', primaryActionRoute: '/hospital/quality' },
    ],
    'Isolation Room Active Cohort': [
      { id: 'ISO-01', name: 'Room 4: Multidrug-Resistant Klebsiella', meta: 'Contact Precautions Enforced', detail: 'Dedicated PPE station outside room · Biohazard waste bagged in yellow container', timeOrWait: 'Active Isolation', status: 'Contact Protocol', statusColor: 'urgent', primaryActionLabel: 'Audit PPE Protocol', primaryActionRoute: '/hospital/quality' },
    ],
    'Hand Hygiene Observation Log': [
      { id: 'HYG-01', name: 'WHO 5 Moments Observational Audit', meta: 'Emergency Casualty & Operation Theatres', detail: '120 hand hygiene opportunities observed · Overall compliance: 93.8%', timeOrWait: 'Audit Complete', status: 'Target Met (93.8%)', statusColor: 'success', primaryActionLabel: 'Log Audit Score', primaryActionRoute: '/hospital/quality' },
    ],
    'Biomedical Waste Manifests': [
      { id: 'BMW-01', name: 'Daily Color-Coded Waste Handover (142 kg)', meta: 'Authorized Vendor: CleanCare Eco Services', detail: 'Yellow bags: 68kg · Red: 42kg · Blue: 24kg · White sharps: 8kg · Barcode verified', timeOrWait: 'Handed Over', status: 'Manifest Signed', statusColor: 'success', primaryActionLabel: 'View BMW Receipt', primaryActionRoute: '/hospital/quality' },
    ],
  },

  security: {
    'Visitor Check-In / Out Log': [
      { id: 'VIS-101', name: 'Ramesh Patel (Visitor for Bed 201)', meta: 'UHID: UHID-1092 · Attendant Card Issued', detail: 'Visiting hours pass generated · Photo captured · Barcoded pass printed', timeOrWait: 'Pass Active', status: 'Visitor Inside', statusColor: 'info', primaryActionLabel: 'Scan Exit', primaryActionRoute: '/hospital/frontdesk' },
    ],
    'Active Attendant Passes': [
      { id: 'ATT-01', name: 'ICU Sole Attendant Pass: Vikram Malhotra', meta: 'Holder: Anjali Malhotra (Spouse)', detail: 'Single attendant pass authorized for critical care pod access', timeOrWait: 'Verified', status: 'Pass Valid', statusColor: 'success', primaryActionLabel: 'Verify Attendant', primaryActionRoute: '/hospital/frontdesk' },
    ],
    'Security Incident Reports': [
      { id: 'SEC-01', name: 'Perimeter Gate 2 Traffic Obstruction', meta: 'Ambulance Bay Ingress Route', detail: 'Unauthorized vehicle parked in ambulance bay removed within 4 minutes', timeOrWait: 'Resolved', status: 'Incident Closed', statusColor: 'success', primaryActionLabel: 'View Incident', primaryActionRoute: '/admin/settings' },
    ],
    'Parking Slot Status': [
      { id: 'PRK-01', name: 'Main Hospital Parking Bays (Basement 1 & 2)', meta: 'Total: 180 slots · Occupied: 138 · Free: 42', detail: 'Doctor reserved parking: 8 slots available · Valet desk operational', timeOrWait: '42 Free Bays', status: 'Parking Managed', statusColor: 'info', primaryActionLabel: 'Parking Roster', primaryActionRoute: '/admin/settings' },
    ],
  },

  mortuary_attendant: {
    'Mortuary Chamber Status Board': [
      { id: 'CHM-01', name: 'Cold Chamber Unit 1 (Temp: 3.2°C)', meta: 'Case: MLC Ref #882 · Male 35y', detail: 'Forensic post-mortem examination scheduled for 02:00 PM by Civil Surgeon team', timeOrWait: 'Chamber 1', status: 'MLC Case Custody', statusColor: 'warn', primaryActionLabel: 'Verify Documents', primaryActionRoute: '/mortuary' },
      { id: 'CHM-02', name: 'Cold Chamber Unit 2 (Temp: 3.4°C)', meta: 'Non-MLC Natural Expiry · Female 72y', detail: 'Death certificate generated · Relative identification and NOC verified', timeOrWait: 'Chamber 2', status: 'Ready for Release', statusColor: 'info', primaryActionLabel: 'Release Body', primaryActionRoute: '/mortuary' },
    ],
    'Deceased Intake Log': [
      { id: 'INT-01', name: 'Emergency Casualty Transfer (Ex-Bed ER-01)', meta: 'Time of Death: 09:15 AM Today', detail: 'Valuables logged and sealed in safe bag #VB-09 · Tagged on left wrist and ankle', timeOrWait: 'Logged Today', status: 'Intake Completed', statusColor: 'success', primaryActionLabel: 'View Intake Form', primaryActionRoute: '/mortuary' },
    ],
    'Pending Body Release Handover': [
      { id: 'REL-01', name: 'Handover to Authorized Kin: Shanti Lal', meta: 'Relative: Son (Aadhaar Verified)', detail: 'Form 4A death certificate signed by Consultant · Mortuary gate pass printed', timeOrWait: 'Kin Arrived', status: 'Ready for Handover', statusColor: 'success', primaryActionLabel: 'Complete Handover', primaryActionRoute: '/mortuary' },
    ],
    'MLC Police Clearances': [
      { id: 'POL-01', name: 'Civil Lines Police Station Inquest Paperwork', meta: 'IO: Sub-Inspector R. Sharma', detail: 'Panchnama documentation complete · Post-mortem requisition received', timeOrWait: 'Cleared', status: 'Police NOC Verified', statusColor: 'success', primaryActionLabel: 'Attach Inquest Form', primaryActionRoute: '/mortuary' },
    ],
  },

  it_admin: {
    'Internal IT Helpdesk Tickets': [
      { id: 'TKT-101', name: 'OPD Counter 2 Thermal Slip Printer Offline', meta: 'Location: Front Desk Lobby', detail: 'USB interface disconnected · Driver restarted remotely · Printer test page sent', timeOrWait: 'Open 15m', status: 'Technician Assigned', statusColor: 'warn', primaryActionLabel: 'Test Printer', primaryActionRoute: '/admin/settings' },
      { id: 'TKT-102', name: 'Radiology PACS Workstation Monitor Calibration', meta: 'Radiologist Reporting Room 1', detail: 'DICOM Part 14 Grayscale Standard Display Function (GSDF) calibration check', timeOrWait: 'Scheduled', status: 'Scheduled Today', statusColor: 'info', primaryActionLabel: 'Calibrate Display', primaryActionRoute: '/admin/settings' },
    ],
    'HL7 / LIS Integration Bridges': [
      { id: 'HL7-01', name: 'Mirth Connect HL7 LIS Feed (Sysmex Analyzer)', meta: 'Port 6661 · ACK Rate: 100%', detail: '2,400 lab result messages processed today · 0 dropped frames · Queue clear', timeOrWait: 'Uptime 99.9%', status: 'HL7 Bridge Online ✅', statusColor: 'success', primaryActionLabel: 'Restart Gateway', primaryActionRoute: '/admin/settings' },
    ],
    'Active Device Connections': [
      { id: 'DEV-01', name: '184 Medical IoT Devices Connected to Hospital LAN', meta: 'VLAN 40 (Biomedical Network)', detail: 'ICU monitors, infusion pumps, CT/MRI scanners isolated behind enterprise firewall', timeOrWait: 'All Online', status: 'Network Secure', statusColor: 'success', primaryActionLabel: 'Device Inventory', primaryActionRoute: '/admin/settings' },
    ],
    'System Audit Trail': [
      { id: 'AUD-01', name: 'Role-Based Access Control (RBAC) Audit Log', meta: 'Compliance: ISO 27001 & HIPAA', detail: 'Zero unauthorized privilege escalation attempts recorded in last 30 days', timeOrWait: 'Audited Today', status: 'Security Normal', statusColor: 'success', primaryActionLabel: 'Export Audit Log', primaryActionRoute: '/admin/settings' },
    ],
  },

  mis_reporting: {
    'Scheduled MIS Reports': [
      { id: 'MIS-01', name: 'Daily Hospital Operational Census Summary', meta: 'Automated 06:00 AM Distribution', detail: 'OPD footfall (386), IPD admissions (142), Bed occupancy (78%), OT cases (8)', timeOrWait: 'Delivered', status: 'Generated & Sent', statusColor: 'success', primaryActionLabel: 'Download PDF', primaryActionRoute: '/reports' },
      { id: 'MIS-02', name: 'Monthly Revenue Cycle & Collection Breakdown', meta: 'Target: Executive Board & CFO', detail: 'Gross collections, outstanding TPA receivables, discount variances and till cash', timeOrWait: 'Draft Ready', status: 'P&L Ready', statusColor: 'info', primaryActionLabel: 'Review Report', primaryActionRoute: '/reports' },
    ],
    'Doctor Productivity Analytics': [
      { id: 'PROD-01', name: 'Department-Wise Consultation & Surgery Metrics', meta: 'Cardiology, Ortho, Surgery & Medicine', detail: 'Average consultation time: 14 mins · Conversion to admission ratio: 8.2%', timeOrWait: 'Updated Today', status: 'Analytics Active', statusColor: 'info', primaryActionLabel: 'View Trends', primaryActionRoute: '/reports' },
    ],
    'Department Financial Comparison': [
      { id: 'FIN-01', name: 'Pharmacy vs Diagnostics vs Inpatient Revenue', meta: 'Current Month Performance', detail: 'Pharmacy: ₹42.8L · Diagnostics: ₹31.5L · Inpatient Bed/Surg: ₹84.2L', timeOrWait: 'Target +12%', status: 'Healthy Margin', statusColor: 'success', primaryActionLabel: 'Export Spreadsheet', primaryActionRoute: '/reports' },
    ],
    'Accreditation Metrics': [
      { id: 'KPI-01', name: 'NABH / JCI Key Clinical Quality Indicators', meta: 'Hospital-Wide Patient Safety Ratios', detail: 'Average length of stay (ALOS): 3.8 days · Readmission rate: 1.2% · Return to OT: 0%', timeOrWait: 'Benchmark Met', status: 'Quality Approved', statusColor: 'success', primaryActionLabel: 'Quality Portal', primaryActionRoute: '/reports' },
    ],
  },

  purchase_officer: {
    'Purchase Requisitions Queue': [
      { id: 'PR-101', name: 'Central Pharmacy Bulk Antibiotic Requisition', meta: 'Value: ₹1,45,000 · Urgency: High', detail: 'IV Meropenem 1g (500 vials) · Piperacillin-Tazobactam 4.5g (800 vials)', timeOrWait: 'Pending 2h', status: 'Awaiting PO Generation', statusColor: 'urgent', primaryActionLabel: 'Create Purchase Order', primaryActionRoute: '/admin/settings' },
      { id: 'PR-102', name: 'Housekeeping Sanitization Supplies', meta: 'Value: ₹28,000 · Monthly Stock', detail: 'Sodium Hypochlorite 5% (200L) · Microfiber mops and disposable PPE packs', timeOrWait: 'Pending 1d', status: 'Standard Approval', statusColor: 'info', primaryActionLabel: 'Create Purchase Order', primaryActionRoute: '/admin/settings' },
    ],
    'Vendor Quotations to Compare': [
      { id: 'RFQ-01', name: 'Digital X-Ray High-Resolution Flat Panel Detector', meta: '3 Quotations Received from Authorized Distributors', detail: 'Comparative evaluation statement prepared · Best price: ₹6,80,000 (2 yr warranty)', timeOrWait: '3 Quotes In', status: 'Ready to Compare', statusColor: 'warn', primaryActionLabel: 'Compare Quotes', primaryActionRoute: '/admin/settings' },
    ],
    'Pending Purchase Orders': [
      { id: 'PO-882', name: 'Orthopaedic Knee Implants Batch #14', meta: 'Vendor: Stryker India · Value: ₹3,20,000', detail: 'Approved by Medical Superintendent · Dispatched by vendor · Delivery ETA tomorrow', timeOrWait: 'ETA Tomorrow', status: 'Vendor Dispatched', statusColor: 'info', primaryActionLabel: 'Track Shipment', primaryActionRoute: '/admin/settings' },
    ],
    'GRN Inward Inspection': [
      { id: 'GRN-01', name: 'Inward Shipment: Disposable Surgical Drapes (500 sets)', meta: 'Received at Central Stores Gate 3', detail: 'Packaging intact · Expiry 2028 verified · Physical count matches vendor invoice', timeOrWait: 'At Store Gate', status: 'Inspection Cleared', statusColor: 'success', primaryActionLabel: 'Verify GRN & Accept', primaryActionRoute: '/admin/settings' },
    ],
  },
};

export default function WorkQueueTable({ roleKey, workQueues }: WorkQueueTableProps) {
  const navigate = useNavigate();
  // Support aliases for roleKey (e.g. anaesthesiologist -> anaesthetist)
  const effectiveRole = roleKey === 'anaesthesiologist' ? 'anaesthetist' : roleKey;
  const roleData = ROLE_QUEUE_DATA[effectiveRole] || ROLE_QUEUE_DATA[roleKey] || {};
  const activeQueues = workQueues && workQueues.length > 0 ? workQueues : Object.keys(roleData);
  const [selectedQueue, setSelectedQueue] = useState<string>(activeQueues[0] || 'Work Queue');
  const [searchFilter, setSearchFilter] = useState('');

  // Interactive local queue state so user can modify items, submit action forms & see real updates!
  const [itemsMap, setItemsMap] = useState<Record<string, WorkQueueItem[]>>({});

  // Active Action Form Modal state
  const [activeModalItem, setActiveModalItem] = useState<WorkQueueItem | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionStatus, setActionStatus] = useState('Completed');
  const [actionValue, setActionValue] = useState('');

  // Get items for currently selected queue with smart fallback
  const getQueueItems = (queueName: string): WorkQueueItem[] => {
    if (itemsMap[queueName]) return itemsMap[queueName];
    if (roleData[queueName]) return roleData[queueName];
    // Department-tailored fallback if not yet customized
    return [
      {
        id: 'TASK-01',
        name: `Active Roster Item for ${queueName}`,
        meta: 'Priority Department Workflow · Live Synced',
        detail: `Standard clinical/operational protocol task active in ${queueName}.`,
        timeOrWait: 'Live Roster',
        status: 'In Progress',
        statusColor: 'info',
        primaryActionLabel: 'Review & Action',
        primaryActionRoute: '/hospital/dashboard',
      },
      {
        id: 'TASK-02',
        name: `Secondary Clearance Roster`,
        meta: 'Standard Turnaround SLA',
        detail: 'Department verification and signoff pending supervisor approval.',
        timeOrWait: '15 min wait',
        status: 'Pending Clearance',
        statusColor: 'warn',
        primaryActionLabel: 'Clear Item',
        primaryActionRoute: '/hospital/dashboard',
      },
    ];
  };

  const currentItems = getQueueItems(selectedQueue);

  const filteredItems = currentItems.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.detail.toLowerCase().includes(q) ||
      item.meta.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q)
    );
  });

  const handleOpenActionModal = (item: WorkQueueItem) => {
    setActiveModalItem(item);
    setActionRemarks(`Action initiated on ${new Date().toLocaleTimeString()} by on-duty staff.`);
    setActionStatus('Completed / Signed Off');
    setActionValue('Verified');
  };

  const handleSubmitModalAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalItem) return;

    // Update item in local queue state
    const updated = currentItems.map((it) => {
      if (it.id === activeModalItem.id) {
        return {
          ...it,
          status: actionStatus,
          statusColor: 'success' as const,
          timeOrWait: 'Just now',
          detail: actionRemarks || it.detail,
        };
      }
      return it;
    });

    setItemsMap((prev) => ({
      ...prev,
      [selectedQueue]: updated,
    }));

    toast.success(`Action successfully documented: ${activeModalItem.primaryActionLabel} for ${activeModalItem.name}!`);
    setActiveModalItem(null);
  };

  const handleAudioCall = (item: WorkQueueItem) => {
    toast.info(`Calling token ${item.id}: ${item.name} to Consultation / Action Desk`);
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
            placeholder="Filter queue by name, ID, status..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="text-xs pl-8 pr-3 py-1.5 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-64"
          />
        </div>
      </div>

      {/* Queue Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {activeQueues.map((q) => {
          const isSelected = selectedQueue === q;
          const count = getQueueItems(q).length;
          return (
            <button
              key={q}
              type="button"
              onClick={() => setSelectedQueue(q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
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
                <td className="py-2.5 px-3 font-medium whitespace-nowrap text-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>{item.timeOrWait}</span>
                  </span>
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
                      onClick={() => handleOpenActionModal(item)}
                      className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <span>{item.primaryActionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    {item.primaryActionRoute && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.info(`Navigating to ${item.primaryActionRoute}...`);
                          navigate(item.primaryActionRoute!);
                        }}
                        title={`Open Module (${item.primaryActionRoute})`}
                        className="p-1 rounded border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-primary" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAudioCall(item)}
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

      {/* Interactive Action Form Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-primary/10 text-primary">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-semibold text-sm leading-none">
                    {activeModalItem.primaryActionLabel}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {activeModalItem.id} · {activeModalItem.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModalAction} className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Case Details
                </div>
                <div className="text-xs font-medium text-foreground">
                  {activeModalItem.detail}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Metadata: {activeModalItem.meta}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Status / Outcome
                </label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  className="w-full text-xs rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Completed / Signed Off">Completed / Signed Off</option>
                  <option value="Administered / Done">Administered / Done</option>
                  <option value="Verified & Cleared">Verified & Cleared</option>
                  <option value="In Progress / Monitored">In Progress / Monitored</option>
                  <option value="Transferred / Step-Down">Transferred / Step-Down</option>
                  <option value="Escalated to Specialist">Escalated to Specialist</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Clinical Remarks / Audit Notes
                </label>
                <textarea
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Document observations, dosage, response, vitals or administrative notes..."
                  className="w-full text-xs rounded-lg border bg-background p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t gap-2">
                {activeModalItem.primaryActionRoute ? (
                  <button
                    type="button"
                    onClick={() => {
                      const route = activeModalItem.primaryActionRoute;
                      setActiveModalItem(null);
                      if (route) navigate(route);
                    }}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Full-Page Module
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalItem(null)}
                    className="text-xs px-3 py-2 rounded-lg border hover:bg-muted font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Submit & Update Roster
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
