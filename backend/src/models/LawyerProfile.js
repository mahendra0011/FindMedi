import mongoose from 'mongoose';

const lawyerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  barCouncilNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  barCouncilCertUrl: { type: String, default: '' },
  stateBarCouncil: { type: String, required: true },
  yearOfEnrollment: { type: Number, required: true },
  lawDegreeCertUrl: { type: String, default: '' },
  govtIdType: {
    type: String,
    enum: ['Aadhaar', 'PAN', 'Voter ID', 'Passport', 'Other'],
    default: 'Aadhaar',
  },
  govtIdNumber: { type: String, default: '' },
  govtIdDocUrl: { type: String, default: '' },
  practiceCategories: [
    {
      type: String,
      enum: [
        'medical_negligence',
        'insurance',
        'accident_mlc',
        'consumer_rights',
        'family_law',
        'criminal_law',
        'civil_property',
        'corporate_contract',
        'general_consultation',
      ],
    },
  ],
  yearsOfPractice: { type: Number, default: 1, min: 0 },
  courtsPracticedIn: [{ type: String }],
  jurisdictionCity: { type: String, default: 'Jabalpur', index: true },
  operatingCity: { type: String, default: 'Jabalpur', index: true },
  lawFirmName: { type: String, default: '' },
  bio: { type: String, default: '' },
  languages: [{ type: String }],
  consultationModes: [
    {
      type: String,
      enum: ['video', 'phone', 'in_person', 'chat'],
    },
  ],
  consultationFee: { type: Number, default: 800, min: 0 },
  followUpFee: { type: Number, default: 500, min: 0 },
  freeFirstConsultation: { type: Boolean, default: false },
  sessionDuration: { type: Number, default: 30, min: 15 },
  bankDetails: {
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    upiId: { type: String, default: '' },
    verified: { type: Boolean, default: false },
  },
  gstin: { type: String, default: '', trim: true },
  // Section-10 settings master
  settings: {
    emergencyStandby: { type: Boolean, default: false },
    refundPolicy: {
      type: String,
      enum: ['lawyer_cancels_full', 'court_clash_reschedule', 'client_12h_full'],
      default: 'lawyer_cancels_full',
    },
    feeSchedule: {
      video30m: { type: Number, default: 0, min: 0 },
      chamberVisit: { type: Number, default: 0, min: 0 },
      bedsideVisit: { type: Number, default: 0, min: 0 },
      noticeDrafting: { type: Number, default: 0, min: 0 },
    },
    practicingCourts: [{ type: String }],
    privilegeLocked: { type: Boolean, default: true },
  },
  availableDays: [{ type: String }],
  availableTimeSlots: [
    {
      start: { type: String, default: '10:00 AM' },
      end: { type: String, default: '06:00 PM' },
    },
  ],
  acceptsUrgent: { type: Boolean, default: true, index: true },
  lawyerStatus: {
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
  casesHandled: { type: Number, default: 25 },
  favorableOutcomesRate: { type: Number, default: 88, min: 50, max: 100 },
  notableCases: [{ type: String }],
  practiceType: { type: String, enum: ['independent', 'firm'], default: 'independent' },
  yearsAtCurrentPractice: { type: Number, default: 3 },
  avgResponseMinutes: { type: Number, default: 12 },
  currentSessionStatus: {
    type: String,
    enum: ['available', 'in_session', 'offline'],
    default: 'available',
  },
  faqs: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
    },
  ],
  awards: [{ type: String }],
  isPoliceVerified: { type: Boolean, default: false },
  policeVerificationDocUrl: { type: String, default: '' },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [79.9864, 23.1815] },
    lat: { type: Number, default: 23.1815 },
    lng: { type: Number, default: 79.9864 },
    h3Index8: { type: String, index: true, default: null },
    h3Index9: { type: String, index: true, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  isOnlineForUrgent: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
});

lawyerProfileSchema.index({ currentLocation: '2dsphere' });

export default mongoose.model('LawyerProfile', lawyerProfileSchema);
