import mongoose from 'mongoose';

const physioSchema = new mongoose.Schema({
  referralId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  diagnosis: { type: String },
  initialAssessment: {
    painScale: { type: Number, min: 0, max: 10 },
    rangeOfMotion: { type: String },
    strengthTest: { type: String },
    functionalAssessment: { type: String },
    notes: { type: String },
  },
  treatmentPlan: {
    sessionsTotal: { type: Number, default: 6 },
    sessionsCompleted: { type: Number, default: 0 },
    therapyType: { type: String },
    goals: { type: String },
  },
  sessions: [{
    sessionNumber: Number,
    date: Date,
    exercisesPerformed: String,
    progressNote: String,
    painLevelBefore: { type: Number, min: 0, max: 10 },
    painLevelAfter: { type: Number, min: 0, max: 10 },
    therapistName: String,
    duration: Number,
  }],
  status: { type: String, enum: ['Referred', 'In Progress', 'Mid Review', 'Completed', 'Discontinued'], default: 'Referred' },
  reviewNotes: { type: String },
  dischargePlan: { homeExercise: String, precautions: String, followUpDate: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

physioSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.treatmentPlan) {
    this.treatmentPlan.sessionsCompleted = this.sessions?.length || 0;
  }
  next();
});

export default mongoose.model('Physiotherapy', physioSchema);