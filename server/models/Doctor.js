import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: String, default: '1 year' },
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  patients: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
  phone: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  initials: { type: String, default: '' },
  department: { type: String, default: '' },
  fees: { type: Number, default: 500 },
  consultation_fees: { type: Number, default: 500 },
  location: { type: String, default: '' },
  profile_photo: { type: String, default: '' },
  qualifications: { type: String, default: '' },
  bio: { type: String, default: '' },
  time_slots: { type: [String], default: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
  weekly_schedule: {
    type: Object,
    default: {
      monday: true, tuesday: true, wednesday: true,
      thursday: true, friday: true, saturday: false, sunday: false
    }
  },
  leaves: { type: [String], default: [] },
  approved: { type: Boolean, default: false },
  user_id: { type: String, default: '' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy', ''], default: '' },
  reviews_count: { type: Number, default: 0 },
  signatureUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Doctor', doctorSchema);
