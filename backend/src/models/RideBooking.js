import mongoose from 'mongoose';

const rideBookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    index: true,
    default: () => `RID-${Math.floor(100000 + Math.random() * 900000)}`,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null,
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'e_rickshaw', 'car', 'van'],
    required: true,
    index: true,
  },
  isEmergency: {
    type: Boolean,
    default: false,
    index: true,
  },
  pickup: {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  drop: {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  distanceKm: { type: Number, default: 0 },
  durationMin: { type: Number, default: 0 },
  fare: {
    base: { type: Number, default: 0 },
    distanceCharge: { type: Number, default: 0 },
    surge: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  pickupOtp: {
    type: String,
    default: () => Math.floor(1000 + Math.random() * 9000).toString(),
  },
  status: {
    type: String,
    enum: [
      'searching',
      'accepted',
      'rider_arriving',
      'arrived',
      'in_progress',
      'completed',
      'cancelled_by_user',
      'cancelled_by_rider',
      'no_riders_found',
    ],
    default: 'searching',
    index: true,
  },
  statusHistory: [
    {
      status: { type: String },
      at: { type: Date, default: Date.now },
      note: { type: String, default: '' },
    },
  ],
  dispatchAttempts: [
    {
      riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      distanceKm: { type: Number },
      sentAt: { type: Date, default: Date.now },
      respondedAt: { type: Date },
      outcome: { type: String, enum: ['pending', 'accepted', 'rejected', 'timeout'], default: 'pending' },
    },
  ],
  currentDispatchRadius: { type: Number, default: 5 },
  // File 03 §2 — generic instant-dispatch wave fields (mirrors LawyerBooking/
  // AssistantBooking). Used when a ride is driven via instantDispatchService;
  // the legacy sequential path (dispatchAttempts) keeps working as-is.
  notified: [{ providerId: String, userId: String, _id: false }],
  everNotified: [{ providerId: String, _id: false }],
  acceptances: [{ providerId: String, distanceKm: Number, acceptedAt: { type: Date, default: Date.now }, _id: false }],
  rejections: [{ type: String }],
  windowEndsAt: { type: Date, default: null },
  currentSearchRadiusKm: { type: Number, default: 5 },
  dispatchLog: [{
    radiusKm: Number,
    candidateCount: Number,
    outcome: { type: String, enum: ['assigned', 'no_response', 'no_acceptance', 'escalated'] },
    timestamp: { type: Date, default: Date.now },
  }],
  payment: {
    method: { type: String, enum: ['demo_wallet', 'cash', 'pending', ''], default: 'pending' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    transactionRef: { type: String, default: '' },
    paidAt: { type: Date },
  },
  ratingByUser: {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date },
  },
  ratingByRider: {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date },
  },
  cancellationReason: { type: String, default: '' },
  cancelledBy: { type: String, enum: ['user', 'rider', 'system', ''], default: '' },
  acceptedAt: { type: Date },
  arrivedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

rideBookingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('RideBooking', rideBookingSchema);
