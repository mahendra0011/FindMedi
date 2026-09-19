import mongoose from 'mongoose';

const medicineDoseLogSchema = new mongoose.Schema({
  reminderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicineReminder',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  carePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChronicCarePlan',
    default: null,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['taken', 'skipped', 'missed', 'snoozed_then_taken', 'snoozed_then_missed'],
    required: true,
  },
  respondedAt: {
    type: Date,
    default: null,
  },
  snoozeCount: {
    type: Number,
    default: 0,
  },
  note: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

// Fast lookups by user and schedule date range
medicineDoseLogSchema.index({ userId: 1, scheduledAt: -1 });
medicineDoseLogSchema.index({ reminderId: 1, scheduledAt: -1 });

export default mongoose.model('MedicineDoseLog', medicineDoseLogSchema);
