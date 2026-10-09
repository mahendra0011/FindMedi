import mongoose from 'mongoose';

/** File 22 P1-14: doctor fee master (consult/follow-up/emergency + revenue share). */
const doctorFeeSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  consultFee: { type: Number, default: 0, min: 0 },
  followUpFee: { type: Number, default: 0, min: 0 },
  emergencyFee: { type: Number, default: 0, min: 0 },
  revenueSharePct: { type: Number, default: 0, min: 0, max: 100 },
  effectiveFrom: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

doctorFeeSchema.index({ hospitalId: 1, doctorId: 1, effectiveFrom: -1 });

export default mongoose.models.DoctorFee || mongoose.model('DoctorFee', doctorFeeSchema);
