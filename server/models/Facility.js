import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  type: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy'], required: true, index: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, index: true },
  state: { type: String, default: '' },
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

  details: {
    type: Object,
    default: {},
  },
});

facilitySchema.index({ type: 1, status: 1 });

export default mongoose.model('Facility', facilitySchema);
