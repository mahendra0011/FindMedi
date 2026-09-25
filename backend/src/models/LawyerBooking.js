import mongoose from 'mongoose';

const caseNoteSchema = new mongoose.Schema({
  note: { type: String, required: true },
  sessionNumber: { type: Number, default: 1 },
  authorRole: { type: String, default: 'lawyer' },
  createdAt: { type: Date, default: Date.now },
});

const lawyerBookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    index: true,
    default: () => `LWB-${Math.floor(100000 + Math.random() * 900000)}`,
  },
  caseThreadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LawyerBooking',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  caseDescription: {
    type: String,
    required: true,
  },
  urgency: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal',
    index: true,
  },
  consultationMode: {
    type: String,
    enum: ['in_person', 'video', 'phone', 'chat'],
    default: 'in_person',
  },
  scheduledDate: {
    type: Date,
    default: Date.now,
    index: true,
  },
  scheduledTime: {
    type: String,
    default: 'Immediate',
  },
  budgetRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 5000 },
  },
  documents: [{ type: String }],
  fee: {
    type: Number,
    required: true,
  },
  isFollowUp: {
    type: Boolean,
    default: false,
    index: true,
  },
  targetLawyerOnly: {
    type: Boolean,
    default: false,
    index: true,
  },
  intakeSource: {
    type: String,
    enum: ['quick_urgent_card', 'scheduled_profile_form'],
    default: 'scheduled_profile_form',
  },
  broadcastFallbackAt: {
    type: Date,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [79.9864, 23.1815] },
    lat: { type: Number, default: 23.1815 },
    lng: { type: Number, default: 79.9864 },
    address: { type: String, default: '' },
    landmarkName: { type: String, default: '' },
    city: { type: String, default: '' },
  },
  lawyerCurrentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date },
  },
  bookingFor: {
    type: String,
    enum: ['self', 'family', 'other'],
    default: 'self',
  },
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    default: null,
  },
  otherPatient: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    age: { type: Number },
  },
  phone: {
    type: String,
    default: '',
  },
  acknowledgeUrgent: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: [
      'searching',
      'requested',
      'confirmed',
      'in_progress',
      'completed',
      'declined_by_lawyer',
      'cancelled_by_user',
      'cancelled_by_lawyer',
      'reschedule_proposed',
      'no_responders_found',
    ],
    default: 'requested',
    index: true,
  },
  notified: [{ providerId: String, userId: String, _id: false }],
  everNotified: [{ providerId: String, _id: false }],
  acceptances: [{ providerId: String, distanceKm: Number, acceptedAt: { type: Date, default: Date.now }, _id: false }],
  rejections: [{ type: String }],
  windowEndsAt: { type: Date, default: null },
  currentSearchRadiusKm: { type: Number, default: 5 },
  dispatchLog: [{
    radiusKm: Number,
    candidateCount: Number,
    outcome: { type: String, enum: ['assigned', 'no_response', 'no_acceptance', 'escalated'] },
    timestamp: { type: Date, default: Date.now },
  }],
  proposedNewTime: {
    date: { type: Date },
    time: { type: String },
    reason: { type: String, default: '' },
  },
  statusHistory: [
    {
      status: { type: String },
      at: { type: Date, default: Date.now },
      note: { type: String, default: '' },
    },
  ],
  startedAt: { type: Date },
  completedAt: { type: Date },
  // L-11: idempotent wallet settlement on completion (net = fee − 10% commission).
  settledAt: { type: Date },
  settlementAmount: { type: Number, default: 0 },
  finalCaseSummary: { type: String, default: '' },
  caseNotes: [caseNoteSchema],
  isCaseClosed: { type: Boolean, default: false, index: true },
  payment: {
    method: { type: String, enum: ['demo_wallet', 'cash', 'pending', ''], default: 'pending' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    transactionRef: { type: String, default: '' },
    paidAt: { type: Date },
  },
  ratingByUser: {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    ratedAt: { type: Date },
  },
  confidential: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const CATEGORY_MAP_TO_SLUG = {
  'Medical Negligence': 'medical_negligence',
  'Insurance Disputes': 'insurance',
  'Accident & MLC': 'accident_mlc',
  'Consumer Rights': 'consumer_rights',
  'Family & Personal': 'family_law',
  'Criminal Law': 'criminal_law',
  'Civil & Property': 'civil_property',
  'Corporate & Contract': 'corporate_contract',
  'General Consultation': 'general_consultation',
};

// Auto-assign caseThreadId to its own _id if not specified and normalize category
lawyerBookingSchema.pre('save', function (next) {
  if (this.category && CATEGORY_MAP_TO_SLUG[this.category]) {
    this.category = CATEGORY_MAP_TO_SLUG[this.category];
  }
  if (!this.caseThreadId) {
    this.caseThreadId = this._id;
  }
  next();
});

lawyerBookingSchema.index({ location: '2dsphere' });

export default mongoose.model('LawyerBooking', lawyerBookingSchema);
