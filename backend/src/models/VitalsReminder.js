import mongoose from 'mongoose';

const vitalsReminderSchema = new mongoose.Schema({
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
  vitalType: {
    type: String,
    enum: ['bp', 'blood_sugar', 'weight', 'temperature'],
    required: true,
  },
  times: [{
    type: String, // HH:mm format
    required: true,
  }],
  frequency: {
    type: String,
    enum: ['daily', 'specific_days'],
    default: 'daily',
  },
  daysOfWeek: [{
    type: String,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  }],
  alarmSound: {
    presetId: {
      type: String,
      enum: ['classic_alarm', 'digital_buzzer', 'gentle_rise', 'chime_cascade', 'custom'],
      default: 'classic_alarm',
    },
    customSoundUrl: {
      type: String,
      default: null,
    },
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active',
  },
  instructions: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

export default mongoose.model('VitalsReminder', vitalsReminderSchema);
