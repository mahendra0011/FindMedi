import mongoose from 'mongoose';

const insuranceSchema = new mongoose.Schema({
  claimId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  insuranceProvider: { type: String, required: true },
  policyNumber: { type: String, required: true },
  insuranceId: { type: String },
  tpaName: { type: String },
  tpaContact: { type: String },
  coverageType: { type: String, enum: ['Cashless', 'Reimbursement'], default: 'Cashless' },
  preAuthAmount: { type: Number },
  preAuthStatus: { type: String, enum: ['Not Required', 'Pending', 'Approved', 'Partially Approved', 'Rejected'], default: 'Not Required' },
  preAuthDate: { type: Date },
  preAuthExpiry: { type: Date },
  claimAmount: { type: Number },
  approvedAmount: { type: Number },
  claimStatus: { type: String, enum: ['Not Filed', 'Filed', 'Processing', 'Settled', 'Rejected'], default: 'Not Filed' },
  claimDate: { type: Date },
  settlementDate: { type: Date },
  documents: [{ name: String, url: String }],
  diagnosis: { type: String },
  treatmentPlan: { type: String },
  estimatedCost: { type: Number },
  remarks: { type: String },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

insuranceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Insurance', insuranceSchema);