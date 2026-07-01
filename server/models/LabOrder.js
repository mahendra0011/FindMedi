import mongoose from 'mongoose';

const labOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  tests: [{
    testName: { type: String, required: true },
    category: { type: String, enum: ['Blood', 'Urine', 'Stool', 'Imaging', 'Cardiac', 'Other'], default: 'Blood' },
    priority: { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' },
    status: { type: String, enum: ['Ordered', 'Sample Needed', 'Sample Collected', 'Processing', 'Completed', 'Verified', 'Report Delivered'], default: 'Ordered' },
    sampleId: { type: String },
    sampleType: { type: String },
    sampleCollectedAt: { type: Date },
    collectedBy: { type: String },
    resultValue: { type: String },
    normalRange: { type: String },
    unit: { type: String },
    isAbnormal: { type: Boolean, default: false },
    isCritical: { type: Boolean, default: false },
    resultEnteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resultEnteredAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

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