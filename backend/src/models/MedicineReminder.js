import mongoose from 'mongoose';

const medicineReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    default: null,
  },
  medicineName: {
    type: String,
    required: true,
    trim: true,
  },
  dosage: {
    type: String,
    required: true,
    trim: true,
  },
  form: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Drops', 'Ointment', 'Other'],
    default: 'Tablet',
  },
  frequency: {
    type: String,
    enum: ['once_daily', 'twice_daily', 'thrice_daily', 'custom'],
    default: 'once_daily',
  },
  times: [{
    type: String, // HH:mm format e.g. "08:00", "20:00"
    required: true,
  }],
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null, // null = ongoing
  },
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
  autoMissAfterMinutes: {
    type: Number,
    default: 10,
  },
  notifyDoctorOnMissThreshold: {
    type: Number,
    default: null, // e.g. 3 = notify doctor if 3 missed doses in a week
  },
  instructions: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active',
  },
  carePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChronicCarePlan',
    default: null,
  },
}, {
  timestamps: true,
});

export default mongoose.model('MedicineReminder', medicineReminderSchema);
