import crypto from 'node:crypto';
import Prescription from '../models/Prescription.js';
import logger from '../config/logger.js';

/**
 * REC-M-05: tamper-evident prescriptions with a public verification endpoint.
 *
 * THE PROBLEM
 * A prescription PDF renders a `signatureUrl` image. An image is not a
 * signature - anyone with a text editor can produce a pixel-identical one. There
 * was no cryptographic integrity value and no public way to check, so a forged
 * prescription was indistinguishable from a real one to a pharmacist holding it.
 *
 * WHAT "SIGNED" MEANS HERE, PRECISELY
 * An HMAC over a canonical digest of the clinical content, keyed by a server
 * secret. A forger can edit the medicines freely; what they cannot do is produce
 * a digest that verifies without the key. This attests "the platform issued this
 * and has not altered it since" - it is NOT a digital signature by a licensed
 * prescriber and must never be presented as one. That would need a per-doctor key
 * and a regulatory-grade HSM.
 *
 * WHY THE PUBLIC VERIFY ENDPOINT RETURNS SO LITTLE
 * It is unauthenticated, because the point is a pharmacist checking a paper
 * script. That makes it an oracle unless designed not to be one: it confirms
 * authenticity and returns a few non-identifying facts, and NEVER the patient,
 * the medicines or the diagnosis. A verify endpoint that echoes a patient's name
 * for any valid token is a patient lookup service with a URL.
 */

const TOKEN_VERSION = 'FM1';

const getSecret = () => process.env.PRESCRIPTION_SIGNING_SECRET || process.env.JWT_SECRET;

/**
 * Canonical form of the fields a pharmacist relies on.
 *
 * Key order is fixed and values stringified, because an HMAC over
 * `JSON.stringify` of a Mongoose subdocument is not stable across versions -
 * `__v`, key insertion order and undefined-vs-missing all leak in. If this ever
 * drifts, every previously issued prescription fails verification.
 */
export const canonicalise = (p = {}) => JSON.stringify({
  prescriptionId: String(p.prescriptionId ?? ''),
  patientId: String(p.patientId ?? ''),
  doctorId: String(p.doctorId ?? ''),
  appointmentId: String(p.appointmentId ?? ''),
  hospitalId: String(p.hospitalId ?? ''),
  // Medicines in order: reordering changes the prescription.
  medicines: (p.medicines || []).map((m) => [
    String(m.name ?? ''), String(m.dosage ?? ''), String(m.frequency ?? ''), String(m.duration ?? ''),
  ]),
  diagnosis: String(p.diagnosis ?? ''),
  createdAt: new Date(p.createdAt ?? 0).toISOString(),
});

export const computeDigest = (prescription) =>
  crypto.createHash('sha256').update(canonicalise(prescription)).digest('hex');

/**
 * Keyed signature over the digest. Constant-time comparison everywhere it is
 * checked - a `===` on an HMAC leaks prefix length by timing, which is enough to
 * forge one byte at a time.
 */
export const signDigest = (digest) => {
  const secret = getSecret();
  if (!secret) throw new Error('PRESCRIPTION_SIGNING_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(digest).digest('hex');
};

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/** Recompute and compare. Never trusts the stored signature. */
/**
 * Issue (or re-issue) the integrity block.
 *
 * Returns null when no signing secret is configured, so an unconfigured
 * deployment degrades to "no integrity value" rather than to a value signed with
 * an empty key, which would verify against anything.
 */
export const sealPrescription = (prescription, { nonce } = {}) => {
  if (!getSecret()) {
    logger.warn('[prescription-integrity] PRESCRIPTION_SIGNING_SECRET not set - prescription left unsigned');
    return null;
  }
  const digest = computeDigest(prescription);
  const signature = signDigest(digest);
  prescription.integrity = {
    version: TOKEN_VERSION,
    digest,
    signature,
    algorithm: 'HMAC-SHA256',
    issuedAt: new Date(),
    // Only a hash of the nonce is stored, so a database leak does not hand out
    // usable verification tokens for every live prescription on the platform.
    nonceHash: nonce ? crypto.createHash('sha256').update(nonce).digest('hex') : null,
  };
  return prescription.integrity;
};

/**
 * Mint a scannable token: `FM1.<prescriptionId>.<nonce>.<sig>`
 *
 * The signature covers the prescription id AND the nonce, so a token for one
 * prescription cannot be edited into a token for another.
 */
export const issueToken = (prescription, { nonce } = {}) => {
  const n = nonce || crypto.randomBytes(16).toString('hex');
  const body = `${TOKEN_VERSION}.${prescription.prescriptionId}.${n}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('hex').slice(0, 32);
  return { token: `${body}.${sig}`, nonce: n };
};

export const parseToken = (token) => {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) return null;
  const [, prescriptionId, nonce, sig] = parts;
  // Shape-validated BEFORE any lookup. `prescriptionId` goes into a query, and
  // `$` / `.` in a Mongo id is a query-operator injection surface.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(prescriptionId)) return null;
  if (!/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{32}$/.test(sig)) return null;
  return { prescriptionId, nonce, sig };
};

/** Is this token authentic, before any database work? */
export const verifyTokenSignature = ({ prescriptionId, nonce, sig }) => {
  if (!getSecret()) return false;
  const body = `${TOKEN_VERSION}.${prescriptionId}.${nonce}`;
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('hex').slice(0, 32);
  return safeEqual(expected, sig);
};

/**
 * Verify a scanned token end to end.
 *
 * Returns ONLY non-identifying facts. Callers must not widen this.
 */
export const verifyToken = async (token) => {
  const parsed = parseToken(token);
  if (!parsed) return { valid: false, reason: 'malformed' };
  if (!verifyTokenSignature(parsed)) return { valid: false, reason: 'bad-token-signature' };

  const prescription = await Prescription.findOne({ prescriptionId: parsed.prescriptionId })
    .select('integrity status cancelledAt revokedAt doctorId medicines createdAt')
    .lean();
  if (!prescription) return { valid: false, reason: 'not-found' };

  const integrity = verifyIntegrity(prescription);
  if (!integrity.valid) return { valid: false, reason: integrity.reason };

  if (prescription.revokedAt || prescription.cancelledAt || ['cancelled', 'revoked'].includes(prescription.status)) {
    return { valid: false, reason: 'revoked', issuedAt: integrity.issuedAt };
  }

  // A prescriber must still be an active, registered prescriber on the day of
  // dispensing. An integrity check that keeps passing after the doctor has been
  // struck off answers the wrong question.
  const doctor = await Prescription.db.model('User')
    .findById(prescription.doctorId)
    .select('status role')
    .lean();

  return {
    valid: true,
    issuedAt: integrity.issuedAt,
    // Boolean only - not the doctor, not the hospital.
    prescriberActive: !!doctor && doctor.status !== 'blocked',
    prescriberRoleIsClinical: !!doctor && ['doctor', 'clinic_doctor', 'psychiatrist', 'therapist'].includes(doctor.role),
    // Counts, not contents.
    medicineCount: (prescription.medicines || []).length,
  };
};
export const verifyIntegrity = (prescription) => {
  const integrity = prescription?.integrity;
  if (!integrity?.digest || !integrity?.signature) return { valid: false, reason: 'unsigned' };
  const digest = computeDigest(prescription);
  if (digest !== integrity.digest) return { valid: false, reason: 'content-changed' };
  if (!safeEqual(signDigest(digest), integrity.signature)) return { valid: false, reason: 'bad-signature' };
  return { valid: true, digest, signature: integrity.signature, issuedAt: integrity.issuedAt };
};