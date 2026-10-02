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
