import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'ECG', 'EEG', 'Mammography', 'DEXA', 'PET Scan', 'Lab Analyzer', 'Centrifuge', 'Microscope', 'Other'], required: true },
  model: { type: String },
  serialNumber: { type: String },
  manufacturer: { type: String },
  installationDate: { type: Date },
  lastMaintenanceDate: { type: Date },
  nextMaintenanceDate: { type: Date },
  maintenanceInterval: { type: Number, default: 90 },
  status: { type: String, enum: ['Operational', 'Under Maintenance', 'Out of Service', 'Retired'], default: 'Operational' },
  location: { type: String },
  notes: { type: String },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

equipmentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Equipment', equipmentSchema);
