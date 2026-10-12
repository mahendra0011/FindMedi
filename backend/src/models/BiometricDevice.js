import mongoose from 'mongoose';

const biometricDeviceSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  deviceName: { type: String, required: true, maxlength: 200 },
  deviceType: {
    type: String,
    enum: ['ZKTeco', 'eSSL', 'Realtime', 'Mantra', 'Suprema', 'Generic TCP', 'Web API'],
    default: 'Generic TCP',
  },
  ipAddress: { type: String, maxlength: 45 },
  port: { type: Number, min: 1, max: 65535 },
  location: { type: String, maxlength: 200 },
  department: { type: String, maxlength: 100 },
  status: {
    type: String,
    enum: ['Online', 'Offline', 'Maintenance', 'Disabled'],
    default: 'Offline',
    index: true,
  },
  lastSyncAt: { type: Date },
  lastPingAt: { type: Date },
  serialNumber: { type: String, maxlength: 100 },
  firmwareVersion: { type: String, maxlength: 50 },
  apiEndpoint: { type: String, maxlength: 500 },
  authKey: { type: String, maxlength: 500 },
  syncIntervalMinutes: { type: Number, min: 1, default: 5 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

biometricDeviceSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.BiometricDevice || mongoose.model('BiometricDevice', biometricDeviceSchema);
