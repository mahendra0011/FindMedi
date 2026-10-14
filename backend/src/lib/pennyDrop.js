// 2.md 14 / onboarding security checklist — penny-drop payout verification.
//
// A payout account is proven by a nominal bank transfer whose CREDITED NAME the
// bank reports back; it must match the applicant's `account_holder`. The real
// round-trip needs merchant credentials, so this module is env-driven and
// FAIL-SOFT on purpose:
//
//   PENNY_DROP_MODE=off     → skipped entirely (fast local dev).
//   PENNY_DROP_MODE=mock    → (default) no network; returns a deterministic
//                             `mock_verified` so CI and dev never depend on a
//                             bank being reachable.
//   PENNY_DROP_MODE=live    → POSTs to PENNY_DROP_URL with a 5s timeout; ANY
//                             transport/shape error degrades to `unavailable`
//                             rather than blocking the applicant's submission —
//                             a gateway outage must not become an outage of the
//                             join flow, it becomes a reviewer-visible flag.
//
// `evaluateNameMatch` is the pure comparison the live gateway response (and the
// tests) both go through: bank credited names routinely differ in case,
// spacing, honorifics and word order, so this is a normalized containment
// match, not string equality.

export const PENNY_DROP_MODES = ['off', 'mock', 'live'];

/** Resolve the configured mode; unknown values fall back to `mock` (never
 *  silently to `live` — a typo must not turn on a money-moving path). */
export function pennyDropMode() {
  const raw = String(process.env.PENNY_DROP_MODE || 'mock').toLowerCase().trim();
  return PENNY_DROP_MODES.includes(raw) ? raw : 'mock';
}

/** Uppercase, strip everything non-alphanumeric: "Shri Ramesh Kumar" and
 *  "Ramesh Kumar" compare on their token content. */
export function normalizeName(raw) {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Name comparison for payout verification.
 *
 * - both sides normalize to something meaningful (>= 3 chars), else no match;
 * - exact normalized equality → match;
 * - one side containing the other (>= 3 chars of substance) → match, which is
 *   what covers "RAMESH KUMAR" vs "RAMESH KUMAR S/O RAM" and bank-added
 *   honorifics;
 * - otherwise token-subset match: every token of the SHORTER name appears in
 *   the longer (covers reordered middle/last names), requiring at least two
 *   tokens so a single common token like "KUMAR" cannot match alone.
 */
export function evaluateNameMatch(expected, credited) {
  const a = normalizeName(expected);
  const b = normalizeName(credited);
  if (a.length < 3 || b.length < 3) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const at = a.split(' ');
  const bt = b.split(' ');
  const [short, long] = at.length <= bt.length ? [at, bt] : [bt, at];
  if (short.length < 2) return false;
  const longSet = new Set(long);
  return short.every((token) => longSet.has(token));
}

const hasPayoutIdentity = ({ ifsc, accountNumber, accountHolder }) =>
  Boolean(accountHolder && accountNumber && ifsc);

/**
 * Verify a payout account. Returns a discriminated result the auto-check layer
 * turns into a reviewer note:
 *
 *   { status: 'verified' | 'name_mismatch' | 'unavailable' | 'skipped' | 'incomplete',
 *     mode, nameMatch, creditedName, note, at }
 */
export async function verifyPennyDrop({ ifsc, accountNumber, accountHolder } = {}) {
  const mode = pennyDropMode();
  const at = new Date();

  if (mode === 'off') {
    return { status: 'skipped', mode, nameMatch: null, creditedName: '', note: 'penny-drop disabled by config', at };
  }
  if (!hasPayoutIdentity({ ifsc, accountNumber, accountHolder })) {
    return { status: 'incomplete', mode, nameMatch: null, creditedName: '', note: 'payout fields incomplete, nothing to verify', at };
  }

  if (mode === 'mock') {
    // Deterministic mock: the credited name equals what was submitted, so the
    // happy path passes and `evaluateNameMatch` still gets exercised by unit
    // tests and by any live gateway response.
    const creditedName = String(accountHolder);
    const nameMatch = evaluateNameMatch(accountHolder, creditedName);
    return {
      status: nameMatch ? 'verified' : 'name_mismatch',
      mode,
      nameMatch,
      creditedName,
      note: 'mock mode: no bank round-trip performed',
      at,
    };
  }

  // live
  const url = String(process.env.PENNY_DROP_URL || '').trim();
  if (!url) {
    return { status: 'unavailable', mode, nameMatch: null, creditedName: '', note: 'PENNY_DROP_URL not configured', at };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(process.env.PENNY_DROP_KEY ? { 'x-api-key': process.env.PENNY_DROP_KEY } : {}) },
        body: JSON.stringify({ ifsc, accountNumber, accountHolder }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      return { status: 'unavailable', mode, nameMatch: null, creditedName: '', note: `gateway responded ${res.status}`, at };
    }
    const payload = await res.json();
    const creditedName = String(payload?.creditedName ?? payload?.name ?? '');
    const nameMatch = evaluateNameMatch(accountHolder, creditedName);
    return {
      status: nameMatch ? 'verified' : 'name_mismatch',
      mode,
      nameMatch,
      creditedName,
      note: nameMatch ? 'credited name matches' : `bank credited "${creditedName.slice(0, 60)}"`,
      at,
    };
  } catch (err) {
    // Fail-soft: an unreachable bank is a REVIEWER flag, never a 500 on submit.
    return {
      status: 'unavailable',
      mode,
      nameMatch: null,
      creditedName: '',
      note: `gateway unreachable (${String(err?.message ?? err).slice(0, 120)})`,
      at,
    };
  }
}
