import mongoose from 'mongoose';

const icuScoreSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  scoreType: {
    type: String,
    enum: ['SOFA', 'APACHE-II', 'NEWS2', 'GCS'],
    required: true,
    index: true,
  },
  score: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, default: 24 },
  components: {
    // SOFA components
    respiration: { type: Number, min: 0, max: 4 },
    coagulation: { type: Number, min: 0, max: 4 },
    liver: { type: Number, min: 0, max: 4 },
    cardiovascular: { type: Number, min: 0, max: 4 },
    cns: { type: Number, min: 0, max: 4 },
    renal: { type: Number, min: 0, max: 4 },
    // APACHE II components
    acutePhysiology: { type: Number },
    chronicHealth: { type: Number },
    agePoints: { type: Number },
    // NEWS2
    respirationRate: Number,
    spo2: Number,
    airOrOxygen: String,
    systolicBp: Number,
    pulse: Number,
    consciousness: String,
    temperature: Number,
  },
  inputs: { type: mongoose.Schema.Types.Mixed },
  mortalityEstimate: { type: Number, min: 0, max: 100 },
  interpretation: { type: String, maxlength: 500 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recordedAt: { type: Date, default: Date.now, index: true },
  notes: { type: String, maxlength: 1000 },
}, { timestamps: true });

icuScoreSchema.index({ hospitalId: 1, admissionId: 1, scoreType: 1, recordedAt: -1 });

export default mongoose.models.IcuScore || mongoose.model('IcuScore', icuScoreSchema);
