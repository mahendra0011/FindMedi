import mongoose from 'mongoose';

/**
 * FE-B-06 — single-use ambulance setup codes.
 *
 * Replaces a 48-hour JWT embedded in the invite URL. This model exists because the
 * requirements are: opaque (no claims to leak), short-lived (15 minutes), and
 * single-use. A JWT cannot express "used" — it is valid until it expires — so the
 * redeemability check has to live somewhere, and a row is the natural place.
 *
 * `code` is stored as-is (not hashed) because the lookup IS the redemption: the
 * query filters on `code` to flip `usedAt`. Hashing would require a scan. The code
 * is 128 bits of CSPRNG entropy, is valid for 15 minutes, and is worth nothing
 * after one use, so the exposure window from an index dump is negligible — and
 * this collection is in the same database as password hashes.
 */
const ambulanceSetupCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  email: { type: String, required: true },
  ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// TTL index: expired rows are removed by Mongo itself. This is a clean-up
// convenience, not the security control — `expiresAt` is also checked in the
// consume query, so an expired code is already rejected even if the row survives
// until the next TTL pass.
ambulanceSetupCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AmbulanceSetupCode', ambulanceSetupCodeSchema);