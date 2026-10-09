import mongoose from 'mongoose';

/** File 16 §16.1: RCM event ledger (stage transitions with amounts). */
const rcmEventSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  stage: {
    type: String, required: true, index: true,
    enum: ['scheduled', 'checked_in', 'authorized', 'serviced', 'coded', 'billed', 'claimed', 'paid', 'denied', 'appealed', 'written_off'],
  },
  entityRef: { model: { type: String, default: '' }, id: { type: mongoose.Schema.Types.ObjectId, default: null } },
  amount: { type: Number, default: 0 },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  at: { type: Date, default: Date.now },
}, { timestamps: true });

rcmEventSchema.index({ hospitalId: 1, stage: 1, at: -1 });

export default mongoose.models.RcmEvent || mongoose.model('RcmEvent', rcmEventSchema);
