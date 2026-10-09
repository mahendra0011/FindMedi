import mongoose from 'mongoose';

/** File 17 §17.1: scheduled report deliveries (cron-validated). */
const reportScheduleSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  reportKey: { type: String, required: true },
  cron: { type: String, required: true },
  format: { type: String, enum: ['csv', 'xlsx'], default: 'xlsx' },
  recipients: [{ type: String }],
  savedViewId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedView', default: null },
  active: { type: Boolean, default: true },
  lastRunAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.ReportSchedule || mongoose.model('ReportSchedule', reportScheduleSchema);
