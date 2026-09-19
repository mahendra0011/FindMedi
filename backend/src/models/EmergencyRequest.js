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

  dispatchLog: [
    {
      radiusKm: Number,
      phase: { type: String, enum: ['ambulance', 'vehicle'] },
      candidateCount: Number,
      acceptedProviderIds: [String],
      outcome: { type: String, enum: ['assigned', 'no_response', 'escalated'] },
      at: { type: Date, default: Date.now },
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