import mongoose from 'mongoose';

const onboardingTaskSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
  taskName: { type: String, required: true, maxlength: 200 },
  taskType: {
    type: String,
    enum: [
      'Document Collection', 'ID Card Issuance', 'System Access',
      'Department Introduction', 'Safety Training', 'Equipment Training',
      'Uniform Issuance', 'Bank Details', 'PF/ESI Registration',
      'Probation Review', 'Other',
    ],
    default: 'Other',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dueDate: { type: Date },
  completedAt: { type: Date },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Skipped'],
    default: 'Pending',
    index: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  notes: { type: String, maxlength: 1000 },
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  checklistItems: [{
    item: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
  }],
}, { timestamps: true });

onboardingTaskSchema.index({ hospitalId: 1, staffId: 1, status: 1 });

export default mongoose.models.OnboardingTask || mongoose.model('OnboardingTask', onboardingTaskSchema);
