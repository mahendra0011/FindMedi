import mongoose from 'mongoose';

const sosVehicleSettingsSchema = new mongoose.Schema({
  radiusSteps: { type: [Number], default: [5, 10, 15, 20] },
  windowSeconds: { type: Number, default: 30 },
  maxRetriesPerRadius: { type: Number, default: 3 },
  retryPauseSeconds: { type: Number, default: 3 },
  includeAmbulanceInAutoVehicleMode: { type: Boolean, default: false },
}, { timestamps: true });

// NOTE (index audit): intentionally index-free. Every read is
// `SOSVehicleSettings.findOne()` with NO filter (routes/adminSosSettings.js,
// routes/emergencySOS.js, services/sosVehicleService.js) — singleton config
// document, nothing for an index to serve.
export default mongoose.model('SOSVehicleSettings', sosVehicleSettingsSchema);
