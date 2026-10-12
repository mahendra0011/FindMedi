import mongoose from 'mongoose';

const biomedicalAssetSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    assetTag: { type: String, required: true, trim: true, index: true },
    equipmentName: { type: String, required: true, trim: true },
    manufacturer: { type: String, required: true, trim: true },
    modelNumber: { type: String, trim: true, default: '' },
    serialNumber: { type: String, required: true, trim: true },
    criticalityCategory: {
      type: String,
      enum: ['A', 'B', 'C'], // A: Life support (15m SLA), B: Diagnostic (2h), C: Monitoring (6h)
      default: 'B',
      index: true,
    },
    department: { type: String, required: true, trim: true },
    locationRoom: { type: String, trim: true, default: '' },
    dateOfInstallation: { type: Date, default: Date.now },
    purchaseCost: { type: Number, default: 0 },
    contractType: {
      type: String,
      enum: ['WARRANTY', 'AMC', 'CMC', 'IN_HOUSE'],
      default: 'WARRANTY',
    },
    contractVendorName: { type: String, trim: true, default: '' },
    contractExpiryDate: { type: Date },
    ppmFrequencyMonths: { type: Number, default: 3 },
    lastPpmDate: { type: Date },
    nextPpmDueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['OPERATIONAL', 'BREAKDOWN', 'UNDER_MAINTENANCE', 'CONDEMNED'],
      default: 'OPERATIONAL',
      index: true,
    },
    totalUptimePercent: { type: Number, default: 100 },
    breakdownCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

biomedicalAssetSchema.index({ hospitalId: 1, assetTag: 1 }, { unique: true });

export default mongoose.models.BiomedicalAsset || mongoose.model('BiomedicalAsset', biomedicalAssetSchema);
