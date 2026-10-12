import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  jobOpeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOpening', required: true, index: true },
  name: { type: String, required: true, maxlength: 200 },
  email: { type: String, required: true, maxlength: 200 },
  phone: { type: String, required: true, maxlength: 20 },
  qualifications: [{ degree: String, year: Number, institute: String }],
  experienceYears: { type: Number, min: 0 },
  currentEmployer: { type: String, maxlength: 200 },
  expectedSalary: { type: Number, min: 0 },
  resumeUrl: { type: String, maxlength: 500 },
  notes: { type: String, maxlength: 2000 },
  stage: {
    type: String,
    enum: [
      'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
      'Interviewed', 'Offer Released', 'Offer Accepted', 'Offer Rejected',
      'Background Check', 'Onboarding', 'Hired', 'Rejected', 'Withdrawn',
    ],
    default: 'Applied',
    index: true,
  },
  interviewDate: { type: Date },
  interviewNotes: { type: String, maxlength: 2000 },
  rating: { type: Number, min: 1, max: 5 },
  shortlistedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hiredStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  stageHistory: [{
    fromStage: String,
    toStage: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    notes: String,
  }],
}, { timestamps: true });

candidateSchema.index({ hospitalId: 1, stage: 1 });
candidateSchema.index({ hospitalId: 1, jobOpeningId: 1 });

export default mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
