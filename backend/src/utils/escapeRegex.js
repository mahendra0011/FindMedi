// REC-006 / PHARMA-003 / CHAT-004: escaping helper, promoted out of chat.js so
// every search box uses it. Building a RegExp straight from user input lets a
// crafted `q` such as `((a+)+)+$` trigger catastrophic backtracking, which
// stalls the single-threaded Node event loop for every connected user — and it
// also turns metacharacters into a match-anything filter.
//
// Two rules for every call site:
//   1. escapeRegex() the user string before it reaches `new RegExp`
//   2. capSearch() the length, so a huge pattern cannot be compiled at all
const REGEX_META = /[.*+?^${}()|[\]\\]/g;

/** Escape regex metacharacters. Returns '' for null/undefined so callers can
 *  branch on emptiness instead of building a match-everything pattern. */
export function escapeRegex(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(REGEX_META, '\\$&');
}

// Long enough for real names ("Dextromethorphan", hospital names, batch codes)
// and short enough that no pathological pattern can be constructed.
export const SEARCH_MAX_LENGTH = 120;

/** Normalise a user-supplied search term: coerce to string, trim, length-cap. */
export function capSearch(value, max = SEARCH_MAX_LENGTH) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

/** Build a case-insensitive, metacharacter-safe, length-capped RegExp.
 *  Returns null when the term is empty, so callers can skip the filter. */
export function safeSearchRegex(value, { max = SEARCH_MAX_LENGTH, flags = 'i' } = {}) {
  const term = capSearch(value, max);
  if (!term) return null;
  return new RegExp(escapeRegex(term), flags);
}

/** True when the term contains regex metacharacters — used by the CI guard's
 *  unit test and by any endpoint that wants to warn, not to reject. */
export function hasRegexMeta(value) {
  REGEX_META.lastIndex = 0;
  return REGEX_META.test(String(value ?? ''));
}

// REC-006 hardening for admin-authored recon-rule patterns. Unlike a search
// box, a recon rule IS a real regex by design (billing:write), so it cannot be
// escaped into a literal — but a catastrophic pattern such as `((a+)+)+$`
// would stall the import worker that runs it against every bank line. Cap
// the length and reject the classic nested-quantifier shapes up front; this is
// a heuristic safety net, not a regex-safety proof.
const RULE_MAX_LENGTH = 200;
const CATASTROPHIC = /(\([^)]*[+*][^)]*\)[+*])|(\[\^?[^\]]*\][+*][+*])|([+*][+*])/;

/** Validate an admin-supplied rule pattern. Returns the trimmed, length-capped
 *  pattern, or throws a 400 when it contains nested quantifiers. */
export function safeRulePattern(value) {
  const pattern = String(value ?? '').trim().slice(0, RULE_MAX_LENGTH);
  if (CATASTROPHIC.test(pattern)) {
    const err = new Error('Pattern rejected: nested quantifiers can cause catastrophic backtracking');
    err.status = 400;
    throw err;
  }
  return pattern;
}
