import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  reportType: { type: String, enum: ['Daily', 'Monthly', 'Government', 'Custom'], required: true },
  category: { type: String, enum: ['OPD', 'IPD', 'Revenue', 'OT', 'Emergency', 'Lab', 'Radiology', 'Birth', 'Death', 'Notifiable Disease', 'PCPNDT', 'Bed Occupancy', 'Doctor Performance', 'Department'], required: true },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  department: { type: String },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  generatedAt: { type: Date, default: Date.now },
  data: { type: mongoose.Schema.Types.Mixed },
  summary: { type: mongoose.Schema.Types.Mixed },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
});

export default mongoose.model('Report', reportSchema);