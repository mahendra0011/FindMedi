import mongoose from 'mongoose';

// ABDM M2/M3 consent ledger: every grant is scoped + expiring + revocable.
const consentRecordSchema = new mongoose.Schema({
  consentId: { type: String, required: true, unique: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  purposeOfCare: { type: String, default: 'General Clinical Evaluation' },
  dataTypes: [{ type: String }], // e.g. ['labs:6mo','prescriptions','discharge']
  status: { type: String, enum: ['REQUESTED', 'GRANTED', 'DENIED', 'REVOKED', 'EXPIRED'], default: 'REQUESTED', index: true },
  validityHours: { type: Number, default: 24 },
  grantedAt: { type: Date },
  expiresAt: { type: Date },
  revokedAt: { type: Date },
  hipSessionKey: { type: String, default: '' }, // ephemeral ECDH public material ref (never plaintext records)
}, { timestamps: true });

export default mongoose.model('ConsentRecord', consentRecordSchema);
