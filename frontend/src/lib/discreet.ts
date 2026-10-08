/**
 * Discreet mode (privacy): neutral, PHI-free wording for sensitive categories.
 *
 * Sensitive categories (mental health, sexual/reproductive health, de-addiction,
 * IVF/fertility) must never render diagnosis-like text in titles, toasts, or
 * notification previews. When discreet mode is on (or the category itself is
 * sensitive), surfaces call neutralText() instead of the raw label.
 */

export const SENSITIVE_CATEGORY_PATTERNS: RegExp[] = [
  /mental/i,
  /psych/i,
  /counsell?ing/i,
  /sexual/i,
  /reproductive/i,
  /ivf/i,
  /fertil/i,
  /de[\s-]?addiction/i,
  /addiction/i,
  /rehab/i,
  /hiv/i,
  /std/i,
  /sti\b/i,
  /abortion/i,
  /contracept/i,
];

export function isSensitiveCategory(category?: string | null): boolean {
  if (!category) return false;
  return SENSITIVE_CATEGORY_PATTERNS.some((re) => re.test(String(category)));
}

const NEUTRAL_BY_KIND: Record<string, string> = {
  appointment: 'Your appointment update is available in FindMedi.',
  booking: 'Your booking update is available in FindMedi.',
  payment: 'There is a billing update in FindMedi.',
  report: 'A health report update is available in FindMedi.',
  default: 'You have a new update in FindMedi.',
};

/**
 * Return neutral copy when discreet mode is on or the category is sensitive;
 * otherwise return the original text untouched.
 */
export function neutralText(
  original: string,
  opts: { category?: string | null; discreet?: boolean; kind?: keyof typeof NEUTRAL_BY_KIND | string } = {},
): string {
  const { category = null, discreet = false, kind = 'default' } = opts;
  if (!discreet && !isSensitiveCategory(category)) return original;
  return NEUTRAL_BY_KIND[String(kind)] ?? NEUTRAL_BY_KIND.default;
}

/** Slot-hold countdown stub: seconds left before a held slot is released. */
export const SLOT_HOLD_SECONDS = 300;

export function formatHoldCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.trunc(Number(secondsLeft) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
