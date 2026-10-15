import mongoose from 'mongoose';

const rideTrackingSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideBooking',
    required: true,
    index: true,
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// 30-day retention window per RETENTION.md (dispute window)
rideTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('RideTracking', rideTrackingSchema);
