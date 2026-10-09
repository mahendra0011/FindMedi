/**
 * File 13 §13.5 + File 17 §17.1: whitelisted dataset registry shared by the
 * rule engine and the report studio. No dynamic model resolution from
 * client input — every dataset is an explicit builder here.
 */
import Admission from '../models/Admission.js';
import Billing from '../models/Billing.js';
import LabOrder from '../models/LabOrder.js';

export const DATASETS = {
  // Active/Recent IPD encounters with bills summarized at query time.
  ipd_stays: {
    label: 'IPD stays', fields: ['_id', 'hospitalId', 'patientName', 'status', 'ward', 'bedNumber', 'createdAt'],
    async fetch(hospitalId) {
      return Admission.find({ hospitalId, status: { $in: ['Admitted', 'Discharged'] } })
        .sort({ createdAt: -1 }).limit(500).lean();
    },
  },
  bills_unpaid: {
    label: 'Unpaid bills', fields: ['_id', 'invoiceId', 'hospitalId', 'patient', 'amount', 'paid', 'balance', 'status', 'createdAt'],
    async fetch(hospitalId) {
      return Billing.find({ hospitalId, status: { $in: ['Pending', 'Partial', 'Overdue'] } })
        .sort({ createdAt: -1 }).limit(500).lean();
    },
  },
  lab_critical: {
    label: 'Critical lab results',
    fields: ['_id', 'hospitalId', 'patientName', 'tests', 'status', 'createdAt'],
    async fetch(hospitalId) {
      return LabOrder.find({ hospitalId, 'tests.isCritical': true })
        .sort({ createdAt: -1 }).limit(500).lean();
    },
  },
  // Live counts for ops widgets (single synthesized row).
  ops_snapshot: {
    label: 'Ops snapshot', fields: ['blockedDischarges', 'tpaQueries', 'lowStocks', 'capturedAt'],
    async fetch(hospitalId) {
      const [EncounterM, ClaimM] = await Promise.all([
        import('../models/Encounter.js').then((m) => m.default),
        import('../models/Claim.js').then((m) => m.default).catch(() => null),
      ]);
      const blocked = await EncounterM.countDocuments({ hospitalId, dischargeStatus: 'Blocked' }).catch(() => 0);
      let tpa = 0;
      if (ClaimM) tpa = await ClaimM.countDocuments({ hospitalId, queries: { $ne: [] } }).catch(() => 0);
      return [{ blockedDischarges: blocked, tpaQueries: tpa, lowStocks: 0, capturedAt: new Date() }];
    },
  },
};

export function datasetNames() {
  return Object.fromEntries(Object.entries(DATASETS).map(([k, v]) => [k, { label: v.label, fields: v.fields }]));
}
