import mongoose from 'mongoose';

const taskChecklistItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  category: { type: String, default: 'general' },
  isCustom: { type: Boolean, default: false },
  isDone: { type: Boolean, default: false },
  doneAt: { type: Date },
});

const assistantBookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    index: true,
    default: () => `ASB-${Math.floor(100000 + Math.random() * 900000)}`,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  assistantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  hospital: {
    type: String,
    required: true,
    index: true,
  },
  serviceCategories: [
    {
      type: String,
    },
  ],
  isUrgent: {
    type: Boolean,
    default: false,
    index: true,
  },
  targetAssistantOnly: {
    type: Boolean,
    default: false,
    index: true,
  },
  intakeSource: {
    type: String,
    enum: ['quick_urgent_card', 'scheduled_profile_form', 'booking_wizard'],
    default: 'scheduled_profile_form',
  },
  broadcastFallbackAt: {
    type: Date,
  },
  urgencyWindow: {
    type: String,
    enum: ['asap', 'specific_time'],
    default: 'asap',
  },
  onBehalfOf: {
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
    age: { type: String, default: '' },
  },
  taskDescription: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
  documents: [{ type: String }],
  scheduledDate: {
    type: Date,
    required: true,
    index: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  durationType: {
    type: String,
    enum: ['2hr', '4hr', 'full_day', 'overnight'],
    default: '4hr',
  },
  specialInstructions: {
    type: String,
    default: '',
  },
  cost: {
    ratePerHour: { type: Number, default: 150 },
    estimatedHours: { type: Number, default: 4 },
    total: { type: Number, required: true },
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [79.9864, 23.1815] },
    lat: { type: Number, default: 23.1815 },
    lng: { type: Number, default: 79.9864 },
    address: { type: String, default: '' },
  },
  status: {
    type: String,
    enum: [
      'searching',
      'requested',
      'confirmed',
      'in_progress',
      'completed',
      'declined_by_assistant',
      'cancelled_by_patient',
      'cancelled_by_assistant',
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
  statusHistory: [
    {
      status: { type: String },
      at: { type: Date, default: Date.now },
      note: { type: String, default: '' },
    },
  ],
  taskChecklist: [taskChecklistItemSchema],
  checkInAt: { type: Date },
  completedAt: { type: Date },
  completionSummary: { type: String, default: '' },
  payment: {
    method: { type: String, enum: ['demo_wallet', 'cash', 'pending', ''], default: 'pending' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    transactionRef: { type: String, default: '' },
    paidAt: { type: Date },
  },
  ratingByPatient: {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date },
  },
  ratingByAssistant: {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date },
  },
  cancellationReason: { type: String, default: '' },
  cancelledBy: { type: String, enum: ['patient', 'assistant', 'system', ''], default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

assistantBookingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

assistantBookingSchema.index({ location: '2dsphere' });

export default mongoose.model('AssistantBooking', assistantBookingSchema);
