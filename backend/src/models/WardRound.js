import mongoose from 'mongoose';

/**
 * File 09 §9.2/04.4: doctor ward-round notes (SOAP) + inline orders.
 */
const wardRoundSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundAt: { type: Date, default: Date.now },
  soap: {
    s: { type: String, default: '' },
    o: { type: String, default: '' },
    a: { type: String, default: '' },
    p: { type: String, default: '' },
  },
  orders: [{ type: String, maxlength: 300 }],
}, { timestamps: true });

wardRoundSchema.index({ admissionId: 1, roundAt: -1 });

export default mongoose.models.WardRound || mongoose.model('WardRound', wardRoundSchema);
