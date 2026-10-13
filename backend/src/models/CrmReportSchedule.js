import mongoose from 'mongoose';

/**
 * File 24 §4.12 CRM report schedules: recurring CSV exports emailed to a set
 * of recipients (aggregates only — no PII/PHI rows). Run by the nightly
 * scheduler via runCrmReportSchedules() in routes/crm.js.
 */
const crmReportScheduleSchema = new mongoose.Schema({
  reportKey: {
    type: String,
    enum: ['supply_funnel', 'field_productivity', 'churn', 'partner_outcomes', 'cohort'],
    required: true,
    index: true,
  },
  frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  recipients: [{ type: String, maxlength: 200 }],
  format: { type: String, enum: ['csv'], default: 'csv' },
  active: { type: Boolean, default: true, index: true },
  lastRunAt: { type: Date, default: null },
  lastError: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.CrmReportSchedule
  || mongoose.model('CrmReportSchedule', crmReportScheduleSchema);
