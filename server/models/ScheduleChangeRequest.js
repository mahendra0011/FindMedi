import mongoose from 'mongoose';

const scheduleChangeRequestSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctorName: { type: String },
  doctorEmail: { type: String },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending' },
  // Proposed schedule snapshot — same shape as scheduleSchema fields
  requestedChanges: {
    slotDuration: { type: Number },
    workingHours: { start: { type: String }, end: { type: String } },
    breakTime: { start: { type: String }, end: { type: String } },
    bookingWindow: { unit: { type: String }, value: { type: Number } },
    weekly_schedule: { type: Object },
    leaves: { type: [String] },
    dateDisabledSlots: { type: Object },
    bufferPerHour: { type: Number },
  },
  // Snapshot of the doctor's field values AT REQUEST TIME — drives the "old → new" text.
  // Only keys present in requestedChanges are populated.
  oldValues: {
    slotDuration: { type: Number },
    workingHours: { start: { type: String }, end: { type: String } },
    breakTime: { start: { type: String }, end: { type: String } },
    bookingWindow: { unit: { type: String }, value: { type: Number } },
    weekly_schedule: { type: Object },
    leaves: { type: [String] },
    dateDisabledSlots: { type: Object },
    bufferPerHour: { type: Number },
  },
  // Which fields admin agreed to apply (e.g. ['slotDuration','workingHours','breakTime'])
  appliedFields: { type: [String], default: [] },
  // Rejection note (used if admin rejects OR confirms without checking all fields)
  rejectionNote: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

scheduleChangeRequestSchema.pre('save', function (next) {
  if (this.status !== 'Pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  next();
});

export default mongoose.model('ScheduleChangeRequest', scheduleChangeRequestSchema);
