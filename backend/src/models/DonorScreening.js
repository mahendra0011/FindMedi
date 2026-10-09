import mongoose from 'mongoose';

/** File 22 P1-21: donor eligibility screening (deferrals tracked). */
const donorScreeningSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  donorName: { type: String, required: true, maxlength: 120 },
  phone: { type: String, default: '' },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  age: { type: Number, default: null },
  weightKg: { type: Number, default: null },
  hb: { type: Number, default: null },
  bp: { type: String, default: '' },
  lastDonationAt: { type: Date, default: null },
  questionnaire: { type: mongoose.Schema.Types.Mixed, default: {} },
  eligible: { type: Boolean, default: true },
  deferralReason: { type: String, default: '', maxlength: 500 },
  deferredTill: { type: Date, default: null },
  screenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

donorScreeningSchema.index({ hospitalId: 1, phone: 1 });

export default mongoose.models.DonorScreening || mongoose.model('DonorScreening', donorScreeningSchema);
