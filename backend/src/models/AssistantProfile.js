import mongoose from 'mongoose';

const assistantProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  govtIdType: {
    type: String,
    enum: ['Aadhaar', 'PAN', 'Voter ID', 'Passport', 'Other'],
    required: true,
  },
  govtIdNumber: { type: String, required: true },
  govtIdDocUrl: { type: String, default: '' },
  policeVerificationDocUrl: { type: String, default: '' },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  experienceYears: { type: Number, default: 1, min: 0 },
  experienceTypes: [{ type: String }],
  certifications: [{ type: String }],
  languages: [{ type: String }],
  bio: { type: String, default: '' },
  serviceCategories: [
    {
      type: String,
      enum: ['paperwork', 'medicine', 'reports', 'errand', 'full_attendant', 'elderly_care'],
    },
  ],
  hospitalsCovered: [{ type: String, index: true }],
  operatingCity: { type: String, default: 'Jabalpur', index: true },
  shiftTypes: [{ type: String, enum: ['2hr', '4hr', 'full_day', 'overnight'] }],
  pricePerHour: { type: Number, default: 150, min: 50 },
  pricePerFullDay: { type: Number, default: 1000, min: 300 },
  extraSkills: {
    mobilityAssistance: { type: Boolean, default: false },
    wheelchairComfort: { type: Boolean, default: false },
    ownVehicleMedicine: { type: Boolean, default: false },
    overnightStays: { type: Boolean, default: false },
  },
  policeVerificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'not_submitted'],
    default: 'verified',
  },
  healthCertification: {
    isVaccinated: { type: Boolean, default: true },
    vaccines: { type: [String], default: ['COVID-19 Booster', 'Hepatitis B'] },
    healthCertDocUrl: { type: String, default: '' },
    isCertifiedFit: { type: Boolean, default: true },
  },
  onTimeRate: { type: Number, default: 98, min: 50, max: 100 },
  completionRate: { type: Number, default: 99, min: 50, max: 100 },
  repeatClientsCount: { type: Number, default: 12 },
  trainedEmergencyAdmissions: { type: Boolean, default: true },
  badgeIdentifier: { type: String, default: 'FindMedi Blue Lanyard & Attendant ID' },
  dayInWorkDescription: { type: String, default: '' },
  bankDetails: {
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    upiId: { type: String, default: '' },
    verified: { type: Boolean, default: false },
  },
  // Section-10 settings master (dashboard settings tab persists here)
  settings: {
    emergencyStandby: { type: Boolean, default: false },
    refundPolicy: {
      type: String,
      enum: ['full_6h', 'half_2_6h', 'none_enroute'],
      default: 'full_6h',
    },
    rateCard: {
      halfDay4h: { type: Number, default: 0, min: 0 },
      day8h: { type: Number, default: 0, min: 0 },
      night12h: { type: Number, default: 0, min: 0 },
      full24h: { type: Number, default: 0, min: 0 },
    },
    clinicalTags: [{ type: String }],
    preferredHospitals: [{ type: String }],
  },
  availableDays: [{ type: String }],
  availableTimeSlots: [
    {
      start: { type: String, default: '09:00 AM' },
      end: { type: String, default: '06:00 PM' },
    },
  ],
  assistantStatus: {
    type: String,
    enum: ['pending_approval', 'active', 'rejected', 'suspended'],
    default: 'pending_approval',
    index: true,
  },
  rejectionReason: { type: String, default: '' },
  isAvailable: { type: Boolean, default: false, index: true },
  isDocumentVerified: { type: Boolean, default: false },
  rating: {
    avg: { type: Number, default: 5.0, min: 1, max: 5 },
    count: { type: Number, default: 0 },
  },
  totalEarnings: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  favoritedByCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

assistantProfileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('AssistantProfile', assistantProfileSchema);
