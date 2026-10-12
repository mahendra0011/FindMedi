import mongoose from 'mongoose';

const jobOpeningSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  title: { type: String, required: true, maxlength: 200 },
  department: { type: String, required: true, maxlength: 100 },
  designation: { type: String, maxlength: 100 },
  description: { type: String, maxlength: 5000 },
  requirements: [{ type: String, maxlength: 500 }],
  qualifications: [{ type: String, maxlength: 200 }],
  experienceYears: { type: Number, min: 0, max: 50 },
  salaryRange: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Visiting'],
    default: 'Full-time',
  },
  openings: { type: Number, min: 1, default: 1 },
  status: {
    type: String,
    enum: ['Open', 'Closed', 'On Hold', 'Filled'],
    default: 'Open',
    index: true,
  },
  postedDate: { type: Date, default: Date.now },
  closingDate: { type: Date },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String, maxlength: 50 }],
}, { timestamps: true });

jobOpeningSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.JobOpening || mongoose.model('JobOpening', jobOpeningSchema);
