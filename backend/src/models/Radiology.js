import mongoose from 'mongoose';

const radiologySchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  // A1 #13 + subcatogary.md C4.2 — the 7 originals now cover the equipment
  // list too (DEXA, PET Scan, EEG sit in Equipment.type), plus the §4.2
  // modalities (nuclear, fluoroscopy, angiography, OPG/CBCT, elastography)
  // and the cardiac/neuro studies A2 called missing.
  modality: {
    type: String,
    enum: [
      'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Echo', 'ECG', 'Mammography',
      // A1 #13 — align with Equipment.type
      'DEXA', 'PET Scan', 'EEG',
      // §4.2 additions
      'Nuclear Scan', 'Fluoroscopy', 'Angiography', 'OPG/CBCT', 'Stress Echo',
      'Elastography', 'Doppler', 'TMT', 'EMG/NCV',
    ],
    required: true,
  },
  bodyPart: { type: String, required: true },
  clinicalHistory: { type: String },
  priority: { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' },
  status: {
    type: String,
    // §5: 19-state workflow (the original 14 UNION the front-desk/billing/
    // reporting states: Draft, Authorization Pending, Payment Pending,
    // Scheduling Pending, Appointment Confirmed, Preparation Pending,
    // Ready for Imaging, Study Completed, Report Finalized) + On Hold
    // (prep-queue pause target of the transition map).
    enum: [
      'Draft', 'Ordered', 'Authorization Pending', 'Payment Pending',
      'Scheduling Pending', 'Scheduled', 'Appointment Confirmed', 'Patient Arrived',
      'Preparation Pending', 'Ready for Imaging',
      'In Progress', 'Completed', 'Study Completed', 'Reporting Pending',
      'Reported', 'Report Finalized', 'Report Released', 'Delivered', 'On Hold', 'Cancelled'
    ],
    default: 'Ordered'
  },
  modalityId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImagingModality', default: null },
  scheduledAt: { type: Date },
  performedAt: { type: Date },
  performedBy: { type: String },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  findings: { type: String },
  impression: { type: String },
  recommendation: { type: String },
  reportUrl: { type: String },
  imageUrls: [{ type: String }],
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedAt: { type: Date },
  // §19/§32: PACS linkage + human-readable numbers for the master search.
  studyNumber: { type: String, default: '', index: true },
  reportNumber: { type: String, default: '', index: true },
  studyUid: { type: String, default: '', index: true },
  prepInstructions: { type: String, default: '' },
  // §5 cancel flow: set when a PAID charge is refunded on cancellation.
  refundFlag: { type: Boolean, default: false },
  // §19: DICOM transfer bookkeeping for the frontend study list.
  dicomStudy: {
    studyUid: { type: String, default: '' },
    seriesCount: { type: Number, default: 0 },
    transferStatus: { type: String, enum: ['', 'Pending', 'Transferring', 'Completed', 'Failed'], default: '' },
    storageStatus: { type: String, enum: ['', 'Online', 'Nearline', 'Archived'], default: '' },
    linkedAt: { type: Date },
    linkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },

  // Safety & Pre-scan Screening (MRI / CT Contrast / Pregnancy)
  safetyScreening: {
    isScreened: { type: Boolean, default: false },
    screenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    screenedAt: { type: Date },
    hasPacemakerOrMetalImplant: { type: Boolean, default: false },
    hasRenalImpairment: { type: Boolean, default: false },
    serumCreatinine: { type: Number },
    eGfr: { type: Number },
    contrastAllergyHistory: { type: Boolean, default: false },
    isPregnant: { type: Boolean, default: false },
    clearedForScan: { type: Boolean, default: false },
    clearanceNotes: { type: String, default: '' },
  },

  // Critical Finding Escalation
  criticalFinding: {
    isCritical: { type: Boolean, default: false },
    findingDetails: { type: String, default: '' },
    urgencyLevel: { type: String, enum: ['Red - Immediate 15min', 'Orange - Urgent 1hr', 'Yellow - Same day', ''], default: '' },
    communicatedToDoctor: { type: Boolean, default: false },
    communicatedAt: { type: Date },
    acknowledgedByDoctor: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    escalationNotes: { type: String, default: '' },
    // §21: escalation/closure lifecycle for the critical-findings queue.
    escalatedAt: { type: Date },
    escalatedTo: { type: String, default: '' },
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    outcome: { type: String, default: '' },
  },

  // §15: pre-scan preparation checklist (consent, missing info, holds).
  preparation: {
    checklist: [{
      item: { type: String, required: true },
      done: { type: Boolean, default: false },
      doneAt: { type: Date },
      doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
    missingInfo: [{ type: String, default: '' }],
    consentTaken: { type: Boolean, default: false },
    hold: { type: Boolean, default: false },
    holdReason: { type: String, default: '' },
    ready: { type: Boolean, default: false },
    readyAt: { type: Date },
  },

  // §10 CT: contrast administration record (agent, dose, route, reaction).
  contrast: {
    agent: { type: String, default: '' },
    volumeMl: { type: Number, min: 0 },
    route: { type: String, default: '' },
    givenAt: { type: Date },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reaction: { type: String, default: '' },
  },

  // Report Versioning & Amendments (Prevent silent overwrite)
  reportVersions: [{
    versionNumber: { type: Number, required: true },
    findings: { type: String },
    impression: { type: String },
    recommendation: { type: String },
    amendmentReason: { type: String },
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signedAt: { type: Date, default: Date.now },
  }],

  cancellationReason: { type: String },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // File 09 §9.1/F5: consult/order lineage (optional, backfilled by script).
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  // File 22 P0-4: admitted stay linkage so IPD bills roll up radiology charges.
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

radiologySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (typeof next === 'function') next();
});

export default mongoose.model('Radiology', radiologySchema);