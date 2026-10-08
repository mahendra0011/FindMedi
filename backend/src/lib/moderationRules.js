/**
 * 8.md §5 (Content & UGC moderation) + §6 (Trust & Safety) — the RULES.
 *
 * This module is deliberately PURE: no mongoose model, no request, no I/O. It
 * is the single definition of
 *
 *   - the queue vocabulary (target type / category / severity / status /
 *     canned action) that the ModerationItem schema and the request schemas in
 *     utils/validate.js both pin to,
 *   - the auto-filters of 8.md §5.2 (keyword + regex detectors for abuse, PII
 *     and medical/advert claims — no external API, so a flag can never be
 *     blocked by a vendor outage),
 *   - the SLA clock per severity (§5.2 "SLA"), and
 *   - the strike → escalation thresholds of §6, written as a table a reviewer
 *     can read instead of a pile of magic numbers.
 *
 * The model-touching half (queue writes, target enforcement, strikes) lives in
 * ./moderationActions.js so that this file stays importable from anywhere —
 * including utils/validate.js — without registering a mongoose model as a side
 * effect of request validation.
 */

/** Bump when a rule below changes: every queue row records the version it was judged under. */
export const MODERATION_POLICY_VERSION = '2026.10-8md5';

/** 8.md §5.1 queues. `chat_report` is the moderation lane for ChatReport rows. */
export const MODERATION_TARGET_TYPES = [
  'review', 'provider_profile', 'product_listing', 'event', 'article', 'chat_report',
];

export const MODERATION_CATEGORIES = [
  // Auto-detected by analyzeContent():
  'abuse', 'pii', 'medical_claim', 'misleading', 'crisis', 'spam',
  // Reported / ops-assigned only:
  'verified_booking', 'defamation', 'copyright', 'other',
];

export const MODERATION_SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const MODERATION_STATUSES = ['open', 'in_review', 'actioned', 'dismissed', 'appealed'];

/** 8.md §5.2 "canned actions" — the only verbs a moderator may take. */
export const MODERATION_ACTIONS = [
  'hide', 'restore', 'shadow_hide', 'remove', 'warn_user', 'escalate', 'strike',
];

/**
 * Actions that make content (or a livelihood) disappear. These are the ones
 * that may need a second pair of eyes — see needsSecondReviewer().
 */
export const DESTRUCTIVE_ACTIONS = ['hide', 'shadow_hide', 'remove', 'strike'];

/** Content-level impact per action, applied to the target row (moderationActions.js). */
export const ACTION_VISIBILITY = {
  hide: 'hidden',
  shadow_hide: 'shadow_hidden',
  remove: 'removed',
  restore: 'visible',
  warn_user: 'visible',
  escalate: 'visible',
  strike: 'visible',
};

// ── 8.md §5.2 — second reviewer for high-severity / destructive actions ──────
//
// Two-person rule, mirroring routes/adminApplications.js: the FIRST reviewer
// parks the action (nothing happens to the content), and only a SECOND,
// different reviewer can let it take effect.
//
//   action is destructive AND (severity is high|critical)  → second reviewer
//   action is a strike (hits the provider's income)        → second reviewer,
//                                                            regardless of severity
//
// Low/medium `hide` — the everyday first-line takedown — stays single-reviewer,
// or the queue could never drain.
export const needsSecondReviewer = (severity, action) => {
  if (action === 'strike') return true;
  return DESTRUCTIVE_ACTIONS.includes(action) && (severity === 'high' || severity === 'critical');
};

// ── 8.md §5.2 — SLA (dueAt computed from severity) ──────────────────────────
export const SLA_HOURS = { low: 72, medium: 48, high: 24, critical: 8 };

export const slaHoursFor = (severity) => SLA_HOURS[severity] ?? SLA_HOURS.medium;

export const slaDueAtFor = (severity, from = new Date()) => (
  new Date(from.getTime() + slaHoursFor(severity) * 60 * 60 * 1000)
);

/** Queue rows past their clock while still being worked. */
export const isOverdue = (item, now = Date.now()) => (
  ['open', 'in_review', 'appealed'].includes(item.status)
  && item.slaDueAt instanceof Date
  && item.slaDueAt.getTime() < now
);

// ── 8.md §6 — strike thresholds (documented, configurable in one place) ──────
//
//   active strikes │ provider subject                │ user subject
//   ───────────────┼─────────────────────────────────┼────────────────────────
//   1              │ warning (in-app notice)         │ warning (in-app notice)
//   2              │ LISTING suspension (delisted    │ — (the warning stands)
//   3              │   directory-wide)               │ ACCOUNT suspension
//   4+             │ ACCOUNT suspension (owner       │   (status: blocked)
//                  │   blocked + listing suspended)  │
//
// Strikes are PERMANENT records: they never decay, are never deleted, and an
// appeal can only overturn one (status: overturned) — the row stays as the
// evidence of what was decided and why.
export const STRIKE_THRESHOLDS = {
  warn: 1,
  suspendListing: 2,
  suspendAccount: 3,
};

export const STRIKE_LEVELS = ['warning', 'listing_suspension', 'account_suspension'];

export const escalationForStrikeCount = (count, subjectType) => {
  if (count >= STRIKE_THRESHOLDS.suspendAccount) return 'account_suspension';
  if (subjectType === 'provider' && count >= STRIKE_THRESHOLDS.suspendListing) return 'listing_suspension';
  if (count >= STRIKE_THRESHOLDS.warn) return 'warning';
  return 'none';
};

// ── 8.md §5.2 — auto-filters (keyword/regex; no external calls) ─────────────
//
// Deliberately conservative: a detector only RANKS a row into the queue, it
// never removes content by itself — removal needs the canned action, which is
// (for these severities) a two-person decision.

