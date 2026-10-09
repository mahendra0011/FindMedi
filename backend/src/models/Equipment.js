import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // subcatogary.md C24 — original 13 plus the §24 additions (ventilator,
  // defibrillator, pumps, dialysis, OT gear, monitors…). A1 #13: Radiology
  // modality and this list now cover the same equipment (DEXA, PET Scan).
  type: {
    type: String,
    enum: [
      'MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'ECG', 'EEG', 'Mammography',
      'DEXA', 'PET Scan', 'Lab Analyzer', 'Centrifuge', 'Microscope', 'Other',
      // §24 additions
      'Ventilator', 'Defibrillator', 'Infusion Pump', 'Dialysis Machine',
      'Autoclave', 'Anaesthesia Machine', 'Patient Monitor',
      'OT Table/Lights', 'C-Arm', 'Portable USG/X-Ray', 'Suction',
      'Nebuliser', 'Warmer/Incubator',
      // A2 also calls for Fluoroscopy (pairs with Radiology.modality) and
      // a generic bucket for ambulance-borne kit.
      'Fluoroscopy', 'Ambulance Equipment',
    ],
    required: true,
  },
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
  // File 22 P1-19: AMC/warranty/calibration/criticality + contract linkage.
  warrantyTill: { type: Date, default: null },
  amcVendor: { type: String, default: '' },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null, index: true },
  calibrationDue: { type: Date, default: null },
  nextPmDue: { type: Date, default: null },
  criticality: { type: String, enum: ['Low', 'Medium', 'High', 'LifeSupport'], default: 'Medium' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

equipmentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Equipment', equipmentSchema);
