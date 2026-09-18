import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  facilityType: { type: String, enum: ['hospital', 'lab', 'pharmacy', 'clinic'], required: true },
  facilityName: { type: String },
  licenseType: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  issuingAuthority: { type: String, default: '' },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Expiring Soon', 'Expired', 'Revoked'], default: 'Active' },
  documentUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  reminders: [{ daysBefore: Number, sentAt: Date }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

licenseSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  const daysLeft = Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) this.status = 'Expired';
  else if (daysLeft <= 30) this.status = 'Expiring Soon';
  else this.status = 'Active';
  next();
});

export default mongoose.model('License', licenseSchema);