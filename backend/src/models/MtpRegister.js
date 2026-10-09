import mongoose from 'mongoose';

/** File 22 P2-30: MTP register (indication category + consent). */
const mtpSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  patientName: { type: String, required: true },
  gestationalAgeWeeks: { type: Number, required: true, min: 0 },
  indication: { type: String, enum: ['A', 'B', 'C', 'failure-contraception', 'other'], default: 'other' },
  doctorOpinion: { type: String, default: '', maxlength: 1000 },
  consentTaken: { type: Boolean, default: false },
  procedureDate: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.MtpRegister || mongoose.model('MtpRegister', mtpSchema);
