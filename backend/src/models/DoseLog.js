import mongoose from 'mongoose';

// File 22 P2-29: radiation dose log — one row per irradiation event, fed by
// the modality (or manually when the device does not export structured dose).
// Required for RIS dose-audit chapters; never edited, only appended.

const doseLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  orderId: { type: String, default: '', index: true },
  studyUid: { type: String, default: '', index: true },
  accessionNo: { type: String, default: '' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  modality: { type: String, default: '' }, // CT, CR, DX, RF, MG, NM, US
  bodyPart: { type: String, default: '' },
  // Dose metrics: DAP (Gy·cm²), dose (Gy), CT DLP (mGy·cm), exposure time (ms).
  dapGycm2: { type: Number, default: null },
  doseGy: { type: Number, default: null },
  dlpMgycm: { type: Number, default: null },
  exposureMs: { type: Number, default: null },
  ctvolCm3: { type: Number, default: null },
  deviceAe: { type: String, default: '' },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  at: { type: Date, default: Date.now },
}, { timestamps: true });

doseLogSchema.index({ hospitalId: 1, at: -1 });

export default mongoose.models.DoseLog || mongoose.model('DoseLog', doseLogSchema);
