import mongoose from 'mongoose';

const sosVehicleSettingsSchema = new mongoose.Schema({
  radiusSteps: { type: [Number], default: [5, 10, 15, 20] },
  windowSeconds: { type: Number, default: 30 },
  maxRetriesPerRadius: { type: Number, default: 3 },
  retryPauseSeconds: { type: Number, default: 3 },
  includeAmbulanceInAutoVehicleMode: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('SOSVehicleSettings', sosVehicleSettingsSchema);
