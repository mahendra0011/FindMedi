import mongoose from 'mongoose';

// 7.md:39 CME tracker: a doctor's continuing-education credits with
// certificates. Self-reported against the doctor's OWN profiles (Doctor rows
// whose user_id is the caller — the same ownership key as the second-opinion
// inbox), so a doctor can never file credits onto another clinician's name.
// Verification workflow (council/admin sign-off) is a follow-up; this is the
// tracking surface: what, when, how many hours, proof attached.
const cmeCreditSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  doctorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  organizer: { type: String, trim: true, maxlength: 200, default: '' },
  credits: { type: Number, min: 0, max: 100, required: true },
  date: { type: String, required: true },
  certificateUrl: { type: String, trim: true, maxlength: 500, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

cmeCreditSchema.index({ doctorId: 1, date: -1 });

export default mongoose.model('CMECredit', cmeCreditSchema);
