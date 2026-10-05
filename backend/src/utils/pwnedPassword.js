import crypto from 'node:crypto';
import logger from '../config/logger.js';
import { securityFailOpenTotal } from '../lib/metrics.js';

// P2-9: Have I Been Pwned password range check (k-anonymity). Only the 5-char
// SHA-1 prefix of the candidate leaves this server - the full hash is never
// transmitted. POST /register, /reset-password and PUT /change-password call
// this before a chosen password is persisted.
//
// Posture on outage is FAIL-OPEN (with the shared F8 counter): this control
// raises the bar against reuse of known-breached passwords; refusing every
// signup because api.pwnedpasswords.com is unreachable would turn a hygiene
// check into a self-inflicted outage. Tests never touch the network.

const RANGE_URL = (prefix) => `https://api.pwnedpasswords.com/range/${prefix}`;

export async function isPwnedPassword(password, { timeoutMs = 2000 } = {}) {
  if (process.env.NODE_ENV === 'test') return false;
  try {
    const sha1 = crypto
      .createHash('sha1')
      .update(String(password), 'utf8')
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(RANGE_URL(prefix), {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`http-${res.status}`);
    const body = await res.text();
    for (const line of body.split('\n')) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch (err) {
    securityFailOpenTotal.inc({ control: 'pwned_password' });
    logger.warn(`pwnedPassword check unavailable (${err?.message || err}); allowing password (fail-open)`);
    return false;
  }
}
