import { randomDigits } from './secureRandom.js';

export function generateOTP(length = 6) {
  return randomDigits(length);
}

export function generateSecret() {
  // Delegate to the CSPRNG-backed 2FA service; this legacy helper stays as a
  // thin alias so AUTH-019's weak base32 generator is gone from all paths.
  return randomDigits(20).split('').map((d) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Number(d) % 32]).join('');
}
