import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  // The stored reportType is BOTH a frequency (legacy Daily/Monthly/...) and,
  // since the MIS catalogue in configLoader.js, a report id such as
  // 'Bed Occupancy' or 'Lab Turnaround Time' — POST /reports/generate passes
  // the id through, and GET /reports filters on it, so the enum is the union
  // of the two vocabularies (adding values only; nothing stored breaks).
  reportType: {
    type: String,
    enum: [
      'Daily', 'Monthly', 'Government', 'Custom',
      'Bed Occupancy', 'Financial Summary', 'Lab Statistics', 'Pharmacy',
      'Staff Attendance', 'Inventory', 'OT Statistics', 'Appointment',
      'Patient', 'Birth Certificate', 'Death Certificate', 'Notifiable Disease',
      'Radiology Study Volume', 'Radiology TAT', 'Radiology Revenue',
      'Radiology Equipment Utilization', 'Radiology Report Pending',
      'Radiology Cancelled/No-show',
      'Lab Turnaround Time', 'Lab Rejection Rate', 'Lab Outsourcing',
      'Lab Section Workload',
    ],
    required: true,
  },
  // 'General' is what /generate sends when no category is supplied; the rest
  // mirror the configLoader report catalogue categories.
  category: {
    type: String,
    enum: [
      'OPD', 'IPD', 'Revenue', 'OT', 'Emergency', 'Lab', 'Radiology', 'Birth',
      'Death', 'Notifiable Disease', 'PCPNDT', 'Bed Occupancy',
      'Doctor Performance', 'Department',
      'General', 'Clinical', 'Financial', 'Administrative', 'HR',
    ],
    required: true,
  },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  department: { type: String },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  generatedAt: { type: Date, default: Date.now },
  data: { type: mongoose.Schema.Types.Mixed },
  summary: { type: mongoose.Schema.Types.Mixed },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
}, { timestamps: true });

export default mongoose.models.Report || mongoose.model('Report', reportSchema);