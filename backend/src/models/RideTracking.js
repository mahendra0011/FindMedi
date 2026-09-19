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
});

export default mongoose.model('RideTracking', rideTrackingSchema);
