import mongoose from 'mongoose';

/**
 * File 09 §9.9: death record + mortuary handover. Cause coded ICD-10;
 * certificate number feeds the CRS report.
 */
const deathRecordSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, default: '' },
  timeOfDeath: { type: Date, required: true },
  causeIcd10: { type: String, default: '' },
  causeText: { type: String, default: '' },
  certifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mlcCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'MlcCase', default: null },
  mortuaryTagNo: { type: String, default: '' },
  releasedTo: { type: String, default: '' },
  releasedToId: { type: String, default: '' },
  releasedAt: { type: Date, default: null },
  certificateNo: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.DeathRecord || mongoose.model('DeathRecord', deathRecordSchema);
