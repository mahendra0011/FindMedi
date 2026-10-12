import mongoose from 'mongoose';

const biometricLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiometricDevice', required: true, index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  punchTime: { type: Date, required: true, index: true },
  punchType: {
    type: String,
    enum: ['Fingerprint', 'Face', 'Card', 'PIN', 'RFID', 'Palm'],
    default: 'Fingerprint',
  },
  punchResult: {
    type: String,
    enum: ['Success', 'Failed', 'Duplicate', 'Unknown User'],
    default: 'Success',
  },
  workCode: { type: String, maxlength: 50 },
  rawPayload: { type: String, maxlength: 2000 },
  syncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

biometricLogSchema.index({ hospitalId: 1, punchTime: -1 });
biometricLogSchema.index({ hospitalId: 1, staffId: 1, punchTime: -1 });

export default mongoose.models.BiometricLog || mongoose.model('BiometricLog', biometricLogSchema);
