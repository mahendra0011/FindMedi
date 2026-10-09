import mongoose from 'mongoose';

/**
 * File 09 §9.2: discharge state machine.
 * Initiated → DoctorApproved → NursingClear → PharmacyClear → BillingClear → Discharged
 * (+ Cancelled). Types: Normal/LAMA/DAMA/Referred/Absconded/Death.
 * Structured summary replaces the old plain-string field.
 */
const DISCHARGE_STATES = ['Initiated', 'DoctorApproved', 'NursingClear', 'PharmacyClear', 'BillingClear', 'Discharged', 'Cancelled'];
const DISCHARGE_NEXT = {
  Initiated: ['DoctorApproved', 'Cancelled'],
  DoctorApproved: ['NursingClear', 'Cancelled'],
  NursingClear: ['PharmacyClear', 'Cancelled'],
  PharmacyClear: ['BillingClear', 'Cancelled'],
  BillingClear: ['Discharged', 'Cancelled'],
  Discharged: [],
  Cancelled: ['Initiated'],
};

const dischargeWorkflowSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  state: { type: String, enum: DISCHARGE_STATES, default: 'Initiated', index: true },
  type: {
    type: String,
    enum: ['Normal', 'LAMA', 'DAMA', 'Referred', 'Absconded', 'Death'],
    default: 'Normal',
  },
  approvals: [{
    stage: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    remarks: { type: String, maxlength: 1000, default: '' },
  }],
  summary: {
    diagnosis: [{ type: String }],
    procedures: [{ type: String }],
    course: { type: String, default: '' },
    investigations: { type: String, default: '' },
    conditionAtDischarge: { type: String, default: '' },
    medicines: [{ drug: String, dose: String, route: String, freq: String, days: String }],
    advice: { type: String, default: '' },
    followUp: { date: { type: Date, default: null }, dept: { type: String, default: '' } },
    redFlags: { type: String, default: '' },
  },
  finalBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', default: null },
  summaryPdfUrl: { type: String, default: '' },
  abdmPushed: { type: Boolean, default: false },
}, { timestamps: true });

export const DISCHARGE_TRANSITIONS = DISCHARGE_NEXT;
export default mongoose.models.DischargeWorkflow || mongoose.model('DischargeWorkflow', dischargeWorkflowSchema);
