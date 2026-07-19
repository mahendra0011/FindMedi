import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
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
  insuranceAccepted: [{ provider: String, planType: String }],  // Insurance providers accepted
  paymentModes: [{ type: String }],                             // Accepted payment modes
  workingHours: {
    weekdays: { type: String, default: '9:00 AM - 6:00 PM' },
    saturday: { type: String, default: '9:00 AM - 2:00 PM' },
    sunday: { type: String, default: 'Closed' },
  },
});

export default mongoose.model('Hospital', hospitalSchema);
