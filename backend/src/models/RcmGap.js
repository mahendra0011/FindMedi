import mongoose from 'mongoose';

/** File 16 §16.1: open revenue control gaps (closed explicitly, never deleted). */
const rcmGapSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  kind: {
    type: String, required: true, index: true,
    enum: ['auth_pending', 'uncoded', 'unbilled', 'unclaimed', 'denial_open', 'ar_90', 'writeoff_review', 'settlement_pending'],
  },
  entityRef: { model: { type: String, default: '' }, id: { type: mongoose.Schema.Types.ObjectId, default: null } },
  amount: { type: Number, default: 0 },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  ownerRole: { type: String, default: '' },
}, { timestamps: true });

rcmGapSchema.index({ hospitalId: 1, closedAt: 1 });

export default mongoose.models.RcmGap || mongoose.model('RcmGap', rcmGapSchema);
