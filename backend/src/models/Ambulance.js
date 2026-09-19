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
      type: [Number], // [longitude, latitude]
      default: [79.9864, 23.1815], // Default center
    },
    updatedAt: { type: Date, default: Date.now },
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
