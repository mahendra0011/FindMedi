import mongoose from 'mongoose';

/** File 22 P0-6: equipment maintenance log (PM/calibration/repair). */
const assetMaintenanceSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  assetUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetUnit', default: null, index: true },
  equipmentName: { type: String, default: '', maxlength: 200 },
  kind: { type: String, enum: ['preventive', 'calibration', 'repair', 'inspection'], required: true, index: true },
  dueDate: { type: Date, default: null },
  doneDate: { type: Date, default: null },
  vendor: { type: String, default: '' },
  cost: { type: Number, default: 0, min: 0 },
  reportUrl: { type: String, default: '' },
  status: { type: String, enum: ['Scheduled', 'Done', 'Overdue', 'Cancelled'], default: 'Scheduled', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetMaintenanceSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.AssetMaintenance || mongoose.model('AssetMaintenance', assetMaintenanceSchema);
