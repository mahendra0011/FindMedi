import mongoose from 'mongoose';

/**
 * File 09 §04.7: labour record + partogram snapshots, delivery note link.
 */
const labourRecordSchema = new mongoose.Schema({
  antenatalId: { type: mongoose.Schema.Types.ObjectId, ref: 'AntenatalRecord', default: null, index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  onsetAt: { type: Date, default: null },
  partogram: [{
    at: { type: Date }, dilationCm: { type: Number, default: null },
    contractions: { type: String, default: '' }, fetalHeart: { type: String, default: '' },
  }],
  deliveryAt: { type: Date, default: null },
  deliveryType: { type: String, enum: ['', 'Normal', 'C-Section', 'Assisted'], default: '' },
  babyWeightKg: { type: Number, default: 0 },
  babySex: { type: String, enum: ['', 'Male', 'Female', 'Other'], default: '' },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.LabourRecord || mongoose.model('LabourRecord', labourRecordSchema);
