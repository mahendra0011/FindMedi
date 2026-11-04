import mongoose from 'mongoose';
import { encryptPhi, decryptPhi } from '../utils/phiFields.js';

/** File 16 A16.3: bank accounts registered for reconciliation.
 *
 * SITE-SEC 1.7: account number + IFSC are encrypted at rest with the same
 * v1 envelope as other identifiers. Reconciliation only ever displays the
 * last four digits, so the route decrypts for masking instead of storing a
 * plaintext copy. `accountNoHash` is the deterministic blind index used for
 * the per-tenant duplicate check (ciphertext is randomized per write).
 */
const enc = (field) => ({
  set: (v) => encryptPhi('BankAccount', field, v),
  get: (v) => decryptPhi('BankAccount', field, v),
});

const bankAccountSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  bankName: { type: String, required: true },
  accountNo: { type: String, required: true, ...enc('accountNo') },
  accountNoHash: { type: String, index: true, sparse: true },
  ifsc: { type: String, default: '', ...enc('ifsc') },
  kind: { type: String, enum: ['current', 'savings', 'escrow', 'od'], default: 'current' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

bankAccountSchema.index({ hospitalId: 1, accountNoHash: 1 }, { unique: true, sparse: true });

export default mongoose.models.BankAccount || mongoose.model('BankAccount', bankAccountSchema);
