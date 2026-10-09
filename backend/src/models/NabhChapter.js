import mongoose from 'mongoose';

/**
 * File 22 P2-30: NABH chapter map. Objectives bind an insights KPI key when
 * the data exists live; '' means manual assessment (explicit, never faked).
 */
const nabhChapterSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, maxlength: 12 },
  title: { type: String, required: true, maxlength: 200 },
  objectives: [{
    code: { type: String, default: '' },
    label: { type: String, default: '' },
    autoKpi: { type: String, default: '' }, // insights KPI key, '' = manual
  }],
}, { timestamps: true });

/** Seed chapters (idempotent by code). Auto-KPIs reference insights keys. */
export const NABH_SEED = [
  {
    code: 'ACC', title: 'Access, Assessment & Continuity of Care',
    objectives: [
      { code: 'ACC.1', label: 'Defined scope displayed; registration uniform', autoKpi: '' },
      { code: 'ACC.4', label: 'Discharge process defined; before-noon target', autoKpi: 'discharge_before_noon_pct' },
    ],
  },
  {
    code: 'COP', title: 'Care of Patients',
    objectives: [
      { code: 'COP.2', label: 'Emergency triage + MLC documentation', autoKpi: '' },
      { code: 'COP.5', label: 'Lab TAT within defined limits', autoKpi: 'lab_tat_breach' },
      { code: 'COP.8', label: 'Pain + fall-risk assessment on admission', autoKpi: '' },
    ],
  },
  {
    code: 'MOM', title: 'Management of Medication',
    objectives: [
      { code: 'MOM.4', label: 'Prescription audit; high-risk meds controlled', autoKpi: 'rx_verify_backlog' },
      { code: 'MOM.7', label: 'ADR capture and review', autoKpi: '' },
    ],
  },
  {
    code: 'PRE', title: 'Patient Rights & Education',
    objectives: [
      { code: 'PRE.2', label: 'Complaint redressal within defined TAT', autoKpi: '' },
      { code: 'PRE.5', label: 'Discharge summary handed with follow-up', autoKpi: '' },
    ],
  },
  { code: 'HIC', title: 'Hospital Infection Control', objectives: [{ code: 'HIC.2', label: 'HAI surveillance; BMW segregation audited', autoKpi: '' }] },
  { code: 'FMS', title: 'Facility Management & Safety', objectives: [{ code: 'FMS.5', label: 'Equipment calibration + AMC current', autoKpi: '' }] },
  { code: 'HRM', title: 'Human Resource Management', objectives: [{ code: 'HRM.4', label: 'Credential verification current', autoKpi: '' }] },
  {
    code: 'IMS', title: 'Information Management System',
    objectives: [{ code: 'IMS.3', label: 'Dashboard KPIs reviewed periodically', autoKpi: 'collection_ratio' }],
  },
];

export default mongoose.models.NabhChapter || mongoose.model('NabhChapter', nabhChapterSchema);
