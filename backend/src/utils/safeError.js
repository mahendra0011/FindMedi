import logger from '../config/logger.js';

/**
 * RIDE-B-06: turn an internal error into a response that is useful to the user and
 * useless to an attacker.
 *
 * The handlers used `res.status(500).json({ message: '...', error: err.message })`,
 * which handed out raw CastError / MongoServerError / path text on every ride
 * route: internal schema and collection names, and occasionally a connection
 * string fragment. A 500 body should describe the failure, not the system.
 *
 * The real message goes to the log together with a short, opaque `errorId`; the
 * client gets that id, which is enough to find the matching log line in support.
 */
export const ERROR_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function newErrorId() {
  // 8 chars from 36 — enough entropy for a correlation id, not a secret.
  let id = '';
  for (let i = 0; i < 8; i += 1) {
    id += ERROR_ID_ALPHABET[Math.floor(Math.random() * ERROR_ID_ALPHABET.length)];
  }
  return id;
}

/**
 * Write a 500 that leaks nothing, and log the cause with a correlation id.
 *
 * @param {object} res   express response
 * @param {Error}  err   the caught error
 * @param {string} clientMessage safe, user-facing summary
 * @param {object} [ctx] extra log context (never sent to the client)
 */
export function sendSafeError(res, err, clientMessage = 'Something went wrong', ctx = {}) {
  const errorId = newErrorId();
  logger.error(`[${errorId}] ${clientMessage}`, {
    errorId,
    message: err?.message,
    stack: err?.stack,
    ...ctx,
  });
  return res.status(500).json({ message: clientMessage, errorId });
}

// §5.3/§5.4: response-DTO allowlist guard — `...doc` / full-object returns leak
// password, tokenVersion, 2FA secrets, __v, KYC/bank fields. Strip at the DTO
// boundary (select:false is bypassed by .lean()/.select('+password')).
const FORBIDDEN_RESPONSE_FIELDS = new Set([
  'password', 'passwordHash', 'tokenVersion', 'tokenKey',
  'twoFactorSecret', 'twoFactorTempSecret', 'twoFactorBackupCodes',
  'driveTokens', 'abhaOtpHash', 'otp', 'otpHash',
  'bankAccount', 'bankAccountNumber', 'accountNumber', 'ifsc', 'upiId',
  'aadhaar', 'aadhaarNumber', 'pan', 'panNumber', 'passportNumber',
  'voterId', 'kyc', 'kycDocs', '__v',
]);

export function sanitizeDto(input) {
  if (!input || typeof input !== 'object') return input;
  const obj = typeof input.toObject === 'function' ? input.toObject() : { ...input };
  for (const field of FORBIDDEN_RESPONSE_FIELDS) delete obj[field];
  return obj;
}

export { FORBIDDEN_RESPONSE_FIELDS };

/**
 * Handle an unexpected failure inside an async route.
 *
 *   router.get('/:id', protect, async (req, res) => {
 *     try { … } catch (err) { sendServerError(res, err, 'Failed to fetch ride details', { rideId: req.params.id }); }
 *   });
 */
export function sendServerError(res, err, clientMessage, ctx) {
  return sendSafeError(res, err, clientMessage, ctx);
}
