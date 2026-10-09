import mongoose from 'mongoose';

/** File 22 P1-24: tele-consult consent log (required before video Rx). */
const teleConsentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null, index: true },
  mode: { type: String, enum: ['video', 'audio', 'chat'], default: 'video' },
  consentedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

teleConsentSchema.index({ appointmentId: 1, patientId: 1 });

export default mongoose.models.TeleConsent || mongoose.model('TeleConsent', teleConsentSchema);
