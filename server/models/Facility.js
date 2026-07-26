import mongoose from 'mongoose';
import { generate16DigitId } from '../utils/idGenerator.js';

const facilitySchema = new mongoose.Schema({
  facilityId: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  type: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy'], required: true, index: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, index: true },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  licenseNumber: { type: String, required: true },
  logo: { type: String, default: '' },
  description: { type: String, default: '' },
  specialties: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  rejectionReason: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  subscriptionPlan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
  createdAt: { type: Date, default: Date.now, index: true },

  establishedYear: { type: Number, default: null },
  totalDoctors: { type: Number, default: 0 },
  accreditations: [{ type: String }],
  hospitalType: { type: String, default: 'Private' },
  emergency24x7: { type: Boolean, default: false },
  bedAvailability: { type: Number, default: 0 },
  ambulanceService: { type: Boolean, default: false },
  image: { type: String, default: '' },

  // Lab-specific fields
  nablNumber: { type: String, default: '' },
  aerbNumber: { type: String, default: '' },
  workingHours: { type: String, default: '8:00 AM - 8:00 PM' },

  pathologistName: { type: String, default: '' },
  pathologistQualification: { type: String, default: '' },
  radiologistName: { type: String, default: '' },
  radiologistQualification: { type: String, default: '' },
  cardiologistName: { type: String, default: '' },
  cardiologistQualification: { type: String, default: '' },

  technicianName: { type: String, default: '' },
  technicianRole: { type: String, default: '' },
  technicianQualification: { type: String, default: '' },
  technicianExperience: { type: String, default: '' },

  timing: {
    monday: { type: String, default: '8:00 AM - 8:00 PM' },
    tuesday: { type: String, default: '8:00 AM - 8:00 PM' },
    wednesday: { type: String, default: '8:00 AM - 8:00 PM' },
    thursday: { type: String, default: '8:00 AM - 8:00 PM' },
    friday: { type: String, default: '8:00 AM - 8:00 PM' },
    saturday: { type: String, default: '9:00 AM - 6:00 PM' },
    sunday: { type: String, default: 'Closed' },
  },

  amenities: {
    parking: { type: Boolean, default: false },
    acWaitingArea: { type: Boolean, default: false },
    wheelchairAccess: { type: Boolean, default: false },
    cardPayment: { type: Boolean, default: false },
    inHousePharmacy: { type: Boolean, default: false },
    drinkingWater: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    homeVisit: { type: Boolean, default: false },
    homeDelivery: { type: Boolean, default: false },
    prescriptionUpload: { type: Boolean, default: false },
  },

  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
  },

  details: {
    type: Object,
    default: {},
  },
});

facilitySchema.pre('save', async function (next) {
  if (!this.facilityId) {
    this.facilityId = generate16DigitId();
  }
  next();
});

facilitySchema.index({ type: 1, status: 1 });
facilitySchema.index({ location: '2dsphere' });

export default mongoose.model('Facility', facilitySchema);
