import mongoose from 'mongoose';

const labOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  // File 22 P1-11: accession number (barcode identity of the sample set).
  accessionNo: { type: String, default: '', index: true },
  tests: [{
    testName: { type: String, required: true },
    category: { type: String, enum: ['Blood', 'Urine', 'Stool', 'Imaging', 'Cardiac', 'Other'], default: 'Blood' },
    priority: { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' },
    status: { type: String, enum: ['Ordered', 'Sample Needed', 'Sample Collected', 'Processing', 'Completed', 'Verified', 'Report Delivered', 'Rejected', 'Recollect'], default: 'Ordered' },
    sampleId: { type: String },
    sampleType: { type: String },
    sampleCollectedAt: { type: Date },
    collectedBy: { type: String },
    resultValue: { type: String },
    // File 22 P1-11: structured refs + flags (copied from Test master at order).
    refLow: { type: Number, default: null },
    refHigh: { type: Number, default: null },
    criticalLow: { type: Number, default: null },
    criticalHigh: { type: Number, default: null },
    flag: { type: String, enum: ['', 'H', 'L', 'HH', 'LL'], default: '' },
    prevValue: { type: String, default: '' },
    deltaPct: { type: Number, default: null },
    deltaFlag: { type: Boolean, default: false },
    recollectReason: { type: String, default: '' },
    recollectCount: { type: Number, default: 0 },
    outsourced: {
      lab: { type: String, default: '' },
      sentAt: { type: Date, default: null },
      receivedAt: { type: Date, default: null },
    },
    normalRange: { type: String },
    unit: { type: String },
    isAbnormal: { type: Boolean, default: false },
    isCritical: { type: Boolean, default: false },
    resultEnteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resultEnteredAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // LAB-B-07: the releasing role is stored so a later audit can prove that
    // verification was performed by a reviewing role, not merely a different user
    // id from the same shift.
    verifiedByRole: { type: String },
    verifiedAt: { type: Date },
    verificationNotes: { type: String },
    rejectionReason: { type: String },
  }],
  clinicalNotes: { type: String },
  status: {
    type: String,
    enum: ['Ordered', 'Sample Pending', 'Processing', 'Under Verification', 'Completed', 'Partially Completed', 'Cancelled'],
    default: 'Ordered',
  },
  priority: { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' },
  sampleIds: [{ type: String }],
  reportUrl: { type: String },
  isBilled: { type: Boolean, default: false },
  billAmount: { type: Number, default: 0 },
  // File 22 P1-11: critical-result call-back log (who was told, when).
  criticalCallbacks: [{
    testName: { type: String, default: '' },
    calledTo: { type: String, default: '' },
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
    notes: { type: String, default: '', maxlength: 500 },
  }],
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // File 09 §9.1/F5: consult/order lineage (optional, backfilled by script).
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  // File 22 P0-4: admitted stay linkage so IPD bills roll up lab charges.
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null, index: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  // Doc 11 §4: ordering-doctor review ack (verify stays pathologist-only).
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

labOrderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  const testStatuses = this.tests.map(t => t.status);
  if (testStatuses.every(s => s === 'Verified' || s === 'Report Delivered')) {
    this.status = 'Completed';
  } else if (testStatuses.some(s => s === 'Verified' || s === 'Report Delivered')) {
    this.status = 'Partially Completed';
  } else if (testStatuses.some(s => s === 'Processing' || s === 'Completed')) {
    this.status = 'Processing';
  } else if (testStatuses.some(s => s === 'Sample Collected')) {
    this.status = 'Sample Pending';
  }
  next();
});

export default mongoose.model('LabOrder', labOrderSchema);