import mongoose from 'mongoose';

/**
 * File 09 §9.8/06.1: staff credentialing & privileging (council
 * registrations, BLS/ACLS, surgical privileges) with expiry tracking.
 */
const credentialSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  type: {
    type: String,
    enum: ['NMC', 'StateCouncil', 'NursingCouncil', 'BLS', 'ACLS', 'PharmacyCouncil', 'Other'],
    required: true,
  },
  number: { type: String, default: '' },
  validTill: { type: Date, default: null, index: true },
  docUrl: { type: String, default: '' },
  privileges: [{ type: String, maxlength: 200 }],
  verifiedAt: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

credentialSchema.index({ staffId: 1, type: 1 });

export default mongoose.models.Credential || mongoose.model('Credential', credentialSchema);
