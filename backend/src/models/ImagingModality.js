import mongoose from 'mongoose';

const imagingModalitySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true }, // e.g., 'Siemens Magnetom 3T MRI', 'GE Revolution 128 CT'
  code: { type: String, required: true, uppercase: true }, // e.g. 'MRI-01', 'CT-01', 'XRAY-01'
  modalityType: {
    type: String,
    enum: ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'Doppler', 'Mammography', 'OPG/CBCT', 'Fluoroscopy', 'Echo', 'DEXA', 'Nuclear Scan', 'PET Scan'],
    required: true,
  },
  roomNumber: { type: String, default: '' },
  machineModel: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  dicomAETitle: { type: String, default: '' },
  dicomPort: { type: Number, default: 4242 },
  status: {
    type: String,
    // 'Inactive' = soft-deleted master row (kept for study/appointment history).
    enum: ['Available', 'In Use', 'Under Maintenance', 'Out of Service', 'Inactive'],
    default: 'Available',
  },
  slotDurationMinutes: { type: Number, default: 30 },
  requiresContrastScreening: { type: Boolean, default: false },
  requiresImplantCheck: { type: Boolean, default: false },
  dailyCapacity: { type: Number, default: 20 },
  operatingHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '20:00' },
  },
  isActive: { type: Boolean, default: true },

  // §6 modality master: scheduling/commercial/servicing metadata so the
  // scheduler, prep checklist and HIS billing all read from one record.
  supportedStudies: [{ type: String, default: '' }],
  prepRules: [{ type: String, default: '' }],
  reportTemplates: [{ type: String, default: '' }],
  price: { type: Number, default: 0, min: 0 },
  insuranceRate: { type: Number, default: 0, min: 0, max: 100 },
  workingHours: {
    open: { type: String, default: '08:00' },
    close: { type: String, default: '20:00' },
    days: [{ type: String, default: 'Mon' }],
  },
  maintenanceScheduleDays: { type: Number, default: 90 },
  assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedEquipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
}, { timestamps: true });

imagingModalitySchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export default mongoose.model('ImagingModality', imagingModalitySchema);
