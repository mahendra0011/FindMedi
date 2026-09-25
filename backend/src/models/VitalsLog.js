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
    enum: ['bp', 'blood_sugar', 'weight', 'temperature', 'pulse', 'spo2'],
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
    // Pulse (bpm) & SpO2 (%) — bedside logging
    pulse: { type: Number, default: null },
    spo2: { type: Number, default: null },
  },
  // Spec 07: link to the originating care booking + who recorded it.
  bookingKind: { type: String, enum: ['assistant', 'appointment', 'ipd', null], default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
