/**
 * File 22 P2-36: shared report runner (sync route + async export worker).
 * Whitelisted datasets only; PHI masking per role; streaming-friendly
 * batched fetch interface.
 */
import { DATASETS } from './datasets.js';
import { ruleMatches } from './ruleEngine.js';

export const MAX_ROWS = 5000;

// Columns treated as PHI: masked for non-clinical roles. Keys are
// "<dataset>:<column>" so two datasets can share a column name safely.
const PHI = new Set([
  'ipd_stays:patientName', 'bills_unpaid:patient', 'lab_critical:patientName',
]);

const CLINICAL_ROLES = new Set([
  'doctor', 'clinic_doctor', 'nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse',
  'surgeon', 'anaesthetist', 'hospital_admin', 'superadmin',
  'medical_director', 'cmo', 'nursing_supervisor', 'matron',
]);

export function maskValue(v) {
  const s = String(v ?? '');
  if (!s) return s;
  if (s.length <= 4) return '••••';
  return `${s.slice(0, 2)}••••${s.slice(-2)}`;
}

export function maskRow(datasetKey, row, role) {
  if (CLINICAL_ROLES.has(role)) return row;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    if (PHI.has(`${datasetKey}:${k}`)) out[k] = maskValue(out[k]);
  }
  return out;
}

export async function runReport({ hospitalId, reportKey, filters, columns, role, catalog }) {
  const started = Date.now();
  const def = (catalog || []).find((r) => r.key === reportKey);
  if (!def || !DATASETS[def.dataset]) throw new Error('Unknown report/dataset');
  const rows = await DATASETS[def.dataset].fetch(hospitalId);
  const rule = { groups: filters?.groups || [] };
  const filtered = (rule.groups.length ? rows.filter((r) => ruleMatches(rule, r)) : rows).slice(0, MAX_ROWS);
  const cols = (columns?.length ? columns : DATASETS[def.dataset].fields);
  const projected = filtered.map((r) => {
    const masked = maskRow(def.dataset, r, role);
    return Object.fromEntries(cols.map((c) => [c, masked[c] ?? '']));
  });
  return { rows: projected, columns: cols, scanned: rows.length, ms: Date.now() - started };
}
