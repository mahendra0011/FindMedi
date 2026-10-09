import mongoose from 'mongoose';

/** File 17 §17.1: curated report definitions (dataset-whitelisted). */
const reportDefinitionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'ops' },
  dataset: { type: String, required: true },
  defaultFilters: { type: mongoose.Schema.Types.Mixed, default: {} },
  defaultColumns: [{ type: String }],
  roles: [{ type: String }], // empty = all authenticated staff
}, { timestamps: true });

/** Seeded catalogue (roles gate client-side AND server-side). */
export const REPORT_CATALOGUE = [
  { key: 'ipd-census', name: 'IPD census', category: 'ops', dataset: 'ipd_stays', roles: [] },
  { key: 'unpaid-bills', name: 'Unpaid bills (AR)', category: 'finance', dataset: 'bills_unpaid', roles: ['accountant', 'hospital_admin', 'superadmin'] },
  { key: 'critical-labs', name: 'Critical lab results', category: 'clinical', dataset: 'lab_critical', roles: ['doctor', 'nurse', 'hospital_admin', 'superadmin'] },
  { key: 'ops-snapshot', name: 'Ops snapshot', category: 'ops', dataset: 'ops_snapshot', roles: [] },
];

export default mongoose.models.ReportDefinition || mongoose.model('ReportDefinition', reportDefinitionSchema);
