import mongoose from 'mongoose';

/**
 * Checklist §2: ambulance trip sheet — one row per dispatch (who, from/to,
 * odometer in/out, patient carried). Odometer deltas feed the fuel-log
 * sanity check; the trip is the auditable unit, not the individual log line.
 */
export const TRIP_STATUS = ['ongoing', 'completed', 'cancelled'];

const ambulanceTripSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  emergencyRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest', default: null },
  fromLocation: { type: String, trim: true, maxlength: 300, required: true },
  toLocation: { type: String, trim: true, maxlength: 300, required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  odometerStartKm: { type: Number, min: 0 },
  odometerEndKm: { type: Number, min: 0 },
  status: { type: String, enum: TRIP_STATUS, default: 'ongoing', index: true },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true });

ambulanceTripSchema.index({ ambulanceId: 1, startedAt: -1 });

/**
 * Checklist §2: vehicle running log — fuel / maintenance / inspection lines.
 * `litres` and `costInr` are fuel-specific; odometer is the shared sanity
 * anchor (a fuel fill between two odometer readings that does not move the
 * odometer is either a mis-entry or a fuel-theft signal).
 */
export const VEHICLE_LOG_TYPES = ['fuel', 'maintenance', 'inspection', 'insurance', 'other'];

const ambulanceVehicleLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true, index: true },
  type: { type: String, enum: VEHICLE_LOG_TYPES, required: true, index: true },
  at: { type: Date, default: Date.now, index: true },
  odometerKm: { type: Number, min: 0 },
  litres: { type: Number, min: 0 },
  costInr: { type: Number, min: 0 },
  vendor: { type: String, trim: true, maxlength: 200, default: '' },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

ambulanceVehicleLogSchema.index({ ambulanceId: 1, at: -1 });

export const AmbulanceTrip = mongoose.models.AmbulanceTrip || mongoose.model('AmbulanceTrip', ambulanceTripSchema);
export const AmbulanceVehicleLog = mongoose.models.AmbulanceVehicleLog || mongoose.model('AmbulanceVehicleLog', ambulanceVehicleLogSchema);
