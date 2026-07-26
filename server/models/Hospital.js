import mongoose from 'mongoose';
import { generate16DigitId } from '../utils/idGenerator.js';

const hospitalSchema = new mongoose.Schema({
  hospitalId: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, index: true },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  licenseNumber: { type: String, required: true },
  website: { type: String, default: '' },
  logo: { type: String, default: '' },
  description: { type: String, default: '' },
  specialties: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  rejectionReason: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  subscriptionPlan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
  createdAt: { type: Date, default: Date.now, index: true },

  // 🏥 Essential Fields
  establishedYear: { type: Number, default: null },           // kitna purana hospital hai
  totalDoctors: { type: Number, default: 0 },                 // total doctors ki sankhya
  accreditations: [{ type: String }],                         // NABH, NABL, ISO badges
  hospitalType: {                                             // Government/Private, Multi-specialty/Single-specialty
    type: String,
    default: 'Private',
  },
  emergency24x7: { type: Boolean, default: false },           // 24/7 Emergency badge
  bedAvailability: { type: Number, default: 0 },              // Bed availability status
  ambulanceService: { type: Boolean, default: false },        // Ambulance Service available
  image: { type: String, default: '' },                     // Cover image for hospital profile
  amenities: [{ type: String }],                             // Parking, AC Waiting, Wheelchair, Card Payment, etc.
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
  },
  insuranceAccepted: [{ provider: String, planType: String }],  // Insurance providers accepted
  paymentModes: [{ type: String }],                             // Accepted payment modes
  workingHours: {
    weekdays: { type: String, default: '9:00 AM - 6:00 PM' },
    saturday: { type: String, default: '9:00 AM - 2:00 PM' },
    sunday: { type: String, default: 'Closed' },
  },
});

hospitalSchema.index({ location: '2dsphere' });

hospitalSchema.pre('save', async function (next) {
  if (!this.hospitalId) {
    this.hospitalId = generate16DigitId();
  }
  next();
});

export default mongoose.model('Hospital', hospitalSchema);
