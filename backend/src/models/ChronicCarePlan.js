import mongoose from 'mongoose';

const chronicCarePlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null,
  },
  planName: {
    type: String,
    required: true,
    trim: true,
  },
  condition: {
    type: String,
    required: true,
    enum: ['Diabetes', 'Hypertension', 'Thyroid', 'Asthma', 'Heart Disease', 'Arthritis', 'COPD', 'Other'],
    default: 'Diabetes',
  },
  customCondition: {
    type: String,
    trim: true,
    default: '',
  },
  linkedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    default: null,
    index: true,
  },
  medicineReminderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicineReminder',
  }],
  vitalsTracked: [{
    vitalType: {
      type: String,
      enum: ['bp', 'blood_sugar', 'weight', 'temperature'],
      required: true,
    },
    targetDescription: {
      type: String,
      default: '',
    },
    personalizedTarget: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
  }],
  followUpIntervalDays: {
    type: Number,
    default: 30,
  },
  lastFollowUpAt: {
    type: Date,
    default: null,
  },
  nextFollowUpDueAt: {
    type: Date,
    default: null,
  },
  shareWithDoctor: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'pending_patient_acceptance'],
    default: 'active',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  createdBy: {
    type: String,
    enum: ['patient', 'doctor'],
    default: 'patient',
  },
}, {
  timestamps: true,
});

export default mongoose.model('ChronicCarePlan', chronicCarePlanSchema);
