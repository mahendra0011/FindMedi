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
  // File 22 P2-36: third wave — inventory, supply chain, revenue quality,
  // infection control and department mix. Derived in insights.js compute;
  // keys whose source data is unavailable return explicit null (never faked).
  { key: 'inventory_turnover', name: 'Inventory turnover (x)', category: 'ops', unit: 'ratio' },
  { key: 'stockout_items', name: 'Items at/below reorder level', category: 'ops', unit: 'count' },
  { key: 'near_expiry_value', name: 'Near-expiry stock value (₹)', category: 'finance', unit: 'rupees' },
  { key: 'vendor_otd_pct', name: 'Vendor on-time delivery %', category: 'ops', unit: 'percent' },
  { key: 'po_fill_rate', name: 'PO line fill rate %', category: 'ops', unit: 'percent' },
  { key: 'arpob', name: 'ARPOB (₹/occupied bed/day)', category: 'finance', unit: 'rupees' },
  { key: 'ar_days', name: 'AR days (collection lag)', category: 'finance', unit: 'days' },
  { key: 'cash_collection', name: 'Cash collected (period, ₹)', category: 'finance', unit: 'rupees' },
  { key: 'claim_approval_days', name: 'Claim approval TAT (days)', category: 'finance', unit: 'days' },
  { key: 'claim_ageing_60', name: 'Claims ageing >60 days', category: 'finance', unit: 'count' },
  { key: 'opd_new_patient_pct', name: 'New patient % (OPD)', category: 'growth', unit: 'percent' },
  { key: 'icu_occupancy', name: 'ICU/high-dependency occupancy %', category: 'ops', unit: 'percent' },
  { key: 'mortality_rate', name: 'In-hospital mortality %', category: 'clinical', unit: 'percent' },
  { key: 'hai_rate', name: 'HAI rate (per 1000 patient-days)', category: 'clinical', unit: 'rate' },
  { key: 'needlestick_reports', name: 'Needle-stick reports (period)', category: 'clinical', unit: 'count' },
  { key: 'restricted_abx_pending', name: 'Restricted antibiotics awaiting approval', category: 'clinical', unit: 'count' },
  { key: 'dialysis_sessions_30d', name: 'Dialysis sessions (30d)', category: 'ops', unit: 'count' },
];

export default mongoose.models.KpiDefinition || mongoose.model('KpiDefinition', kpiDefinitionSchema);
