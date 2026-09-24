import mongoose from 'mongoose';

const riderProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  role: { type: String, default: 'rider' },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    index: true,
  },
  govtIdType: {
    type: String,
    enum: ['Aadhaar', 'PAN', 'Voter ID', 'Passport'],
    required: true,
  },
  govtIdNumber: { type: String, required: true },
  govtIdDocUrl: { type: String, default: '' },
  drivingLicenseNumber: { type: String, required: true },
  drivingLicenseDocUrl: { type: String, default: '' },
  drivingLicenseExpiry: { type: Date, required: true },
  bankDetails: {
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    upiId: { type: String, default: '' },
  },
  operatingArea: { type: String, default: '' },
  operatingCity: { type: String, default: 'Jabalpur', index: true },
  availableDays: [{ type: String }],
  availableTimeSlot: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '20:00' },
  },
  riderStatus: {
    type: String,
    enum: ['pending_approval', 'active', 'rejected', 'suspended'],
    default: 'pending_approval',
    index: true,
  },
  rejectionReason: { type: String, default: '' },
  isOnline: { type: Boolean, default: false, index: true },
  emergencySupport: { type: Boolean, default: false, index: true },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [79.9864, 23.1815], // Default Jabalpur / center
    },
    lat: { type: Number, default: 23.1815 },
    lng: { type: Number, default: 79.9864 },
    accuracy: { type: Number, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  rating: {
    avg: { type: Number, default: 5.0 },
    count: { type: Number, default: 0 },
  },
  totalEarnings: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  cancellationStrikes: { type: Number, default: 0 },
  // R-9: re-uploaded KYC docs (docType → { url, status, uploadedAt }).
  docs: { type: Object, default: {} },
  // §8 rider ops master.
  settings: {
    waitMinutes: { type: Number, default: 5, min: 0 },
    noShowFee: { type: Number, default: 50, min: 0 },
    lateRefund: { type: Boolean, default: true },
    acAvailable: { type: Boolean, default: false },
    wheelchairFit: { type: Boolean, default: false },
    transferScope: { type: String, enum: ['local', 'regional', 'intercity'], default: 'local' },
    payoutUpi: { type: String, default: '' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

riderProfileSchema.index({ 'currentLocation.coordinates': '2dsphere' });

riderProfileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.currentLocation?.lat != null && this.currentLocation?.lng != null) {
    this.currentLocation.coordinates = [Number(this.currentLocation.lng), Number(this.currentLocation.lat)];
  }
  next();
});

export default mongoose.model('RiderProfile', riderProfileSchema);
