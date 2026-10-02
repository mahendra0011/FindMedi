import crypto from 'node:crypto';

// AUTH-009/010/019/031: single CSPRNG source. No Math.random() for OTPs,
// temp passwords, reference IDs, or idempotency members anywhere.
export function randomDigits(length) {
  let out = '';
  for (let i = 0; i < length; i++) out += String(crypto.randomInt(0, 10));
  return out;
}

export function randomToken(bytes = 16, encoding = 'hex') {
  return crypto.randomBytes(bytes).toString(encoding);
}

export function randomPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[crypto.randomInt(0, alphabet.length)];
  return out;
}

export function randomId(prefix = '', length = 8) {
  return `${prefix}${crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase()}`;
}
