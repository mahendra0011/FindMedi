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
  // File 09 §9.1/F5: consult/order lineage (optional, backfilled by script).
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

radiologySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Radiology', radiologySchema);