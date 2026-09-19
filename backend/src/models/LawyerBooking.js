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
    enum: ['video', 'phone', 'in_person', 'chat'],
    default: 'video',
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true,
  },
  scheduledTime: {
    type: String,
    required: true,
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
  status: {
    type: String,
    enum: [
      'requested',
      'confirmed',
      'in_progress',
      'completed',
      'declined_by_lawyer',
      'cancelled_by_user',
      'cancelled_by_lawyer',
      'reschedule_proposed',
    ],
    default: 'requested',
    index: true,
  },
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

// Auto-assign caseThreadId to its own _id if not specified
lawyerBookingSchema.pre('save', function (next) {
  if (!this.caseThreadId) {
    this.caseThreadId = this._id;
  }
  next();
});

export default mongoose.model('LawyerBooking', lawyerBookingSchema);
