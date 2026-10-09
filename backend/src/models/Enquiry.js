import mongoose from 'mongoose';

/** File 22 P0-6: front-office enquiry log (walk-in/call/online interest). */
const enquirySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true, maxlength: 120 },
  phone: { type: String, default: '', index: true },
  source: { type: String, enum: ['walkin', 'call', 'online', 'referral', 'camp', 'other'], default: 'walkin' },
  interest: { type: String, default: '', maxlength: 200 },
  notes: { type: String, default: '', maxlength: 1000 },
  followUpAt: { type: Date, default: null },
  status: { type: String, enum: ['Open', 'FollowUp', 'Converted', 'Dropped'], default: 'Open', index: true },
  convertedPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

enquirySchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);
