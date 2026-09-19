import mongoose from 'mongoose';

const vitalsLogSchema = new mongoose.Schema({
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
  carePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChronicCarePlan',
    default: null,
    index: true,
  },
  vitalType: {
    type: String,
    enum: ['bp', 'blood_sugar', 'weight', 'temperature'],
    required: true,
    index: true,
  },
  values: {
    // Blood Pressure (mmHg)
    systolic: { type: Number, default: null },
    diastolic: { type: Number, default: null },
    // Blood Sugar (mg/dL)
    sugarValue: { type: Number, default: null },
    sugarContext: {
      type: String,
      enum: ['fasting', 'post_meal', 'random', 'bedtime'],
      default: 'random',
    },
    // Weight (kg)
    weightKg: { type: Number, default: null },
    // Temperature
    tempValue: { type: Number, default: null },
    tempUnit: { type: String, enum: ['F', 'C'], default: 'F' },
  },
  note: {
    type: String,
    trim: true,
    default: '',
  },
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  isBackdated: {
    type: Boolean,
    default: false,
  },
  flag: {
    type: String,
    enum: ['normal', 'high', 'low', 'fever'],
    default: 'normal',
  },
}, {
  timestamps: true,
});

vitalsLogSchema.index({ userId: 1, vitalType: 1, recordedAt: -1 });

export default mongoose.model('VitalsLog', vitalsLogSchema);
