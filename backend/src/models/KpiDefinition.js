import mongoose from 'mongoose';

/** File 17 §17.2: KPI definition registry (values computed, never typed). */
const kpiDefinitionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'ops' },
  unit: { type: String, default: 'number' },
  target: { type: mongoose.Schema.Types.Mixed, default: null },
  roles: [{ type: String }],
}, { timestamps: true });

export const KPI_CATALOGUE = [
  { key: 'bed_occupancy', name: 'Bed occupancy %', category: 'ops', unit: 'percent' },
  { key: 'avg_los', name: 'Average length of stay (days)', category: 'clinical', unit: 'days' },
  { key: 'collection_ratio', name: 'Collection ratio %', category: 'finance', unit: 'percent' },
  { key: 'denial_rate', name: 'Claim denial rate %', category: 'finance', unit: 'percent' },
  { key: 'opd_wait_p50', name: 'OPD wait p50 (min)', category: 'ops', unit: 'minutes' },
  { key: 'left_without_seen', name: 'Left-without-seen %', category: 'ops', unit: 'percent' },
  { key: 'lab_tat_breach', name: 'Lab TAT breach %', category: 'clinical', unit: 'percent' },
  { key: 'ot_utilization', name: 'OT utilization %', category: 'ops', unit: 'percent' },
  { key: 'readmit_30', name: '30-day readmission %', category: 'clinical', unit: 'percent' },
  { key: 'recall_conversion', name: 'Recall conversion %', category: 'growth', unit: 'percent' },
  // File 22 P2-36: second wave (all derived live in insights.js compute).
  { key: 'avg_bill_value', name: 'Average bill value (₹)', category: 'finance', unit: 'rupees' },
  { key: 'noshow_pct', name: 'Appointment no-show %', category: 'ops', unit: 'percent' },
  { key: 'cancel_pct', name: 'Appointment cancellation %', category: 'ops', unit: 'percent' },
  { key: 'discharge_before_noon_pct', name: 'Discharge before noon %', category: 'ops', unit: 'percent' },
  { key: 'rx_verify_backlog', name: 'Prescriptions awaiting verification', category: 'clinical', unit: 'count' },
  { key: 'pharmacy_pending_count', name: 'Active prescriptions (pharmacy load)', category: 'ops', unit: 'count' },
  { key: 'lab_verify_backlog', name: 'Lab orders under verification', category: 'clinical', unit: 'count' },
  { key: 'ot_completed_30d', name: 'OT cases completed (30d)', category: 'ops', unit: 'count' },
];

export default mongoose.models.KpiDefinition || mongoose.model('KpiDefinition', kpiDefinitionSchema);
