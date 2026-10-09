import mongoose from 'mongoose';

/**
 * File 09 §9.9/02 §4: dashboard alert center. Raised by jobs/routes
 * (critical labs, overdue vitals, pending discharges, expiries, TPA
 * queries...), acked/snoozed by humans with audit. Realtime fan-out via
 * socket `dashboard:alert` at the raise site.
 */
const dashboardAlertSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  type: {
    type: String,
    enum: [
      'critical_lab', 'overdue_vitals', 'missed_dose', 'pending_discharge',
      'drug_expiry', 'low_stock', 'blood_expiry', 'tpa_query', 'tpa_expiry',
      'license_expiry', 'cert_expiry', 'maintenance_due', 'refund_pending',
      'bill_overdue', 'bed_cleaning', 'other',
    ],
    required: true, index: true,
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning', index: true },
  entityRef: {
    model: { type: String, default: '' },
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  message: { type: String, maxlength: 500, default: '' },
  status: { type: String, enum: ['open', 'acked', 'snoozed', 'resolved'], default: 'open', index: true },
  ackedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ackedAt: { type: Date, default: null },
  snoozeUntil: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

dashboardAlertSchema.index({ hospitalId: 1, status: 1, severity: -1 });

export default mongoose.models.DashboardAlert || mongoose.model('DashboardAlert', dashboardAlertSchema);
