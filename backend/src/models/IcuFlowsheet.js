import mongoose from 'mongoose';

/**
 * File 09 §04.5: ICU flowsheet — hourly vitals, ventilator settings,
 * infusions, GCS/sedation, device days. One row per admission per hour
 * (upsert by admissionId + hourSlot).
 */
const icuFlowsheetSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  hourSlot: { type: Date, required: true },
  vitals: { type: mongoose.Schema.Types.Mixed, default: {} },
  ventilator: {
    mode: { type: String, default: '' },
    fio2: { type: Number, default: null },
    peep: { type: Number, default: null },
    rate: { type: Number, default: null },
  },
  infusions: [{ name: { type: String }, rate: { type: String } }],
  gcs: { e: { type: Number, default: null }, v: { type: Number, default: null }, m: { type: Number, default: null } },
  sedationScore: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

icuFlowsheetSchema.index({ admissionId: 1, hourSlot: 1 }, { unique: true });

export default mongoose.models.IcuFlowsheet || mongoose.model('IcuFlowsheet', icuFlowsheetSchema);
