import mongoose from 'mongoose';

const radiologySchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  modality: { type: String, enum: ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Echo', 'ECG', 'Mammography'], required: true },
  bodyPart: { type: String, required: true },
  clinicalHistory: { type: String },
  priority: { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' },
  status: { type: String, enum: ['Ordered', 'Scheduled', 'In Progress', 'Completed', 'Reported', 'Delivered'], default: 'Ordered' },
  scheduledAt: { type: Date },
  performedAt: { type: Date },
  performedBy: { type: String },
  findings: { type: String },
  impression: { type: String },
  recommendation: { type: String },
  reportUrl: { type: String },
  imageUrls: [{ type: String }],
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedAt: { type: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

radiologySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Radiology', radiologySchema);