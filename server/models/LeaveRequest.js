import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctorName: { type: String },
  doctorEmail: { type: String },
  leaveType: { type: String, enum: ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Personal Leave', 'Maternity/Paternity Leave', 'Other'], required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  adminNotes: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});

leaveRequestSchema.pre('save', function (next) {
  if (this.status !== 'Pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  next();
});

export default mongoose.model('LeaveRequest', leaveRequestSchema);
