import mongoose from 'mongoose';

const emergencyDoctorRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  bookingId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    default: () => `DOC-SOS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
  },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, default: '' },
  patientPhone: { type: String, default: '' },
  patientAge: { type: Number, default: null },
  patientGender: { type: String, default: '' },
  bloodGroup: { type: String, default: 'Unknown' },
  emergencyCategory: { type: String, default: 'General Medical Emergency' },
  symptomsDescription: { type: String, default: '' },
  severity: { type: String, default: 'Severe' },
  pickupAddress: { type: String, default: '' },
  landmark: { type: String, default: '' },
  pricing: {
    consultationFee: { type: Number, default: 800 },
    emergencySurcharge: { type: Number, default: 200 },
    total: { type: Number, default: 1000 },
  },
  timeline: [
    {
      stage: { type: String },
      timestamp: { type: Date, default: Date.now },
      note: { type: String, default: '' },
      coordinates: { type: [Number] },
    },
  ],
  transitDistanceKm: { type: Number, default: 0 },
  estimatedArrivalMinutes: { type: Number, default: 0 },
  doctorLiveLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    updatedAt: { type: Date, default: Date.now },
  },

  patientDetails: {
    name: { type: String, default: '' },
    age: { type: Number, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    phone: { type: String, default: '' },
  },

  symptomCategory: {
    type: String,
    enum: ['chest_pain', 'high_fever', 'breathing_issue', 'severe_pain', 'injury', 'mental_health_crisis', 'other'],
    default: 'other',
  },
  symptomNote: { type: String, default: '', maxlength: 300 },

  consultationMode: {
    type: String,
    enum: ['video', 'audio', 'chat', 'home_visit'],
    default: 'video',
  },

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
    address: { type: String, default: '' },
  },
  pickupLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [79.9864, 23.1815] },
  },

  status: {
    type: String,
    enum: ['searching', 'assigned', 'in_progress', 'completed', 'cancelled_by_user', 'no_responders_found'],
    default: 'searching',
    index: true,
  },

  currentSearchRadiusKm: { type: Number, default: 10 },
  assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date, default: null },

  notified: [{ providerId: String, userId: String, _id: false }],
  everNotified: [{ providerId: String, _id: false }],
  acceptances: [{ providerId: String, distanceKm: Number, acceptedAt: { type: Date, default: Date.now }, _id: false }],
  windowEndsAt: { type: Date, default: null },
  dispatchLog: [{
    radiusKm: Number,
    candidateCount: Number,
    outcome: { type: String, enum: ['assigned', 'no_response', 'no_acceptance', 'escalated'] },
    timestamp: { type: Date, default: Date.now },
  }],

  fee: { type: Number, default: 0 },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },

  cancelledAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

emergencyDoctorRequestSchema.index({ location: '2dsphere' });
emergencyDoctorRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('EmergencyDoctorRequest', emergencyDoctorRequestSchema);
