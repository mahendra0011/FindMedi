import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Stethoscope, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, PhoneCall, Filter, ExternalLink, RefreshCw, Eye,
  X, Check, Edit3, ShieldAlert, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchRoleQueues } from './useLiveKpis';

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

  clinic_doctor: {
    'Live Patient Waiting Queue': [
      { id: 'TK-01', name: 'Aarav Sharma', meta: '34y · Male · UHID-9041', detail: 'Fever & persistent dry cough (3 days)', timeOrWait: '15 min wait', status: 'Waiting', statusColor: 'warn', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
      { id: 'TK-02', name: 'Meera Patel', meta: '28y · Female · UHID-8842', detail: 'Routine 2nd trimester antenatal checkup', timeOrWait: '22 min wait', status: 'Scheduled', statusColor: 'info', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
      { id: 'TK-03', name: 'Rajesh Verma', meta: '58y · Male · UHID-7910', detail: 'Hypertension follow-up & BP review (160/95 mmHg)', timeOrWait: '30 min wait', status: 'Priority Review', statusColor: 'warn', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
    ],
    'Waiting OPD Patients': [
      { id: 'TK-01', name: 'Aarav Sharma', meta: '34y · Male · UHID-9041', detail: 'Fever & persistent dry cough (3 days)', timeOrWait: '15 min wait', status: 'Waiting', statusColor: 'warn', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
      { id: 'TK-02', name: 'Meera Patel', meta: '28y · Female · UHID-8842', detail: 'Routine 2nd trimester antenatal checkup', timeOrWait: '22 min wait', status: 'Scheduled', statusColor: 'info', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
      { id: 'TK-03', name: 'Rajesh Verma', meta: '58y · Male · UHID-7910', detail: 'Hypertension follow-up & BP review (160/95 mmHg)', timeOrWait: '30 min wait', status: 'Priority Review', statusColor: 'warn', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
    ],
    'In-Consultation Encounter': [
      { id: 'TK-12', name: 'Kavita Reddy', meta: '41y · Female · UHID-1092', detail: 'Chief complaint: Acute epigastric pain · Physical exam ongoing', timeOrWait: 'In Room', status: 'In Consultation', statusColor: 'info', primaryActionLabel: 'Open EMR Workstation', primaryActionRoute: '/clinic/consultations' },
    ],
    'Active Consultation': [
      { id: 'TK-12', name: 'Kavita Reddy', meta: '41y · Female · UHID-1092', detail: 'Chief complaint: Acute epigastric pain · Physical exam ongoing', timeOrWait: 'In Room', status: 'In Consultation', statusColor: 'info', primaryActionLabel: 'Open EMR Workstation', primaryActionRoute: '/clinic/consultations' },
    ],
    'Pending Lab Results': [
      { id: 'REP-01', name: 'Deepak Joshi (CBC & Lipid Profile)', meta: 'UHID-9011 · Lab Accession #L-441', detail: 'Hemoglobin 13.2 g/dL · Fasting Chol 210 mg/dL', timeOrWait: 'Awaiting Review', status: 'Results Ready', statusColor: 'success', primaryActionLabel: 'Review Report', primaryActionRoute: '/clinic/consultations' },
    ],
    'Pending Investigation Reviews': [
      { id: 'REP-01', name: 'Deepak Joshi (CBC & Lipid Profile)', meta: 'UHID-9011 · Lab Accession #L-441', detail: 'Hemoglobin 13.2 g/dL · Fasting Chol 210 mg/dL', timeOrWait: 'Awaiting Review', status: 'Results Ready', statusColor: 'success', primaryActionLabel: 'Review Report', primaryActionRoute: '/clinic/consultations' },
    ],
    'Scheduled Follow-ups': [
      { id: 'FOL-01', name: 'Sunita Devi', meta: '46y · Female · UHID-9214', detail: 'Type 2 DM post 14-day Metformin adjustment follow-up', timeOrWait: '11:30 AM', status: 'Follow-up Due', statusColor: 'info', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
      { id: 'FOL-02', name: 'Vikram Malhotra', meta: '52y · Male · UHID-6119', detail: 'ECG review & cardiology consultation follow-up', timeOrWait: '12:00 PM', status: 'Follow-up Due', statusColor: 'info', primaryActionLabel: 'Consult Patient', primaryActionRoute: '/clinic/consultations' },
    ],
    'Telemedicine Queue': [
      { id: 'VID-01', name: 'Suresh Menon', meta: '45y · Male · UHID-5921', detail: 'Cardiology lipid profile review via Video Teleconsult', timeOrWait: 'In Waiting Room', status: 'Patient Waiting', statusColor: 'warn', primaryActionLabel: 'Join Video Room', primaryActionRoute: '/clinic/consultations' },
    ],
  },

  clinic_receptionist: {
    'Front Desk Check-in Queue': [
      { id: 'REG-101', name: 'Harish Chandra', meta: 'Phone: 98124-XXXXX', detail: 'Walk-in arrival for General Physician consultation', timeOrWait: '2 min in lobby', status: 'Arrived', statusColor: 'info', primaryActionLabel: 'Check-In', primaryActionRoute: '/clinic/reception' },
      { id: 'REG-102', name: 'Priyanka Sen', meta: 'UHID-4921 · Appt #204', detail: 'Pre-booked appointment with Dr. Sharma (11:00 AM)', timeOrWait: 'Arrived on-time', status: 'Check-In Pending', statusColor: 'warn', primaryActionLabel: 'Check-In', primaryActionRoute: '/clinic/reception' },
    ],
    'Waiting Room Patient Queue': [
      { id: 'TKN-04', name: 'Rahul Sharma', meta: 'Token #18 · Room 101', detail: 'Vitals recorded: BP 120/80, SpO2 99%', timeOrWait: '10 min wait', status: 'Next to Call', statusColor: 'info', primaryActionLabel: 'Call to Room', primaryActionRoute: '/clinic/reception' },
      { id: 'TKN-05', name: 'Anita Desai', meta: 'Token #19 · Room 102', detail: 'Waiting for Pediatrician OPD', timeOrWait: '18 min wait', status: 'Waiting', statusColor: 'info', primaryActionLabel: 'Call to Room', primaryActionRoute: '/clinic/reception' },
    ],
    'OPD Thermal Slips Queue': [
      { id: 'SLIP-01', name: 'Manish Rawat (UHID-2026-0812)', meta: 'Dr. Vivek Verma · General Medicine', detail: 'Thermal barcode OPD slip ready for printer', timeOrWait: 'Just now', status: 'Ready to Print', statusColor: 'success', primaryActionLabel: 'Print OPD Slip', primaryActionRoute: '/clinic/reception' },
    ],
    'Doctor Room Status': [
      { id: 'RM-01', name: 'Room 101 · Dr. Vivek Verma', meta: 'Specialty: Internal Medicine', detail: 'Current Token: #17 · 5 patients waiting in queue', timeOrWait: 'Active', status: 'Room Occupied', statusColor: 'success', primaryActionLabel: 'Queue Desk', primaryActionRoute: '/clinic/reception' },
      { id: 'RM-02', name: 'Room 102 · Dr. Sunita Rao', meta: 'Specialty: Pediatrics', detail: 'Current Token: #11 · 3 patients waiting in queue', timeOrWait: 'Active', status: 'Room Occupied', statusColor: 'success', primaryActionLabel: 'Queue Desk', primaryActionRoute: '/clinic/reception' },
    ],
  },

  clinic_nurse: {
    'Vitals Station Queue': [
      { id: 'VIT-01', name: 'Sunita Devi (Token #20)', meta: '46y · Female · UHID-9214', detail: 'Chief complaint: Headaches · BP & RBS screening due', timeOrWait: 'Waiting 8m', status: 'Screening Due', statusColor: 'warn', primaryActionLabel: 'Record Vitals', primaryActionRoute: '/clinic/nurse' },
      { id: 'VIT-02', name: 'Vikram Malhotra (Token #21)', meta: '52y · Male · UHID-6119', detail: 'Pre-consultation routine vitals check', timeOrWait: 'Waiting 3m', status: 'Screening Due', statusColor: 'warn', primaryActionLabel: 'Record Vitals', primaryActionRoute: '/clinic/nurse' },
    ],
    'Minor Procedure / Dressing Queue': [
      { id: 'PROC-01', name: 'Akash Jain', meta: '22y · Male · Wound Dressing', detail: 'Post-abrasion antiseptic dressing & bandaging', timeOrWait: 'In Dressing Room', status: 'Ready for Dressing', statusColor: 'info', primaryActionLabel: 'Perform Dressing', primaryActionRoute: '/clinic/nurse' },
    ],
    'Immunization & Vaccine Due': [
      { id: 'VAC-01', name: 'Baby Vivaan (9 Months)', meta: 'Pediatric Immunization', detail: 'MR 1st Dose + Typhoid Conjugate Vaccine scheduled', timeOrWait: 'Cold Chain Checked', status: 'Ready to Administer', statusColor: 'info', primaryActionLabel: 'Administer Vaccine', primaryActionRoute: '/clinic/nurse' },
    ],
    'Doctor Room Assistance': [
      { id: 'AST-01', name: 'Consulting Room #101', meta: 'Dr. Vivek Verma', detail: 'Nebulization setup requested for acute asthma patient', timeOrWait: 'Stat', status: 'Assistance Needed', statusColor: 'urgent', primaryActionLabel: 'Assist Doctor', primaryActionRoute: '/clinic/nurse' },
    ],
  },

  clinic_cashier: {
    'Unpaid Consultation Invoices': [
      { id: 'INV-401', name: 'Harish Chandra · ₹800', meta: 'Dr. Vivek Verma OPD Fee', detail: 'Consultation fee pending counter settlement', timeOrWait: 'Pending 5m', status: 'Unpaid', statusColor: 'urgent', primaryActionLabel: 'Collect Payment', primaryActionRoute: '/clinic/cashier' },
      { id: 'INV-402', name: 'Sunita Devi · ₹1,250', meta: 'Consultation + RBS Rapid Test', detail: 'Patient completed doctor visit, arrived at billing counter', timeOrWait: 'Pending 2m', status: 'Unpaid', statusColor: 'urgent', primaryActionLabel: 'Collect Payment', primaryActionRoute: '/clinic/cashier' },
    ],
    'Pharmacy Dispensing Bills': [
      { id: 'RXB-101', name: 'Rahul Sharma · ₹640', meta: '3 Prescribed Medicines Dispensed', detail: 'Paracetamol 650mg, Azithromycin 500mg, Pantoprazole 40mg', timeOrWait: 'Dispensed', status: 'Awaiting Settlement', statusColor: 'warn', primaryActionLabel: 'Settle Rx Bill', primaryActionRoute: '/clinic/cashier' },
    ],
    'Collected Receipts Log': [
      { id: 'RCT-902', name: 'Priyanka Sen · ₹800', meta: 'Payment Mode: UPI Dynamic QR', detail: 'Receipt #RCT-902 printed & handed to patient', timeOrWait: 'Settled 10m ago', status: 'Paid', statusColor: 'success', primaryActionLabel: 'Print Receipt', primaryActionRoute: '/clinic/cashier' },
    ],
    'Cash Drawer Handover': [
      { id: 'TILL-01', name: 'Morning Shift Cash Till Closing', meta: 'Counter #1 · Cashier: Anita Gupta', detail: 'Opening float: ₹2,000 · Physical cash collected: ₹18,450 · UPI: ₹26,800', timeOrWait: 'Shift End', status: 'Ready to Close', statusColor: 'info', primaryActionLabel: 'Reconcile Till', primaryActionRoute: '/clinic/cashier' },
    ],
  },

  clinic_admin: {
    'Today Consultation Census': [
      { id: 'CEN-01', name: 'Clinic Daily OPD Census', meta: '82 Total Footfall Today', detail: '65 Appointments scheduled · 17 Walk-ins · 64 Consultations finished', timeOrWait: 'Census Active', status: 'OPD Active', statusColor: 'success', primaryActionLabel: 'View Appointments', primaryActionRoute: '/clinic/appointments' },
    ],
    'Pending Bill Settlements': [
      { id: 'SET-01', name: 'Uncollected OPD Billing Balances', meta: '4 Invoices Pending · Total: ₹3,850', detail: 'Counter receivables awaiting cashier collection or split settle', timeOrWait: 'Action Needed', status: 'Balances Pending', statusColor: 'warn', primaryActionLabel: 'Open Billing Desk', primaryActionRoute: '/clinic/billing' },
    ],
    'Inventory Reorder Alerts': [
      { id: 'STK-01', name: 'Critical Pharmacy Stock Alerts', meta: '3 Medicines Below Minimum Threshold', detail: 'Amoxicillin 500mg (8 tabs left) · Normal Saline 500ml (4 bottles left)', timeOrWait: 'Immediate', status: 'Below Reorder Point', statusColor: 'urgent', primaryActionLabel: 'Manage Inventory', primaryActionRoute: '/clinic/inventory' },
    ],
    'Staff Duty Status': [
      { id: 'STF-01', name: 'Clinic Staff Attendance Roster', meta: '12 / 14 Clinical & Front Staff Present', detail: '2 Nurses on morning shift · 1 Pharmacist · 2 Cashiers on duty', timeOrWait: 'On Duty', status: 'Roster Active', statusColor: 'success', primaryActionLabel: 'View Staff Roster', primaryActionRoute: '/clinic/staff' },
    ],
  },

  clinic_branch_manager: {
    'Branch Patient Queue': [
      { id: 'BR-Q1', name: 'South City Branch Central Queue', meta: '38 Patients Registered Today', detail: 'Avg wait time: 14 mins · 4 Consulting rooms active', timeOrWait: 'Real-time', status: 'Queue Smooth', statusColor: 'success', primaryActionLabel: 'Branch Schedule', primaryActionRoute: '/clinic/schedule' },
    ],
    'Doctor Room Allocations': [
      { id: 'RM-ALL-1', name: 'Room 101 - Dr. Vivek Verma (Internal Med)', meta: 'Morning Session: 09:00 - 13:00', detail: 'Consulting room fully equipped, digital prescription pad active', timeOrWait: 'Active', status: 'Allocated', statusColor: 'success', primaryActionLabel: 'Room Master', primaryActionRoute: '/clinic/schedule' },
    ],
    'Daily Cash Closing': [
      { id: 'CLS-01', name: 'Branch Daily Cash & Digital Audit', meta: 'Total Collection: ₹46,200', detail: 'Cash: ₹16,400 · UPI: ₹24,800 · Card POS: ₹5,000', timeOrWait: 'End of Day', status: 'Closing Due', statusColor: 'warn', primaryActionLabel: 'Verify Closing', primaryActionRoute: '/clinic/billing' },
    ],
    'Staff Attendance Log': [
      { id: 'ATT-01', name: 'Branch Biometric Check-in Exceptions', meta: 'All morning shift staff verified on-time', detail: 'Evening shift nurse reporting at 14:00', timeOrWait: 'Verified', status: 'Attendance Normal', statusColor: 'info', primaryActionLabel: 'Staff Log', primaryActionRoute: '/clinic/staff' },
    ],
  },

  clinic_lab_tech: {
    'Accession & Barcode Queue': [
      { id: 'ACC-01', name: 'Rahul Sharma · Blood Sample (CBC / ESR)', meta: 'EDTA Vial · Ref: Dr. Verma', detail: 'Sample collected, print barcode and verify container seal', timeOrWait: 'Collected 10m', status: 'Awaiting Barcode', statusColor: 'warn', primaryActionLabel: 'Print Barcode', primaryActionRoute: '/clinic/tests' },
      { id: 'ACC-02', name: 'Pooja Nair · Urine Routine & Microscopy', meta: 'Sterile Cup · Ref: Dr. Rao', detail: 'Sample received at intake counter', timeOrWait: 'Just now', status: 'Sample Received', statusColor: 'info', primaryActionLabel: 'Accession Sample', primaryActionRoute: '/clinic/tests' },
    ],
    'Sample Collection Queue': [
      { id: 'COL-01', name: 'Manish Rawat · Fasting Blood Sugar', meta: 'Fluoride Vial · Phlebotomy Bay 1', detail: 'Patient seated in collection bay', timeOrWait: 'Due Now', status: 'Collection Due', statusColor: 'urgent', primaryActionLabel: 'Collect Sample', primaryActionRoute: '/clinic/tests' },
    ],
    'Results Entry Worklist': [
      { id: 'ENT-01', name: 'Sunita Devi · Lipid Profile & HbA1c', meta: 'Automated Biochemistry Analyzer Run #42', detail: 'Analyzer values imported, verify calibration & reference ranges', timeOrWait: 'Completed Run', status: 'Ready to Enter', statusColor: 'info', primaryActionLabel: 'Enter Results', primaryActionRoute: '/clinic/tests' },
    ],
    'Pathologist Sign-off Queue': [
      { id: 'SGN-01', name: 'Geeta Kumari · Complete Blood Count', meta: 'Abnormal Flag: Mild Microcytic Anemia (Hb 9.8)', detail: 'Report compiled, awaiting consulting pathologist electronic signature', timeOrWait: 'Awaiting Doctor Sign', status: 'Pending Sign-off', statusColor: 'warn', primaryActionLabel: 'Review & Sign', primaryActionRoute: '/clinic/tests' },
    ],
  },

  clinic_inventory_mgr: {
    'Medicine Stock Below Reorder Level': [
      { id: 'REO-01', name: 'Paracetamol 650mg Tablets', meta: 'Current Stock: 40 tabs · Reorder Level: 200 tabs', detail: 'Daily consumption: ~60 tabs · Immediate indent needed', timeOrWait: 'Critically Low', status: 'Stock Critical', statusColor: 'urgent', primaryActionLabel: 'Raise Indent', primaryActionRoute: '/clinic/inventory' },
      { id: 'REO-02', name: 'Disposable Syringes 5ml with Needle', meta: 'Current Stock: 15 pcs · Reorder Level: 100 pcs', detail: 'Procedure room consumption fast', timeOrWait: 'Low Stock', status: 'Reorder Due', statusColor: 'warn', primaryActionLabel: 'Raise Indent', primaryActionRoute: '/clinic/inventory' },
    ],
    'Batches Expiring in 30 Days': [
      { id: 'EXP-01', name: 'Cough Syrup Diphenhydramine 100ml', meta: 'Batch #CS-2024 · Expiry: End of Month', detail: '14 bottles in stock · Fast-track dispensing or vendor return', timeOrWait: '24 Days Left', status: 'Near Expiry', statusColor: 'urgent', primaryActionLabel: 'Quarantine Batch', primaryActionRoute: '/clinic/inventory' },
    ],
    'Pending Purchase Indents': [
      { id: 'IND-101', name: 'Monthly Consumables & Surgical Cotton Indent', meta: 'Value Estimate: ₹18,500', detail: 'Submitted to clinic purchase desk for vendor quotation', timeOrWait: 'Submitted Yesterday', status: 'Indent Pending', statusColor: 'info', primaryActionLabel: 'View Indents', primaryActionRoute: '/clinic/inventory' },
    ],
    'Goods Received Verification (GRN)': [
      { id: 'GRN-401', name: 'MedSource India Delivery: IV Fluids Batch #9', meta: 'PO #PO-2026-88 · 50 Bottles RL & DNS', detail: 'Shipment delivered to clinic stock room Gate 2', timeOrWait: 'Delivered Today', status: 'Verify & Stock', statusColor: 'success', primaryActionLabel: 'Acknowledge GRN', primaryActionRoute: '/clinic/inventory' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // LIS — PATHOLOGY & LABORATORY MANAGEMENT SYSTEM WORK QUEUES
  // ══════════════════════════════════════════════════════════════
  pathologist: {
    'Results Awaiting Verification': [
      { id: 'LAB-901', name: 'Rohit Verma · Complete Blood Count & ESR', meta: 'Sample: EDTA Blood · Ref: Dr. Sharma', detail: 'Hb: 8.4 g/dL (Low), Platelets: 95,000 /uL (Low) · Smear review recommended', timeOrWait: 'Awaiting 22m', status: 'Verification Pending', statusColor: 'warn', primaryActionLabel: 'Verify Report', primaryActionRoute: '/lab/verify' },
      { id: 'LAB-904', name: 'Kavita Joshi · Comprehensive Metabolic Panel (KFT/LFT)', meta: 'Sample: Plain Serum · Ref: Dr. Mehta', detail: 'Serum Creatinine: 2.4 mg/dL (Elevated), SGPT: 68 U/L', timeOrWait: 'Awaiting 14m', status: 'Verification Pending', statusColor: 'warn', primaryActionLabel: 'Verify Report', primaryActionRoute: '/lab/verify' },
      { id: 'LAB-910', name: 'Ananya Roy · Thyroid Profile (T3, T4, TSH)', meta: 'Sample: Serum · Ref: Dr. Chawla', detail: 'TSH: 8.9 uIU/mL (Hypothyroid range) · Free T4: 0.9 ng/dL', timeOrWait: 'Awaiting 35m', status: 'Routine Review', statusColor: 'info', primaryActionLabel: 'Verify Report', primaryActionRoute: '/lab/verify' },
    ],
    'Critical Panic Values': [
      { id: 'CRIT-01', name: 'Sanjay Dutt · Arterial Blood Gas & Electrolytes', meta: 'ICU Bed 4 · Potassium: 6.8 mEq/L (PANIC HIGH)', detail: 'Severe hyperkalemia flagged by analyzer · Critical telephonic notification required', timeOrWait: 'STAT 4m', status: 'Immediate Alert', statusColor: 'urgent', primaryActionLabel: 'Telephone Alert', primaryActionRoute: '/lab/verify' },
      { id: 'CRIT-02', name: 'Meena Saxena · Coagulation Profile (PT/INR)', meta: 'Emergency Bay 2 · INR: 5.4 (PANIC HIGH)', detail: 'Bleeding risk critical · Attending physician intimation pending', timeOrWait: 'STAT 8m', status: 'Immediate Alert', statusColor: 'urgent', primaryActionLabel: 'Telephone Alert', primaryActionRoute: '/lab/verify' },
    ],
    'Urgent STAT Reports': [
      { id: 'STAT-101', name: 'Vikram Seth · Cardiac Troponin-I & CK-MB', meta: 'ER Trauma · Positive (0.42 ng/mL)', detail: 'Atypical chest discomfort · STAT clearance required', timeOrWait: 'Overdue 6m', status: 'STAT Pending', statusColor: 'urgent', primaryActionLabel: 'Sign & Release', primaryActionRoute: '/lab/verify' },
    ],
    'Corrected Reports for Review': [
      { id: 'AMEND-01', name: 'Sunita Rao · Lipid Profile Addendum', meta: 'Original Report #REP-4091', detail: 'Fasting status amended from non-fasting to 12h overnight fast · Version 2 draft', timeOrWait: 'Draft Ready', status: 'Addendum Review', statusColor: 'info', primaryActionLabel: 'Approve Addendum', primaryActionRoute: '/lab/verify' },
    ],
    'QC Warning Worklist': [
      { id: 'QC-01', name: 'Biochemistry Analyzer #1 · Control Level 2', meta: 'Parameter: Serum Sodium (Westgard 1:3s breach)', detail: 'Run suspended; recalibration and repeat test recommended', timeOrWait: 'Action Needed', status: 'Calibration Flag', statusColor: 'urgent', primaryActionLabel: 'Review QC Run', primaryActionRoute: '/lab/qc' },
    ],
  },

  lab_technician: {
    'Assigned Samples Queue': [
      { id: 'SMP-201', name: 'Deepak Chopra · EDTA Tube #ED-8821', meta: 'Test: CBC with Differential · Section: Hematology', detail: 'Sample accessioned and mixed; ready for Sysmex analyzer load', timeOrWait: 'Received 8m', status: 'Ready for Load', statusColor: 'info', primaryActionLabel: 'Run Analyzer', primaryActionRoute: '/lab/worklist/hematology' },
      { id: 'SMP-204', name: 'Pooja Bhatia · Serum Gel Tube #SST-9912', meta: 'Test: Liver Function Test (LFT) · Section: Biochemistry', detail: 'Centrifugation completed (3000 RPM, 10 min); clear serum separated', timeOrWait: 'Separated 12m', status: 'Ready for Load', statusColor: 'info', primaryActionLabel: 'Run Analyzer', primaryActionRoute: '/lab/worklist/biochemistry' },
      { id: 'SMP-209', name: 'Mohit Agarwal · Sterile Urine Cup #UR-1044', meta: 'Test: Urine Routine & Microscopy · Section: Clinical Path', detail: 'Physical examination complete: Pale yellow, slightly turbid', timeOrWait: 'In Queue', status: 'Microscopy Due', statusColor: 'info', primaryActionLabel: 'Perform Microscopy', primaryActionRoute: '/lab/worklist/clinical_pathology' },
    ],
    'Pending Result Entry': [
      { id: 'RES-101', name: 'Alok Nath · Lipid Profile Panel', meta: 'Architect c4000 Analyzer Auto-Feed', detail: 'Total Cholesterol: 242 mg/dL, Triglycerides: 198 mg/dL · Review & submit', timeOrWait: 'Analyzer Done', status: 'Verify & Submit', statusColor: 'warn', primaryActionLabel: 'Submit Results', primaryActionRoute: '/lab/worklist/biochemistry' },
      { id: 'RES-102', name: 'Geeta Kumari · Dengue Serology (NS1 / IgM / IgG)', meta: 'Rapid Chromatographic Card', detail: 'NS1 Antigen: Positive, IgM: Negative, IgG: Negative', timeOrWait: 'Read at 15m', status: 'Enter Findings', statusColor: 'urgent', primaryActionLabel: 'Submit Results', primaryActionRoute: '/lab/worklist/serology' },
    ],
    'Repeat Analysis Worklist': [
      { id: 'RPT-01', name: 'Kamal Nayan · Serum Glucose Random (440 mg/dL)', meta: 'Out of linear range (> 400 mg/dL)', detail: '1:2 dilution required to confirm high glucose reading', timeOrWait: 'Dilution Due', status: 'Dilution Required', statusColor: 'urgent', primaryActionLabel: 'Perform Dilution', primaryActionRoute: '/lab/worklist/biochemistry' },
    ],
    'QC Warning Worklist': [
      { id: 'QC-TECH-1', name: 'Hematology 3-Part Differential Daily QC', meta: 'Coulter Principle · 8:00 AM Run', detail: 'Leukocyte count within 1 SD; normal run verified', timeOrWait: 'Verified Today', status: 'QC Passed', statusColor: 'success', primaryActionLabel: 'Log QC Entry', primaryActionRoute: '/lab/qc' },
    ],
    'Outsourced Dispatch': [
      { id: 'OUT-101', name: 'Ramesh Sen · Serum Free Light Chains', meta: 'Reference Lab: Metropolis Diagnostic Central', detail: 'Serum aliquot frozen at -20°C with cold-pack dry ice courier manifest', timeOrWait: 'Courier Due 14:00', status: 'Dispatch Ready', statusColor: 'info', primaryActionLabel: 'Dispatch Batch', primaryActionRoute: '/lab/outsource' },
    ],
  },

  phlebotomist: {
    'Pending Collection Queue': [
      { id: 'COL-101', name: 'Aarav Malhotra · Fasting Blood Sugar & Lipid Profile', meta: 'UHID-8812 · Phlebotomy Counter 2', detail: '12h Overnight Fast verified · Fluoride + SST Vials required', timeOrWait: 'Waiting 6m', status: 'Seated in Bay', statusColor: 'urgent', primaryActionLabel: 'Collect Sample', primaryActionRoute: '/lab/collection' },
      { id: 'COL-102', name: 'Meena Sundaram · Thyroid Profile & CBC', meta: 'UHID-8819 · Phlebotomy Counter 1', detail: 'Patient verified · EDTA Lavender + SST Gold Top tubes prepared', timeOrWait: 'Waiting 12m', status: 'Waiting Call', statusColor: 'info', primaryActionLabel: 'Collect Sample', primaryActionRoute: '/lab/collection' },
      { id: 'COL-103', name: 'Rajesh Khanna · Glycated Hemoglobin (HbA1c)', meta: 'UHID-8824 · Walk-in OPD', detail: 'Non-fasting routine draw · Lavender top tube', timeOrWait: 'Waiting 15m', status: 'Waiting Call', statusColor: 'info', primaryActionLabel: 'Collect Sample', primaryActionRoute: '/lab/collection' },
    ],
    'Urgent STAT Collections': [
      { id: 'STAT-COL-1', name: 'Bed 204 (ICU) · Serum Troponin-T STAT', meta: 'Ward Phlebotomy Request', detail: 'Suspected acute coronary syndrome · Immediate bedside draw', timeOrWait: 'STAT Immediate', status: 'STAT Request', statusColor: 'urgent', primaryActionLabel: 'Bedside Draw', primaryActionRoute: '/lab/collection' },
    ],
    'Home Visits Assigned': [
      { id: 'HMC-01', name: 'Shanti Swaroop (78y) · Complete Geriatric Panel', meta: 'B-12, Sector 14, Noida · Slot: 09:30 AM', detail: 'Fasting sample · Patient immobile · Home cold-chain kit #04', timeOrWait: 'On Route', status: 'En Route', statusColor: 'warn', primaryActionLabel: 'Log Visit', primaryActionRoute: '/lab/collection' },
    ],
    'Recollection Requests': [
      { id: 'RCL-01', name: 'Pankaj Verma · CBC EDTA Sample Hemolyzed', meta: 'Order #ORD-7712 · Rejected by Hematology Lab', detail: 'Sample gross hemolysis noted on centrifugation · Recollection needed', timeOrWait: 'Contacted Patient', status: 'Recollect Due', statusColor: 'urgent', primaryActionLabel: 'Recollect Blood', primaryActionRoute: '/lab/collection' },
    ],
    'Collection Issues': [
      { id: 'ISSUE-01', name: 'Sunil Gavaskar · Difficult Venous Access', meta: 'Chemotherapy patient · Collapsed peripheral veins', detail: 'Paediatric butterfly needle 23G requested with warm compress', timeOrWait: 'Action Needed', status: 'Technique Alert', statusColor: 'warn', primaryActionLabel: 'Assisted Draw', primaryActionRoute: '/lab/collection' },
    ],
  },

  biochem_tech: {
    'Biochemistry Analyzer Worklist': [
      { id: 'BIO-101', name: 'Anil Kapoor · Liver Function Test (LFT)', meta: 'Analyzer: Cobas c311 · Tray Position 12', detail: 'Bilirubin (T/D), SGOT, SGPT, Alkaline Phosphatase, Total Protein, Albumin', timeOrWait: 'Running 8m', status: 'In Analyzer', statusColor: 'info', primaryActionLabel: 'View Run', primaryActionRoute: '/lab/worklist/biochemistry' },
      { id: 'BIO-102', name: 'Sunita Sharma · Renal Function Test (KFT)', meta: 'Analyzer: Cobas c311 · Tray Position 13', detail: 'Urea, BUN, Creatinine, Uric Acid, Calcium, Phosphorus', timeOrWait: 'Awaiting Load', status: 'Ready for Run', statusColor: 'info', primaryActionLabel: 'Load Sample', primaryActionRoute: '/lab/worklist/biochemistry' },
    ],
    'Glucose & HbA1c Batches': [
      { id: 'GLU-01', name: 'Morning Fasting Blood Sugar Batch (18 Samples)', meta: 'Hexokinase Photometric Method', detail: 'Controls Level 1 & Level 2 within 1.2 SD · Batch ready to run', timeOrWait: 'Batch Ready', status: 'Start Batch', statusColor: 'success', primaryActionLabel: 'Run Batch', primaryActionRoute: '/lab/worklist/biochemistry' },
    ],
    'Critical Electrolytes': [
      { id: 'ISE-01', name: 'ICU Patient Bed 8 · Na+/K+/Cl- Panel', meta: 'Direct Ion-Selective Electrode (ISE)', detail: 'K+: 2.8 mEq/L (Moderate Hypokalemia) · Confirm and alert', timeOrWait: 'Flagged 2m', status: 'Critical Value', statusColor: 'urgent', primaryActionLabel: 'Confirm & Report', primaryActionRoute: '/lab/worklist/biochemistry' },
    ],
    'Dilution Repeat Tests': [
      { id: 'DIL-01', name: 'Serum Amylase > 2000 U/L (Acute Pancreatitis)', meta: 'Automated 1:5 Saline Dilution', detail: 'Re-running with diluted sample to obtain precise endpoint value', timeOrWait: 'Diluted', status: 'Re-running', statusColor: 'warn', primaryActionLabel: 'Log Dilution', primaryActionRoute: '/lab/worklist/biochemistry' },
    ],
    'QC Out-of-Range Alerts': [
      { id: 'QC-BIO-1', name: 'Alkaline Phosphatase Reagent Lot #882', meta: 'Calibration Expiry: Tomorrow', detail: 'Two-point calibration required with Calibrator C.f.a.s.', timeOrWait: 'Due Today', status: 'Calibrate Due', statusColor: 'warn', primaryActionLabel: 'Calibrate', primaryActionRoute: '/lab/qc' },
    ],
  },

  hematology_tech: {
    'CBC Worklist Queue': [
      { id: 'HEM-101', name: 'Ritu Sen · Complete Blood Count + ESR', meta: 'Automated 5-Part Hematology Analyzer', detail: 'RBC, WBC, Hb, Hct, MCV, MCH, MCHC, Platelet count, Differential', timeOrWait: 'Run Completed', status: 'Results Ready', statusColor: 'success', primaryActionLabel: 'Verify Curve', primaryActionRoute: '/lab/worklist/hematology' },
      { id: 'HEM-102', name: 'Vikas Dubey · Complete Blood Count', meta: 'Analyzer Flag: NRBC Present & Platelet Clumps?', detail: 'Automated flag triggered; requires manual blood film correlation', timeOrWait: 'Smear Due', status: 'Flagged by Machine', statusColor: 'urgent', primaryActionLabel: 'Prepare Smear', primaryActionRoute: '/lab/worklist/hematology' },
    ],
    'Peripheral Smear Reviews': [
      { id: 'SMR-01', name: 'Priyanka Chopra · Leishman Stained Smear', meta: 'Indication: Severe Anemia (Hb 6.2 g/dL)', detail: 'Microcytic hypochromic RBCs with marked anisopoikilocytosis and pencil cells', timeOrWait: 'Stained', status: 'Microscopy Ready', statusColor: 'warn', primaryActionLabel: 'Microscope Exam', primaryActionRoute: '/lab/worklist/hematology' },
    ],
    'Coagulation PT/INR Queue': [
      { id: 'COAG-01', name: 'Harish Chandra · Prothrombin Time (PT / INR)', meta: 'Coagulometer: Mechanical Clot Detection', detail: 'Patient on oral Warfarin anticoagulant therapy · INR expected', timeOrWait: 'Incubating 37°C', status: 'Processing', statusColor: 'info', primaryActionLabel: 'Record Seconds', primaryActionRoute: '/lab/worklist/hematology' },
    ],
    'Reticulocyte Counts': [
      { id: 'RETIC-01', name: 'Baby Aarush (4m) · Reticulocyte Count', meta: 'Supravital Brilliant Cresyl Blue Stain', detail: 'Hemolytic anemia evaluation · Manual count per 1000 RBCs', timeOrWait: 'Staining 20m', status: 'Count Due', statusColor: 'info', primaryActionLabel: 'Enter Count', primaryActionRoute: '/lab/worklist/hematology' },
    ],
    'Analyzer Flagged Runs': [
      { id: 'FLAG-01', name: 'Sample #9902 · Leukocytosis (> 50,000 /uL)', meta: 'Suspected leukemoid reaction vs CML', detail: 'Scattergram shows high-fluorescence lymphocyte/monocyte cloud', timeOrWait: 'Pathologist Alert', status: 'Pathologist Review', statusColor: 'urgent', primaryActionLabel: 'Forward to Path', primaryActionRoute: '/lab/verify' },
    ],
  },

  microbiology_tech: {
    'Active Culture Incubations': [
      { id: 'MIC-101', name: 'Urine Culture & Sensitivity (Clean Catch Midstream)', meta: 'Incubation: 24h at 37°C · CLED Agar', detail: 'Significant colony growth > 10^5 CFU/mL; yellow colonies (lactose fermenter)', timeOrWait: 'Day 2 Incubation', status: 'Significant Growth', statusColor: 'urgent', primaryActionLabel: 'ID & Sensitivity', primaryActionRoute: '/lab/worklist/microbiology' },
      { id: 'MIC-102', name: 'Blood Culture Bottle Pair (Aerobic/Anaerobic)', meta: 'Automated Bact/ALERT System · Bottle #BC-4412', detail: 'Vial signaled positive at 18 hours · Subculture and Gram stain urgent', timeOrWait: 'Bottle Positive', status: 'STAT Positive', statusColor: 'urgent', primaryActionLabel: 'Gram Stain & Plate', primaryActionRoute: '/lab/worklist/microbiology' },
    ],
    'Preliminary Gram Stains': [
      { id: 'GRM-01', name: 'Sputum for Gram Stain & Culture', meta: 'Purulent specimen · Geckler criteria valid', detail: 'Gram-positive lancet-shaped diplococci surrounded by clear capsule halos', timeOrWait: 'Immediate Read', status: 'Pneumococcus Susp', statusColor: 'warn', primaryActionLabel: 'Log Prelim Report', primaryActionRoute: '/lab/worklist/microbiology' },
    ],
    'Antibiotic Susceptibility Testing': [
      { id: 'AST-01', name: 'E. coli Isolate · Kirby-Bauer Disc Diffusion', meta: 'Mueller-Hinton Agar · CLSI 2026 Guidelines', detail: 'Zone measurement: Resistant to Ampicillin, Sensitive to Meropenem, Amikacin', timeOrWait: '18h Zones Ready', status: 'Measure Zones', statusColor: 'info', primaryActionLabel: 'Record Zone mm', primaryActionRoute: '/lab/worklist/microbiology' },
    ],
    'Organism Identification Desk': [
      { id: 'ID-01', name: 'Pus Swab Isolate · Golden Yellow Pigment', meta: 'Catalase: Positive · Slide Coagulase: Positive', detail: 'Staphylococcus aureus confirmed · Cefoxitin disc set for MRSA screen', timeOrWait: 'Screen Ready', status: 'MRSA Screening', statusColor: 'warn', primaryActionLabel: 'Verify MRSA', primaryActionRoute: '/lab/worklist/microbiology' },
    ],
    'Delayed Cultures': [
      { id: 'DEL-01', name: 'Fungal Culture (Nail Clippings on SDA)', meta: 'Incubation Day 14 at 25°C', detail: 'Slow growing dermatophyte colony emerging · Awaiting conidia formation', timeOrWait: 'Hold 7 more days', status: 'Hold Incubation', statusColor: 'info', primaryActionLabel: 'Update Status', primaryActionRoute: '/lab/worklist/microbiology' },
    ],
  },

  histopathology_tech: {
    'Grossing Worklist': [
      { id: 'HST-101', name: 'Gallbladder Specimen (Laparoscopic Cholecystectomy)', meta: 'Container #BX-8801 · 10% Neutral Buffered Formalin', detail: 'Specimen dimensions 8x4x3 cm · Gross examination with attending pathologist', timeOrWait: 'Fixed 24h', status: 'Ready for Grossing', statusColor: 'info', primaryActionLabel: 'Grossing Desk', primaryActionRoute: '/lab/worklist/histopathology' },
      { id: 'HST-102', name: 'Skin Punch Biopsy (Forearm Lesion, 4mm)', meta: 'Container #BX-8804 · Suspected Basal Cell Carcinoma', detail: 'Entire punch bisected and submitted in single cassette #A1', timeOrWait: 'Ready', status: 'Grossed', statusColor: 'success', primaryActionLabel: 'Process Cassette', primaryActionRoute: '/lab/worklist/histopathology' },
    ],
    'Block Embedding Queue': [
      { id: 'EMB-01', name: 'Tissue Processor Overnight Run (14 Cassettes)', meta: 'Dehydration, Clearing & Paraffin Infiltration complete', detail: 'Orient tissue at embedding center with molten paraffin wax at 60°C', timeOrWait: 'Processor Done', status: 'Embed in Wax', statusColor: 'warn', primaryActionLabel: 'Embed Blocks', primaryActionRoute: '/lab/worklist/histopathology' },
    ],
    'Staining & Slide Mounts': [
      { id: 'STN-01', name: 'Microtome Sectioned Ribbons (4 Micron Thickness)', meta: 'Automated Hematoxylin & Eosin (H&E) Staining Station', detail: 'Sections dried at 58°C; staining protocol running (clearing to DPX coverslip)', timeOrWait: 'In Stainer', status: 'H&E Running', statusColor: 'info', primaryActionLabel: 'Coverslip & Label', primaryActionRoute: '/lab/worklist/histopathology' },
    ],
    'Pathologist Slide Handover': [
      { id: 'HND-HISTO-1', name: 'Case BX-8798: Appendix Sections (3 Slides)', meta: 'Acute suppurative appendicitis suspected', detail: 'Slides stained, labeled with 2D barcode and matched with requisition form', timeOrWait: 'Ready on Tray', status: 'Ready for Review', statusColor: 'success', primaryActionLabel: 'Handover to Path', primaryActionRoute: '/lab/verify' },
    ],
    'Special Staining Requests': [
      { id: 'SPEC-STN-1', name: 'Gastric Antral Biopsy · Giemsa Stain for H. pylori', meta: 'Pathologist request: Dr. Mehra', detail: 'Special staining for spiral bacilli identification in foveolar mucus', timeOrWait: 'Stain Today', status: 'Special Stain Due', statusColor: 'warn', primaryActionLabel: 'Perform Giemsa', primaryActionRoute: '/lab/worklist/histopathology' },
    ],
  },

  cytology_tech: {
    'Pap Smear Screening Worklist': [
      { id: 'CYT-101', name: 'Sunita Devi · Cervical Screening Pap Smear', meta: 'Liquid-Based Cytology (LBC)', detail: 'Bethesda System: Negative for Intraepithelial Lesion or Malignancy (NILM)', timeOrWait: 'Stained', status: 'Screening Ready', statusColor: 'info', primaryActionLabel: 'Screen Slide', primaryActionRoute: '/lab/worklist/cytology' },
    ],
    'FNAC Smear Fixation & Staining Queue': [
      { id: 'CYT-102', name: 'Ramesh Sen · Thyroid Nodule FNAC Aspirate', meta: 'Fixed 95% Ethyl Alcohol + Air-Dried', detail: 'Rapid on-site evaluation (ROSE) performed; Papanicolaou & Giemsa staining completed', timeOrWait: 'Ready', status: 'Slides Mounted', statusColor: 'success', primaryActionLabel: 'Stage for Path', primaryActionRoute: '/lab/verify' },
    ],
    'Body Fluid Cytocentrifugation Worklist': [
      { id: 'CYT-103', name: 'Mohan Lal · Pleural Fluid Centrifugation', meta: 'Vol: 250 mL · Heparinized Container', detail: 'Cytospin preparation for atypical mesothelial cells vs metastatic carcinoma', timeOrWait: 'Centrifuged', status: 'Cell Block Prep', statusColor: 'warn', primaryActionLabel: 'Prepare Cell Block', primaryActionRoute: '/lab/worklist/cytology' },
    ],
    'Cytology Slides Staged for Pathologist': [
      { id: 'CYT-104', name: 'Pooja Hegde · Ascitic Fluid Smears (Tray 4)', meta: 'Ref: Dr. Rao (Oncology)', detail: 'Four stained slides with requisition slip positioned for microscopic sign-out', timeOrWait: 'Staged 15m', status: 'Awaiting Pathologist', statusColor: 'info', primaryActionLabel: 'Deliver Tray', primaryActionRoute: '/lab/verify' },
    ],
  },

  serology_tech: {
    'Serology & Immunoassay Worklist': [
      { id: 'SER-101', name: 'Aarav Malhotra · Viral Hepatitis Complete Profile', meta: 'HBsAg, Anti-HCV, Anti-HAV IgM', detail: 'Architect i2000SR Chemiluminescence Analyzer automated feed', timeOrWait: 'Running 12m', status: 'Assay In-Progress', statusColor: 'info', primaryActionLabel: 'Review COI', primaryActionRoute: '/lab/worklist/serology' },
    ],
    'Viral Marker Screening': [
      { id: 'SER-102', name: 'Emergency Pre-Op Panel (HIV-1/2 & Syphilis RPR)', meta: 'OT Case #OT-8822 (Immediate)', detail: 'Rapid immunochromatographic 4th generation card · Non-reactive verified', timeOrWait: 'Read at 15m', status: 'Non-Reactive Verified', statusColor: 'success', primaryActionLabel: 'Release OT Cleared', primaryActionRoute: '/lab/verify' },
    ],
    'Autoimmune Antibody Panel': [
      { id: 'SER-103', name: 'Meena Sharma · ANA by Indirect Immunofluorescence', meta: 'Substrate: HEp-2 cells · Dilution 1:100', detail: 'Nuclear speckled fluorescence pattern observed · Titration needed', timeOrWait: 'Incubation Done', status: 'Microscopy Due', statusColor: 'warn', primaryActionLabel: 'Capture Field', primaryActionRoute: '/lab/worklist/serology' },
    ],
    'Dilution Titre Verification': [
      { id: 'SER-104', name: 'Karan Mehra · Widal Tube Agglutination Test', meta: 'TO and TH baseline titres', detail: 'TO 1:160, TH 1:320 · End-point agglutination verified with control sera', timeOrWait: 'Titre Ready', status: 'Titre Confirmed', statusColor: 'info', primaryActionLabel: 'Submit Titre', primaryActionRoute: '/lab/worklist/serology' },
    ],
  },

  molecular_tech: {
    'RT-PCR Extraction & Amplification Queue': [
      { id: 'MOL-101', name: 'Hepatitis B Virus (HBV) Quantitative DNA PCR', meta: 'TaqMan Real-Time PCR Assay', detail: 'Automated magnetic bead extraction: 500 uL plasma input, eluate 50 uL', timeOrWait: 'Plate Loaded', status: 'Cycle 24/40', statusColor: 'info', primaryActionLabel: 'Monitor Amplification', primaryActionRoute: '/lab/worklist/molecular' },
    ],
    'Viral Load Quantification': [
      { id: 'MOL-102', name: 'HIV-1 Viral Load (IU/mL) Calibration Run', meta: 'Reference standard dilution series (10^2 - 10^7 copies/mL)', detail: 'Standard curve slope -3.32 (Efficiency 100.1%, R^2 = 0.998)', timeOrWait: 'Run Completed', status: 'Valid Curve', statusColor: 'success', primaryActionLabel: 'Quantify Batch', primaryActionRoute: '/lab/worklist/molecular' },
    ],
    'Thermal Cycler Runs': [
      { id: 'MOL-103', name: 'Respiratory Pathogen Multiplex Panel (12 Targets)', meta: '96-Well Optical Reaction Plate #MOL-901', detail: 'Influenza A/B, RSV, SARS-CoV-2 multiplex detection', timeOrWait: 'Finishing 8m', status: 'Cycling', statusColor: 'info', primaryActionLabel: 'Analyze Ct Values', primaryActionRoute: '/lab/worklist/molecular' },
    ],
    'Contamination Control Log': [
      { id: 'MOL-104', name: 'Daily Pre-PCR / Post-PCR UV Decontamination', meta: 'Biosafety Cabinet Level II & PCR Hood', detail: 'UV-C irradiation 30 mins logged · Swipe test negative for amplicon carry-over', timeOrWait: 'Verified Today', status: 'Zero Contamination', statusColor: 'success', primaryActionLabel: 'Sign Clean Log', primaryActionRoute: '/lab/qc' },
    ],
  },

  clinical_pathology_tech: {
    'Urine Routine & Microscopy Worklist': [
      { id: 'CP-101', name: 'Vikas Dubey · Complete Urine Analysis', meta: 'Automated 10-parameter test strip + sediment microscopy', detail: 'Protein: Trace, RBC: 0-1/hpf, Pus Cells: 12-15/hpf (UTI suspicion)', timeOrWait: 'Microscopy Ready', status: 'Centrifuged', statusColor: 'warn', primaryActionLabel: 'Microscope Exam', primaryActionRoute: '/lab/worklist/clinical-pathology' },
    ],
    'Stool Occult Blood & Parasitology': [
      { id: 'CP-102', name: 'Sanjay Dutt · Stool Occult Blood (FOBT) & Wet Mount', meta: 'Immunochemical FOBT strip + Saline/Iodine Mount', detail: 'FOBT: Negative · Wet mount: Giardia lamblia cysts observed', timeOrWait: 'Read Complete', status: 'Parasite Detected', statusColor: 'urgent', primaryActionLabel: 'Record Findings', primaryActionRoute: '/lab/worklist/clinical-pathology' },
    ],
    'Semen Analysis Processing Queue': [
      { id: 'CP-103', name: 'Fertility Assessment Semen Analysis (WHO 2021 Criteria)', meta: 'Liquefaction at 37°C complete in 25 min', detail: 'Sperm count, progressive motility, vitality & strict Kruger morphology evaluation', timeOrWait: 'Chamber Loaded', status: 'Count in Progress', statusColor: 'info', primaryActionLabel: 'Count Hemocytometer', primaryActionRoute: '/lab/worklist/clinical-pathology' },
    ],
    'Body Fluid Cell Count & Differential': [
      { id: 'CP-104', name: 'Synovial Fluid Right Knee · Total & Differential Leukocytes', meta: 'Neubauer Improved Counting Chamber', detail: 'Turbid fluid · TLC: 48,000 /uL (82% PMNs) · Polarized light exam for crystals', timeOrWait: 'Count Ready', status: 'Urgent Fluid', statusColor: 'urgent', primaryActionLabel: 'Report TLC & Crystals', primaryActionRoute: '/lab/worklist/clinical-pathology' },
    ],
  },

  analyzer_staff: {
    'Analyzer Calibration Worklist': [
      { id: 'EQ-CAL-1', name: 'Beckman Coulter AU5800 Chemistry Auto-Analyzer', meta: 'ISE Module 2-Point Calibration', detail: 'Calibrators: Ion-Trol Level 1 & Level 2 · Slope: 58.4 mV/decade (Within spec)', timeOrWait: 'Calibrated', status: 'Calibration Pass', statusColor: 'success', primaryActionLabel: 'Lock Calibration', primaryActionRoute: '/hospital/analyzer-emulator' },
    ],
    'ASTM / HL7 Interfacing Feeds': [
      { id: 'HL7-01', name: 'Sysmex XN-1000 Bidirectional ASTM TCP/IP Feed', meta: 'Port 5000 · Port Listener: Active', detail: 'Sample query (Host Query) & auto result broadcast running without packet drops', timeOrWait: 'Live Stream', status: 'Network Online', statusColor: 'success', primaryActionLabel: 'Inspect Packets', primaryActionRoute: '/hospital/analyzer-emulator' },
    ],
    'Reagent Blank Verifications': [
      { id: 'RGT-BLK-1', name: 'Total Bilirubin DSA Reagent Blank OD Check', meta: 'Optical Density: 0.042 (< 0.080 target)', detail: 'Photometric baseline verified at 546 nm wavelength', timeOrWait: 'Verified Today', status: 'Blank Accepted', statusColor: 'info', primaryActionLabel: 'Accept Blank', primaryActionRoute: '/lab/qc' },
    ],
  },

  lab_inventory_mgr: {
    'Reagent Low Stock Warnings': [
      { id: 'INV-LAB-1', name: 'Roche Cobas Elecsys Troponin T hs Gen 5', meta: 'Pack Size: 100 Tests · On-board: 18 Tests', detail: 'Average daily STAT run: 25 tests · Emergency order required', timeOrWait: 'Stock Alert', status: 'Reorder Now', statusColor: 'urgent', primaryActionLabel: 'Create PO Indent', primaryActionRoute: '/inventory' },
    ],
    'Expiring Consumables Alerts': [
      { id: 'INV-LAB-2', name: 'Vacutainer K2-EDTA Lavender 3 mL (Lot #4419)', meta: 'Quantity: 4 boxes (400 tubes)', detail: 'Manufacturer shelf-life expiration: 15 days · First-Expired First-Out (FEFO)', timeOrWait: '15 Days Left', status: 'Near Expiry', statusColor: 'warn', primaryActionLabel: 'Prioritize Dispense', primaryActionRoute: '/inventory' },
    ],
    'Purchase Indents Pending': [
      { id: 'IND-LAB-1', name: 'Microbiology CLED & MacConkey Dehydrated Media (5 kg)', meta: 'Supplier: HiMedia Laboratories', detail: 'Indent #IND-9904 approved by Lab Director · Awaiting PO release', timeOrWait: 'Pending Approval', status: 'Indent Cleared', statusColor: 'info', primaryActionLabel: 'Issue Purchase Order', primaryActionRoute: '/purchase-center' },
    ],
  },

  lab_manager: {
    'Overdue TAT Lab Orders': [
      { id: 'TAT-01', name: 'Serum Troponin-I STAT · Overdue by 14m', meta: 'Order #ORD-9912 · Target TAT: 45 min', detail: 'Analyzer rerun caused delay · Escalate to emergency biochemistry bay', timeOrWait: 'TAT Breach', status: 'Breached', statusColor: 'urgent', primaryActionLabel: 'Expedite Result', primaryActionRoute: '/lab/verify' },
    ],
    'Critical Panic Values': [
      { id: 'PAN-01', name: 'Serum Potassium 6.8 mEq/L · ICU Bed 4', meta: 'Phoned to Dr. Sen · Acknowledgement Pending', detail: 'Automated SMS and red dashboard alarm active', timeOrWait: '6 min active', status: 'Ack Pending', statusColor: 'urgent', primaryActionLabel: 'Confirm Call', primaryActionRoute: '/lab/verify' },
    ],
    'Sample Rejection Escalations': [
      { id: 'REJ-01', name: 'Hemolyzed Blood Sample · Phlebotomy Counter 3', meta: 'Rejection Rate for shift: 2.8% (Target < 1.5%)', detail: 'Vacuum tube drawing technique refresher recommended for phlebotomist team', timeOrWait: 'Review Log', status: 'Investigation', statusColor: 'warn', primaryActionLabel: 'Review Rejection', primaryActionRoute: '/lab/analytics' },
    ],
    'Reagent Low Stock Warnings': [
      { id: 'STK-01', name: 'Creatinine Jaffe Kinetic Reagent Pack', meta: 'Current: 2 Kits · Avg Daily Usage: 1 Kit', detail: 'Reorder point reached · Purchase requisition generated', timeOrWait: '2 Days Stock', status: 'Low Stock', statusColor: 'urgent', primaryActionLabel: 'Approve PO', primaryActionRoute: '/purchase-center' },
    ],
    'Pending Equipment Service': [
      { id: 'EQ-01', name: 'Cobas e411 Chemiluminescence Analyzer', meta: 'Monthly Preventative Maintenance Due in 48 Hours', detail: 'Roche biomedical service engineer visit confirmed for Saturday 18:00', timeOrWait: 'Service Due', status: 'PM Scheduled', statusColor: 'info', primaryActionLabel: 'Equipment Log', primaryActionRoute: '/hospital/biomedical' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // RIS / PACS — RADIOLOGY & IMAGING MANAGEMENT SYSTEM WORK QUEUES
  // ══════════════════════════════════════════════════════════════
  radiologist: {
    'STAT Emergency Queue': [
      { id: 'STAT-RAD-1', name: 'Ravi Teja · CT Brain Plain (Trauma)', meta: 'UHID-9081 · ER Bay 1 · GCS: 11/15', detail: 'Acute subdural hematoma vs contusion · Immediate interpretation requested', timeOrWait: 'STAT 6m in PACS', status: 'Immediate Reading', statusColor: 'urgent', primaryActionLabel: 'Report Now', primaryActionRoute: '/radiology/reports' },
      { id: 'STAT-RAD-2', name: 'Sumitra Devi · CT Pulmonary Angiography (CTPA)', meta: 'UHID-9088 · ICU Bed 2 · Severe Dyspnea', detail: 'Rule out acute pulmonary embolism (PE) · S1Q3T3 on ECG', timeOrWait: 'STAT 12m', status: 'Immediate Reading', statusColor: 'urgent', primaryActionLabel: 'Report Now', primaryActionRoute: '/radiology/reports' },
    ],
    'CT Scan Reporting Queue': [
      { id: 'CT-REP-01', name: 'Karan Mehra · HRCT Chest (High Resolution)', meta: 'UHID-8812 · Ref: Dr. Joshi (Pulmonology)', detail: 'Persistent dry cough & exertional breathlessness · Interstitial lung disease evaluation', timeOrWait: 'Scanned 28m', status: 'Awaiting Report', statusColor: 'warn', primaryActionLabel: 'Open in Viewer', primaryActionRoute: '/radiology/reports' },
      { id: 'CT-REP-02', name: 'Anita Saxena · CECT Abdomen & Pelvis (Triple Phase)', meta: 'UHID-8820 · Ref: Dr. Rao (Gastroenterology)', detail: 'Liver cirrhosis follow-up · Evaluation of arterial-enhancing focal lesion', timeOrWait: 'Scanned 42m', status: 'Awaiting Report', statusColor: 'warn', primaryActionLabel: 'Open in Viewer', primaryActionRoute: '/radiology/reports' },
    ],
    'MRI Reporting Queue': [
      { id: 'MRI-REP-01', name: 'Siddharth Roy · MRI Brain with Contrast & Spectroscopy', meta: 'UHID-7912 · Ref: Dr. Mehra (Neurology)', detail: 'Intracranial space occupying lesion (SOL) evaluation · MR Perfusion series acquired', timeOrWait: 'Scanned 35m', status: 'Awaiting Report', statusColor: 'info', primaryActionLabel: 'Open in Viewer', primaryActionRoute: '/radiology/reports' },
      { id: 'MRI-REP-02', name: 'Pooja Hegde · MRI Right Knee Joint', meta: 'UHID-8114 · Sports Injury (Twisting trauma)', detail: 'Anterior cruciate ligament (ACL) tear and medial meniscus tear evaluation', timeOrWait: 'Scanned 50m', status: 'Routine Queue', statusColor: 'info', primaryActionLabel: 'Open in Viewer', primaryActionRoute: '/radiology/reports' },
    ],
    'Radiography Review Worklist': [
      { id: 'XR-REP-01', name: 'Manish Rawat · Digital Chest X-Ray PA View', meta: 'UHID-9211 · Routine pre-op clearance', detail: 'Bilateral lung fields clear, cardiothoracic ratio normal', timeOrWait: 'Scanned 15m', status: 'Ready to Sign', statusColor: 'success', primaryActionLabel: 'Sign Report', primaryActionRoute: '/radiology/reports' },
      { id: 'XR-REP-02', name: 'Deepak Verma · Right Ankle AP & Lateral Views', meta: 'UHID-9218 · Skeletal trauma evaluation', detail: 'Distal fibular hairline fracture vs ligamentous avulsion', timeOrWait: 'Scanned 20m', status: 'Report Drafted', statusColor: 'info', primaryActionLabel: 'Verify & Sign', primaryActionRoute: '/radiology/reports' },
    ],
    'Addendum Request Desk': [
      { id: 'ADD-01', name: 'Case RAD-8821 · MRI Spine Lumbar Addendum', meta: 'Referring Surgeon: Dr. Bansal (Ortho)', detail: 'Clarification requested regarding L4-L5 exit nerve root compression severity', timeOrWait: 'Surgeon Request', status: 'Addendum Due', statusColor: 'warn', primaryActionLabel: 'Create Addendum', primaryActionRoute: '/radiology/reports' },
    ],
  },

  radiology_technician: {
    'Pending Acquisition Queue': [
      { id: 'RAD-ACQ-1', name: 'Alok Gupta · Digital X-Ray Chest PA View', meta: 'UHID-4011 · DR Room 1', detail: 'Patient verified and gown provided · Collimation 14x17 inches set', timeOrWait: 'Patient Ready', status: 'Ready for Exposure', statusColor: 'urgent', primaryActionLabel: 'Acquire X-Ray', primaryActionRoute: '/radiology/xray' },
      { id: 'RAD-ACQ-2', name: 'Meena Sharma · CT Abdomen Plain & Contrast', meta: 'UHID-4022 · CT Scanner 1', detail: 'IV Cannula 18G verified · Oral contrast administered 45 mins prior', timeOrWait: 'Ready on Gantry', status: 'Ready to Scan', statusColor: 'urgent', primaryActionLabel: 'Start CT Scan', primaryActionRoute: '/radiology/ct' },
    ],
    'In-Progress Exam Desk': [
      { id: 'RAD-PROG-1', name: 'Vikram Seth · MRI Brain Neuro Suite', meta: '3.0T MRI Magnet Room · Sequence 3 of 6 (T2 FLAIR)', detail: 'Patient tolerating scan well · Head coil positioned with ear protection', timeOrWait: '14 min remaining', status: 'In Magnet Bore', statusColor: 'info', primaryActionLabel: 'Monitor Scan', primaryActionRoute: '/radiology/mri' },
    ],
    'DICOM Push Verification': [
      { id: 'DCM-PUSH-1', name: 'Suresh Raina · CT Chest HRCT (Series 1-4)', meta: '1,420 DICOM slices acquired', detail: 'Auto-routing to PACS Server node 192.168.1.100 · Transferring...', timeOrWait: 'Transfer 88%', status: 'Pushing to PACS', statusColor: 'info', primaryActionLabel: 'Verify Push', primaryActionRoute: '/radiology/pacs' },
    ],
    'Reject / Repeat Logs': [
      { id: 'REJ-RAD-1', name: 'X-Ray Lumbar Spine Lateral · Patient Motion Artifact', meta: 'Reject Reason: Blurring during exposure', detail: 'Repeat exposure authorized with breath-hold coaching (Dose logged)', timeOrWait: 'Repeat Done', status: 'Logged for QA', statusColor: 'warn', primaryActionLabel: 'Log QA Reject', primaryActionRoute: '/radiology/mis' },
    ],
  },

  mri_technician: {
    'MRI Queue Today': [
      { id: 'MRI-Q-1', name: 'Harish Chandra · MRI Lumbar Spine with Contrast', meta: 'UHID-5512 · 3T Scanner · Slot: 11:30 AM', detail: 'Metal screening cleared · Creatinine 0.9 mg/dL · Contrast consent signed', timeOrWait: 'Next Patient', status: 'Screening Passed', statusColor: 'urgent', primaryActionLabel: 'Start MRI', primaryActionRoute: '/radiology/mri' },
      { id: 'MRI-Q-2', name: 'Pooja Nair · MRI Brain Epilepsy Protocol', meta: 'UHID-5519 · High-resolution coronal oblique T2 & FLAIR', detail: 'Specialized 1mm thin volumetric acquisitions scheduled', timeOrWait: 'Slot: 12:15 PM', status: 'Patient Arrived', statusColor: 'info', primaryActionLabel: 'Position Patient', primaryActionRoute: '/radiology/mri' },
    ],
    'Contrast-Enhanced MRI Waiting': [
      { id: 'MRI-CONT-1', name: 'Sunita Devi · MRI Pelvis for Endometriosis', meta: 'Gadolinium IV Contrast 10 mL', detail: 'Power injector loaded · Anti-spasmodic agent administered by nursing staff', timeOrWait: 'Ready in Prep Bay', status: 'Contrast Ready', statusColor: 'warn', primaryActionLabel: 'Connect Injector', primaryActionRoute: '/radiology/mri' },
    ],
    'Screening Cleared Patients': [
      { id: 'MRI-SCR-1', name: 'Deepak Chopra · MRI Cervical Spine', meta: 'Ferromagnetic Detector: All Green', detail: 'Implant verification: Dental ceramic bridge only (MR Safe at 3T)', timeOrWait: 'Cleared 10m', status: 'Safety Cleared', statusColor: 'success', primaryActionLabel: 'Call to Magnet', primaryActionRoute: '/radiology/mri' },
    ],
    'Incomplete DICOM Push': [
      { id: 'MRI-DCM-1', name: 'Rohan Joshi · MRI Shoulder Arthrogram', meta: 'Series 5 (T1 Fat-Sat Coronal) Missing 4 images', detail: 'Re-transmitting series from MRI local console cache to Central PACS', timeOrWait: 'Retrying', status: 'Push Retry', statusColor: 'warn', primaryActionLabel: 'Force Retransfer', primaryActionRoute: '/radiology/pacs' },
    ],
  },

  ct_technician: {
    'Triple Phase CT Queue': [
      { id: 'CT-Q-1', name: 'Mahesh Rawat · Triple Phase Liver CT', meta: 'UHID-7012 · Dual Head Contrast Injector', detail: 'Non-contrast, Late Arterial (Bolus tracking), Portal Venous, Delayed', timeOrWait: 'Cannula Ready', status: 'Set Bolus Track', statusColor: 'urgent', primaryActionLabel: 'Start Protocol', primaryActionRoute: '/radiology/ct' },
    ],
    'HRCT Chest Worklist': [
      { id: 'CT-HR-1', name: 'Kavita Reddy · HRCT Chest (Inspiratory & Expiratory)', meta: 'UHID-7024 · Sub-millimeter collimation 0.625mm', detail: 'High-spatial-frequency bone algorithm reconstruction required', timeOrWait: 'In Gantry Room', status: 'Acquiring Scout', statusColor: 'info', primaryActionLabel: 'Run CT Scan', primaryActionRoute: '/radiology/ct' },
    ],
    'Trauma Whole Body CT': [
      { id: 'CT-TR-1', name: 'Unknown Male (Trauma) · Pan-Scan Protocol', meta: 'ER Trauma Activation · GCS: 9', detail: 'Non-contrast CT Brain & C-Spine, IV Contrast CT Thorax, Abdomen & Pelvis', timeOrWait: 'STAT Immediate', status: 'STAT Active', statusColor: 'urgent', primaryActionLabel: 'Emergency Scan', primaryActionRoute: '/radiology/ct' },
    ],
    '3D Multiplanar Reformat Queue': [
      { id: 'CT-3D-1', name: 'Sanjay Dutt · CT Facial Bones 3D Volume Rendering', meta: 'Maxillofacial trauma reconstruction', detail: 'Generate 360-degree rotating bone window VR cinematic rendering', timeOrWait: 'Post-Processing', status: 'Generating 3D', statusColor: 'info', primaryActionLabel: 'Complete 3D VR', primaryActionRoute: '/radiology/ct' },
    ],
  },

  xray_technician: {
    'STAT Trauma X-Rays': [
      { id: 'XR-TR-1', name: 'Akash Jain · Right Tibia-Fibula AP & Lateral', meta: 'ER Trauma · Compound fracture suspicion', detail: 'Immobilized with splint · Bedside portable digital radiography requested', timeOrWait: 'STAT 5m', status: 'STAT Bay Call', statusColor: 'urgent', primaryActionLabel: 'Take Exposure', primaryActionRoute: '/radiology/xray' },
    ],
    'Routine OP Chest Worklist': [
      { id: 'XR-OP-1', name: 'Shyam Sundar · Chest X-Ray PA View', meta: 'UHID-6112 · Pre-employment health checkup', detail: 'Deep inspiration verified · 110 kVp, 3.2 mAs exposure parameters', timeOrWait: 'Next in Queue', status: 'Position Patient', statusColor: 'info', primaryActionLabel: 'Expose X-Ray', primaryActionRoute: '/radiology/xray' },
      { id: 'XR-OP-2', name: 'Meena Saxena · B/L Knee Standing AP View', meta: 'UHID-6118 · Osteoarthritis grade review', detail: 'Weight-bearing standing views with both knees in single detector field', timeOrWait: 'Waiting in Gown', status: 'Position Patient', statusColor: 'info', primaryActionLabel: 'Expose X-Ray', primaryActionRoute: '/radiology/xray' },
    ],
    'Pediatric Radiography Queue': [
      { id: 'XR-PED-1', name: 'Master Aarav (3y) · Chest AP Supine View', meta: 'Suspected foreign body aspiration', detail: 'Radiation protection: Pediatric low-dose protocol with gonad shielding', timeOrWait: 'Calm & Ready', status: 'Careful Exposure', statusColor: 'warn', primaryActionLabel: 'Low-Dose Shot', primaryActionRoute: '/radiology/xray' },
    ],
    'Repeat Review Desk': [
      { id: 'XR-REV-1', name: 'Pelvis AP · Clipped Iliac Crest', meta: 'Collimation error on first shot', detail: 'Repeat with lower detector centering; total cumulative dose logged', timeOrWait: 'Completed', status: 'QA Logged', statusColor: 'info', primaryActionLabel: 'View Repeat Log', primaryActionRoute: '/radiology/mis' },
    ],
  },

  us_technician: {
    'Full Bladder Waiting Queue': [
      { id: 'US-BLD-1', name: 'Sunita Devi · USG Whole Abdomen & Pelvis', meta: 'UHID-3041 · Sonologist Room 1 (Dr. Sarah)', detail: 'Patient drank 1 Litre water 45 min ago · Full bladder confirmed by nurse', timeOrWait: 'Bladder Full', status: 'Ready for Exam', statusColor: 'urgent', primaryActionLabel: 'Call to US Room', primaryActionRoute: '/radiology/ultrasound' },
      { id: 'US-BLD-2', name: 'Pooja Nair · USG KUB (Kidney, Ureter, Bladder)', meta: 'UHID-3048 · Severe right flank colic', detail: 'Pre-void and post-void bladder volume measurements required', timeOrWait: 'Waiting 10m', status: 'Waiting Call', statusColor: 'info', primaryActionLabel: 'Call to US Room', primaryActionRoute: '/radiology/ultrasound' },
    ],
    'Fasting Upper Abdomen Queue': [
      { id: 'US-FST-1', name: 'Ramesh Gupta · USG Upper Abdomen (Gallbladder / Liver)', meta: 'UHID-3054 · Suspected cholelithiasis', detail: '6h Overnight fasting confirmed · Gallbladder fully distended', timeOrWait: 'Fasting 6h', status: 'Fasting Cleared', statusColor: 'success', primaryActionLabel: 'Start Ultrasound', primaryActionRoute: '/radiology/ultrasound' },
    ],
    'STAT Vascular Doppler': [
      { id: 'US-DOP-1', name: 'Mohit Agarwal · Color Doppler Left Lower Limb (Venous)', meta: 'UHID-3062 · Acute unilateral calf swelling', detail: 'Rule out deep vein thrombosis (DVT) · Compression sonography protocol', timeOrWait: 'STAT 10m', status: 'STAT Doppler', statusColor: 'urgent', primaryActionLabel: 'Start Doppler', primaryActionRoute: '/radiology/doppler' },
    ],
    'Biopsy Guidance Assistance': [
      { id: 'US-BIO-1', name: 'Kavita Joshi · USG Guided Liver Biopsy Assistance', meta: 'Interventional Suite · Dr. Sen & Dr. Sarah', detail: 'Sterile probe cover, biopsy gun 18G & formalin containers prepared', timeOrWait: 'Slot: 14:00', status: 'Sterile Prep Ready', statusColor: 'warn', primaryActionLabel: 'Join Procedure', primaryActionRoute: '/radiology/ultrasound' },
    ],
  },

  mammo_technician: {
    'Screening Mammography Queue': [
      { id: 'MAM-01', name: 'Geeta Kumari (52y) · Bilateral Digital Mammography', meta: 'UHID-2201 · Annual breast health screening', detail: 'Standard 4-view protocol: Bilateral Cranio-Caudal (CC) & Mediolateral Oblique (MLO)', timeOrWait: 'Patient Ready', status: 'Position Patient', statusColor: 'info', primaryActionLabel: 'Start Screening', primaryActionRoute: '/radiology/mammography' },
    ],
    'Diagnostic Magnification Views': [
      { id: 'MAM-02', name: 'Anita Desai (48y) · Left Breast Spot Compression', meta: 'UHID-2208 · Palpable upper outer quadrant lump', detail: 'Focal spot magnification view for microcalcification morphology evaluation', timeOrWait: 'Awaiting Exam', status: 'Diagnostic View', statusColor: 'urgent', primaryActionLabel: 'Magnification View', primaryActionRoute: '/radiology/mammography' },
    ],
    'Prior Image Retrieval Desk': [
      { id: 'MAM-PRIOR-1', name: 'Shanti Swaroop · 2025 Mammogram Comparison Pull', meta: 'PACS Prior Study: MAMMO-2025-081', detail: 'Historical priors fetched from nearline archive to diagnostic reporting console', timeOrWait: 'Retrieved', status: 'Priors Linked', statusColor: 'success', primaryActionLabel: 'Compare in PACS', primaryActionRoute: '/radiology/pacs' },
    ],
    'Ultrasound Correlation Queue': [
      { id: 'MAM-US-1', name: 'Priyanka Sen · Post-Mammography Ultrasound Correlation', meta: 'Dense fibroglandular breast tissue (ACR Density D)', detail: 'Supplemental automated breast ultrasound scheduled in Room 2', timeOrWait: 'Same-day Link', status: 'US Handover', statusColor: 'info', primaryActionLabel: 'Handover to US', primaryActionRoute: '/radiology/ultrasound' },
    ],
  },

  pacs_admin: {
    'Unlinked / Orphan DICOM Studies': [
      { id: 'ORP-01', name: 'CT Head Study Instance UID #1.2.840.113619...', meta: 'Modality: CT Scanner 2 · Patient ID Missing', detail: 'Study acquired during network drop; manual reconciliation with order #ORD-998', timeOrWait: 'Flagged 1h', status: 'Manual Link Req', statusColor: 'urgent', primaryActionLabel: 'Reconcile Study', primaryActionRoute: '/radiology/pacs' },
    ],
    'Retry Transfer Queue': [
      { id: 'RET-01', name: 'MRI Brain 3T to Offsite Teleradiology PACS Node', meta: 'C-STORE timeout on slice 412/980', detail: 'Network re-established; auto-retry background thread active', timeOrWait: 'Retrying (1/3)', status: 'Transfer Retrying', statusColor: 'warn', primaryActionLabel: 'Force C-STORE', primaryActionRoute: '/radiology/pacs' },
    ],
    'Modality Association Alerts': [
      { id: 'AE-01', name: 'GE Revolution CT Scanner AE Title: CT_SCAN_1', meta: 'DICOM Ping (C-ECHO): 12ms response', detail: 'AE title handshake verified; steady C-STORE pipeline online', timeOrWait: 'Online', status: 'Healthy Link', statusColor: 'success', primaryActionLabel: 'View Association', primaryActionRoute: '/radiology/modalities' },
    ],
    'Storage Tiering Jobs': [
      { id: 'STR-01', name: 'Nearline Cold Archive Migration (Studies > 90 Days)', meta: 'Free Hot SSD Space: 6.4 TB (52% free)', detail: '340 studies scheduled for compressed optical/cloud tiering tonight', timeOrWait: 'Scheduled 01:00', status: 'Job Queued', statusColor: 'info', primaryActionLabel: 'Configure Tiering', primaryActionRoute: '/radiology/pacs' },
    ],
  },

  radiology_prep_staff: {
    'MRI Safety Screening Queue': [
      { id: 'SCR-01', name: 'Vikas Dubey · MRI Lumbar Spine Safety Check', meta: 'UHID-9082 · Ferromagnetic Metal Questionnaire', detail: 'History of welding: Orbital X-Ray clearance checked and verified negative', timeOrWait: 'Verified 8m', status: 'Ready for Magnet', statusColor: 'success', primaryActionLabel: 'Clear for MRI', primaryActionRoute: '/radiology/preparation' },
      { id: 'SCR-02', name: 'Mohan Lal · MRI Brain Check (Cardiac Stent)', meta: 'UHID-9089 · Drug-eluting stent placed 2022', detail: 'Stent card checked: Medtronic Onyx (MR Conditional at 1.5T and 3T)', timeOrWait: 'Card Verified', status: 'Safety Cleared', statusColor: 'success', primaryActionLabel: 'Clear for MRI', primaryActionRoute: '/radiology/preparation' },
    ],
    'CT Contrast Hydration & Renal Check': [
      { id: 'REN-01', name: 'Sunita Devi · CECT Abdomen Renal Clearance', meta: 'UHID-9114 · Serum Creatinine: 1.1 mg/dL, eGFR: 72 mL/min', detail: 'Renal parameters within safe contrast threshold (> 45 mL/min) · IV placed', timeOrWait: 'IV Ready', status: 'Contrast Cleared', statusColor: 'success', primaryActionLabel: 'Mark Ready', primaryActionRoute: '/radiology/preparation' },
      { id: 'REN-02', name: 'Kavita Joshi · CECT Chest Contrast Allergy Review', meta: 'UHID-9120 · Mild seafood allergy reported', detail: 'Pre-medication with Oral Prednisolone + Cetirizine completed 2h prior', timeOrWait: 'Pre-med Given', status: 'Allergy Cleared', statusColor: 'warn', primaryActionLabel: 'Mark Ready', primaryActionRoute: '/radiology/preparation' },
    ],
    'Consent Form Signing': [
      { id: 'CNS-01', name: 'Master Aarav (8y) · Pediatric Contrast Consent', meta: 'Mother accompanying patient', detail: 'Informed consent explained regarding low-osmolar iodinated contrast media', timeOrWait: 'Signed', status: 'Consent Uploaded', statusColor: 'success', primaryActionLabel: 'View Consent', primaryActionRoute: '/radiology/preparation' },
    ],
    'Pediatric Sedation Prep': [
      { id: 'SED-01', name: 'Baby Anaya (2y) · MRI Brain Sedation Protocol', meta: 'Supervised by Anaesthetist: Dr. Rao', detail: '4h Fasting verified · Vital signs baseline documented · Induction room ready', timeOrWait: 'Anaesthesia Ready', status: 'Sedation Ready', statusColor: 'urgent', primaryActionLabel: 'Induction Desk', primaryActionRoute: '/radiology/preparation' },
    ],
  },

  radiology_scheduler: {
    'Waitlist Queue': [
      { id: 'SCH-W1', name: 'Rohit Sharma · MRI Brain with Contrast Waitlist', meta: 'Requested Slot: Evening · Priority: High', detail: 'Patient flexible on timing; alert when cancellation occurs', timeOrWait: 'Waitlist #1', status: 'Call on Opening', statusColor: 'info', primaryActionLabel: 'Allocate Slot', primaryActionRoute: '/radiology/scheduling' },
    ],
    'Rescheduling Queue': [
      { id: 'SCH-R1', name: 'Pooja Hegde · CT Scan Reschedule Request', meta: 'Originally today 15:00 · Patient requested Monday', detail: 'Fasting instructions and reminder notification re-dispatched', timeOrWait: 'Requested Today', status: 'Reschedule Due', statusColor: 'warn', primaryActionLabel: 'Confirm New Slot', primaryActionRoute: '/radiology/scheduling' },
    ],
    'Unconfirmed Online Bookings': [
      { id: 'SCH-U1', name: 'Deepak Verma · USG Abdomen Online Booking', meta: 'Web portal self-booking · Awaiting confirmation call', detail: 'Call patient to verify full-bladder preparation instructions', timeOrWait: 'Booked 1h ago', status: 'Call Needed', statusColor: 'urgent', primaryActionLabel: 'Confirm & Lock', primaryActionRoute: '/radiology/scheduling' },
    ],
    'Preparation Confirmation Calls': [
      { id: 'SCH-P1', name: 'Morning CT Contrast Batch (6 Patients Tomorrow)', meta: 'Scheduled from 08:30 to 11:30 AM', detail: 'Verify 4-hour fasting and bring previous serum creatinine report', timeOrWait: 'Calls Due', status: 'SMS Dispatched', statusColor: 'info', primaryActionLabel: 'Verify Batch', primaryActionRoute: '/radiology/scheduling' },
    ],
  },

  radiology_manager: {
    'Overdue Reporting Worklist': [
      { id: 'MGR-TAT-1', name: 'CT Pulmonary Angiography · TAT Breach Warning', meta: 'Study #CT-9904 · Acquired 65m ago', detail: 'Target reporting TAT: 60 mins · Attending Radiologist Dr. Mehra notified', timeOrWait: 'Overdue 5m', status: 'Breached', statusColor: 'urgent', primaryActionLabel: 'Expedite Sign-off', primaryActionRoute: '/radiology/reports' },
    ],
    'Urgent / STAT Queue': [
      { id: 'MGR-STAT-1', name: 'Trauma CT Brain & C-Spine · ER Bay 1', meta: 'GCS: 10 · Critical findings alert active', detail: 'Report signed; critical communication log verified by radiologist', timeOrWait: 'Communicated', status: 'STAT Closed', statusColor: 'success', primaryActionLabel: 'Audit Communication', primaryActionRoute: '/radiology/critical' },
    ],
    'Unverified Scans': [
      { id: 'MGR-UNV-1', name: 'Evening Walk-in X-Rays (8 Studies Unread)', meta: 'Acquired between 18:00 and 20:00', detail: 'Assigned to night teleradiology panel for provisional review', timeOrWait: 'In Night Queue', status: 'Assigned Telerad', statusColor: 'info', primaryActionLabel: 'View Queue', primaryActionRoute: '/radiology/reports' },
    ],
    'Critical Escalation Queue': [
      { id: 'MGR-CRIT-1', name: 'Pneumothorax Finding · Physician Ack Pending', meta: 'Chest X-Ray ICU Bed 4 · Alert dispatched 18m ago', detail: 'Attending physician telephonic acknowledgement required within 30 min SLA', timeOrWait: '18m elapsed', status: 'Pending Ack', statusColor: 'urgent', primaryActionLabel: 'Escalate to CMO', primaryActionRoute: '/radiology/critical' },
    ],
    'Equipment Downtime': [
      { id: 'MGR-EQ-1', name: 'USG Machine Room 2 (Samsung RS85)', meta: 'Convex Probe Connector Issue', detail: 'Service ticket #TK-882 raised with biomedical engineer; backup machine deployed', timeOrWait: 'Down 4h', status: 'Under Repair', statusColor: 'urgent', primaryActionLabel: 'Biomedical Desk', primaryActionRoute: '/hospital/biomedical' },
    ],
  },

  radiology_billing_executive: {
    'Unbilled Modality Studies': [
      { id: 'BIL-RAD-1', name: 'Harish Chandra · MRI Lumbar Spine with Contrast', meta: 'Study #MRI-2026-901 · Tariff: ₹8,500', detail: 'Scan completed at 11:45 AM · Contrast charge + film surcharge unbilled', timeOrWait: 'Completed 15m', status: 'Awaiting Bill', statusColor: 'urgent', primaryActionLabel: 'Generate Invoice', primaryActionRoute: '/billing' },
      { id: 'BIL-RAD-2', name: 'Meena Sharma · CT Abdomen Triple Phase', meta: 'Study #CT-2026-842 · Tariff: ₹6,800', detail: 'Scan completed · Patient in recovery bay awaiting final receipt', timeOrWait: 'Completed 25m', status: 'Bill Pending', statusColor: 'warn', primaryActionLabel: 'Generate Invoice', primaryActionRoute: '/billing' },
    ],
    'TPA Pre-Auth Approvals': [
      { id: 'TPA-RAD-1', name: 'Siddharth Roy · Star Health Cashless Pre-Auth', meta: 'MRI Brain with Contrast · Claim Est: ₹11,000', detail: 'Pre-auth initial sanction ₹8,500 approved · Differential copay ₹2,500', timeOrWait: 'Sanction Received', status: 'Pre-Auth Cleared', statusColor: 'success', primaryActionLabel: 'Collect Co-pay', primaryActionRoute: '/hospital/insurance' },
    ],
    'Cash Desk Settlements': [
      { id: 'CSH-RAD-1', name: 'Morning Modality Shift Till Reconciliation', meta: 'Total Cash: ₹48,500 · UPI: ₹92,400', detail: 'POS counter terminal batch settlement and sealed cash bag handover to main finance', timeOrWait: 'Shift Close Due', status: 'Reconcile Till', statusColor: 'info', primaryActionLabel: 'Close Shift Till', primaryActionRoute: '/hospital/cashier?tab=reconcile' },
    ],
  },

  equipment_manager: {
    'Modality Breakdown Work Orders': [
      { id: 'BME-RAD-1', name: 'Siemens Somatom 128-Slice CT Gantry Temperature Warning', meta: 'Gantry Room 1 · Error Code: #E-401 Thermal Drift', detail: 'HVAC chilled water loop serviced · Tube cooling cycle verified within 45°C limit', timeOrWait: 'Active Ticket', status: 'Under Maintenance', statusColor: 'urgent', primaryActionLabel: 'Sign Work Order', primaryActionRoute: '/hospital/biomedical' },
    ],
    'Preventative Maintenance Due': [
      { id: 'BME-RAD-2', name: 'GE Optima 1.5T MRI Cryogen Helium Level Check', meta: 'Current Level: 78.4% (Threshold: 65%)', detail: 'Cold head compressor operating hours: 4,820h · Next refill scheduled next quarter', timeOrWait: 'Monthly Audit', status: 'Helium Stable', statusColor: 'success', primaryActionLabel: 'Log Cryogen Level', primaryActionRoute: '/hospital/biomedical' },
    ],
    'AERB Radiation Compliance Logs': [
      { id: 'AERB-01', name: 'Quarterly TLD Badge Dose Evaluation (Staff: 18)', meta: 'Thermo Luminescent Dosimeters · BARC Accredited Lab', detail: 'All radiographer badges within ALARA permissible limit (< 1.2 mSv/quarter)', timeOrWait: 'Logged Today', status: 'AERB Compliant', statusColor: 'success', primaryActionLabel: 'Upload AERB Return', primaryActionRoute: '/hospital/quality' },
    ],
    'Critical Calibration Pending': [
      { id: 'BME-RAD-3', name: 'Fluoroscopy C-Arm Dose Area Product (DAP) Meter', meta: 'Annual QA Physicist Calibration Certification', detail: 'BARC licensed medical physicist calibration scheduled for Saturday', timeOrWait: 'Due in 4 Days', status: 'Inspection Due', statusColor: 'warn', primaryActionLabel: 'Schedule Physicist', primaryActionRoute: '/radiology/modalities' },
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

  // Live backend queue state — real transactional lists keyed by SPEC queue
  // names. Falls back to the curated roster below when empty/unreachable.
  const [liveMap, setLiveMap] = useState<Record<string, WorkQueueItem[]>>({});
  useEffect(() => {
    let cancelled = false;
    fetchRoleQueues(effectiveRole)
      .then((m) => {
        if (!cancelled && m && Object.keys(m).length > 0) setLiveMap(m);
      })
      .catch(() => {
        /* keep curated fallback on any network/auth error */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRole]);

  // Fuzzy key match so near-identical queue names still hit curated data
  // (e.g. spec 'Turnaround / Cleaning Queue' vs curated 'Bed Turnover Queue').
  const fuzzyDemo = (queueName: string): WorkQueueItem[] | null => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const target = new Set(norm(queueName).split(' ').filter((w) => w.length > 2));
    let best: WorkQueueItem[] | null = null;
    let bestScore = 0;
    for (const [key, items] of Object.entries(roleData)) {
      const words = new Set(norm(key).split(' ').filter((w) => w.length > 2));
      let score = 0;
      target.forEach((w) => {
        if (words.has(w)) score += 2;
        else if ([...words].some((x) => x.includes(w) || w.includes(x))) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = items as WorkQueueItem[];
      }
    }
    return bestScore >= 2 ? best : null;
  };

  // Active Action Form Modal state
  const [activeModalItem, setActiveModalItem] = useState<WorkQueueItem | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionStatus, setActionStatus] = useState('Completed');
  const [actionValue, setActionValue] = useState('');

  // Get items for currently selected queue with smart fallback:
  // local edits > live backend > exact curated > fuzzy curated > generic.
  const getQueueItems = (queueName: string): WorkQueueItem[] => {
    if (itemsMap[queueName]) return itemsMap[queueName];
    if (liveMap[queueName]?.length) return liveMap[queueName];
    if (roleData[queueName]) return roleData[queueName];
    const fuzzy = fuzzyDemo(queueName);
    if (fuzzy) return fuzzy;
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
            {liveMap[selectedQueue]?.length ? (
              <span data-testid="queue-source-live" title="Showing live hospital data from backend APIs" className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                ● Live
              </span>
            ) : (
              <span data-testid="queue-source-demo" title="Backend unreachable or empty — showing curated roster" className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                Demo roster
              </span>
            )}
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
