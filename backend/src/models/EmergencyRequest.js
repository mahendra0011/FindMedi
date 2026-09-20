import mongoose from 'mongoose';

const emergencyRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  reporterMode: {
    type: String,
    enum: ['self', 'other'],
    required: true,
  },

  patientDetails: {
    name: { type: String, default: '' },
    age: { type: Number, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    bloodGroup: { type: String, default: '' },
    knownAllergies: { type: String, default: '' },
    knownConditions: { type: String, default: '' },
    phone: { type: String, default: '' },
  },

  reporterOwnDetailsShared: { type: Boolean, default: false },
  reporterDetails: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
  },

  category: {
    type: String,
    enum: ['accident', 'heart_attack', 'breathing_issue', 'burn', 'fall', 'stroke', 'other', ''],
    default: '',
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: { type: String, default: '' },
    accuracy: { type: Number, default: null }, // meters, from navigator.geolocation
  },

  status: {
    type: String,
    enum: [
      'searching',
      'assigned',
      'en_route',
      'completed',
      'cancelled_by_user',
      'no_responders_found',
    ],
    default: 'searching',
    index: true,
  },

  requestMode: {
    type: String,
    enum: ['manual_select', 'auto_select_vehicle', 'auto_select_ambulance'],
    default: 'manual_select',
  },

  selectedVehicleTypes: [{
    type: String,
    enum: ['auto', 'e_rickshaw', 'car', 'van', 'ambulance'],
  }],

  autoBookEnabled: { type: Boolean, default: false },

  autoFindEnabled: { type: Boolean, default: false },

  startingRadiusKm: { type: Number, default: 5 },

  currentSearchRadiusKm: { type: Number, default: 5 },
  currentSearchPhase: {
    type: String,
    enum: ['ambulance', 'vehicle'],
    default: 'ambulance',
  },

  // Assignment details
  assignedProviderId: { type: mongoose.Schema.Types.ObjectId, default: null },
  assignedProviderType: {
    type: String,
    enum: ['ambulance', 'rider', null],
    default: null,
  },
  assignedVehicleType: { type: String, default: null }, // Only set when providerType === 'rider'
  assignedHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    default: null,
  }, // Only set when providerType === 'ambulance'
  assignedAt: { type: Date, default: null },

  // Final destination hospital chosen by driver/responder
  selectedHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    default: null,
  },

  // Wave state (Doc 01 §4): who was notified + who accepted in current window
  notified: [{
    providerId: String,
    providerType: { type: String, enum: ['ambulance', 'rider'] },
    userId: String,
    _id: false,
  }],
  // Permanent list: is request me ab tak kitne providerId ko alert gaya (cross-wave exclude)
  everNotified: [{
    providerId: String,
    _id: false,
  }],
  acceptances: [{
    providerId: String,
    providerType: String,
    userId: String,
    distanceKm: Number,
    acceptedAt: { type: Date, default: Date.now },
    _id: false,
  }],
  rejections: [String],
  windowEndsAt: { type: Date, default: null },

  // Driver-side granular progress (dashboard stepper ↔ patient tracking sync)
  progressStage: {
    type: String,
    enum: ['assigned', 'reached_pickup', 'heading_to_hospital', 'reached_hospital', 'completed'],
    default: 'assigned',
  },
  progressLog: [{
    stage: String,
    at: { type: Date, default: Date.now },
    _id: false,
  }],

  // Detailed dispatch history (radius, attempts, outcomes)
  dispatchLog: [
    {
      radiusKm: Number,
      phase: { type: String, enum: ['ambulance', 'vehicle'] },
      attemptNumber: { type: Number, default: 1 }, // 1, 2, 3... auto-find mode ke liye
      candidateCount: Number,
      acceptedProviderIds: [String],
      outcome: { type: String, enum: ['assigned', 'no_response', 'escalated', 'booked'] },
      timestamp: { type: Date, default: Date.now },
    },
  ],

  cancelledAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

emergencyRequestSchema.index({ location: '2dsphere' });

emergencyRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('EmergencyRequest', emergencyRequestSchema);