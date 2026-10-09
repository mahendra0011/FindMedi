import mongoose from 'mongoose';

/** File 22 P2-30: PCPNDT Form F register. */
const pcpndtSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  patientName: { type: String, required: true },
  husbandName: { type: String, default: '' },
  doctorName: { type: String, default: '' },
  indication: { type: String, default: '', maxlength: 500 },
  gestationalAgeWeeks: { type: Number, default: null },
  declarationSigned: { type: Boolean, default: false },
  formDate: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.PcpndtFormF || mongoose.model('PcpndtFormF', pcpndtSchema);
