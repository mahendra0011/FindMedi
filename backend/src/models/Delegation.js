import mongoose from 'mongoose';

/** File 13 §13.2: time-boxed approval delegation (toUser acts as fromUser's role). */
const delegationSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope: { type: String, default: 'all' },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Delegation || mongoose.model('Delegation', delegationSchema);
