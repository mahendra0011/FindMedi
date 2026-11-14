import { signToken, verifyToken } from '../utils/jwtKeys.js';

// AUTH-F-01: jsonwebtoken lives ONLY in src/utils/jwtKeys.js. Unsubscribe
// links are signed through the same keyset so key rotation applies here too;
// retiring a key stays safe for as long as the link TTL (365d).
export function generateUnsubscribeToken(userId) {
  return signToken(
    { sub: String(userId), purpose: 'unsubscribe', typ: 'unsubscribe' },
    { expiresIn: '365d' }
  );
}

export function verifyUnsubscribeToken(token) {
  const payload = verifyToken(token);
  if (payload?.purpose !== 'unsubscribe' || !payload?.sub) throw new Error('invalid token');
  return String(payload.sub);
}
