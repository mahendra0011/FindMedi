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
];

export default mongoose.models.KpiDefinition || mongoose.model('KpiDefinition', kpiDefinitionSchema);
