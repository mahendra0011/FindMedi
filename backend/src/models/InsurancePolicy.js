import mongoose from 'mongoose';

/**
 * 6.md 2.13 / 6.md 140: the patient's health-insurance POLICY registry —
 * "Policies (add insurer/TPA, member IDs, validity), PM-JAY/CGHS/ESI cards".
 *
 * Deliberately a separate model from `Insurance`, which is a CLAIM (claimId,
 * pre-auth lifecycle, claimStatus) filed against a hospital stay. A policy is
 * what the member holds and renews; claims carry policyNumber as a plain
 * string. Splitting them means filing a claim never mutates the registry,
 * and retention has two clear targets instead of one overloaded collection.
 *
 * No `status` path: active/expired is DERIVED from validTo at read (the DSR
 * effectiveStatus precedent), so a lapsed policy needs no cron job and nobody
 * can post a forged `status`.
 */
const insurancePolicySchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  insurer: { type: String, required: true, trim: true, maxlength: 120 },
  tpa: { type: String, trim: true, maxlength: 120, default: '' },
  policyNumber: { type: String, required: true, trim: true, maxlength: 60 },
  // "member IDs" (6.md 88): the insured lives listed on the policy.
  memberIds: [{ type: String, trim: true, maxlength: 60 }],
  // PM-JAY / CGHS / ESI scheme cards (6.md 88); null for a plain commercial
  // policy — a missing scheme is not an error, it is the common case.
  scheme: { type: String, enum: ['PM-JAY', 'CGHS', 'ESI', null], default: null },
  // "validity" — the window the policy covers.
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
}, { timestamps: true });

insurancePolicySchema.index({ patientId: 1, validTo: -1 });

export default mongoose.models.InsurancePolicy
  || mongoose.model('InsurancePolicy', insurancePolicySchema);
