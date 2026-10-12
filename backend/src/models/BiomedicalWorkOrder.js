import mongoose from 'mongoose';

const biomedicalWorkOrderSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiomedicalAsset', required: true, index: true },
    ticketType: {
      type: String,
      enum: ['BREAKDOWN', 'PPM', 'CALIBRATION', 'SAFETY_TEST'],
      default: 'BREAKDOWN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
      index: true,
    },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedAt: { type: Date, default: Date.now },
    symptomDescription: { type: String, required: true, trim: true },
    assignedEngineerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
    rootCauseAnalysis: { type: String, trim: true, default: '' },
    sparesConsumed: [
      {
        partName: { type: String, required: true },
        partNumber: { type: String, default: '' },
        cost: { type: Number, default: 0 },
        qty: { type: Number, default: 1 },
      },
    ],
    rectifiedAt: { type: Date },
    downtimeMinutes: { type: Number, default: 0 },
    electricalSafetyTestPassed: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['REPORTED', 'IN_PROGRESS', 'AWAITING_SPARES', 'RESOLVED', 'CLOSED'],
      default: 'REPORTED',
      index: true,
    },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.BiomedicalWorkOrder || mongoose.model('BiomedicalWorkOrder', biomedicalWorkOrderSchema);
