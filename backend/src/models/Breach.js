import mongoose from 'mongoose';

/**
 * File 22 P2-31: breach register with a 72-hour notification clock.
 * deadlineAt derives at create; the scheduler escalates un-notified rows
 * approaching the deadline. Status is a forward-only lifecycle.
 */
const breachSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  title: { type: String, required: true, maxlength: 200 },
  nature: { type: String, enum: ['confidentiality', 'integrity', 'availability', 'other'], default: 'other' },
  scope: { type: String, default: '', maxlength: 1000 },
  recordsAffected: { type: Number, default: 0 },
  detectedAt: { type: Date, default: Date.now },
  deadlineAt: { type: Date, index: true },
  notifiedAt: { type: Date, default: null },
  notifiedTo: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['Open', 'Assessing', 'Notified', 'Contained', 'Closed'], default: 'Open', index: true },
  containment: { type: String, default: '', maxlength: 2000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

breachSchema.pre('save', function (next) {
  if (!this.deadlineAt && this.detectedAt) {
    this.deadlineAt = new Date(new Date(this.detectedAt).getTime() + 72 * 3600 * 1000);
  }
  next();
});

breachSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.Breach || mongoose.model('Breach', breachSchema);
