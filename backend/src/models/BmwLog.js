import mongoose from 'mongoose';

/**
 * File 09 §9.9/06.5: Biomedical Waste (BMW Rules 2016) daily log —
 * colour-bag weights per ward + CBWTF handover manifest. Feeds the monthly
 * Form IV and annual pollution-board report.
 */
const bmwLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  date: { type: String, required: true, index: true },
  wardId: { type: String, default: '' },
  yellowKg: { type: Number, default: 0, min: 0 },
  redKg: { type: Number, default: 0, min: 0 },
  whiteKg: { type: Number, default: 0, min: 0 },
  blueKg: { type: Number, default: 0, min: 0 },
  handedTo: { type: String, default: '' },
  manifestNo: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

bmwLogSchema.index({ hospitalId: 1, date: 1 });

export default mongoose.models.BmwLog || mongoose.model('BmwLog', bmwLogSchema);