export const ABUSE_PATTERNS = [
  { label: 'insult', re: /\b(?:idiot|moron|imbecile|stupid|loser|pathetic|worthless|useless|clown)\b/i },
  { label: 'fraud-allegation', re: /\b(?:scammer|scam|fraudster|fraudulent|cheat|liar|thief|extortion)\b/i },
  { label: 'hostility', re: /\b(?:shut\s*up|get\s*lost|screw\s*you|back\s*off|go\s*away)\b/i },
  { label: 'profanity', re: /\b(?:bastard|bloody|damned|damn)\b/i },
  { label: 'threat', re: /\b(?:kill|beat|attack|hurt)\s+(?:you|him|her|them|your)\b/i },
];

/** 8.md §6 "Crisis escalation": flagged for HUMAN review, never auto-ban. */
export const CRISIS_PATTERNS = [
  {
    label: 'self-harm',
    re: /\b(?:suicide|suicidal|kill\s*myself|end\s*my\s*life|want\s*to\s*die|self[-\s]?harm|cut\s*myself|hanging\s*myself)\b/i,
  },
];

// Order matters: a 12-digit Aadhaar must not be re-read as a 10-digit phone.
export const PII_PATTERNS = [
  { label: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
  { label: 'aadhaar', re: /\b\d{4}[\s-]\d{4}[\s-]\d{4}\b|\b\d{12}\b/ },
  { label: 'pan', re: /\b[A-Z]{5}\d{4}[A-Z]\b/ },
  { label: 'phone', re: /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/ },
  { label: 'phone_10d', re: /\b\d{10}\b/ },
];

// 8.md §5.1: "banned claims (cures diabetes)", Drugs & Magic Remedies / ASCI.
export const MEDICAL_CLAIM_PATTERNS = [
  {
    label: 'guaranteed-cure',
    re: /\b(?:100\s*%|100\s*percent|guaranteed?|assured)\s+(?:cure|relief|recovery|results?|success)\b/i,
  },
  {
    label: 'cure-claim',
    re: /\b(?:cure[sd]?|heal[sd]?|permanent(?:ly)?\s+(?:cure|relief|treatment|solution))\b[^.!?]{0,60}\b(?:diabetes|cancer|arthritis|asthma|hiv|aids|obesity|insomnia|depression|anxiety|hypertension|thyroid|pcod|psoriasis|eczema|kidney|liver|heart\s*disease|blood\s*pressure|sugar|hair\s*fall|baldness)\b/i,
  },
  {
    label: 'miracle-claim',
    re: /\b(?:miracle\s+cure|magic\s+cure|wonder\s+drug|no\s+side[-\s]?effects?|100\s*%\s*safe)\b/i,
  },
  {
    label: 'absolute-result',
    re: /\b(?:works\s+in\s+\d+\s+days|result\s+guaranteed|permanently\s+remove)\b/i,
  },
];

/** 8.md §5.1 events/camps: misleading "free test" promotions. */
export const MISLEADING_PATTERNS = [
  { label: 'free-test-claim', re: /\bfree\s+(?:tests?|checkups?|screenings?|medicines?)\b/i },
];

const CATEGORY_SEVERITY = {
  crisis: 'critical',
  pii: 'high',
  medical_claim: 'high',
  defamation: 'high',
  abuse: 'medium',
  misleading: 'medium',
  spam: 'low',
  copyright: 'medium',
  verified_booking: 'medium',
  other: 'low',
};

export const severityForCategory = (category) => CATEGORY_SEVERITY[category] || 'medium';

const SEVERITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };

export const maxSeverity = (...severities) => severities.reduce(
  (acc, s) => ((SEVERITY_RANK[s] ?? 0) > (SEVERITY_RANK[acc] ?? 0) ? s : acc),
  'low',
);

/** Mask a match before it is stored on a queue row (reviewer sees shape, not value). */
export const maskMatch = (value) => {
  const str = String(value ?? '');
  if (str.length <= 4) return '•'.repeat(str.length);
  const keepTail = str.length - 4 > 12 ? 12 : str.length - 4;
  return `${str.slice(0, 2)}${'•'.repeat(keepTail)}${str.slice(-2)}`;
};

/**
 * Run every auto-filter over one piece of user-generated text.
 *
 * @param {string} raw
 * @param {object} [options]
 * @param {string} [options.targetType] booking-gated lanes flag `verified_booking` separately
 * @returns {{flagged: boolean, categories: string[], severity: string, findings: Array<{category: string, label: string, sample: string}>}}
 */
export function analyzeContent(raw, options = {}) {
  const text = String(raw ?? '').slice(0, 5000);
  const findings = [];
  const seen = new Set();

  const scan = (patterns, category) => {
    if (seen.has(category)) return;
    for (const { label, re } of patterns) {
      const match = text.match(re);
      if (match) {
        seen.add(category);
        findings.push({ category, label, sample: maskMatch(match[0]) });
        return;
      }
    }
  };

  scan(CRISIS_PATTERNS, 'crisis');
  scan(PII_PATTERNS, 'pii');
  scan(MEDICAL_CLAIM_PATTERNS, 'medical_claim');
  scan(MISLEADING_PATTERNS, 'misleading');
  scan(ABUSE_PATTERNS, 'abuse');

  const categories = findings.map((f) => f.category);
  return {
    flagged: categories.length > 0,
    categories,
    severity: categories.length ? maxSeverity(...categories.map(severityForCategory)) : 'low',
    findings,
    targetType: options.targetType,
  };
}
