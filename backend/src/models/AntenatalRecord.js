import mongoose from 'mongoose';

/**
 * File 09 §04.7: antenatal card — LMP/EDD, visits, USG/labs, risk flags.
 */
const antenatalRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null },
  lmp: { type: Date, default: null },
  edd: { type: Date, default: null },
  gravida: { type: Number, default: 0 },
  para: { type: Number, default: 0 },
  visits: [{
    at: { type: Date, default: Date.now },
    weightKg: { type: Number, default: null },
    bp: { type: String, default: '' },
    fundalHeightCm: { type: Number, default: null },
    fetalHeart: { type: String, default: '' },
    notes: { type: String, default: '' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  usg: [{ at: { type: Date }, finding: { type: String } }],
  labs: [{ name: { type: String }, result: { type: String }, at: { type: Date } }],
  riskFlags: [{ type: String, maxlength: 200 }],
  status: { type: String, enum: ['Active', 'Delivered', 'Closed'], default: 'Active', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

antenatalRecordSchema.index({ patientId: 1, status: 1 });

export default mongoose.models.AntenatalRecord || mongoose.model('AntenatalRecord', antenatalRecordSchema);
