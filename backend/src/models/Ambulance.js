import mongoose from 'mongoose';

const ambulanceSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
    index: true,
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  vehicleModel: { type: String, default: '' },
  ambulanceType: {
    type: String,
    enum: ['BLS', 'ALS', 'PATIENT_TRANSPORT', 'MORTUARY'],
    default: 'BLS',
  },
  equipmentLevel: { type: String, default: '' }, // e.g. "Oxygen, Defibrillator, Ventilator"

  currentDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null,
  },
  currentDriverPhone: { type: String, default: '' },

  // Ambulance login (Doc 02) — User(role=ambulance) linked profile
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true, index: true },
  driverName: { type: String, default: '' },
  driverPhone: { type: String, default: '' },
  loginEmail: { type: String, default: '', lowercase: true, trim: true },
  loginStatus: { type: String, enum: ['none', 'invited', 'active'], default: 'none', index: true },
  lastPingAt: { type: Date, default: null },
  currentEmergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest', default: null },

  isOnline: { type: Boolean, default: false, index: true },
  isOnDuty: { type: Boolean, default: false, index: true },
  emergencySupport: { type: Boolean, default: true, index: true },

  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude] — undefined until first GPS ping (never default Jabalpur)
      default: undefined,
    },
    accuracy: { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },

  // §8 ambulance ops master.
  settings: {
    lifeSupportTier: { type: String, enum: ['BLS', 'ALS', 'PTV', 'NICU'], default: 'BLS' },
    oxygenOk: { type: Boolean, default: false },
    aedOk: { type: Boolean, default: false },
    suctionOk: { type: Boolean, default: false },
    spineBoardOk: { type: Boolean, default: false },
    emtOnBoard: { type: Boolean, default: false },
    baseDispatchFee: { type: Number, default: 0, min: 0 },
    perKmRate: { type: Number, default: 0, min: 0 },
    oxygenFee: { type: Number, default: 0, min: 0 },
    erAutoAlert: { type: Boolean, default: true },
    maxRadiusKm: { type: Number, default: 25, min: 0 },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ambulanceSchema.index({ 'currentLocation.coordinates': '2dsphere' });

ambulanceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Ambulance', ambulanceSchema);
